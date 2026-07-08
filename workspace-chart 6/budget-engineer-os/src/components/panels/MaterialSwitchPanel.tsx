import { useAppStore } from '../../store/appStore';
import { MaterialSystem } from '../../domain/types';

const MATS: { id: MaterialSystem; label: string }[] = [
  { id: 'concrete', label: 'Concrete' },
  { id: 'steel', label: 'Steel' },
  { id: 'timber', label: 'Timber' },
];

export function MaterialSwitchPanel() {
  const materialSystem = useAppStore((s) => s.materialSystem);
  const setMaterialSystem = useAppStore((s) => s.setMaterialSystem);
  return (
    <div className="panel">
      <h3>Structural Material System</h3>
      <p className="sub">Drives IFC class, BOQ rate &amp; plan colour</p>
      <div className="btn-row">
        {MATS.map((m) => (
          <button key={m.id} className={materialSystem === m.id ? 'active' : ''} onClick={() => void setMaterialSystem(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
