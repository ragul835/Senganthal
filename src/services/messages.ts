import { apiRequest } from "./api";
export type ContactMessage = { id: string; name: string; email: string; subject: string; message: string; createdAt: string };
export function sendContactMessage(value: Omit<ContactMessage, "id" | "createdAt">) { return apiRequest<{ ok: true }>("/contact", { method: "POST", body: JSON.stringify(value) }); }
export function subscribeToUpdates(email: string) { return apiRequest<{ ok: true }>("/subscribe", { method: "POST", body: JSON.stringify({ email }) }); }
export function listContactMessages() { return apiRequest<ContactMessage[]>("/contact"); }
export function listSubscribers() { return apiRequest<Array<{ email: string; createdAt: string }>>("/subscribers"); }
