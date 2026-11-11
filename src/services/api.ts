import { API_BASE_URL } from "../config/constants";

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && options.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: "include" });
  const text = await response.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body ? String(body.message) : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return body as T;
}
