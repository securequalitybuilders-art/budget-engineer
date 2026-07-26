import type { DetectedSegment } from '@/lib/import/wallDetection';

interface DetectionReviewProps {
  segments: DetectedSegment[];
  imageWidth: number;
  imageHeight: number;
  onRemoveSegment: (index: number) => void;
  onUpdateSegment?: (index: number, seg: Partial<DetectedSegment>) => void;
  className?: string;
}

function confidenceColor(conf?: number): string {
  if (conf === undefined) return '#94a3b8';
  if (conf >= 0.7) return '#22c55e';
  if (conf >= 0.4) return '#f59e0b';
  return '#ef4444';
}

function confidenceLabel(conf?: number): string {
  if (conf === undefined) return 'N/A';
  if (conf >= 0.7) return 'High';
  if (conf >= 0.4) return 'Medium';
  return 'Low';
}

export function DetectionReview({
  segments,
  imageWidth,
  imageHeight,
  onRemoveSegment,
  className = '',
}: DetectionReviewProps) {
  const viewBox = `0 0 ${imageWidth} ${imageHeight}`;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Detection Review
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          {segments.length} walls detected
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2">
        <svg
          width="100%"
          viewBox={viewBox}
          className="max-h-[300px]"
          style={{ aspectRatio: `${imageWidth}/${imageHeight}` }}
        >
          {segments.map((seg, i) => {
            const c = confidenceColor(seg.importConfidence);
            return (
              <g key={i}>
                <line
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.x2}
                  y2={seg.y2}
                  stroke={c}
                  strokeWidth={3}
                  opacity={0.8}
                  strokeLinecap="round"
                />
                <line
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.x2}
                  y2={seg.y2}
                  stroke="white"
                  strokeWidth={1}
                  opacity={0.3}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-col gap-1">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
          >
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: confidenceColor(seg.importConfidence) }}
            />
            <span className="flex-1 text-[var(--text-secondary)]">
              Wall {i + 1}: ({Math.round(seg.x1)}, {Math.round(seg.y1)}) → ({Math.round(seg.x2)}, {Math.round(seg.y2)})
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {confidenceLabel(seg.importConfidence)}
            </span>
            <button
              type="button"
              onClick={() => onRemoveSegment(i)}
              className="text-[var(--text-tertiary)] hover:text-red-400"
              title="Remove wall"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
