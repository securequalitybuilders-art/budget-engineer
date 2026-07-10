import { useState, useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';

export interface ImageImportResult {
  dataUrl: string;
  file: File;
  naturalWidth: number;
  naturalHeight: number;
}

interface ImageImportZoneProps {
  onImageLoaded: (result: ImageImportResult) => void;
  className?: string;
}

export function ImageImportZone({ onImageLoaded, className = '' }: ImageImportZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreview(dataUrl);

        const img = new Image();
        img.onload = () => {
          onImageLoaded({
            dataUrl,
            file,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [onImageLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleReset = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <div className={className}>
      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors
            ${isDragOver ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'border-[var(--border-primary)] hover:border-[var(--brand-primary)]'}`}
        >
          <Upload size={32} className="text-[var(--text-tertiary)]" />
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              Drop an image here
            </div>
            <div className="mt-1 text-xs text-[var(--text-tertiary)]">
              PNG, JPG, WebP — floor plans, sketches, hand drawings
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="Imported floor plan"
            className="max-h-[400px] w-full rounded-lg border border-[var(--border-primary)] object-contain"
          />
          <button
            type="button"
            onClick={handleReset}
            className="absolute right-2 top-2 rounded-md bg-[var(--bg-primary)]/80 px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
