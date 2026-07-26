export type SheetSize = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';

export interface SheetDim {
  code: SheetSize;
  widthMm: number;
  heightMm: number;
  label: string;
  portrait: boolean;
}

const SHEETS: Record<SheetSize, { landscape: [number, number]; portrait: [number, number] }> = {
  A4: { landscape: [297, 210], portrait: [210, 297] },
  A3: { landscape: [420, 297], portrait: [297, 420] },
  A2: { landscape: [594, 420], portrait: [420, 594] },
  A1: { landscape: [841, 594], portrait: [594, 841] },
  A0: { landscape: [1189, 841], portrait: [841, 1189] },
};

export function getSheetDimensions(size: SheetSize, landscape = true): SheetDim {
  const dim = SHEETS[size];
  const [w, h] = landscape ? dim.landscape : dim.portrait;
  return { code: size, widthMm: w, heightMm: h, label: `${size} (${landscape ? 'Landscape' : 'Portrait'})`, portrait: !landscape };
}

export function listSheetSizes(): SheetSize[] {
  return ['A4', 'A3', 'A2', 'A1', 'A0'];
}

export function suggestSheetSize(contentWidthMm: number, contentHeightMm: number): SheetSize {
  const margin = 20;
  const needW = contentWidthMm + margin * 2;
  const needH = contentHeightMm + margin * 2;
  const order: SheetSize[] = ['A4', 'A3', 'A2', 'A1', 'A0'];
  for (const size of order) {
    const dim = getSheetDimensions(size, contentWidthMm > contentHeightMm);
    if (dim.widthMm >= needW && dim.heightMm >= needH) return size;
  }
  return 'A0';
}

export function scaleToFit(
  contentWidth: number, contentHeight: number,
  sheetWidth: number, sheetHeight: number,
  margin = 20
): { scale: number; offsetX: number; offsetY: number } {
  const availW = sheetWidth - margin * 2;
  const availH = sheetHeight - margin * 2;
  const scale = Math.min(availW / contentWidth, availH / contentHeight) * 0.9;
  const offsetX = (sheetWidth - contentWidth * scale) / 2;
  const offsetY = (sheetHeight - contentHeight * scale) / 2;
  return { scale: Math.min(scale, 1), offsetX, offsetY };
}
