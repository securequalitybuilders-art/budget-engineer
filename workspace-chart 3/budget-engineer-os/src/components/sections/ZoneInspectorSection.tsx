import type { BimElement } from '../../domain/bim';
import type { BOQLineItem } from '../../domain/boq';
import type { TransactionEvent } from '../../domain/transaction';
import type { ZoneCostSummary } from '../../lib/zoneCost';
import type { ZoneTrace } from '../../lib/zoneTrace';
import type { ZoneBoqGroup } from '../../lib/zoneGrouping';
import { RoomProgramPanel } from '../panels/RoomProgramPanel';
import { RoomSchedulePanel } from '../panels/RoomSchedulePanel';
import { ZoneTracePanel } from '../panels/ZoneTracePanel';
import { ZoneBoqGroupPanel } from '../panels/ZoneBoqGroupPanel';
import { BimInspector } from '../bim/BimInspector';
import { BimPropertyTaxonomyPanel } from '../panels/BimPropertyTaxonomyPanel';
import { TransactionHistoryPanel } from '../panels/TransactionHistoryPanel';

export type ZoneInspectorSectionProps = {
  selected?: BimElement;
  linkedItems: BOQLineItem[];
  zoneCosts: ZoneCostSummary[];
  zoneTrace?: ZoneTrace;
  zoneGroup?: ZoneBoqGroup;
  transactions: TransactionEvent[];
  onRenameZone: (name: string) => void;
  onAssignProgram: (program: string) => void;
  onExportScheduleCsv: () => void;
  onExportScheduleHtml: () => void;
};

export default function ZoneInspectorSection({
  selected,
  linkedItems,
  zoneCosts,
  zoneTrace,
  zoneGroup,
  transactions,
  onRenameZone,
  onAssignProgram,
  onExportScheduleCsv,
  onExportScheduleHtml,
}: ZoneInspectorSectionProps) {
  return (
    <>
      <RoomProgramPanel element={selected} onRename={onRenameZone} onProgram={onAssignProgram} />
      <div style={{ background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Room Schedule</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={secondaryButton} onClick={onExportScheduleCsv}>Export CSV</button>
            <button style={secondaryButton} onClick={onExportScheduleHtml}>Print HTML</button>
          </div>
        </div>
        <RoomSchedulePanel items={zoneCosts} />
      </div>
      <ZoneTracePanel trace={zoneTrace} />
      <ZoneBoqGroupPanel group={zoneGroup} />
      <BimInspector element={selected} linkedItems={linkedItems} />
      <BimPropertyTaxonomyPanel element={selected} />
      <TransactionHistoryPanel items={transactions} />
    </>
  );
}

const secondaryButton: React.CSSProperties = { background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '8px 10px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' };
