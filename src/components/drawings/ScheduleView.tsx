import { useMemo } from 'react';
import type { PlanModel } from '@/domain/plan';
import type { CadDocument as Ws6CadDocument } from '@/domain/ws6-types';
import { convertPlanModelToCadDocument } from '@/adapters/planModelToCadAdapter';
import { buildScheduleSvg, ScheduleType } from '@/lib/drawings/disciplines/schedule-svg';
import type { TitleBlockMeta } from '@/lib/drawings/title-block';
import type { DesignOption } from '@/domain/boq';

function toWs6CadDocument(cad: import('@/domain/cad').CadDocument): Ws6CadDocument {
  return {
    id: cad.id,
    projectId: cad.projectId,
    name: cad.projectId,
    materialSystem: 'concrete',
    floors: cad.floors.map(f => ({ id: f.id, name: f.name, elevation: f.elevation, height: f.height ?? 3 })),
    walls: cad.walls.map(w => ({
      id: w.id, floorId: w.floorId,
      start: { x: w.start.x, y: w.start.y }, end: { x: w.end.x, y: w.end.y },
      thickness: w.thickness, height: w.bim?.classification ? 3 : 3,
      name: w.bim?.classification ?? '', structural: w.structuralRole === 'external',
      metadata: { ifcClass: w.bim?.classification ?? '', category: w.structuralRole, properties: {} },
    })),
    openings: cad.openings.map(o => ({
      id: o.id, wallId: o.wallId, floorId: o.floorId,
      kind: o.kind, offset: o.offsetRatio, width: o.width,
      height: o.height, sillHeight: o.sillHeight, headHeight: o.headHeight,
      name: o.bim?.classification ?? '',
      metadata: { ifcClass: o.bim?.classification ?? '', category: o.kind, properties: {} },
    })),
    blocks: cad.blocks.map(b => ({
      id: b.id, floorId: b.floorId,       kind: b.blockType as import('@/domain/ws6-types').BlockKind,
      position: { x: b.position.x, y: b.position.y },
      width: b.width, depth: b.height ?? b.width, rotation: b.rotation,
      name: b.bim?.classification ?? '',
      metadata: { ifcClass: b.bim?.classification ?? '', category: b.blockType, properties: {} },
    })),
    boundaries: (cad.boundaries ?? []).map(b => ({
      id: b.id,
      points: b.points.map(p => ({ x: p.x, y: p.y })),
      layerId: b.layerId, boundaryMode: b.boundaryMode, provenance: b.provenance,
    })),
  };
}

interface ScheduleViewProps {
  activePlan: PlanModel;
  design: DesignOption | null;
  scheduleType: ScheduleType;
}

export function ScheduleView({ activePlan, design, scheduleType }: ScheduleViewProps) {
  const svgContent = useMemo(() => {
    try {
      const result = convertPlanModelToCadDocument({ plan: activePlan, designId: design?.id });
      if (!result.cad) return '';

      const titles: Record<ScheduleType, string> = {
        door: 'DOOR SCHEDULE',
        window: 'WINDOW SCHEDULE',
        structural: 'STRUCTURAL SCHEDULE',
        equipment: 'EQUIPMENT SCHEDULE',
        room: 'ROOM SCHEDULE',
      };

      const meta: TitleBlockMeta = {
        project: design?.name ?? 'Untitled Project',
        drawing: titles[scheduleType],
        sheet: scheduleType === 'door' ? 'A-601' : scheduleType === 'window' ? 'A-602' : 'S-601',
        revision: 'A',
      };
      
      return buildScheduleSvg(toWs6CadDocument(result.cad), scheduleType, meta);
    } catch (err) {
      console.error(`Failed to generate ${scheduleType} schedule SVG:`, err);
      return `<svg width="800" height="600"><text x="400" y="300" fill="#ef4444" text-anchor="middle">Error generating schedule</text></svg>`;
    }
  }, [activePlan, design, scheduleType]);

  if (!svgContent) return null;

  return (
    <div className="flex flex-col gap-2">
      <div 
        className="rounded-lg border border-stone-700/60 bg-stone-950 p-4 overflow-auto flex justify-center"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
