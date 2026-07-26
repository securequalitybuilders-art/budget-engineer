import type { SheetSize } from '@/lib/drawings/sheetSet';
import { getSheetDimensions } from '@/lib/drawings/sheetSet';

export interface PaperSpaceConfig {
  sheetSize: SheetSize;
  title?: string;
  projectName?: string;
  sheetNumber?: string;
  revision?: string;
  scale?: number;
}

export function generateDxfPaperSpace(config: PaperSpaceConfig): string {
  const dims = getSheetDimensions(config.sheetSize);
  const scale = config.scale ?? 100;
  const paperW = dims.widthMm;
  const paperH = dims.heightMm;

  const groups: string[] = [];
  groups.push('0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC');

  groups.push('0\nSECTION\n2\nTABLES');
  groups.push('0\nTABLE\n2\nVPORT\n70\n1');
  groups.push('0\nVPORT\n2\n*ACTIVE\n10\n0\n20\n0\n11\n1\n21\n1\n12\n0\n22\n0\n13\n0\n23\n0\n14\n1\n24\n1\n15\n0\n25\n0\n16\n0\n26\n0\n36\n1\n17\n0\n27\n0\n40\n1\n41\n1\n42\n50\n43\n0\n44\n0\n50\n0\n51\n0\n71\n0\n72\n0\n73\n0\n74\n0\n75\n0\n76\n0\n77\n1\n78\n0\n0\nENDTAB');

  groups.push('0\nTABLE\n2\nLTYPE\n70\n1');
  groups.push('0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0\n0\nENDTAB');

  groups.push('0\nTABLE\n2\nLAYER\n70\n4');
  groups.push('0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS');
  groups.push('0\nLAYER\n2\nTITLE-BLOCK\n70\n0\n62\n7\n6\nCONTINUOUS');
  groups.push('0\nLAYER\n2\nVIEWPORT\n70\n0\n62\n8\n6\nCONTINUOUS');
  groups.push('0\nLAYER\n2\nBORDER\n70\n0\n62\n7\n6\nCONTINUOUS');
  groups.push('0\nENDTAB\n0\nENDSEC');

  groups.push('0\nSECTION\n2\nBLOCKS');
  groups.push('0\nBLOCK\n2\n*Paper_Space\n70\n0\n10\n0\n20\n0\n0\nENDBLK');
  groups.push('0\nBLOCK\n2\n*Paper_Space0\n70\n0\n10\n0\n20\n0\n0\nENDBLK');
  groups.push('0\nENDSEC');

  groups.push('0\nSECTION\n2\nENTITIES');

  const margin = 10;
  groups.push('0\nLWPOLYLINE\n8\nBORDER\n90\n4\n70\n1');
  groups.push(`10\n${margin}\n20\n${margin}\n`);
  groups.push(`10\n${paperW - margin}\n20\n${margin}\n`);
  groups.push(`10\n${paperW - margin}\n20\n${paperH - margin}\n`);
  groups.push(`10\n${margin}\n20\n${paperH - margin}\n`);

  const titleBlockH = 30;
  const titleBlockY = margin;
  groups.push('0\nLWPOLYLINE\n8\nTITLE-BLOCK\n90\n4\n70\n1');
  groups.push(`10\n${margin}\n20\n${titleBlockY}\n`);
  groups.push(`10\n${paperW - margin}\n20\n${titleBlockY}\n`);
  groups.push(`10\n${paperW - margin}\n20\n${titleBlockY + titleBlockH}\n`);
  groups.push(`10\n${margin}\n20\n${titleBlockY + titleBlockH}\n`);

  const titleText = config.title ?? 'Drawing';
  groups.push('0\nTEXT\n8\nTITLE-BLOCK\n1\n' + titleText + '\n40\n3\n10\n' + (margin + 2) + '\n20\n' + (titleBlockY + 18) + '\n50\n0\n72\n0');
  if (config.projectName) {
    groups.push('0\nTEXT\n8\nTITLE-BLOCK\n1\nProject: ' + config.projectName + '\n40\n2\n10\n' + (margin + 2) + '\n20\n' + (titleBlockY + 5) + '\n50\n0\n72\n0');
  }
  if (config.sheetNumber) {
    groups.push('0\nTEXT\n8\nTITLE-BLOCK\n1\nSheet: ' + config.sheetNumber + '\n40\n2\n10\n' + (paperW - margin - 60) + '\n20\n' + (titleBlockY + 18) + '\n50\n0\n72\n0');
  }
  if (config.revision) {
    groups.push('0\nTEXT\n8\nTITLE-BLOCK\n1\nRev: ' + config.revision + '\n40\n2\n10\n' + (paperW - margin - 30) + '\n20\n' + (titleBlockY + 18) + '\n50\n0\n72\n0');
  }

  const vpX = margin + 5;
  const vpY = margin + 35;
  const vpW = paperW - margin * 2 - 10;
  const vpH = paperH - titleBlockH - margin * 2 - 45;
  groups.push('0\nVIEWPORT\n8\nVIEWPORT\n10\n' + vpX + '\n20\n' + vpY + '\n11\n' + (vpX + vpW) + '\n21\n' + (vpY + vpH) + '\n12\n0\n22\n0\n13\n0\n23\n0\n40\n' + (1 / scale) + '\n41\n1\n68\n1\n69\n0\n');

  groups.push('0\nENDSEC\n0\nEOF');
  return groups.join('');
}
