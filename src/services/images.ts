export type CompressedImage = {
  original: File;
  compressed: File;
  originalSize: number;
  compressedSize: number;
  previewUrl: string;
  id: string;
};

const MAX_SIZE = 5 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export { formatSize };

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > 50 * 1024 * 1024)
    throw new Error("Images must be 50 MB or smaller.");

  const originalSize = file.size;

  if (originalSize <= MAX_SIZE) {
    return {
      original: file,
      compressed: file,
      originalSize,
      compressedSize: file.size,
      previewUrl: URL.createObjectURL(file),
      id: crypto.randomUUID(),
    };
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  let scale = 1;
  const maxDim = 4096;
  if (width > maxDim || height > maxDim) {
    scale = Math.min(maxDim / width, maxDim / height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  let quality = 0.92;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, quality)
    );
    if (blob && blob.size <= MAX_SIZE) break;
    quality -= 0.1;
    if (quality < 0.3) quality = 0.3;
    if (attempt > 0 && scale > 0.5) {
      scale *= 0.85;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      ctx.drawImage(await createImageBitmap(file), 0, 0, canvas.width, canvas.height);
    }
  }

  if (!blob) throw new Error("Could not compress image.");

  const ext = outputType === "image/png" ? ".png" : ".jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const compressed = new File([blob], `${baseName}${ext}`, { type: outputType });

  return {
    original: file,
    compressed,
    originalSize,
    compressedSize: compressed.size,
    previewUrl: URL.createObjectURL(compressed),
    id: crypto.randomUUID(),
  };
}

export async function prepareImage(file: File): Promise<File> {
  const result = await compressImage(file);
  return result.compressed;
}
