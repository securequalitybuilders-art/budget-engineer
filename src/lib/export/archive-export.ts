import { zipSync, strToU8 } from 'fflate';

export async function buildArchiveBlob(files: Record<string, string>): Promise<Blob> {
  const zipped = zipSync(Object.fromEntries(Object.entries(files).map(([name, content]) => [name, strToU8(content)])));
  return new Blob([zipped], { type: 'application/zip' });
}
