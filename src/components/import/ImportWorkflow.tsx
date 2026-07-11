import { useState, useCallback, useEffect } from 'react';
import { ImageImportZone, type ImageImportResult } from '@/components/import/ImageImportZone';
import { ScaleCalibration, type ScaleCalibrationResult } from '@/components/import/ScaleCalibration';
import { DetectionReview } from '@/components/import/DetectionReview';
import type { DetectedSegment, DetectionResult } from '@/lib/import/wallDetection';
import { mergeOverlappingSegments, snapToAxis, segmentsToPlan, detectWallsFromImage } from '@/lib/import/wallDetection';
import { savePlanModel } from '@/services/cadPersistenceService';

type ImportStep = 'upload' | 'calibrate' | 'detect' | 'review' | 'complete';

interface ImportWorkflowProps {
  projectId: string;
  onComplete: (planModelId: string) => void;
  onCancel: () => void;
  className?: string;
}

export function ImportWorkflow({ projectId, onComplete, onCancel, className = '' }: ImportWorkflowProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [imageResult, setImageResult] = useState<ImageImportResult | null>(null);
  const [calibration, setCalibration] = useState<ScaleCalibrationResult | null>(null);
  const [segments, setSegments] = useState<DetectedSegment[]>([]);
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [planModelId, setPlanModelId] = useState<string | null>(null);

  const handleImageLoaded = useCallback((result: ImageImportResult) => {
    setImageResult(result);
    setStep('calibrate');
  }, []);

  const handleCalibrated = useCallback((result: ScaleCalibrationResult) => {
    setCalibration(result);
    setStep('detect');
  }, []);

  const runDetection = useCallback(async () => {
    if (!imageResult) return;
    setDetectionRunning(true);
    setDetectionError(null);

    try {
      const result: DetectionResult = await detectWallsFromImage(imageResult.dataUrl, 100);

      const processed: DetectedSegment[] = (result.walls as DetectedSegment[]).map((w) => ({
        ...w,
        importConfidence: w.importConfidence ?? (result.confidence === 'high' ? 0.8 : result.confidence === 'medium' ? 0.5 : 0.3),
      }));

      setSegments(snapAndMerge(processed));
      setStep('review');
    } catch (err) {
      setDetectionError(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setDetectionRunning(false);
    }
  }, [imageResult]);

  useEffect(() => {
    if (step === 'detect') {
      runDetection();
    }
  }, [step, runDetection]);

  const handleRemoveSegment = useCallback((index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const [applyError, setApplyError] = useState<string | null>(null);

  const handleApply = useCallback(async () => {
    if (!calibration || !projectId) return;
    setApplyError(null);

    try {
      const pxPerMetre = calibration.pxPerMetre;
      const snapped = snapAndMerge(segments);

      const model = segmentsToPlan(snapped, pxPerMetre);

      if (!model) return;
      const id = model.id;
      await savePlanModel(projectId, id, model);
      setPlanModelId(id);
      setStep('complete');
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Failed to save plan');
    }
  }, [segments, calibration, projectId]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        {(['upload', 'calibrate', 'detect', 'review', 'complete'] as const).map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium
                ${step === s ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}
            >
              {i + 1}
            </span>
            <span className={step === s ? 'text-[var(--text-primary)]' : ''}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 4 && <span className="text-[var(--text-tertiary)]">→</span>}
          </span>
        ))}
      </div>

      {step === 'upload' && (
        <ImageImportZone onImageLoaded={handleImageLoaded} />
      )}

      {step === 'calibrate' && imageResult && (
        <div className="flex flex-col gap-4">
          <img
            src={imageResult.dataUrl}
            alt="Floor plan"
            className="max-h-[300px] rounded-lg border border-[var(--border-primary)] object-contain"
          />
          <ScaleCalibration
            imageNaturalWidth={imageResult.naturalWidth}
            imageNaturalHeight={imageResult.naturalHeight}
            onCalibrated={handleCalibrated}
          />
        </div>
      )}

      {step === 'detect' && (
        <div className="flex flex-col items-center gap-3 py-8">
          {detectionRunning ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
              <div className="text-sm text-[var(--text-secondary)]">Running wall detection...</div>
            </>
          ) : detectionError ? (
            <>
              <div className="text-sm text-red-400">Detection failed: {detectionError}</div>
              <button
                type="button"
                onClick={runDetection}
                className="rounded-md bg-[var(--brand-primary)] px-3 py-1 text-xs text-white"
              >
                Retry
              </button>
            </>
          ) : null}
        </div>
      )}

      {step === 'review' && imageResult && (
        <div className="flex flex-col gap-4">
          <DetectionReview
            segments={segments}
            imageWidth={imageResult.naturalWidth}
            imageHeight={imageResult.naturalHeight}
            onRemoveSegment={handleRemoveSegment}
            onUpdateSegment={function (_i, _s) {}}
          />
          {applyError && (
            <div className="text-sm text-red-400">Save failed: {applyError}</div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="rounded-md border border-[var(--border-primary)] px-3 py-1 text-xs text-[var(--text-secondary)]"
            >
              Start Over
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-md bg-[var(--brand-primary)] px-3 py-1 text-xs font-medium text-white"
            >
              Apply & Convert to Plan
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="text-lg text-green-400">✓</div>
          <div className="text-sm font-medium text-[var(--text-primary)]">Plan created successfully</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-[var(--border-primary)] px-3 py-1 text-xs text-[var(--text-secondary)]"
            >
              Close
            </button>
            {planModelId && (
              <button
                type="button"
                onClick={() => onComplete(planModelId)}
                className="rounded-md bg-[var(--brand-primary)] px-3 py-1 text-xs font-medium text-white"
              >
                Open in Editor
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function snapAndMerge(segs: DetectedSegment[]): DetectedSegment[] {
  let processed = segs.map((s) => snapToAxis(s));
  processed = mergeOverlappingSegments(processed);
  return processed;
}
