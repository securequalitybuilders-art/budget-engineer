import type { ReactNode } from 'react';
import { CAD_THIN, CAD_HAIR, INK, PAPER } from './cadConstants';
import type { DisciplineCode } from '@/lib/drawings/layerStandard';
import { getDisciplinePrefix } from '@/lib/drawings/layerStandard';
import type { IssueStatus, RevisionRecord } from '@/lib/drawings/namingConventions';

export interface ProTitleBlockProps {
  projectName: string;
  projectNumber?: string;
  drawingTitle: string;
  sheetNumber: string;
  discipline: DisciplineCode;
  revision: string;
  scale: string;
  date: string;
  drawnBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  status?: IssueStatus;
  revisions?: RevisionRecord[];
  sheetWidth: number;
  sheetHeight: number;
  margin?: number;
}

export function ProfessionalTitleBlock({
  projectName, projectNumber, drawingTitle, sheetNumber, discipline,
  revision, scale, date, drawnBy, checkedBy, approvedBy,
  status, revisions, sheetWidth, sheetHeight, margin = 10
}: ProTitleBlockProps): ReactNode {
  const tbH = professionalTitleBlockHeight(!!revisions && revisions.length > 0);
  const tbY = sheetHeight - margin - tbH;

  const c1X = margin + 120;
  const c2X = sheetWidth - margin - 200;
  const c3X = sheetWidth - margin - 90;
  const midX = sheetWidth / 2;

  return (
    <g>
      <rect x={margin} y={tbY} width={sheetWidth - margin * 2} height={tbH} fill={PAPER} stroke={INK} strokeWidth={CAD_THIN} />
      <line x1={c1X} y1={tbY} x2={c1X} y2={tbY + tbH} stroke={INK} strokeWidth={CAD_HAIR} />
      <line x1={c2X} y1={tbY} x2={c2X} y2={tbY + tbH} stroke={INK} strokeWidth={CAD_HAIR} />
      <line x1={c3X} y1={tbY} x2={c3X} y2={tbY + tbH} stroke={INK} strokeWidth={CAD_HAIR} />
      <line x1={margin} y1={tbY + 24} x2={sheetWidth - margin} y2={tbY + 24} stroke={INK} strokeWidth={CAD_HAIR} />

      <text x={margin + 6} y={tbY + 16} fontSize={9} fontWeight="bold" fill="#1a365d" fontFamily="Arial, Helvetica, sans-serif">
        DZENHARE OS — Budget Engineer
      </text>
      <text x={margin + 6} y={tbY + 38} fontSize={7} fill={INK} fontFamily="Arial, Helvetica, sans-serif">
        {projectName}{projectNumber ? `  •  ${projectNumber}` : ''}
      </text>

      <text x={midX} y={tbY + 16} fontSize={10} fontWeight="bold" fill={INK} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">
        {drawingTitle}
      </text>
      <text x={midX} y={tbY + 38} fontSize={7} fill={INK} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle" opacity={0.7}>
        Discipline: {getDisciplinePrefix(discipline)}  •  Sheet: {sheetNumber}
      </text>

      <text x={c2X + 6} y={tbY + 14} fontSize={6} fill={INK} fontFamily="Arial, Helvetica, sans-serif" opacity={0.6}>SCALE</text>
      <text x={c2X + 6} y={tbY + 36} fontSize={10} fontWeight="bold" fill={INK} fontFamily="Arial, Helvetica, sans-serif">{scale}</text>

      <text x={c3X + 6} y={tbY + 14} fontSize={6} fill={INK} fontFamily="Arial, Helvetica, sans-serif" opacity={0.6}>REV</text>
      <text x={c3X + 6} y={tbY + 36} fontSize={14} fontWeight="bold" fill="#d4a574" fontFamily="Arial, Helvetica, sans-serif">{revision}</text>

      <text x={c2X + 6} y={tbY + tbH - 8} fontSize={6} fill={INK} fontFamily="Arial, Helvetica, sans-serif" opacity={0.5}>{date}</text>

      {status && (
        <text x={c3X + 6} y={tbY + tbH - 8} fontSize={6} fill={status === 'For Construction' ? '#22c55e' : '#94a3b8'} fontFamily="Arial, Helvetica, sans-serif">
          {status}
        </text>
      )}

      {renderSignaturesBlock(tbY, tbH, margin, drawnBy, checkedBy, approvedBy)}

      {revisions && revisions.length > 0 && renderRevisionTable(revisions, tbY, tbH, margin, sheetWidth)}
    </g>
  );
}

function renderSignaturesBlock(tbY: number, _tbH: number, margin: number, drawnBy?: string, checkedBy?: string, approvedBy?: string): ReactNode {
  const sigY = tbY - 35;
  const colW = (200) / 3;
  const sigs = [
    { label: 'DRAWN', name: drawnBy ?? '' },
    { label: 'CHECKED', name: checkedBy ?? '' },
    { label: 'APPROVED', name: approvedBy ?? '' },
  ];
  return (
    <g>
      {sigs.map((s, i) => {
        const sx = margin + i * colW;
        return (
          <g key={s.label}>
            <text x={sx + 4} y={sigY} fontSize={5} fill={INK} fontFamily="Arial, Helvetica, sans-serif" opacity={0.5}>{s.label}</text>
            <line x1={sx + 4} y1={sigY + 12} x2={sx + colW - 4} y2={sigY + 12} stroke={INK} strokeWidth={CAD_HAIR} />
            <text x={sx + 4} y={sigY + 24} fontSize={6} fill={INK} fontFamily="Arial, Helvetica, sans-serif">{s.name || '_________________'}</text>
          </g>
        );
      })}
    </g>
  );
}

function renderRevisionTable(revisions: RevisionRecord[], tbY: number, _tbH: number, margin: number, sheetWidth: number): ReactNode {
  const tableTop = tbY - 20 - revisions.length * 12;
  const cols = [
    { x: 0, w: 20, label: 'REV' },
    { x: 20, w: 30, label: 'DATE' },
    { x: 50, w: 80, label: 'DESCRIPTION' },
    { x: 130, w: 30, label: 'BY' },
    { x: 160, w: 30, label: 'STATUS' },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const tableX = sheetWidth - margin - tableW;

  return (
    <g>
      <rect x={tableX} y={tableTop} width={tableW} height={20 + revisions.length * 12} fill={PAPER} stroke={INK} strokeWidth={CAD_HAIR} />
      <text x={tableX + 4} y={tableTop + 10} fontSize={6} fontWeight="bold" fill={INK} fontFamily="Arial, Helvetica, sans-serif">REVISIONS</text>
      <line x1={tableX} y1={tableTop + 16} x2={tableX + tableW} y2={tableTop + 16} stroke={INK} strokeWidth={CAD_HAIR} />
      {revisions.map((rev, i) => {
        const ry = tableTop + 20 + i * 12;
        return (
          <g key={rev.revision}>
            {cols.map(col => (
              <text key={col.label} x={tableX + col.x + 2} y={ry + 9} fontSize={5} fill={INK} fontFamily="Arial, Helvetica, sans-serif">
                {col.label === 'REV' ? rev.revision : col.label === 'DATE' ? rev.date : col.label === 'DESCRIPTION' ? rev.description : col.label === 'BY' ? rev.author : rev.status ?? ''}
              </text>
            ))}
            <line x1={tableX} y1={ry + 12} x2={tableX + tableW} y2={ry + 12} stroke={INK} strokeWidth={CAD_HAIR} opacity={0.3} />
          </g>
        );
      })}
    </g>
  );
}

export function professionalTitleBlockHeight(hasRevisions: boolean): number {
  return hasRevisions ? 55 : 46;
}
