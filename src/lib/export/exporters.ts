import type { BimModel } from '../../domain/bim';
import type { BOQ } from '../boq/boq-types';

export function buildIfcLikeJson(bim: BimModel) {
  return JSON.stringify({
    schema: 'Dzenhare-IFC-Like-0.1',
    modelId: bim.id,
    name: bim.name,
    floors: bim.floors,
    elements: bim.elements,
  }, null, 2);
}

export function buildBoqCsv(boq: BOQ) {
  const header = ['id', 'quantityRef', 'category', 'description', 'unit', 'quantity', 'rate', 'total'];
  const rows = boq.items.map((item) => [
    item.id,
    item.quantityRef,
    item.category,
    escapeCsv(item.description),
    item.unit,
    item.quantity,
    item.rate,
    item.total,
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
