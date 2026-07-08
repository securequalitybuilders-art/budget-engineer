import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import CadPlanView from '../components/cad/CadPlanView';
import CadPropertiesPanel from '../components/cad/CadPropertiesPanel';
import LazyBimViewer from '../components/bim/LazyBimViewer';
import BoqPanel from '../components/panels/BoqPanel';
import TransactionHistoryPanel from '../components/panels/TransactionHistoryPanel';
import ProjectWorkspacePanel from '../components/panels/ProjectWorkspacePanel';
import UserSwitcherPanel from '../components/panels/UserSwitcherPanel';
import GovernancePanel from '../components/panels/GovernancePanel';
import GovernanceActionsPanel from '../components/panels/GovernanceActionsPanel';
import GovernanceSummaryPanel from '../components/panels/GovernanceSummaryPanel';
import GovernanceCommentsPanel from '../components/panels/GovernanceCommentsPanel';
import ExportPanel from '../components/panels/ExportPanel';
import SnapshotComparisonPanel from '../components/panels/SnapshotComparisonPanel';
import ProjectSnapshotsPanel from '../components/panels/ProjectSnapshotsPanel';
import CrossProjectAnalyticsPanel from '../components/panels/CrossProjectAnalyticsPanel';
import BoqDeltaChartPanel from '../components/panels/BoqDeltaChartPanel';
import BoqShareComparePanel from '../components/panels/BoqShareComparePanel';
import BoqCategoryComparePanel from '../components/panels/BoqCategoryComparePanel';
import ClashCheckerPanel from '../components/panels/ClashCheckerPanel';
import SolarOrientationPanel from '../components/panels/SolarOrientationPanel';
import MepTakeoffPanel from '../components/panels/MepTakeoffPanel';
import SlabReinforcementPanel from '../components/panels/SlabReinforcementPanel';
import ExecutivePortfolioDashboardPanel from '../components/panels/ExecutivePortfolioDashboardPanel';
import RoomProgramPanel from '../components/panels/RoomProgramPanel';
import RoomSchedulePanel from '../components/panels/RoomSchedulePanel';
import ZoneTracePanel from '../components/panels/ZoneTracePanel';
import ZoneBoqGroupPanel from '../components/panels/ZoneBoqGroupPanel';
import BimPropertyTaxonomyPanel from '../components/panels/BimPropertyTaxonomyPanel';
import BimInspector from '../components/panels/BimInspector';
import CostBreakdownChart from '../components/panels/CostBreakdownChart';
import KpiCards from '../components/panels/KpiCards';
import ProjectHistoryPanel from '../components/panels/ProjectHistoryPanel';
import RbacPanel from '../components/panels/RbacPanel';
import FloorVisibilityPanel from '../components/panels/FloorVisibilityPanel';
import StandardsManifestPanel from '../components/panels/StandardsManifestPanel';
import IfcInteropPanel from '../components/panels/IfcInteropPanel';
import ComparisonDashboardPanel from '../components/panels/ComparisonDashboardPanel';
import SnapshotDiffTablePanel from '../components/panels/SnapshotDiffTablePanel';
import QuantityComparisonPanel from '../components/panels/QuantityComparisonPanel';
import BoqLineComparisonPanel from '../components/panels/BoqLineComparisonPanel';
import PortfolioDashboardPanel from '../components/panels/PortfolioDashboardPanel';
import PortfolioChartsPanel from '../components/panels/PortfolioChartsPanel';
import MultiProjectComparePanel from '../components/panels/MultiProjectComparePanel';
import CrossProjectDashboardPanel from '../components/panels/CrossProjectDashboardPanel';
export default function BimRoute() {
  const store = useAppStore();
  useEffect(() => { void store.initialize(); }, []);
  const [reviewNote, setReviewNote] = useState('');
  const [approveNote, setApproveNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [leftBoq, setLeftBoq] = useState<any[]>([]);
  const [rightBoq, setRightBoq] = useState<any[]>([]);
  useEffect(() => {
    if (store.compareLeftProjectId) { /* load left */ }
  }, [store.compareLeftProjectId]);
  useEffect(() => {
    if (store.compareRightProjectId) { /* load right */ }
  }, [store.compareRightProjectId]);
  const selectedBimElement = useMemo(() => store.bim?.elements.find(e => e.id === store.selectedElementId) || null, [store.bim, store.selectedElementId]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b1220', color: '#e2e8f0' }}>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #24324b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#f8fafc', letterSpacing: '0.5px' }}>Budget Engineer Studio — <span style={{ color: '#d4a574' }}>DZENHARE OS</span></div>
        <nav style={{ display: 'flex', gap: 8, fontSize: 12 }}>
          {['Design Journey', 'Enterprise AI', '3D BIM', 'Quantities', 'BOQ'].map(l => <span key={l} style={{ padding: '4px 10px', borderRadius: 6, background: '#111c31', color: '#94a3b8', border: '1px solid #24324b' }}>{l}</span>)}
        </nav>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <UserSwitcherPanel /><ProjectWorkspacePanel />
        </div>
      </header>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: 12, padding: 12 }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <RbacPanel />
          <GovernanceSummaryPanel />
          <GovernanceActionsPanel reviewNote={reviewNote} setReviewNote={setReviewNote} approveNote={approveNote} setApproveNote={setApproveNote} rejectReason={rejectReason} setRejectReason={setRejectReason} />
          <GovernanceCommentsPanel />
          <GovernancePanel />
          <ProjectSnapshotsPanel />
          <ProjectHistoryPanel />
          <FloorVisibilityPanel />
          <SnapshotComparisonPanel />
          <SnapshotDiffTablePanel />
          <ComparisonDashboardPanel />
          <QuantityComparisonPanel />
          <BoqLineComparisonPanel />
        </aside>
        <main style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <KpiCards />
            <CostBreakdownChart />
          </div>
          <div style={{ border: '1px solid #24324b', borderRadius: 8, padding: 12, background: '#111c31' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>2D CAD Plan</div>
            <CadPlanView
              cad={store.cad}
              selectedElementId={store.selectedElementId}
              selectedElementIds={store.selectedElementIds}
              activeFloorId={store.activeFloorId}
              onSelectElement={(id, shift) => { if (shift) { const sids = store.selectedElementIds.includes(id || '') ? store.selectedElementIds.filter(x => x !== id) : [...store.selectedElementIds, id || '']; store.setSelectedElements(sids); } else { store.setSelectedElement(id); } }}
              onMoveWall={store.moveCadWall}
              onMoveBlock={store.moveCadBlock}
              onMoveEndpoint={store.moveCadWallEndpoint}
              onAddWall={store.addCadWall}
              onDeleteElement={store.deleteCadElement}
              onMoveOpening={store.moveCadOpening}
              onTrimExtend={store.trimExtendCadWalls}
              onGenerateColumns={store.generateStructuralColumns}
              onGenerateBeams={store.generateStructuralBeams}
              onGenerateFootings={store.generateFoundationFootings}
              materialSystem={store.materialSystem}
              onSetMaterialSystem={store.setMaterialSystem}
            />
            <CadPropertiesPanel
              cad={store.cad}
              selectedElementId={store.selectedElementId}
              selectedElementIds={store.selectedElementIds}
              onUpdateWall={store.updateCadWallProps}
              onUpdateWalls={store.updateCadWallsProps}
              onUpdateOpening={store.updateCadOpening}
              onUpdateOpeningFamily={store.updateCadOpeningFamily}
              onAddOpening={store.addCadOpening}
              onDeleteOpening={store.deleteCadOpening}
              onDeleteElement={store.deleteCadElement}
              onGenerateColumns={store.generateStructuralColumns}
              onGenerateBeams={store.generateStructuralBeams}
              onGenerateFootings={store.generateFoundationFootings}
              onUpdateMaterial={store.updateCadElementMaterial}
              activeFloorId={store.activeFloorId}
            />

            <IfcInteropPanel />
            <StandardsManifestPanel />
          </div>
          <div style={{ border: '1px solid #24324b', borderRadius: 8, padding: 12, background: '#111c31' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>3D BIM</div>
              <button onClick={store.toggleShow3d} style={{ padding: '4px 10px', fontSize: 11, background: store.show3d ? '#1a365d' : '#0b1220', border: '1px solid #24324b', color: '#f8fafc', borderRadius: 6 }}>{store.show3d ? 'Hide 3D' : 'Load 3D Viewer'}</button>
            </div>
            {store.show3d && <LazyBimViewer bim={store.bim} selectedId={store.selectedElementId} onSelect={store.setSelectedElement} />}
          </div>
          <BimInspector element={selectedBimElement} />
          <BimPropertyTaxonomyPanel />
          <RoomProgramPanel />
          <RoomSchedulePanel />
          <ZoneTracePanel />
          <ZoneBoqGroupPanel />
          <ClashCheckerPanel />
          <SolarOrientationPanel />
          <MepTakeoffPanel />
          <SlabReinforcementPanel boq={store.boq} />
        </main>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <ExecutivePortfolioDashboardPanel />
          <PortfolioDashboardPanel />
          <PortfolioChartsPanel />
          <MultiProjectComparePanel />
          <CrossProjectDashboardPanel />
          <CrossProjectAnalyticsPanel />
          <BoqCategoryComparePanel />
          <BoqDeltaChartPanel />
          <BoqShareComparePanel />
          <BoqPanel />
          <ExportPanel />
          <TransactionHistoryPanel />
        </aside>
      </div>
    </div>
  );
}