export function inspectionMimeType(file: Pick<File, 'name' | 'type'>): string {
  const type = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(type)) return type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const inferred = (
    {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    } as Record<string, string>
  )[extension || ''];
  if ((!type || type === 'application/octet-stream') && inferred) return inferred;
  throw new Error('Use a PDF, JPEG, PNG, or WebP document for inspection.');
}
export async function encodeInspectionFile(file: File, read: (file: File) => Promise<string>) {
  if (file.size > 3 * 1024 * 1024)
    throw new Error('This document is too large. Use a file under 3 MB for inspection.');
  if (!file.size)
    throw new Error('The saved document is empty or unavailable. Please upload it again.');
  const type = inspectionMimeType(file);
  const raw = await read(file);
  const data = raw.slice(raw.indexOf(',') + 1);
  return { name: file.name, type, dataUrl: `data:${type};base64,${data}` };
}
