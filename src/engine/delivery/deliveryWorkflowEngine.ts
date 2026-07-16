import type {
  SheetInfo, RevisionEntry, ReleasePackage, PackageContent,
  DrawingRegisterEntry, DeliveryProject, IssueState, PackageType
} from '@/domain/delivery';

export function createSheet(
  sheetNumber: string,
  sheetTitle: string,
  discipline: string,
  createdBy: string
): SheetInfo {
  const rev: RevisionEntry = {
    id: `rev-${Date.now()}`,
    revisionNumber: 'P01',
    date: new Date().toISOString().slice(0, 10),
    description: 'Preliminary issue',
    author: createdBy,
    checker: '',
    approver: '',
    status: 'preliminary',
  };

  return {
    id: `sheet-${Date.now()}`,
    sheetNumber,
    sheetTitle,
    discipline,
    scale: '1:100',
    size: 'A1',
    status: 'preliminary',
    revisions: [rev],
    currentRevision: 'P01',
    createdBy,
    checkedBy: '',
    approvedBy: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function reviseSheet(
  sheet: SheetInfo,
  description: string,
  author: string
): SheetInfo {
  const currentNum = sheet.currentRevision;
  const match = currentNum.match(/^P(\d+)$/);
  const nextNum = match ? `P${String(parseInt(match[1]) + 1).padStart(2, '0')}` : 'P01';

  const rev: RevisionEntry = {
    id: `rev-${Date.now()}`,
    revisionNumber: nextNum,
    date: new Date().toISOString().slice(0, 10),
    description,
    author,
    checker: sheet.checkedBy,
    approver: sheet.approvedBy,
    status: 'revised',
  };

  return {
    ...sheet,
    status: 'revised',
    currentRevision: nextNum,
    revisions: [...sheet.revisions, rev],
    updatedAt: new Date().toISOString(),
  };
}

export function signSheet(
  sheet: SheetInfo,
  role: 'checker' | 'approver',
  name: string
): SheetInfo {
  if (role === 'checker') {
    return { ...sheet, checkedBy: name, updatedAt: new Date().toISOString() };
  }
  return { ...sheet, approvedBy: name, updatedAt: new Date().toISOString() };
}

export function createPackage(
  projectId: string,
  name: string,
  packageType: PackageType,
  issuedBy: string,
  description = ''
): ReleasePackage {
  return {
    id: `pkg-${Date.now()}`,
    projectId,
    name,
    packageType,
    description,
    contents: [],
    revision: 'P01',
    issueDate: new Date().toISOString().slice(0, 10),
    issuedBy,
    checkedBy: '',
    approvedBy: '',
    status: 'draft',
    transmittalNote: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function addToPackage(
  pkg: ReleasePackage,
  content: PackageContent
): ReleasePackage {
  return {
    ...pkg,
    contents: [...pkg.contents, content],
    updatedAt: new Date().toISOString(),
  };
}

export function issuePackage(pkg: ReleasePackage): ReleasePackage {
  return {
    ...pkg,
    status: 'issued',
    updatedAt: new Date().toISOString(),
  };
}

export function generateTransmittalNote(pkg: ReleasePackage): string {
  const lines = [
    `TRANSMITTAL`,
    `Package: ${pkg.name}`,
    `Type: ${pkg.packageType}`,
    `Date: ${pkg.issueDate}`,
    `Issued by: ${pkg.issuedBy}`,
    `Revision: ${pkg.revision}`,
    `Status: ${pkg.status}`,
    ``,
    `Contents:`,
    ...pkg.contents.map(c => `  [${c.type}] ${c.name} (${c.ref})`),
    ``,
    `Checked by: ${pkg.checkedBy || 'TBC'}`,
    `Approved by: ${pkg.approvedBy || 'TBC'}`,
    ``,
    `Note: ${pkg.transmittalNote || 'No additional notes.'}`,
  ];
  return lines.join('\n');
}

export function generateDrawingRegister(sheets: SheetInfo[]): DrawingRegisterEntry[] {
  return sheets.map(s => ({
    sheetId: s.id,
    sheetNumber: s.sheetNumber,
    sheetTitle: s.sheetTitle,
    discipline: s.discipline,
    status: s.status,
    revision: s.currentRevision,
    date: s.updatedAt.slice(0, 10),
    fileRef: `${s.sheetNumber}_${s.currentRevision}`,
  }));
}

export function createDeliveryProject(
  projectId: string,
  projectNumber: string,
  clientName: string,
  projectAddress: string
): DeliveryProject {
  return {
    id: `delivery-${projectId}`,
    projectId,
    sheets: [],
    packages: [],
    drawingRegister: [],
    currentIssueState: 'draft',
    projectNumber,
    clientName,
    projectAddress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function advanceIssueState(current: IssueState): IssueState {
  const sequence: IssueState[] = ['draft', 'in-progress', 'for-review', 'for-construction', 'as-built'];
  const idx = sequence.indexOf(current);
  if (idx >= 0 && idx < sequence.length - 1) return sequence[idx + 1];
  return current;
}

export function generatePackageManifestHtml(pkg: ReleasePackage): string {
  let html = `<div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:20px">
<h1 style="font-size:14px;border-bottom:2px solid #111;padding-bottom:8px">ISSUE PACKAGE MANIFEST</h1>
<table style="width:100%;border-collapse:collapse;font-size:10px;margin:8px 0">
<tr><td style="padding:3px;font-weight:600">Package</td><td style="padding:3px">${pkg.name}</td></tr>
<tr><td style="padding:3px;font-weight:600">Type</td><td style="padding:3px">${pkg.packageType}</td></tr>
<tr><td style="padding:3px;font-weight:600">Revision</td><td style="padding:3px">${pkg.revision}</td></tr>
<tr><td style="padding:3px;font-weight:600">Date</td><td style="padding:3px">${pkg.issueDate}</td></tr>
<tr><td style="padding:3px;font-weight:600">Issued by</td><td style="padding:3px">${pkg.issuedBy}</td></tr>
<tr><td style="padding:3px;font-weight:600">Checked by</td><td style="padding:3px">${pkg.checkedBy || '—'}</td></tr>
<tr><td style="padding:3px;font-weight:600">Approved by</td><td style="padding:3px">${pkg.approvedBy || '—'}</td></tr>
</table>

<h2 style="font-size:11px;margin:12px 0 4px">Contents</h2>
<table style="width:100%;border-collapse:collapse;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600">
<th style="padding:4px;border:1px solid #ddd;text-align:left">Type</th>
<th style="padding:4px;border:1px solid #ddd;text-align:left">Name</th>
<th style="padding:4px;border:1px solid #ddd;text-align:left">Reference</th>
</tr></thead><tbody>`;
  for (const c of pkg.contents) {
    html += `<tr><td style="padding:3px;border:1px solid #ddd">${c.type}</td><td style="padding:3px;border:1px solid #ddd">${c.name}</td><td style="padding:3px;border:1px solid #ddd">${c.ref}</td></tr>`;
  }
  html += `</tbody></table>`;
  html += `<p style="font-size:10px;margin-top:12px">${pkg.transmittalNote}</p>`;
  html += `<div style="margin-top:20px;font-size:9px;color:#999;border-top:1px solid #ddd;padding-top:8px">Generated by Budget Engineer · Professional Delivery Workflow</div>`;
  html += `</div>`;
  return html;
}
