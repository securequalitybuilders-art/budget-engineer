import type { FaçadeOrientation } from '@/domain/ws6-types';

export type ViewType = 'plan' | 'section' | 'elevation' | 'detail' | 'schedule' | 'site' | 'foundation' | 'roof' | 'electrical' | 'plumbing' | 'hvac' | 'presentation';

export interface DrawingViewRef {
  viewId: string;
  viewType: ViewType;
  label: string;
  sheetNumber: string;
  drawingNumber: string;
  floorId?: string;
  orientation?: FaçadeOrientation;
  sectionAxis?: 'AA' | 'BB';
}

export interface SheetCoordinator {
  getSheetForView(viewId: string): string;
  getDrawingNumber(viewId: string): string;
  getLabel(viewId: string): string;
  registerView(v: DrawingViewRef): void;
  getAllViews(): DrawingViewRef[];
  getElevationRefs(): DrawingViewRef[];
  getSectionRefs(): DrawingViewRef[];
  getPlanRefs(): DrawingViewRef[];
  getScheduleRefs(): DrawingViewRef[];
  coordsForSection(axis: 'AA' | 'BB'): DrawingViewRef | undefined;
  coordsForElevation(orientation: FaçadeOrientation): DrawingViewRef | undefined;
  getScheduleContext(packageType: string): DrawingViewRef[];
  getPackageRefs(discipline: string): DrawingViewRef[];
}

const DEFAULT_REFS: DrawingViewRef[] = [
  { viewId: 'plan', viewType: 'plan', label: 'Floor Plan', sheetNumber: 'A-101', drawingNumber: '01' },
  { viewId: 'site-plan', viewType: 'site', label: 'Site Plan', sheetNumber: 'A-001', drawingNumber: '00' },
  { viewId: 'foundation', viewType: 'foundation', label: 'Foundation Plan', sheetNumber: 'S-001', drawingNumber: 'F1' },
  { viewId: 'roof', viewType: 'roof', label: 'Roof Plan', sheetNumber: 'A-201', drawingNumber: 'R1' },
  { viewId: 'section', viewType: 'section', label: 'Section A-A', sheetNumber: 'A-201', drawingNumber: 'S1', sectionAxis: 'AA' },
  { viewId: 'section-bb', viewType: 'section', label: 'Section B-B', sheetNumber: 'A-202', drawingNumber: 'S2', sectionAxis: 'BB' },
  { viewId: 'front', viewType: 'elevation', label: 'Front Elevation', sheetNumber: 'A-301', drawingNumber: 'E1', orientation: 'front' },
  { viewId: 'rear', viewType: 'elevation', label: 'Rear Elevation', sheetNumber: 'A-302', drawingNumber: 'E2', orientation: 'rear' },
  { viewId: 'left', viewType: 'elevation', label: 'Left Side Elevation', sheetNumber: 'A-303', drawingNumber: 'E3', orientation: 'left' },
  { viewId: 'right', viewType: 'elevation', label: 'Right Side Elevation', sheetNumber: 'A-304', drawingNumber: 'E4', orientation: 'right' },
  { viewId: 'schedule-door', viewType: 'schedule', label: 'Door Schedule', sheetNumber: 'A-601', drawingNumber: 'D1' },
  { viewId: 'schedule-window', viewType: 'schedule', label: 'Window Schedule', sheetNumber: 'A-602', drawingNumber: 'W1' },
  { viewId: 'schedule-structural', viewType: 'schedule', label: 'Structural Schedule', sheetNumber: 'S-101', drawingNumber: 'ST1' },
  { viewId: 'detail-1', viewType: 'detail', label: 'Detail 1', sheetNumber: 'A-201', drawingNumber: 'D1' },
  { viewId: 'detail-2', viewType: 'detail', label: 'Detail 2', sheetNumber: 'A-202', drawingNumber: 'D2' },
  { viewId: 'section-aa-alt', viewType: 'section', label: 'Section A–A', sheetNumber: 'A-401', drawingNumber: 'S3' },
  { viewId: 'presentation', viewType: 'presentation', label: 'Presentation', sheetNumber: 'A-000', drawingNumber: 'P1' },
];

export function createSheetCoordinator(overrides?: DrawingViewRef[]): SheetCoordinator {
  const refs: Map<string, DrawingViewRef> = new Map();
  const base = overrides ?? DEFAULT_REFS;
  for (const r of base) refs.set(r.viewId, r);

  function allRefs(): DrawingViewRef[] {
    return Array.from(refs.values());
  }

  return {
    getSheetForView(viewId: string): string {
      return refs.get(viewId)?.sheetNumber ?? 'A-000';
    },
    getDrawingNumber(viewId: string): string {
      return refs.get(viewId)?.drawingNumber ?? '--';
    },
    getLabel(viewId: string): string {
      return refs.get(viewId)?.label ?? viewId;
    },
    registerView(v: DrawingViewRef): void {
      refs.set(v.viewId, v);
    },
    getAllViews(): DrawingViewRef[] {
      return allRefs();
    },
    getElevationRefs(): DrawingViewRef[] {
      return allRefs().filter(v => v.viewType === 'elevation');
    },
    getSectionRefs(): DrawingViewRef[] {
      return allRefs().filter(v => v.viewType === 'section');
    },
    getPlanRefs(): DrawingViewRef[] {
      return allRefs().filter(v => v.viewType === 'plan');
    },
    getScheduleRefs(): DrawingViewRef[] {
      return allRefs().filter(v => v.viewType === 'schedule');
    },
    coordsForSection(axis: 'AA' | 'BB'): DrawingViewRef | undefined {
      return allRefs().find(v => v.sectionAxis === axis);
    },
    coordsForElevation(orientation: FaçadeOrientation): DrawingViewRef | undefined {
      return allRefs().find(v => v.orientation === orientation);
    },
    getScheduleContext(packageType: string): DrawingViewRef[] {
      if (packageType === 'architectural') {
        return allRefs().filter(v => v.viewType === 'schedule' && (v.viewId.includes('door') || v.viewId.includes('window')));
      }
      if (packageType === 'structural') {
        return allRefs().filter(v => v.viewType === 'schedule' && v.viewId.includes('structural'));
      }
      return allRefs().filter(v => v.viewType === 'schedule');
    },
    getPackageRefs(_discipline: string): DrawingViewRef[] {
      return allRefs().filter(v => v.viewType !== 'presentation');
    },
  };
}

export const DEFAULT_COORDINATOR = createSheetCoordinator();
