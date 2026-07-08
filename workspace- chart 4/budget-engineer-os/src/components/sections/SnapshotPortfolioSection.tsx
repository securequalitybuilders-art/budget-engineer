import React from 'react';
import { ProjectSnapshotsPanel, ProjectWorkspacePanel, MultiProjectComparePanel, StandardsManifestPanel } from '../panels/AllPanels';
import { ExecutivePortfolioDashboardPanel } from '../panels/ExecutivePortfolioDashboardPanel';

export default function SnapshotPortfolioSection() {
  return (
    <div className="space-y-4">
      <ProjectWorkspacePanel />
      <ExecutivePortfolioDashboardPanel />
      <MultiProjectComparePanel />
      <StandardsManifestPanel />
      <ProjectSnapshotsPanel />
    </div>
  );
}
