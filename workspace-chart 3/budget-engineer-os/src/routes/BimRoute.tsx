import { useEffect, useState } from 'react';
import { LazyBimViewer } from '../components/bim/LazyBimViewer';
import { FloorVisibilityPanel } from '../components/bim/FloorVisibilityPanel';
import { CadPlanView } from '../components/cad/CadPlanView';
import { CadPropertiesPanel } from '../components/cad/CadPropertiesPanel';
import { IfcInteropPanel } from '../components/cad/IfcInteropPanel';
import { buildCadSvg, buildCadDxf } from '../lib/cadExport';
import { BimLegend } from '../components/bim/BimLegend';
import { CostBreakdownChart } from '../components/charts/CostBreakdownChart';
import { KpiCards } from '../components/charts/KpiCards';
import { ExportPanel } from '../components/panels/ExportPanel';
import { ProjectHistoryPanel } from '../components/panels/ProjectHistoryPanel';
import { CrossProjectDashboardPanel } from '../components/panels/CrossProjectDashboardPanel';
import { BoqCategoryComparePanel } from '../components/panels/BoqCategoryComparePanel';
import { LazyAnalyticsBoundary, LazyBoqDeltaChartPanel, LazyCrossProjectAnalyticsPanel } from '../components/panels/LazyAnalytics';
import { StandardsManifestPanel } from '../components/panels/StandardsManifestPanel';
import { GovernancePanel } from '../components/panels/GovernancePanel';
import { GovernanceSummaryPanel } from '../components/panels/GovernanceSummaryPanel';
import { GovernanceActionsPanel } from '../components/panels/GovernanceActionsPanel';
import { BoqShareComparePanel } from '../components/panels/BoqShareComparePanel';
import { GovernanceCommentsPanel } from '../components/panels/GovernanceCommentsPanel';
import { RbacPanel } from '../components/panels/RbacPanel';
import { UserSwitcherPanel } from '../components/panels/UserSwitcherPanel';
import { ProjectWorkspacePanel } from '../components/panels/ProjectWorkspacePanel';
import { MultiProjectComparePanel } from '../components/panels/MultiProjectComparePanel';
import { LazySnapshotPortfolioSection, LazyZoneInspectorSection, LazySectionBoundary } from '../components/sections/LazySections';
import { useAppStore } from '../store/appStore';
import { estimateZoneCosts } from '../lib/zoneCost';
import { traceZoneToBoq } from '../lib/zoneTrace';
import { groupZoneBoq } from '../lib/zoneGrouping';
import { buildRoomScheduleCsv } from '../lib/scheduleExport';
import { buildRoomScheduleHtml } from '../lib/printExport';
import { buildStandardsManifest } from '../lib/standardsManifest';
import { buildExportPackageFiles, buildExportPackageManifest } from '../lib/exportPackage';
import { buildArchiveBlob } from '../lib/archiveExport';
import { buildCrossProjectMetric } from '../lib/crossProjectMetrics';
import { loadProjectBoqCategoryTotals } from '../lib/crossProjectBoq';
import { loadProjectPortfolioWithLive } from '../lib/crossProjectPortfolio';
import type { PortfolioMetric } from '../lib/portfolioMetrics';
import { canApprove, canReject, canReview, unauthorizedReason } from '../lib/rbac';
import { downloadTextFile } from '../lib/exporters';

export default function BimRoute() {
  const { users, currentUser, projects, governance, activeProjectId, compareLeftProjectId, compareRightProjectId, cad, bim, boq, transactions, snapshots, portfolio, comparison, ghostElements, activeFloorId, setActiveFloor, selectedElementId, selectedElementIds, setSelectedElement, setSelectedElements, setCompareLeftProject, setCompareRightProject, regenerateBim, moveCadWall, moveCadWalls, moveCadBlock, moveCadBlocks, moveCadWallEndpoint, moveCadOpening, addCadWall, deleteCadElement, deleteCadElements, duplicateCadSelection, addCadOpening, deleteCadOpening, updateCadWallProps, updateCadOpening, importCadFromIfc, logExport, initialize, initialized, createSnapshot, restoreSnapshot, selectSnapshotA, selectSnapshotB, renameSelectedZone, assignSelectedZoneProgram, createProject, openProject, archiveProject, sendToReview, approveProject, rejectProject, addGovernanceNote, switchUser } = useAppStore();
  const [show3d, setShow3d] = useState(false);
  const [leftBoqCategories, setLeftBoqCategories] = useState<Record<string, number>>({});
  const [rightBoqCategories, setRightBoqCategories] = useState<Record<string, number>>({});
  const [leftPortfolio, setLeftPortfolio] = useState<PortfolioMetric[]>([]);
  const [rightPortfolio, setRightPortfolio] = useState<PortfolioMetric[]>([]);

  useEffect(() => { if (!initialized) void initialize(); }, [initialize, initialized]);
  // Cross-project sides each load independently from IndexedDB (not from the
  // active-project-scoped store arrays). Re-run when the active project's snapshots
  // or live model change so a side pointing at the active project stays fresh.
  useEffect(() => { void loadProjectBoqCategoryTotals(compareLeftProjectId).then(setLeftBoqCategories); }, [compareLeftProjectId, snapshots, bim]);
  useEffect(() => { void loadProjectBoqCategoryTotals(compareRightProjectId).then(setRightBoqCategories); }, [compareRightProjectId, snapshots, bim]);
  useEffect(() => { void loadProjectPortfolioWithLive(compareLeftProjectId).then(setLeftPortfolio); }, [compareLeftProjectId, snapshots, bim]);
  useEffect(() => { void loadProjectPortfolioWithLive(compareRightProjectId).then(setRightPortfolio); }, [compareRightProjectId, snapshots, bim]);

  const selected = bim.elements.find((e) => e.id === selectedElementId);
  const linkedItems = boq.items.filter((item) => selected?.quantityRefs?.includes(item.quantityRef));
  const counts = { walls: bim.elements.filter((e) => e.type === 'wall').length, slabs: bim.elements.filter((e) => e.type === 'slab').length, openings: bim.elements.filter((e) => e.type === 'opening').length, blocks: bim.elements.filter((e) => e.type === 'block').length, zones: bim.elements.filter((e) => e.type === 'roomZone').length };
  const zoneCosts = estimateZoneCosts(bim, boq);
  const selectedZone = selected?.type === 'roomZone' ? selected : undefined;
  const zoneTrace = selectedZone ? traceZoneToBoq(selectedZone, bim, boq) : undefined;
  const zoneGroup = groupZoneBoq(zoneTrace);
  const snapshotA = snapshots.find((s) => s.id === comparison.snapshotAId);
  const snapshotB = snapshots.find((s) => s.id === comparison.snapshotBId);
  const manifest = buildStandardsManifest(bim, boq);
  const exportPackage = buildExportPackageManifest(bim, boq, zoneCosts, manifest);
  const exportFiles = buildExportPackageFiles(bim, boq, zoneCosts, manifest);
  const leftProject = projects.find((p) => p.id === compareLeftProjectId); const rightProject = projects.find((p) => p.id === compareRightProjectId);
  const crossMetric = leftProject && rightProject ? buildCrossProjectMetric(leftProject, rightProject, leftPortfolio, rightPortfolio) : undefined;

  async function downloadArchive() {
    const blob = await buildArchiveBlob({ ...exportFiles, 'export-package-manifest.json': exportPackage });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'budget-engineer-package.zip'; a.click(); URL.revokeObjectURL(url); void logExport('ZIP_PACKAGE');
  }

  return (
    <div style={pageStyle}>
      <header style={topbarStyle}>
        <div>
          <div style={eyebrowStyle}>DZENHARE OS</div>
          <h1 style={titleStyle}>Budget Engineer · Enterprise BIM + Cost Intelligence</h1>
          <p style={subtitleStyle}>User switching, governance note forms, BOQ delta analytics, and additional lazy-loaded analytics panels.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setShow3d((v) => !v)} style={secondaryButton}>{show3d ? 'Hide 3D Viewer' : 'Load 3D Viewer'}</button>
          <button onClick={() => void regenerateBim()} style={primaryButton}>Regenerate BIM</button>
          <button onClick={() => downloadTextFile('export-package.json', exportPackage, 'application/json')} style={secondaryButton}>Download Export Package</button>
          <button onClick={() => void downloadArchive()} style={secondaryButton}>Download ZIP</button>
        </div>
      </header>

      <section style={navStrip}><NavPill active>Design Journey</NavPill><NavPill>Enterprise AI</NavPill><NavPill>3D BIM</NavPill><NavPill>Quantities</NavPill><NavPill>BOQ</NavPill></section>
      <section style={statsRow}><StatCard label="Floors" value={String(bim.floors.length)} accent="#8b5cf6" /><StatCard label="Walls" value={String(counts.walls)} accent="#1a365d" /><StatCard label="Openings" value={String(counts.openings)} accent="#06b6d4" /><StatCard label="Zones" value={String(counts.zones)} accent="#22c55e" /><StatCard label="Objects" value={String(counts.blocks)} accent="#d4a574" /></section>
      <section style={{ display: 'grid', gap: 16, marginBottom: 16 }}><KpiCards boq={boq} bim={bim} /></section>
      <section style={gridStyle}>
        <div style={{ display: 'grid', gap: 16 }}>
          <UserSwitcherPanel users={users} currentUserId={currentUser.id} onSwitch={switchUser} />
          <ProjectWorkspacePanel items={projects} activeProjectId={activeProjectId} onCreate={() => void createProject()} onOpen={(id) => void openProject(id)} onArchive={(id) => void archiveProject(id)} />
          <RbacPanel currentUser={currentUser} />
          <MultiProjectComparePanel projects={projects} leftProjectId={compareLeftProjectId} rightProjectId={compareRightProjectId} onLeft={setCompareLeftProject} onRight={setCompareRightProject} />
          <CrossProjectDashboardPanel metric={crossMetric} />
          <LazyAnalyticsBoundary>
            <LazyCrossProjectAnalyticsPanel left={leftPortfolio} right={rightPortfolio} />
          </LazyAnalyticsBoundary>
          <BoqCategoryComparePanel left={leftBoqCategories} right={rightBoqCategories} />
          <LazyAnalyticsBoundary>
            <LazyBoqDeltaChartPanel left={leftBoqCategories} right={rightBoqCategories} />
          </LazyAnalyticsBoundary>
          <BoqShareComparePanel left={leftBoqCategories} right={rightBoqCategories} />
          <GovernanceSummaryPanel record={governance} />
          <GovernancePanel record={governance} />
          <GovernanceActionsPanel record={governance} canReview={canReview(currentUser)} canApprove={canApprove(currentUser)} canReject={canReject(currentUser)} reviewReason={unauthorizedReason(currentUser, 'review')} approveReason={unauthorizedReason(currentUser, 'approve')} rejectReason={unauthorizedReason(currentUser, 'reject')} onReview={(note) => void sendToReview(note)} onApprove={(note) => void approveProject(note)} onReject={(reason) => void rejectProject(reason)} />
          <GovernanceCommentsPanel record={governance} onAdd={(message) => void addGovernanceNote(message)} />
          <ProjectHistoryPanel items={transactions} />
          <FloorVisibilityPanel floors={bim.floors} activeFloorId={activeFloorId} onChange={setActiveFloor} />
          <BimLegend />
          <CostBreakdownChart boq={boq} />
          <ExportPanel bim={bim} boq={boq} onExport={(kind) => void logExport(kind)} />
          <StandardsManifestPanel manifest={manifest} />
          <LazySectionBoundary>
            <LazySnapshotPortfolioSection
              snapshots={snapshots}
              portfolio={portfolio}
              comparison={comparison}
              snapshotA={snapshotA}
              snapshotB={snapshotB}
              onCreateSnapshot={() => void createSnapshot()}
              onRestoreSnapshot={(id) => void restoreSnapshot(id)}
              onSelectA={(id) => void selectSnapshotA(id)}
              onSelectB={(id) => void selectSnapshotB(id)}
            />
          </LazySectionBoundary>
          <LazySectionBoundary>
            <LazyZoneInspectorSection
              selected={selected}
              linkedItems={linkedItems}
              zoneCosts={zoneCosts}
              zoneTrace={zoneTrace}
              zoneGroup={zoneGroup}
              transactions={transactions}
              onRenameZone={(name) => void renameSelectedZone(name)}
              onAssignProgram={(program) => void assignSelectedZoneProgram(program)}
              onExportScheduleCsv={() => downloadTextFile('room-schedule.csv', buildRoomScheduleCsv(zoneCosts), 'text/csv')}
              onExportScheduleHtml={() => downloadTextFile('room-schedule.html', buildRoomScheduleHtml(zoneCosts), 'text/html')}
            />
          </LazySectionBoundary>
        </div>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
        <CadPlanView
          cad={cad}
          activeFloorId={activeFloorId}
          selectedElementId={selectedElementId}
          selectedElementIds={selectedElementIds}
          onSelect={setSelectedElement}
          onSelectMany={setSelectedElements}
          onDuplicateSelection={(bimIds, dx, dy) => void duplicateCadSelection(bimIds, dx, dy)}
          onExportSvg={(floorId) => downloadTextFile(`cad-plan-${floorId}.svg`, buildCadSvg(cad, floorId), 'image/svg+xml')}
          onExportDxf={(floorId) => downloadTextFile(`cad-plan-${floorId}.dxf`, buildCadDxf(cad, floorId), 'application/dxf')}
          onMoveWall={(wallId, dx, dy) => void moveCadWall(wallId, dx, dy)}
          onMoveWalls={(wallIds, dx, dy) => void moveCadWalls(wallIds, dx, dy)}
          onMoveBlock={(blockId, x, y) => void moveCadBlock(blockId, x, y)}
          onMoveBlocks={(blockIds, dx, dy) => void moveCadBlocks(blockIds, dx, dy)}
          onMoveWallEndpoint={(wallId, end, x, y) => void moveCadWallEndpoint(wallId, end, x, y)}
          onMoveOpening={(openingId, offset) => void moveCadOpening(openingId, offset)}
          onAddWall={(floorId, start, end) => void addCadWall(floorId, start, end)}
          onDeleteElement={(kind, id) => void deleteCadElement(kind, id)}
          onDeleteElements={(items) => void deleteCadElements(items)}
        />
        <CadPropertiesPanel
          cad={cad}
          selectedElementId={selectedElementId}
          onUpdateWallProps={(wallId, patch) => void updateCadWallProps(wallId, patch)}
          onUpdateOpening={(openingId, patch) => void updateCadOpening(openingId, patch)}
          onAddOpening={(wallId, kind, offset) => void addCadOpening(wallId, kind, offset)}
          onDeleteOpening={(openingId) => void deleteCadOpening(openingId)}
        />
        <IfcInteropPanel cad={cad} onImport={(text) => importCadFromIfc(text)} />
        {show3d ? <LazyBimViewer elements={bim.elements} ghostElements={ghostElements} activeFloorId={activeFloorId} selectedElementId={selectedElementId} highlightIds={comparison.highlightIds} removedIds={comparison.removedIds} modifiedIds={comparison.modifiedIds} onSelect={setSelectedElement} /> : <div style={{ minHeight: 620, display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg,#07111f,#0f172a)', border: '1px solid #24324b', borderRadius: 20, color: '#94a3b8' }}>3D viewer deferred. Use “Load 3D Viewer” when needed.</div>}
        </div>
      </section>
    </div>
  );
}
function NavPill({ children, active = false }: { children: React.ReactNode; active?: boolean }) { return <div style={{ background: active ? '#d4a57422' : '#111c31', color: active ? '#f5d7ac' : '#cbd5e1', border: `1px solid ${active ? '#d4a57455' : '#24324b'}`, padding: '10px 14px', borderRadius: 999, fontSize: 13 }}>{children}</div>; }
function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) { return <div style={{ ...cardStyle, borderTop: `3px solid ${accent}` }}><div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div><div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 700 }}>{value}</div></div>; }
const pageStyle: React.CSSProperties = { minHeight: '100vh', background: 'radial-gradient(circle at top, #12213b, #0b1220 55%)', color: '#e2e8f0', padding: 24, fontFamily: 'Inter, Arial, sans-serif' };
const topbarStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 18 };
const eyebrowStyle: React.CSSProperties = { color: '#d4a574', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 34, lineHeight: 1.08, maxWidth: 760 };
const subtitleStyle: React.CSSProperties = { maxWidth: 760, color: '#94a3b8', lineHeight: 1.6, marginTop: 10 };
const primaryButton: React.CSSProperties = { background: 'linear-gradient(135deg,#d4a574,#f1d2a7)', color: '#111827', border: 'none', padding: '12px 16px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '8px 10px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' };
const navStrip: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 };
const statsRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 16, marginBottom: 16 };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '420px 1fr', gap: 16, alignItems: 'start' };
const cardStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16 };
