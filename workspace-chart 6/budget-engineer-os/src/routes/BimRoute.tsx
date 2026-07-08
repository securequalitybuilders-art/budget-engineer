import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { CadPlanView } from '../components/cad/CadPlanView';
import { SectionView } from '../components/cad/SectionView';
import { BimViewerPanel } from '../components/bim/BimViewerPanel';
import { BoqPanel } from '../components/panels/BoqPanel';
import { CostBreakdownChart } from '../components/charts/CostBreakdownChart';
import { KpiCards } from '../components/charts/KpiCards';
import { AiBriefPanel } from '../components/panels/AiBriefPanel';
import { ProjectSwitcherPanel } from '../components/panels/ProjectSwitcherPanel';
import { RebarSpecPanel } from '../components/panels/RebarSpecPanel';
import { MaterialSwitchPanel } from '../components/panels/MaterialSwitchPanel';
import { RateCardPanel } from '../components/panels/RateCardPanel';
import { LoadAnalysisPanel } from '../components/panels/LoadAnalysisPanel';
import { FootingSizingPanel } from '../components/panels/FootingSizingPanel';
import { ExportPanel } from '../components/panels/ExportPanel';
import { TransactionHistoryPanel } from '../components/panels/TransactionHistoryPanel';

export function BimRoute() {
  const cad = useAppStore((s) => s.cad);
  const bim = useAppStore((s) => s.bim);
  const boq = useAppStore((s) => s.boq);
  const selectedElementId = useAppStore((s) => s.selectedElementId);
  const setSelectedElement = useAppStore((s) => s.setSelectedElement);
  const activeFloorId = useAppStore((s) => s.activeFloorId);
  const sectionConfig = useAppStore((s) => s.sectionConfig);
  const setActiveFloor = useAppStore((s) => s.setActiveFloor);
  const moveCadWall = useAppStore((s) => s.moveCadWall);
  const moveCadBlock = useAppStore((s) => s.moveCadBlock);
  const transactions = useAppStore((s) => s.transactions);
  const [editPlan, setEditPlan] = useState(false);

  if (!cad || !bim || !boq) return <p className="note">Loading model…</p>;

  const selected = bim.elements.find((e) => e.id === selectedElementId);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <KpiCards boq={boq} bim={bim} />

      <div className="grid cols-2">
        {/* Left: design journey */}
        <div className="grid" style={{ alignContent: 'start' }}>
          <ProjectSwitcherPanel />
          <AiBriefPanel />
          <MaterialSwitchPanel />
          <RateCardPanel />
          <div className="panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <h3 style={{ margin: 0 }}>2D CAD Plan — {cad.name}</h3>
              <button className={editPlan ? 'primary' : ''} onClick={() => setEditPlan((v) => !v)}>
                {editPlan ? '✓ Editing' : '✎ Edit Plan'}
              </button>
            </div>
            <p className="sub">
              {editPlan ? 'Drag walls or objects — changes regenerate BIM + BOQ and persist' : 'Click an element to inspect'}
              {' · '}{cad.floors.length} floor{cad.floors.length > 1 ? 's' : ''}
            </p>
            {cad.floors.length > 1 && (
              <div className="btn-row" style={{ marginBottom: 10 }}>
                {cad.floors.map((f) => (
                  <button
                    key={f.id}
                    className={(activeFloorId ?? cad.floors[0].id) === f.id ? 'active' : ''}
                    onClick={() => setActiveFloor(f.id)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
            <CadPlanView
              cad={cad}
              selectedId={selectedElementId}
              onSelect={setSelectedElement}
              activeFloorId={activeFloorId}
              sectionMark={sectionConfig}
              editable={editPlan}
              onMoveWall={(id, dx, dy) => void moveCadWall(id, dx, dy)}
              onMoveBlock={(id, dx, dy) => void moveCadBlock(id, dx, dy)}
            />
            {selected && (
              <p className="note" style={{ marginTop: 10 }}>
                Selected: <b style={{ color: '#e2e8f0' }}>{selected.name}</b> · {selected.metadata.ifcClass}
                {selected.length != null && ` · ${selected.length.toFixed(2)} m`}
                {selected.area != null && ` · ${selected.area.toFixed(2)} m²`}
              </p>
            )}
          </div>
          <SectionView cad={cad} />
          <BimViewerPanel />
          <RebarSpecPanel />
        </div>

        {/* Right: engineering output */}
        <div className="grid" style={{ alignContent: 'start' }}>
          <ExportPanel />
          <CostBreakdownChart boq={boq} />
          <LoadAnalysisPanel />
          <FootingSizingPanel />
          <BoqPanel boq={boq} />
          <TransactionHistoryPanel transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
