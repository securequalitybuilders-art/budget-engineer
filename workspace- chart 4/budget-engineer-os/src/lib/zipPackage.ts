import { strToU8, zipSync } from 'fflate';

export function fflateZip(files: Record<string, string>): Uint8Array {
  const binaryFiles: Record<string, Uint8Array> = {};
  for (const [key, val] of Object.entries(files)) {
    binaryFiles[key] = strToU8(val);
  }
  return zipSync(binaryFiles);
}

export function downloadZip(filename: string, files: Record<string, string>): void {
  const zipped = fflateZip(files);
  const blob = new Blob([zipped as any], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
