import { DEPLOYMENT_PROFILES } from './productPackagingModel';
import type { DeploymentMode } from './productPackagingModel';

export interface DeploymentManifestEntry {
  id: DeploymentMode;
  label: string;
  description: string;
  infrastructure: string;
  audience: string[];
  supportedModes: string[];
  limitations: string[];
}

export interface DeploymentManifest {
  productName: string;
  productVersion: string;
  generatedAt: string;
  totalProfiles: number;
  entries: DeploymentManifestEntry[];
}

export function generateDeploymentManifest(version: string): DeploymentManifest {
  const entries: DeploymentManifestEntry[] = DEPLOYMENT_PROFILES.map(p => ({
    id: p.id,
    label: p.label,
    description: p.description,
    infrastructure: p.infrastructure,
    audience: p.audience,
    supportedModes: p.supportedModes,
    limitations: p.limitations,
  }));

  return {
    productName: 'Budget Engineer',
    productVersion: version,
    generatedAt: new Date().toISOString(),
    totalProfiles: entries.length,
    entries,
  };
}

export function formatDeploymentManifestHtml(manifest: DeploymentManifest): string {
  let html = `<div style="font-family:sans-serif;font-size:10px;margin-top:12px">
<h4 style="font-size:11px;margin:0 0 6px">Deployment Profiles — ${manifest.productName} ${manifest.productVersion}</h4>
<p style="font-size:9px;color:#666;margin:0 0 8px">${manifest.totalProfiles} deployment modes supported.</p>`;

  for (const e of manifest.entries) {
    html += `<div style="margin-bottom:10px;border:1px solid #eee;border-radius:4px;padding:8px">
<div style="font-weight:bold;font-size:10px;margin-bottom:4px">${e.label}</div>
<p style="font-size:9px;color:#555;margin:0 0 4px">${e.description}</p>
<div style="font-size:8px;color:#888;margin:2px 0"><strong>Infrastructure:</strong> ${e.infrastructure}</div>
<div style="font-size:8px;color:#888;margin:2px 0"><strong>Audience:</strong> ${e.audience.join(', ')}</div>
<div style="font-size:8px;color:#888;margin:2px 0"><strong>Modes:</strong> ${e.supportedModes.join(', ')}</div>`;
    if (e.limitations.length > 0) {
      html += `<div style="margin-top:4px"><strong style="font-size:8px;color:#c62828">Limitations</strong><ul style="margin:2px 0;padding-left:16px">`;
      for (const l of e.limitations) {
        html += `<li style="font-size:8px;color:#c62828">${l}</li>`;
      }
      html += `</ul></div>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

export function formatDeploymentManifestJson(manifest: DeploymentManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function formatDeploymentManifestStandaloneHtml(manifest: DeploymentManifest): string {
  return formatDeploymentManifestHtml(manifest);
}
