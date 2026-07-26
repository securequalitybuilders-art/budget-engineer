import type { InteriorProject, FFEEntry } from '@/domain/interior';

export function generateFFESchedule(project: InteriorProject): FFEEntry[] {
  if (project.ffeEntries.length > 0) return project.ffeEntries;

  return project.fixtures.map(fixture => {
    return {
      id: fixture.instanceId,
      roomId: fixture.roomId,
      itemName: `Fixture ${fixture.fixtureTypeId}`,
      supplier: '',
      modelRef: '',
      quantity: 1,
      unit: 'each',
      rateCents: 0,
      category: 'fixture' as const,
    };
  });
}

export function ffeScheduleToCsv(entries: FFEEntry[]): string {
  const header = 'Item,Room,Category,Supplier,Model,Qty,Unit,Rate';
  const rows = entries.map(e =>
    `${e.itemName},${e.roomId},${e.category},${e.supplier},${e.modelRef},${e.quantity},${e.unit},${e.rateCents}`
  );
  return [header, ...rows].join('\n');
}

export function generateFFEScheduleHtml(entries: FFEEntry[]): string {
  let html = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600">
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Item</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Room</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Category</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Supplier</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Model</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:right">Qty</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Unit</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:right">Rate</th>
</tr></thead><tbody>`;
  for (const e of entries) {
    html += `<tr>
<td style="padding:3px 6px;border:1px solid #ddd">${e.itemName}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${e.roomId}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${e.category}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${e.supplier}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${e.modelRef}</td>
<td style="padding:3px 6px;border:1px solid #ddd;text-align:right">${e.quantity}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${e.unit}</td>
<td style="padding:3px 6px;border:1px solid #ddd;text-align:right">${e.rateCents}</td>
</tr>`;
  }
  html += '</tbody></table>';
  return html;
}
