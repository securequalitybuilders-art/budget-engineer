import { buildExportPackageManifest } from './exportPackage';
import type { BimModel } from '../domain/bim';
import type { BOQ } from '../domain/boq';
import type { ZoneCostSummary } from './zoneCost';
import type { StandardsManifest } from './standardsManifest';

export function buildPseudoZipPackage(bim: BimModel, boq: BOQ, zones: ZoneCostSummary[], standards: StandardsManifest) {
  return buildExportPackageManifest(bim, boq, zones, standards);
}
