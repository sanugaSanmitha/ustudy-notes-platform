import JSZip from 'jszip';

export async function extractZipFileNames(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  return Object.keys(zip.files)
    .filter((name) => !zip.files[name].dir)
    .map((name) => name.split('/').pop() || name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export async function extractZipFileNamesFromFile(file: File): Promise<string[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return extractZipFileNames(buffer);
}
