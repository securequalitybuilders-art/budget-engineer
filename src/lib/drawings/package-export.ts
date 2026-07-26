import type { SheetSlot } from './package-ordering';
import type { ComposedSheet } from './sheet-set-composer';
import type { PackageDiscipline, PackageIssueType, PackageSubmissionCategory } from './package-sheet-meta';

export type ExportFormat = 'svg-bundle' | 'pdf-ready' | 'zip';

export interface PackageExportManifestEntry {
  sheetNumber: string;
  title: string;
  templateId: string;
  revision: string;
  discipline: string;
  group: string;
}

export interface PackageExportManifest {
  packageId: string;
  packageTitle: string;
  projectName: string;
  projectNumber: string;
  client?: string;
  architect?: string;
  issueType: PackageIssueType;
  submissionCategory: PackageSubmissionCategory;
  issueStage: string;
  issueNumber: string;
  issueDate: string;
  revision: string;
  discipline: PackageDiscipline;
  sheetCount: number;
  scheduleCount: number;
  sheets: PackageExportManifestEntry[];
  createdAt: string;
  exportFormat: ExportFormat;
  exportFilename: string;
  warnings: string[];
}

export interface PackageExportOptions {
  format: ExportFormat;
  packageId: string;
  packageTitle: string;
  projectName: string;
  projectNumber: string;
  client?: string;
  architect?: string;
  issueType: PackageIssueType;
  submissionCategory: PackageSubmissionCategory;
  issueStage: string;
  issueNumber: string;
  issueDate: string;
  revision: string;
  discipline: PackageDiscipline;
  sheets: PackageSheetEntry[];
  scheduleCount?: number;
  includeNavigation?: boolean;
  includeManifest?: boolean;
  warnings?: string[];
}

export interface PackageSheetEntry {
  slot: SheetSlot;
  composed: ComposedSheet;
  revision?: string;
  discipline?: string;
  group?: string;
}

export interface PackageExportResult {
  format: ExportFormat;
  data: string;
  manifest: PackageExportManifest;
  sheetCount: number;
}

function buildFilename(opts: PackageExportOptions, format: string): string {
  const safeId = opts.packageId.replace(/[^a-zA-Z0-9-]/g, '_');
  const safeTitle = opts.packageTitle.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 40);
  return `${safeId}_${safeTitle}_${opts.revision}.${format}`;
}

function buildManifest(opts: PackageExportOptions): PackageExportManifest {
  return {
    packageId: opts.packageId,
    packageTitle: opts.packageTitle,
    projectName: opts.projectName,
    projectNumber: opts.projectNumber,
    client: opts.client,
    architect: opts.architect,
    issueType: opts.issueType,
    submissionCategory: opts.submissionCategory,
    issueStage: opts.issueStage,
    issueNumber: opts.issueNumber,
    issueDate: opts.issueDate,
    revision: opts.revision,
    discipline: opts.discipline,
    sheetCount: opts.sheets.length,
    scheduleCount: opts.scheduleCount ?? 0,
    sheets: opts.sheets.map(s => ({
      sheetNumber: s.slot.sheetNumber,
      title: s.slot.title,
      templateId: s.slot.templateId,
      revision: s.revision ?? opts.revision,
      discipline: s.discipline ?? opts.discipline,
      group: s.group ?? 'plan',
    })),
    createdAt: new Date().toISOString(),
    exportFormat: opts.format,
    exportFilename: buildFilename(opts, opts.format),
    warnings: opts.warnings ?? [],
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderHtmlPage(
  opts: PackageExportOptions,
  manifest: PackageExportManifest,
  forPdf: boolean,
): string {
  const parts: string[] = [];

  parts.push('<!DOCTYPE html>');
  parts.push(`<html lang="en">`);
  parts.push(`<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">`);
  parts.push(`<title>${esc(manifest.projectName)} — ${esc(manifest.packageTitle)}</title>`);
  parts.push(`<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; font-family: Arial, Helvetica, sans-serif; }
    .nav-bar { background: #16213e; color: #e2e8f0; padding: 10px 20px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid #24324b; flex-wrap: wrap; }
    .nav-bar h2 { font-size: 14px; font-weight: 700; }
    .nav-bar .meta { font-size: 11px; color: #94a3b8; }
    .nav-bar button { background: #24324b; color: #e2e8f0; border: 1px solid #475569; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; }
    .nav-bar button:hover { background: #334155; }
    .nav-bar .page-indicator { font-size: 11px; color: #94a3b8; }
    .nav-bar select { background: #24324b; color: #e2e8f0; border: 1px solid #475569; padding: 3px 8px; border-radius: 4px; font-size: 11px; }
    .sheet-container { width: 100%; overflow-x: auto; }
    .sheet-container svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
    .manifest-section { background: #0f172a; color: #94a3b8; padding: 20px; max-width: 900px; margin: 20px auto; border-radius: 8px; font-size: 12px; }
    .manifest-section table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .manifest-section th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #24324b; color: #e2e8f0; font-weight: 600; }
    .manifest-section td { padding: 6px 8px; border-bottom: 1px solid #1e293b; }
    .manifest-section .warnings { background: #451a1a; border: 1px solid #7f1d1d; border-radius: 6px; padding: 10px; margin-top: 12px; }
    .manifest-section .warnings h4 { color: #fca5a5; font-size: 11px; margin-bottom: 4px; }
    .manifest-section .warnings li { color: #fca5a5; font-size: 10px; margin-left: 16px; }
    @media print {
      .nav-bar { display: none; }
      .sheet-container { page-break-after: always; }
      .sheet-container:last-child { page-break-after: auto; }
      body { background: white; }
    }
  </style></head><body>`);

  if (!forPdf) {
    parts.push(`<div class="nav-bar">`);
    parts.push(`<h2>${esc(manifest.projectName)}</h2>`);
    parts.push(`<span class="meta">${esc(manifest.packageTitle)} · ${manifest.sheetCount} sheets · ${manifest.scheduleCount} schedules</span>`);
    parts.push(`<span class="meta">Issue ${manifest.issueNumber} Rev ${manifest.revision} · ${manifest.issueDate}</span>`);
    parts.push(`<span class="meta">${esc(manifest.discipline)}</span>`);
    parts.push(`<span class="meta">${esc(manifest.issueType.replace(/-/g, ' '))}</span>`);
    parts.push(`<button onclick="window.print()">Print / PDF</button>`);
    parts.push(`<span class="page-indicator">Sheet: <span id="pageNum">1</span> / ${manifest.sheetCount}</span>`);
    parts.push(`<select id="sheetNav" onchange="goToSheet(this.value)">
      ${opts.sheets.map((s, i) => `<option value="${i}">${s.slot.sheetNumber} — ${esc(s.slot.title)}</option>`).join('')}
    </select>`);
    parts.push(`<script>
      function goToSheet(idx) {
        const sheets = document.querySelectorAll('.sheet-container');
        sheets.forEach((el, i) => { el.style.display = i === parseInt(idx) ? 'block' : 'none'; });
        document.getElementById('pageNum').textContent = parseInt(idx) + 1;
      }
      document.addEventListener('DOMContentLoaded', () => goToSheet(0));
    </script></div>`);
  }

  for (let i = 0; i < opts.sheets.length; i++) {
    const entry = opts.sheets[i];
    parts.push(`<div class="sheet-container"${!forPdf ? '' : ''}>`);
    parts.push(entry.composed.sheetSvg);
    if (!forPdf && opts.includeManifest) {
      parts.push(`<div class="manifest-section"><small>${entry.slot.sheetNumber} — ${esc(entry.slot.title)} · Rev ${entry.revision ?? manifest.revision}</small></div>`);
    }
    parts.push('</div>');
  }

  if (opts.includeManifest) {
    parts.push(`<div class="manifest-section">`);
    parts.push(`<h3>Package Manifest</h3>`);
    parts.push(`<p style="font-size:10px;color:#64748b;margin-top:4px">
      ${esc(manifest.packageTitle)} · ${esc(manifest.projectName)} (${manifest.projectNumber})
    </p>`);

    if (manifest.warnings.length > 0) {
      parts.push(`<div class="warnings"><h4>Package Warnings</h4><ul>${
        manifest.warnings.map(w => `<li>${esc(w)}</li>`).join('')
      }</ul></div>`);
    }

    parts.push(`<table><thead><tr><th>Sheet</th><th>Title</th><th>Rev</th><th>Disc</th><th>Group</th></tr></thead><tbody>`);
    for (const s of manifest.sheets) {
      parts.push(`<tr><td>${esc(s.sheetNumber)}</td><td>${esc(s.title)}</td><td>${esc(s.revision)}</td><td>${esc(s.discipline)}</td><td>${esc(s.group)}</td></tr>`);
    }
    parts.push(`</tbody></table>`);
    parts.push(`<p style="margin-top:12px;color:#64748b;font-size:10px">
      Package: ${esc(manifest.packageTitle)} |
      Issue: ${esc(manifest.issueType.replace(/-/g, ' '))} / ${esc(manifest.submissionCategory.replace(/-/g, ' '))} |
      Created: ${manifest.createdAt} |
      Format: ${manifest.exportFormat} |
      Filename: ${esc(manifest.exportFilename)}
    </p>`);
    parts.push('</div>');
  }

  parts.push('</body></html>');
  return parts.join('');
}

export function buildSvgBundleExport(opts: PackageExportOptions): PackageExportResult {
  const manifest = buildManifest(opts);
  const html = renderHtmlPage(opts, manifest, false);
  return { format: 'svg-bundle', data: html, manifest, sheetCount: opts.sheets.length };
}

export function buildPdfPackageExport(opts: PackageExportOptions): PackageExportResult {
  const manifest = buildManifest(opts);
  const html = renderHtmlPage(
    { ...opts, includeNavigation: false },
    manifest,
    true,
  );
  return { format: 'pdf-ready', data: html, manifest, sheetCount: opts.sheets.length };
}

export function buildZipPackageExport(opts: PackageExportOptions): PackageExportResult {
  const manifest = buildManifest(opts);
  const svgFiles = opts.sheets.map((entry) => ({
    filename: `${entry.slot.sheetNumber.replace(/[^a-zA-Z0-9-]/g, '_')}_${entry.slot.title.replace(/[^a-zA-Z0-9-]/g, '_')}.svg`,
    content: entry.composed.sheetSvg,
  }));
  const zipPayload = JSON.stringify({ manifest, files: svgFiles });
  return {
    format: 'zip',
    data: zipPayload,
    manifest,
    sheetCount: opts.sheets.length,
  };
}

export function exportPackage(
  opts: PackageExportOptions,
): PackageExportResult {
  switch (opts.format) {
    case 'svg-bundle':
      return buildSvgBundleExport(opts);
    case 'pdf-ready':
      return buildPdfPackageExport(opts);
    case 'zip':
      return buildZipPackageExport(opts);
    default:
      return buildSvgBundleExport(opts);
  }
}
