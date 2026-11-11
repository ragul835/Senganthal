import { apiRequest } from "./api";

export type AdminAccount = { id: string; email: string; labels: string[] };

export async function getAdmin() {
  try {
    const account = await apiRequest<AdminAccount>("/auth/me");
    return account.labels.includes("admin") ? account : null;
  } catch { return null; }
}

export function loginAdmin(email: string, password: string) {
  return apiRequest<AdminAccount>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}
export function logoutAdmin() { return apiRequest<void>("/auth/logout", { method: "POST" }); }
export function requestPasswordReset(email: string) { return apiRequest<{ ok: true }>("/auth/recovery", { method: "POST", body: JSON.stringify({ email }) }); }
export function finishPasswordReset(_userId: string, secret: string, password: string) { return apiRequest<{ ok: true }>("/auth/recovery", { method: "PUT", body: JSON.stringify({ secret, password }) }); }
