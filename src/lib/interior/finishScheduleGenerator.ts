import type { InteriorProject, FinishScheduleEntry } from '@/domain/interior';

export function generateFinishSchedule(project: InteriorProject): FinishScheduleEntry[] {
  return project.rooms.map(room => {
    const wallAssignments = project.materialAssignments.filter(
      a => a.roomId === room.roomId && a.surface === 'wall'
    );
    const floorAssignments = project.materialAssignments.filter(
      a => a.roomId === room.roomId && a.surface === 'floor'
    );
    const ceilingAssignments = project.materialAssignments.filter(
      a => a.roomId === room.roomId && a.surface === 'ceiling'
    );

    const wallArea = wallAssignments.reduce((s, a) => s + a.coverageM2, 0);
    const floorArea = floorAssignments.reduce((s, a) => s + a.coverageM2, 0);
    const ceilingArea = ceilingAssignments.reduce((s, a) => s + a.coverageM2, 0);

    return {
      roomId: room.roomId,
      roomName: room.name,
      roomType: room.roomType,
      wallFinish: room.finishSpec.wallFinish,
      wallMaterialId: room.finishSpec.wallMaterialId,
      floorFinish: room.finishSpec.floorFinish,
      floorMaterialId: room.finishSpec.floorMaterialId,
      ceilingFinish: room.finishSpec.ceilingFinish,
      ceilingMaterialId: room.finishSpec.ceilingMaterialId,
      wallAreaM2: Math.round(wallArea * 100) / 100 || Math.round(room.dimensions.width * 2.4 * 2 + room.dimensions.height * 2.4 * 2),
      floorAreaM2: Math.round(floorArea * 100) / 100 || Math.round(room.dimensions.width * room.dimensions.height),
      ceilingAreaM2: Math.round(ceilingArea * 100) / 100 || Math.round(room.dimensions.width * room.dimensions.height),
    };
  });
}

export function finishScheduleToCsv(entries: FinishScheduleEntry[]): string {
  const header = 'Room,Type,Wall Finish,Wall Mat,Floor Finish,Floor Mat,Ceiling Finish,Ceiling Mat,Wall m2,Floor m2,Ceiling m2';
  const rows = entries.map(e =>
    `${e.roomName},${e.roomType},${e.wallFinish},${e.wallMaterialId ?? ''},${e.floorFinish},${e.floorMaterialId ?? ''},${e.ceilingFinish},${e.ceilingMaterialId ?? ''},${e.wallAreaM2},${e.floorAreaM2},${e.ceilingAreaM2}`
  );
  return [header, ...rows].join('\n');
}

export function generateFinishScheduleHtml(entries: FinishScheduleEntry[]): string {
  let html = `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600">
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Room</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Type</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Wall</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Floor</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:left">Ceiling</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:right">Wall m²</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:right">Floor m²</th>
<th style="padding:4px 6px;border:1px solid #ddd;text-align:right">Ceil m²</th>
</tr></thead><tbody>`;
  for (const e of entries) {
    html += `<tr>
<td style="padding:3px 6px;border:1px solid #ddd">${e.roomName}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${e.roomType}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${e.wallFinish}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${e.floorFinish}</td>
<td style="padding:3px 6px;border:1px solid #ddd">${e.ceilingFinish}</td>
<td style="padding:3px 6px;border:1px solid #ddd;text-align:right">${e.wallAreaM2}</td>
<td style="padding:3px 6px;border:1px solid #ddd;text-align:right">${e.floorAreaM2}</td>
<td style="padding:3px 6px;border:1px solid #ddd;text-align:right">${e.ceilingAreaM2}</td>
</tr>`;
  }
  html += '</tbody></table>';
  return html;
}
