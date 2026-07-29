import { ExtensionManifest, ExtensionInstance } from '../../domain/marketplace';

const BUILT_IN_EXTENSIONS: ExtensionManifest[] = [
  { id: 'bi-takeoff', name: 'Automated Quantity Takeoff', version: '1.0.0', description: 'Extracts material quantities from plan models.', author: 'DzeNhare', entrypoint: 'extensions/quantity-takeoff', permissions: ['read:plans', 'read:boq'], hooks: ['onPlanLoad', 'onBoqGenerate'], config: { unitSystem: 'metric' } },
  { id: 'bi-compliance', name: 'Compliance Checker', version: '1.0.0', description: 'Validates designs against SADC building codes.', author: 'DzeNhare', entrypoint: 'extensions/compliance-checker', permissions: ['read:plans', 'read:compliance'], hooks: ['onPlanSave', 'onComplianceCheck'], config: { jurisdiction: 'Zimbabwe' } },
  { id: 'bi-cost-estimator', name: 'Real-Time Cost Estimator', version: '1.0.0', description: 'Live cost estimation as you design.', author: 'DzeNhare', entrypoint: 'extensions/cost-estimator', permissions: ['read:boq', 'read:rates'], hooks: ['onPlanChange', 'onMaterialSelect'], config: { currency: 'USD' } },
  { id: 'bi-supplier-connect', name: 'Supplier Connect', version: '1.0.0', description: 'Matches catalog items to marketplace suppliers.', author: 'DzeNhare', entrypoint: 'extensions/supplier-connect', permissions: ['read:catalog', 'read:boq'], hooks: ['onBoqFinalize'], config: { maxMatches: 5 } },
  { id: 'bi-escrow-sync', name: 'Escrow Sync', version: '1.0.0', description: 'Sync milestone payments with execution progress.', author: 'DzeNhare', entrypoint: 'extensions/escrow-sync', permissions: ['read:escrow', 'read:execution'], hooks: ['onMilestoneComplete', 'onProgressUpdate'], config: { autoRelease: false } },
];

export function createExtensionRegistry(): Map<string, ExtensionInstance> {
  const registry = new Map<string, ExtensionInstance>();
  for (const manifest of BUILT_IN_EXTENSIONS) {
    registry.set(manifest.id, {
      manifest, enabled: true, loaded: false,
      hooks: new Map(), config: { ...manifest.config },
      metrics: { calls: 0, errors: 0 },
    });
  }
  return registry;
}

export function loadExtension(registry: Map<string, ExtensionInstance>, extensionId: string): boolean {
  const ext = registry.get(extensionId);
  if (!ext) return false;
  if (ext.loaded) return true;
  ext.loaded = true;
  for (const hook of ext.manifest.hooks) {
    ext.hooks.set(hook, (...args: unknown[]) => {
      console.log(`[${ext.manifest.name}] Hook ${hook} called with`, args);
      return args;
    });
  }
  return true;
}

export function disableExtension(registry: Map<string, ExtensionInstance>, extensionId: string): boolean {
  const ext = registry.get(extensionId);
  if (!ext) return false;
  ext.enabled = false;
  ext.loaded = false;
  ext.hooks.clear();
  return true;
}

export function enableExtension(registry: Map<string, ExtensionInstance>, extensionId: string): boolean {
  const ext = registry.get(extensionId);
  if (!ext) return false;
  ext.enabled = true;
  return loadExtension(registry, extensionId);
}

export function triggerHook(registry: Map<string, ExtensionInstance>, hookName: string, ...args: unknown[]): unknown[] {
  const results: unknown[] = [];
  for (const ext of registry.values()) {
    if (!ext.enabled || !ext.loaded) continue;
    const handler = ext.hooks.get(hookName);
    if (handler) results.push(handler(...args));
  }
  return results;
}

export function getEnabledExtensions(registry: Map<string, ExtensionInstance>): ExtensionInstance[] {
  return Array.from(registry.values()).filter(e => e.enabled);
}

export function installExtension(registry: Map<string, ExtensionInstance>, manifest: ExtensionManifest): ExtensionInstance {
  const existing = registry.get(manifest.id);
  if (existing) throw new Error(`Extension ${manifest.id} is already installed`);
  const instance: ExtensionInstance = {
    manifest, enabled: true, loaded: false, hooks: new Map(), config: { ...manifest.config },
    metrics: { calls: 0, errors: 0 },
  };
  registry.set(manifest.id, instance);
  return instance;
}

export function uninstallExtension(registry: Map<string, ExtensionInstance>, extensionId: string): boolean {
  return registry.delete(extensionId);
}
