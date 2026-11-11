import { apiRequest } from "./api";
export type UpcomingDress = { id: string; title: string; status: string; description: string; mainImages: string[]; workingImages: string[] };
export function listUpcoming() { return apiRequest<UpcomingDress[]>("/upcoming"); }
export async function saveUpcoming(item: { title: string; status: string; description: string; mainImages: File[]; workingImages: File[] }) {
  const form = new FormData();
  form.append("title", item.title); form.append("status", item.status); form.append("description", item.description);
  item.mainImages.forEach((file) => form.append("mainImages", file, file.name));
  item.workingImages.forEach((file) => form.append("workingImages", file, file.name));
  return apiRequest<UpcomingDress>("/upcoming", { method: "POST", body: form });
}
