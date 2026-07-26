import type { CadDocument } from '@/domain/ws6-types';
import type { TitleBlockMeta } from './title-block';
import type { SectionConfig } from './section-svg';

import { buildFloorPlanSvg } from './disciplines/floor-plan-svg';
import { buildSitePlanSvg } from './disciplines/site-plan-svg';
import { buildFoundationPlanSvg } from './disciplines/foundation-plan-svg';
import { buildRoofPlanSvg } from './disciplines/roof-plan-svg';
import { buildRcpPlanSvg } from './disciplines/rcp-plan-svg';
import { buildElectricalPlanSvg } from './disciplines/electrical-plan-svg';
import { buildPlumbingPlanSvg } from './disciplines/plumbing-plan-svg';
import { buildHvacPlanSvg } from './disciplines/hvac-plan-svg';
import { buildElevationSvg } from './elevation-svg';
import { buildSectionSvg } from './section-svg';
import { buildPresentationSvg } from './disciplines/presentation-svg';
import { buildScheduleSvg } from './disciplines/schedule-svg';

export interface BuildDisciplineOptions {
  cad: CadDocument;
  viewId: string;
  floorId?: string;
  titleMeta?: TitleBlockMeta;
  sectionConfig?: SectionConfig;
  printMode?: boolean;
}

export function buildDisciplinePlanSvg(options: BuildDisciplineOptions): string {
  const { cad, viewId, floorId, titleMeta, sectionConfig, printMode = false } = options;

  switch (viewId) {
    case 'site-plan':
      return buildSitePlanSvg(cad, titleMeta, printMode);
    case 'foundation':
      return buildFoundationPlanSvg(cad, floorId, titleMeta, printMode);
    case 'roof':
      return buildRoofPlanSvg(cad, titleMeta, printMode);
    case 'ceiling':
      return buildRcpPlanSvg(cad, floorId, titleMeta, printMode);
    case 'electrical':
      return buildElectricalPlanSvg(cad, floorId, titleMeta, printMode);
    case 'plumbing':
      return buildPlumbingPlanSvg(cad, floorId, titleMeta, printMode);
    case 'hvac':
      return buildHvacPlanSvg(cad, floorId, titleMeta, printMode);
    case 'front':
    case 'rear':
    case 'left':
    case 'right':
      return buildElevationSvg(cad, viewId, titleMeta, printMode);
    case 'section':
      return buildSectionSvg(cad, titleMeta, sectionConfig, printMode);
    case 'presentation':
      return buildPresentationSvg(cad, titleMeta);
    case 'schedule-door':
      return buildScheduleSvg(cad, 'door', titleMeta);
    case 'schedule-window':
      return buildScheduleSvg(cad, 'window', titleMeta);
    case 'schedule-structural':
      return buildScheduleSvg(cad, 'structural', titleMeta);
    case 'plan':
    default:
      return buildFloorPlanSvg(cad, floorId, titleMeta, sectionConfig, printMode);
  }
}

export function buildPlanSvg(
  cad: CadDocument,
  floorId?: string,
  titleMeta?: TitleBlockMeta,
  sectionConfig?: SectionConfig,
  viewId: string = 'plan',
): string {
  return buildDisciplinePlanSvg({ cad, viewId, floorId, titleMeta, sectionConfig });
}
