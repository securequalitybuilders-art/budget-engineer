import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BimModel, BimElement, MaterialSystem } from '../../domain/types';

// Stage 67 — 3D BIM viewer (plain three.js, no react-three-fiber).
// Renders the generated BIM model as extruded boxes: walls, slabs, roof,
// openings (as cut-coloured markers), and structural blocks. Default export
// so it can be React.lazy()-loaded off the critical path.

const MAT_COLOR: Record<MaterialSystem, number> = {
  concrete: 0x1a365d, steel: 0x64748b, timber: 0xa0522d,
};
const SLAB_COLOR = 0x334155;
const ROOF_COLOR = 0x475569;
const DOOR_COLOR = 0x22c55e;
const WINDOW_COLOR = 0x06b6d4;
const BLOCK_COLOR = 0x8b5cf6;

interface Props {
  bim: BimModel;
  materialSystem: MaterialSystem;
}

export default function BimViewer({ bim, materialSystem }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 600;
    const height = 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);

    // ---- compute model bounds (X/Y footprint, Z height) ----
    const floorZ = (id: string) => bim.floors.find((f) => f.id === id)?.elevation ?? 0;
    const xs: number[] = []; const ys: number[] = [];
    for (const e of bim.elements) { xs.push(e.x, e.x + e.width); ys.push(e.y, e.y + e.depth); }
    const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 1);
    const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 1);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY, 4);
    const top = bim.floors.reduce((m, f) => Math.max(m, f.elevation + f.height), 4);

    // ---- camera ----
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    let theta = Math.PI / 4;      // azimuth
    let phi = Math.PI / 3.2;      // polar
    let radius = span * 1.9;
    const target = new THREE.Vector3(0, top / 2, 0);
    const placeCamera = () => {
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.cos(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.sin(theta),
      );
      camera.lookAt(target);
    };
    placeCamera();

    // ---- lights ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(span, top * 2, span * 0.6);
    scene.add(dir);

    // ---- ground grid ----
    const grid = new THREE.GridHelper(span * 3, Math.round(span * 3), 0x24324b, 0x16223c);
    scene.add(grid);

    // helper: add a box centred on its footprint, model coords → scene (Y up = Z)
    const root = new THREE.Group();
    const addBox = (e: BimElement, h: number, zBase: number, color: number, opacity = 1) => {
      const w = Math.max(e.width, 0.05);
      const d = Math.max(e.depth, 0.05);
      const geom = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshLambertMaterial({
        color, transparent: opacity < 1, opacity,
      });
      const mesh = new THREE.Mesh(geom, mat);
      // model (x,y) footprint min-corner → centre; Y(scene up)=elevation+h/2; Z(scene)=y
      mesh.position.set((e.x + w / 2) - cx, zBase + h / 2, (e.y + d / 2) - cy);
      root.add(mesh);
      // crisp edges
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom),
        new THREE.LineBasicMaterial({ color: 0x0b1220, transparent: true, opacity: 0.4 }),
      );
      edges.position.copy(mesh.position);
      root.add(edges);
    };

    for (const e of bim.elements) {
      const z = floorZ(e.floorId);
      switch (e.type) {
        case 'wall':
          addBox(e, e.height, z, MAT_COLOR[(e.metadata.material as MaterialSystem) ?? materialSystem]);
          break;
        case 'slab':
          addBox(e, 0.2, z, SLAB_COLOR);
          break;
        case 'roof':
          addBox(e, 0.15, z, ROOF_COLOR);
          break;
        case 'opening': {
          const isDoor = e.metadata.ifcClass === 'IfcDoor';
          const oh = isDoor ? 2.1 : 1.2;
          const sill = isDoor ? 0 : 0.9;
          addBox(e, oh - 0, z + sill, isDoor ? DOOR_COLOR : WINDOW_COLOR, 0.55);
          break;
        }
        case 'block':
          if (e.metadata.ifcClass === 'IfcStair' || e.cadId.startsWith('stair')) {
            addBox(e, 1.2, z, 0xd4a574, 0.85);
          } else if (e.type === 'block') {
            addBox(e, 0.8, z, BLOCK_COLOR, 0.8);
          }
          break;
        default:
          break;
      }
    }
    scene.add(root);

    // ---- renderer ----
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // ---- simple orbit controls (drag rotate, wheel zoom) ----
    let dragging = false; let lastX = 0; let lastY = 0;
    const onDown = (ev: PointerEvent) => { dragging = true; lastX = ev.clientX; lastY = ev.clientY; };
    const onUp = () => { dragging = false; };
    const onMove = (ev: PointerEvent) => {
      if (!dragging) return;
      theta -= (ev.clientX - lastX) * 0.01;
      phi = Math.min(Math.max(phi - (ev.clientY - lastY) * 0.01, 0.2), Math.PI / 2 - 0.05);
      lastX = ev.clientX; lastY = ev.clientY;
      placeCamera();
    };
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      radius = Math.min(Math.max(radius * (1 + Math.sign(ev.deltaY) * 0.1), span * 0.6), span * 6);
      placeCamera();
    };
    const el = renderer.domElement;
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    el.addEventListener('wheel', onWheel, { passive: false });

    let raf = 0;
    let auto = true;
    const stopAuto = () => { auto = false; };
    el.addEventListener('pointerdown', stopAuto);
    const animate = () => {
      if (auto) { theta += 0.0025; placeCamera(); }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerdown', stopAuto);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
      el.removeEventListener('wheel', onWheel);
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const mm = m.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mm)) mm.forEach((x) => x.dispose());
          else mm.dispose();
        }
      });
    };
  }, [bim, materialSystem]);

  return <div ref={mountRef} style={{ width: '100%', height: 420, borderRadius: 10, overflow: 'hidden', border: '1px solid #24324b' }} />;
}
