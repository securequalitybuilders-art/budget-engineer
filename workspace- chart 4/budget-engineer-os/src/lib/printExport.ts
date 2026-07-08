import { BOQ } from '../domain/boq';

export function printScheduleHtml(boq: BOQ): string {
  let rows = '';
  for (const i of boq.items) {
    rows += `<tr><td style="padding:8px;border:1px solid #ddd;">${i.category}</td><td style="padding:8px;border:1px solid #ddd;">${i.description}</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${i.quantity}</td><td style="padding:8px;border:1px solid #ddd;">${i.unit}</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">$${i.total.toFixed(2)}</td></tr>`;
  }
  return `<!doctype html><html><head><title>Room Schedule & BOQ Print</title><style>body{font-family:sans-serif;margin:40px;color:#333;}table{border-collapse:collapse;width:100%;}th{background:#f4f4f4;padding:10px;border:1px solid #ddd;text-align:left;}</style></head><body><h1>Budget Engineer Studio — Room Schedule & BOQ</h1><p>Project ID: ${boq.projectId}</p><table><thead><tr><th>Category</th><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><h2>Grand Total: $${boq.summary.grandTotal.toFixed(2)}</h2></body></html>`;
}
