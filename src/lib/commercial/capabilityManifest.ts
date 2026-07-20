import { CAPABILITY_GROUPS, getCapabilitiesRequiringHumanReview, getCapabilitiesByMaturity } from './productPackagingModel';
import type { CapabilityGroupId, MaturityLevel } from './productPackagingModel';

export interface CapabilityManifestEntry {
  id: CapabilityGroupId;
  label: string;
  maturity: MaturityLevel;
  requiresHumanReview: boolean;
  humanReviewNote: string;
}

export interface CapabilityManifest {
  productName: string;
  productVersion: string;
  generatedAt: string;
  totalCapabilities: number;
  entries: CapabilityManifestEntry[];
  requiresHumanReviewCount: number;
  maturityBreakdown: Record<MaturityLevel, number>;
}

export function generateCapabilityManifest(version: string): CapabilityManifest {
  const entries: CapabilityManifestEntry[] = CAPABILITY_GROUPS.map(g => ({
    id: g.id,
    label: g.label,
    maturity: g.maturity,
    requiresHumanReview: g.requiresHumanReview,
    humanReviewNote: g.humanReviewNote,
  }));

  const requiresHumanReviewCount = getCapabilitiesRequiringHumanReview().length;
  const maturityBreakdown: Record<MaturityLevel, number> = {
    foundation: getCapabilitiesByMaturity('foundation').length,
    emerging: getCapabilitiesByMaturity('emerging').length,
    established: getCapabilitiesByMaturity('established').length,
    mature: getCapabilitiesByMaturity('mature').length,
  };

  return {
    productName: 'Budget Engineer',
    productVersion: version,
    generatedAt: new Date().toISOString(),
    totalCapabilities: entries.length,
    entries,
    requiresHumanReviewCount,
    maturityBreakdown,
  };
}

export function formatCapabilityManifestHtml(manifest: CapabilityManifest): string {
  const totalPct = manifest.totalCapabilities > 0
    ? Math.round((manifest.requiresHumanReviewCount / manifest.totalCapabilities) * 100)
    : 0;

  let html = `<div style="font-family:sans-serif;font-size:10px;margin-top:12px">
<h4 style="font-size:11px;margin:0 0 6px">Capability Manifest — ${manifest.productName} ${manifest.productVersion}</h4>
<p style="font-size:9px;color:#666;margin:0 0 4px">Generated: ${new Date(manifest.generatedAt).toISOString()}</p>
<div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap">
<div style="background:#e8f5e9;border-radius:4px;padding:4px 8px;text-align:center">
<span style="font-size:13px;font-weight:bold;color:#2e7d32">${manifest.maturityBreakdown.mature}</span>
<div style="font-size:8px;color:#666">Mature</div>
</div>
<div style="background:#e3f2fd;border-radius:4px;padding:4px 8px;text-align:center">
<span style="font-size:13px;font-weight:bold;color:#1565c0">${manifest.maturityBreakdown.established}</span>
<div style="font-size:8px;color:#666">Established</div>
</div>
<div style="background:#fff3e0;border-radius:4px;padding:4px 8px;text-align:center">
<span style="font-size:13px;font-weight:bold;color:#e65100">${manifest.maturityBreakdown.emerging}</span>
<div style="font-size:8px;color:#666">Emerging</div>
</div>
<div style="background:#fce4ec;border-radius:4px;padding:4px 8px;text-align:center">
<span style="font-size:13px;font-weight:bold;color:#c62828">${manifest.maturityBreakdown.foundation}</span>
<div style="font-size:8px;color:#666">Foundation</div>
</div>
</div>
<p style="font-size:9px;color:#666">${manifest.requiresHumanReviewCount}/${manifest.totalCapabilities} capabilities (${totalPct}%) require human review.</p>
<table style="width:100%;border-collapse:collapse;font-size:9px;margin-top:8px">
<thead><tr style="background:#f5f5f5;font-weight:600">
<th style="padding:4px;border:1px solid #ddd;text-align:left">Capability</th>
<th style="padding:4px;border:1px solid #ddd;text-align:center">Maturity</th>
<th style="padding:4px;border:1px solid #ddd;text-align:center">Review</th>
</tr></thead><tbody>`;

  for (const e of manifest.entries) {
    const maturityColor = e.maturity === 'mature' ? '#2e7d32' : e.maturity === 'established' ? '#1565c0' : e.maturity === 'emerging' ? '#e65100' : '#c62828';
    html += `<tr>
<td style="padding:3px;border:1px solid #ddd">${e.label}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:center"><span style="color:${maturityColor}">${e.maturity}</span></td>
<td style="padding:3px;border:1px solid #ddd;text-align:center">${e.requiresHumanReview ? '⚠️ Yes' : '—'}</td>
</tr>`;
  }

  html += `</tbody></table></div>`;
  return html;
}

export function formatCapabilityManifestJson(manifest: CapabilityManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function formatCapabilityManifestStandaloneHtml(manifest: CapabilityManifest): string {
  return formatCapabilityManifestHtml(manifest);
}
