import type { BimModel } from '../../domain/bim';
import type { BOQ } from '../boq/boq-types';
import type { ZoneCostSummary } from '../zones/zone-cost';
import type { StandardsManifest } from './standards-manifest';
import { buildIfcLikeJson, buildBoqCsv } from './exporters';
import { buildRoomScheduleCsv } from './schedule-export';
import { buildRoomScheduleHtml } from './print-export';

export function buildExportPackageFiles(bim: BimModel, boq: BOQ, zones: ZoneCostSummary[], standards: StandardsManifest) {
  return {
    'model.ifc.json': buildIfcLikeJson(bim),
    'boq.csv': buildBoqCsv(boq),
    'room-schedule.csv': buildRoomScheduleCsv(zones),
    'room-schedule.html': buildRoomScheduleHtml(zones),
    'standards-manifest.json': JSON.stringify(standards, null, 2),
    'README.txt': 'Dzenhare Budget Engineer Export Package\nContains BIM, BOQ, room schedules, and standards mappings.',
  };
}

export function buildExportPackageManifest(bim: BimModel, boq: BOQ, zones: ZoneCostSummary[], standards: StandardsManifest) {
  const files = buildExportPackageFiles(bim, boq, zones, standards);
  return JSON.stringify({
    package: 'Dzenhare-Budget-Engineer-Export-Package',
    generatedAt: new Date().toISOString(),
    manifest: {
      modelId: bim.id,
      boqId: boq.id,
      zoneCount: zones.length,
      fileCount: Object.keys(files).length,
      files: Object.keys(files),
    },
  }, null, 2);
}
