import React from 'react';
import { useAppStore } from '../store/appStore';
import { CadPlanView } from '../components/cad/CadPlanView';
import { CadPropertiesPanel } from '../components/cad/CadPropertiesPanel';
import { IfcInteropPanel } from '../components/cad/IfcInteropPanel';
import { LazyBimViewer } from '../components/bim/LazyBimViewer';
import { LazySnapshotPortfolioSection, LazyZoneInspectorSection } from '../components/sections/LazySections';
import { LazyAnalyticsBoundary } from '../components/panels/LazyAnalytics';
import { SolarOrientationPanel } from '../components/panels/SolarOrientationPanel';
import { UserSwitcherPanel, RbacPanel, GovernanceSummaryPanel, GovernanceActionsPanel, GovernanceCommentsPanel, ExportPanel } from '../components/panels/AllPanels';

export default function BimRoute() {
  const state = useAppStore();

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-[1600px] mx-auto w-full gap-6">
      {/* Top Bar Navigation */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-[#111c31] border border-[#24324b] px-6 py-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a365d] to-[#06B6D4] flex items-center justify-center font-bold text-lg text-[#f8fafc] shadow-lg">BE</div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-[#f8fafc]">Budget Engineer Studio</h1>
            <p className="text-xs font-mono text-[#d4a574]">DZENHARE OS — Construction Affordable for Everyone</p>
          </div>
        </div>

        {/* Distinct Navigation Pills with Correct Spacing */}
        <nav className="flex flex-wrap items-center gap-2 bg-[#0b1220] p-1.5 rounded-xl border border-[#24324b]">
          <span className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#06B6D4] text-[#0b1220] shadow">Design Journey</span>
          <span className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#e2e8f0] hover:bg-[#111c31] cursor-pointer transition">Enterprise AI</span>
          <span className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#e2e8f0] hover:bg-[#111c31] cursor-pointer transition">3D BIM</span>
          <span className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#e2e8f0] hover:bg-[#111c31] cursor-pointer transition">Quantities</span>
          <span className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#e2e8f0] hover:bg-[#111c31] cursor-pointer transition">BOQ</span>
        </nav>

        {/* Floor Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0b1220] p-1.5 rounded-xl border border-[#24324b]">
          {state.cadDoc.floors.map(f => (
            <button
              key={f.id}
              onClick={() => state.setActiveFloor(f.id)}
              className={`px-3 py-1 text-xs rounded-lg font-bold transition ${state.activeFloorId === f.id ? 'bg-[#8B5CF6] text-[#f8fafc] shadow' : 'text-[#94a3b8] hover:text-[#e2e8f0]'}`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Bento Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Enterprise Governance & Control Stack (4 cols) */}
        <aside className="lg:col-span-4 space-y-4">
          <UserSwitcherPanel />
          <RbacPanel />
          <GovernanceSummaryPanel />
          <GovernanceActionsPanel />
          <LazySnapshotPortfolioSection />
          <LazyAnalyticsBoundary />
          <SolarOrientationPanel />
          <ExportPanel />
          <GovernanceCommentsPanel />
        </aside>

        {/* Right Column: Computational Design Journey & BIM Canvas (8 cols) */}
        <section className="lg:col-span-8 grid grid-cols-1 gap-6">
          {/* Step 2: 2D CAD Drawing Canvas */}
          <CadPlanView />

          {/* Step 2 & Stage 26 Batch Editor: CAD Properties */}
          <CadPropertiesPanel />

          {/* Step 3: IFC STEP Interoperability */}
          <IfcInteropPanel />

          {/* Step 3: Deferred 3D BIM Canvas */}
          <div className="bg-[#111c31] border border-[#24324b] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#24324b] mb-4">
              <div>
                <h2 className="font-extrabold text-base text-[#f8fafc]">3D BIM Swept-Solid Massing Model</h2>
                <p className="text-xs text-[#94a3b8]">Metrics-first opt-in rendering preserving first paint performance</p>
              </div>
              <button
                onClick={() => state.setShow3d(!state.show3d)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg ${state.show3d ? 'bg-[#ef4444] text-[#f8fafc]' : 'bg-[#06B6D4] text-[#0b1220]'}`}
              >
                {state.show3d ? 'Hide 3D Canvas' : 'Load 3D BIM Massing'}
              </button>
            </div>

            {state.show3d ? (
              <LazyBimViewer />
            ) : (
              <div className="bg-[#0b1220] border border-dashed border-[#24324b] rounded-xl h-48 flex flex-col items-center justify-center text-center p-6">
                <span className="w-12 h-12 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center font-bold text-xl mb-3">3D</span>
                <p className="font-bold text-[#e2e8f0] text-sm">3D BIM Massing Canvas Deferred</p>
                <p className="text-xs text-[#94a3b8] max-w-md mt-1">Click the button above to load Three.js / R3F swept-solid massing and boolean openings.</p>
              </div>
            )}
          </div>

          {/* Step 4: Quantities & Room Schedule Intelligence */}
          <LazyZoneInspectorSection />
        </section>
      </main>
    </div>
  );
}
