import type { ZoneCostSummary } from '../zones/zone-cost';

export function buildRoomScheduleHtml(items: ZoneCostSummary[]) {
  const rows = items.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.program)}</td>
      <td>${item.area.toFixed(2)}</td>
      <td>${item.estimatedCost.toFixed(2)} USD</td>
      <td>${item.costPerM2.toFixed(2)} USD</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Room Schedule</title>
<style>
  body { font-family: Inter, Arial, sans-serif; background: #0b1220; color: #e2e8f0; padding: 24px; }
  h1 { margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; background: #111c31; }
  th, td { border: 1px solid #24324b; padding: 10px; text-align: left; }
  th { color: #94a3b8; }
</style>
</head>
<body>
  <h1>Dzenhare Budget Engineer — Room Schedule</h1>
  <table>
    <thead>
      <tr><th>Room</th><th>Program</th><th>Area (m²)</th><th>Estimated Cost</th><th>Cost / m²</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
