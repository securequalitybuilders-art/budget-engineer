import { BOQ } from '../domain/boq';
import { BimModel } from '../domain/bim';

export function exportBoqCsv(boq: BOQ): string {
  let out = 'Category,Description,Quantity,Unit,Rate,Total\n';
  for (const i of boq.items) {
    out += `"${i.category}","${i.description}",${i.quantity},"${i.unit}",${i.unitRate.toFixed(2)},${i.total.toFixed(2)}\n`;
  }
  out += `\n"Summary","Subtotal",,,,${boq.summary.subtotal.toFixed(2)}\n`;
  out += `"Summary","Contingency (5%)",,,,${boq.summary.contingency.toFixed(2)}\n`;
  out += `"Summary","Professional Fees (7%)",,,,${boq.summary.professionalFees.toFixed(2)}\n`;
  out += `"Summary","VAT (15%)",,,,${boq.summary.vat.toFixed(2)}\n`;
  out += `"Summary","Grand Total",,,,${boq.summary.grandTotal.toFixed(2)}\n`;
  return out;
}

export function exportIfcLikeJson(bim: BimModel): string {
  return JSON.stringify(bim, null, 2);
}
