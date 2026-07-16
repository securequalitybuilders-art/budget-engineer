import type { JoineryDef, JoineryInstance } from '@/domain/interior';

export function generateDefaultJoineryDefs(): JoineryDef[] {
  return [
    { id: 'wardrobe-2dr', name: 'Wardrobe 2-Door Sliding', joineryType: 'wardrobe', width: 1800, depth: 600, height: 2400, materialId: 'timber-01', finishColor: '#c4a882', notes: 'Sliding doors with internal hanging' },
    { id: 'wardrobe-3dr', name: 'Wardrobe 3-Door Sliding', joineryType: 'wardrobe', width: 2400, depth: 600, height: 2400, materialId: 'timber-01', finishColor: '#c4a882', notes: 'Sliding doors with hanging + shelving' },
    { id: 'vanity-1', name: 'Vanity Unit Single', joineryType: 'vanity', width: 600, depth: 450, height: 850, materialId: 'timber-02', finishColor: '#f5f0e8', notes: 'Single basin vanity' },
    { id: 'vanity-2', name: 'Vanity Unit Double', joineryType: 'vanity', width: 1200, depth: 450, height: 850, materialId: 'timber-02', finishColor: '#f5f0e8', notes: 'Double basin vanity' },
    { id: 'kitchen-base-600', name: 'Base Unit 600', joineryType: 'kitchen-unit', width: 600, depth: 600, height: 900, materialId: 'timber-03', finishColor: '#e8e0d0', notes: 'Standard base unit' },
    { id: 'kitchen-wall-600', name: 'Wall Unit 600', joineryType: 'kitchen-unit', width: 600, depth: 350, height: 600, materialId: 'timber-03', finishColor: '#e8e0d0', notes: 'Standard wall unit' },
    { id: 'shelving-1', name: 'Shelving Unit', joineryType: 'shelving', width: 900, depth: 300, height: 1800, materialId: 'timber-04', finishColor: '#d4c8b0', notes: 'Adjustable shelving' },
  ];
}

export function generateDefaultJoinery(_projectId: string, roomIds: string[]): { defs: JoineryDef[]; instances: JoineryInstance[] } {
  const defs = generateDefaultJoineryDefs();

  const instances: JoineryInstance[] = [];
  let instanceIdx = 0;

  for (const roomId of roomIds) {
    if (instanceIdx < defs.length) {
      instances.push({
        instanceId: `join-inst-${instanceIdx}`,
        joineryDefId: defs[instanceIdx].id,
        roomId,
        wallIndex: 0,
        position: { x: 0, y: 0 },
        width: defs[instanceIdx].width,
        height: defs[instanceIdx].height,
        notes: '',
      });
      instanceIdx++;
    }
  }

  return { defs, instances };
}

export function joineryScheduleHtml(defs: JoineryDef[], instances: JoineryInstance[]): string {
  let html = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600">
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Name</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Type</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:right">W×D×H</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Finish</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:right">Qty</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Notes</th>
</tr></thead><tbody>`;

  const defCounts = new Map<string, number>();
  for (const inst of instances) {
    defCounts.set(inst.joineryDefId, (defCounts.get(inst.joineryDefId) ?? 0) + 1);
  }

  for (const def of defs) {
    const qty = defCounts.get(def.id) ?? 0;
    html += `<tr>
<td style="padding:3px 6px;border:1px solid #ddd">${def.name}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${def.joineryType}</td>
<td style="padding:3px 6px;border:1px solid #ddd;text-align:right">${def.width}×${def.depth}×${def.height}</td>
<td style="padding:3px 6px;border:1px solid #ddd"><span style="display:inline-block;width:10px;height:10px;background:${def.finishColor};border:1px solid #ccc;vertical-align:middle;margin-right:4px"></span>${def.finishColor}</td>
<td style="padding:3px 6px;border:1px solid #ddd;text-align:right">${qty}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${def.notes}</td>
</tr>`;
  }

  html += '</tbody></table>';
  return html;
}
