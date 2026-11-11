import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import type { Request } from "express";
import { config } from "./config.js";

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const tempDir = path.join(config.uploadDir, ".tmp");
await fs.mkdir(tempDir, { recursive: true });
await fs.mkdir(config.uploadDir, { recursive: true });

export const upload = multer({
  dest: tempDir,
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (_request, file, callback) => callback(null, allowedTypes.has(file.mimetype)),
});

function safeUploadId(value: string | undefined) {
  return value && /^[a-zA-Z0-9_-]{8,100}$/.test(value) ? value : randomUUID();
}

async function hasValidSignature(filePath: string, mimeType: string) {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (mimeType === "image/jpeg") return bytesRead >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimeType === "image/png") return bytesRead >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimeType === "image/webp") return bytesRead >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    return false;
  } finally { await handle.close(); }
}

export async function persistUpload(file: Express.Multer.File, request: Request) {
  const extension = allowedTypes.get(file.mimetype);
  if (!extension) throw Object.assign(new Error("Only JPG, PNG, and WebP images are accepted."), { status: 415 });

  const range = request.headers["content-range"];
  const uploadId = safeUploadId(request.headers["x-upload-id"] as string | undefined);
  const partPath = path.join(tempDir, `${uploadId}.part`);

  if (typeof range === "string") {
    const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(range);
    if (!match) throw Object.assign(new Error("Invalid Content-Range header."), { status: 400 });
    const start = Number(match[1]);
    const end = Number(match[2]);
    const total = Number(match[3]);
    const currentSize = await fs.stat(partPath).then((stat) => stat.size).catch(() => 0);
    if (currentSize !== start || end - start + 1 !== file.size || total > 25 * 1024 * 1024) {
      await fs.rm(file.path, { force: true });
      throw Object.assign(new Error("Upload chunks are missing or out of order."), { status: 409 });
    }
    if (start === 0 && !(await hasValidSignature(file.path, file.mimetype))) {
      await fs.rm(file.path, { force: true });
      throw Object.assign(new Error("The uploaded file content is not a valid image."), { status: 415 });
    }
    await fs.appendFile(partPath, await fs.readFile(file.path));
    await fs.rm(file.path, { force: true });
    if (end + 1 < total) return { complete: false as const, uploadId };
    const fileId = randomUUID();
    const fileName = `${fileId}${extension}`;
    await fs.rename(partPath, path.join(config.uploadDir, fileName));
    return { complete: true as const, fileId, fileName, mimeType: file.mimetype, uploadId };
  }

  if (!(await hasValidSignature(file.path, file.mimetype))) {
    await fs.rm(file.path, { force: true });
    throw Object.assign(new Error("The uploaded file content is not a valid image."), { status: 415 });
  }
  const fileId = randomUUID();
  const fileName = `${fileId}${extension}`;
  await fs.rename(file.path, path.join(config.uploadDir, fileName));
  return { complete: true as const, fileId, fileName, mimeType: file.mimetype, uploadId };
}

export async function removeStoredFile(fileName: string) {
  if (path.basename(fileName) !== fileName) return;
  await fs.rm(path.join(config.uploadDir, fileName), { force: true });
}

export function storedFilePath(fileName: string) {
  if (path.basename(fileName) !== fileName) throw new Error("Invalid file name.");
  return path.join(config.uploadDir, fileName);
}
