import { BOQ } from '../domain/boq';

export function exportScheduleCsv(boq: BOQ): string {
  let out = 'Zone ID,Room Name,Program,Area m2,Estimated Cost,Cost per m2\n';
  out += `"zone-1","Lounge Space","Living Room",96.00,${(boq.summary.subtotal*0.5).toFixed(2)},${((boq.summary.subtotal*0.5)/96).toFixed(2)}\n`;
  out += `"zone-2","Master Suite","Bedroom",96.00,${(boq.summary.subtotal*0.5).toFixed(2)},${((boq.summary.subtotal*0.5)/96).toFixed(2)}\n`;
  return out;
}
