import React from 'react';
import { RoomSchedulePanel, ProjectHistoryPanel } from '../panels/AllPanels';
import { ClashCheckerPanel } from '../panels/ClashCheckerPanel';
import { MepTakeoffPanel } from '../panels/MepTakeoffPanel';
import { BimInspector } from '../bim/BimInspector';

export default function ZoneInspectorSection() {
  return (
    <div className="space-y-4">
      <ClashCheckerPanel />
      <MepTakeoffPanel />
      <RoomSchedulePanel />
      <ProjectHistoryPanel />
      <BimInspector />
    </div>
  );
}
