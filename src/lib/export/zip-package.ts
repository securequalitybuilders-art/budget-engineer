import { buildExportPackageManifest } from './export-package';
import type { BimModel } from '../../domain/bim';
import type { BOQ } from '../boq/boq-types';
import type { ZoneCostSummary } from '../zones/zone-cost';
import type { StandardsManifest } from './standards-manifest';

export function buildPseudoZipPackage(bim: BimModel, boq: BOQ, zones: ZoneCostSummary[], standards: StandardsManifest) {
  return buildExportPackageManifest(bim, boq, zones, standards);
}
