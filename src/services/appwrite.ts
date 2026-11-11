import { API_BASE_URL } from "../config/constants";
import { apiRequest } from "./api";

export type UploadProgressStatus = "pending" | "loading" | "success" | "error";
export type UploadProgressStepId = "image" | "price" | "path";
export type UploadProgressHandler = (stepId: UploadProgressStepId, status: UploadProgressStatus, detail: string) => void;
export type DressWithImages = { id: string; name: string; price: string; category?: string; sizes?: string; description?: string; washCare?: string; shipping?: string; images: Array<{ fileId: string; imageUrl: string; rowId?: string }> };
export type CustomerReview = { id: string; name: string; stars: number; description: string };

type DressDetails = { sizes: string; description: string; washCare: string; shipping: string };
type DressList = { items: DressWithImages[]; total: number };

export function getDressImageUrl(fileId: string) { return fileId ? `${API_BASE_URL}/images/${encodeURIComponent(fileId)}` : ""; }

export async function getAllDressesWithImages() {
  const result = await apiRequest<DressList>("/dresses?limit=100");
  return result.items;
}

export async function createDressRow(name: string, price: number | string, category = "New Dress", onStepUpdate?: UploadProgressHandler, details?: DressDetails) {
  onStepUpdate?.("price", "loading", "Saving dress details...");
  try {
    const dress = await apiRequest<DressWithImages>("/dresses", { method: "POST", body: JSON.stringify({ name, price, category, ...details }) });
    onStepUpdate?.("price", "success", "Dress details saved.");
    return { rowId: dress.id, raw: dress };
  } catch (error) { onStepUpdate?.("price", "error", error instanceof Error ? error.message : "Dress save failed."); throw error; }
}

export async function updateDressRow(rowId: string, name: string, price: number | string, category: string, details?: DressDetails) {
  const dress = await apiRequest<DressWithImages>(`/dresses/${encodeURIComponent(rowId)}`, { method: "PATCH", body: JSON.stringify({ name, price, category, ...details }) });
  return { rowId: dress.id, raw: dress };
}

export async function uploadDressImage(dressId: string, file: File, onStepUpdate?: UploadProgressHandler) {
  onStepUpdate?.("image", "loading", `Uploading ${file.name}...`);
  const chunkSize = 5 * 1024 * 1024;
  const uploadId = crypto.randomUUID();
  let result: { complete: boolean; uploadId?: string; fileId?: string; rowId?: string; imageUrl?: string } | undefined;
  try {
    for (let start = 0; start < file.size; start += chunkSize) {
      const end = Math.min(start + chunkSize, file.size);
      const formData = new FormData();
      formData.append("file", file.slice(start, end, file.type), file.name);
      const headers = new Headers({ "X-Upload-Id": uploadId });
      if (file.size > chunkSize) headers.set("Content-Range", `bytes ${start}-${end - 1}/${file.size}`);
      result = await apiRequest(`/dresses/${encodeURIComponent(dressId)}/images`, { method: "POST", headers, body: formData });
    }
    if (!result?.complete || !result.fileId) throw new Error("The image upload did not complete.");
    onStepUpdate?.("image", "success", "Image uploaded successfully.");
    onStepUpdate?.("path", "success", "Image attached to dress.");
    return result as { complete: true; fileId: string; rowId: string; imageUrl: string };
  } catch (error) { onStepUpdate?.("image", "error", error instanceof Error ? error.message : "Image upload failed."); throw error; }
}

export async function deleteDress(dressId: string) {
  await apiRequest<void>(`/dresses/${encodeURIComponent(dressId)}`, { method: "DELETE" });
}

export async function deleteDressImage(fileId: string) {
  await apiRequest<void>(`/images/${encodeURIComponent(fileId)}`, { method: "DELETE" });
}

export async function createCustomerReviewRow(value: { name: string; stars: number | string; description: string }) {
  const review = await apiRequest<CustomerReview>("/reviews", { method: "POST", body: JSON.stringify(value) });
  return { rowId: review.id, raw: review };
}

export function getAllCustomerReviews() { return apiRequest<CustomerReview[]>("/reviews"); }

export async function uploadDressWithImages({ name, price, category = "New Dress", images, onStepUpdate, details }: { name: string; price: number | string; category?: string; images: File[]; onStepUpdate?: UploadProgressHandler; details?: DressDetails }) {
  let dressId = "";
  const uploadedFiles: Array<{ fileId: string }> = [];
  try {
    const dress = await createDressRow(name, price, category, onStepUpdate, details);
    dressId = dress.rowId;
    for (const image of images) {
      const uploaded = await uploadDressImage(dressId, image, onStepUpdate);
      uploadedFiles.push({ fileId: uploaded.fileId });
    }
    return { dressId, uploadedFiles };
  } catch (error) {
    if (dressId) await apiRequest(`/dresses/${encodeURIComponent(dressId)}`, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
}

// Kept as a clear migration guard for stale imports.
export async function uploadImageToStorage() { throw new Error("Upload an image through a dress or upcoming-dress endpoint."); }
export async function createDressImageRow() { throw new Error("Images are linked atomically during upload."); }
