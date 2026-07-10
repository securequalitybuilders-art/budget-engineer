import { useState, useCallback } from 'react';
import { computeScaleCalibration } from '@/lib/import/backdropUtils';

export interface ScaleCalibrationResult {
  pxPerMetre: number;
  referencePx: number;
  referenceMetres: number;
}

interface ScaleCalibrationProps {
  imageNaturalWidth: number;
  imageNaturalHeight: number;
  onCalibrated: (result: ScaleCalibrationResult) => void;
  className?: string;
}

export function ScaleCalibration({ imageNaturalWidth, imageNaturalHeight, onCalibrated, className = '' }: ScaleCalibrationProps) {
  const [knownWidth, setKnownWidth] = useState('');
  const [knownHeight, setKnownHeight] = useState('');
  const [result, setResult] = useState<ScaleCalibrationResult | null>(null);

  const handleCalibrate = useCallback(() => {
    const w = parseFloat(knownWidth);
    const h = parseFloat(knownHeight);
    if (!w || !h) return;

    const calibration = computeScaleCalibration(imageNaturalWidth, imageNaturalHeight, w, h);
    if (!calibration) return;

    const r: ScaleCalibrationResult = {
      pxPerMetre: calibration.pxPerMetre,
      referencePx: imageNaturalWidth,
      referenceMetres: w,
    };
    setResult(r);
    onCalibrated(r);
  }, [knownWidth, knownHeight, imageNaturalWidth, imageNaturalHeight, onCalibrated]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        Scale Calibration
      </div>
      <div className="text-xs text-[var(--text-secondary)]">
        Enter the real-world dimensions of the known reference in the image.
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[var(--text-tertiary)]">Known width (m)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={knownWidth}
            onChange={(e) => setKnownWidth(e.target.value)}
            placeholder="e.g. 10"
            className="w-24 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[var(--text-tertiary)]">Known height (m)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={knownHeight}
            onChange={(e) => setKnownHeight(e.target.value)}
            placeholder="e.g. 8"
            className="w-24 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)]"
          />
        </div>
        <button
          type="button"
          onClick={handleCalibrate}
          disabled={!knownWidth || !knownHeight}
          className="self-end rounded-md bg-[var(--brand-primary)] px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          Calibrate
        </button>
      </div>

      {result && (
        <div className="rounded-md bg-[var(--bg-tertiary)] px-3 py-2">
          <div className="text-xs text-[var(--text-secondary)]">
            Scale: <span className="font-semibold text-[var(--text-primary)]">{result.pxPerMetre.toFixed(1)} px/m</span>
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)]">
            {imageNaturalWidth}px ÷ {result.referenceMetres}m = {result.pxPerMetre.toFixed(1)} px/m
          </div>
        </div>
      )}
    </div>
  );
}
