import { loadEnvFile } from "node:process";

try { loadEnvFile(); } catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const base = (process.env.SMOKE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD for the smoke test.");

let cookie = "";
async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (cookie) headers.set("Cookie", cookie);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";", 1)[0];
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path}: ${response.status} ${body?.message || text}`);
  return body;
}

await request("/health");
await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
const dress = await request("/dresses", { method: "POST", body: JSON.stringify({ name: "Smoke Test Saree", price: 2499, category: "Sarees", sizes: "M, L", description: "Automated smoke-test product", washCare: "Dry clean", shipping: "Test only" }) });

try {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nAAAAABJRU5ErkJggg==", "base64");
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "smoke.png");
  await request(`/dresses/${dress.id}/images`, { method: "POST", body: form });
  const catalog = await request("/dresses?limit=100");
  if (!catalog.items.some((item) => item.id === dress.id && item.images.length === 1)) throw new Error("Catalog/image round trip failed.");

  const phone = "+919999999999";
  const placed = await request("/orders", { method: "POST", body: JSON.stringify({ customer: { firstName: "Smoke", lastName: "Test", address: "1 Test Road", apartment: "", city: "Chennai", state: "Tamil Nadu", pinCode: "600001", phone }, items: [{ id: dress.id, size: "M", quantity: 2 }] }) });
  if (placed.total !== 4998) throw new Error(`Server price calculation failed: ${placed.total}`);
  await request("/orders/lookup", { method: "POST", body: JSON.stringify({ orderId: placed.orderId, phone }) });
  await request(`/orders/${placed.orderId}/status`, { method: "PATCH", body: JSON.stringify({ status: "Dispatched" }) });
  const orders = await request("/orders");
  if (!orders.some((order) => order.id === placed.orderId && order.status === "Dispatched")) throw new Error("Order status workflow failed.");

  const suffix = Date.now();
  await request("/contact", { method: "POST", body: JSON.stringify({ name: "Smoke Test", email: `smoke-${suffix}@example.com`, subject: "Smoke test", message: "Automated end-to-end verification." }) });
  await request("/subscribe", { method: "POST", body: JSON.stringify({ email: `subscriber-${suffix}@example.com` }) });
  await request("/reviews", { method: "POST", body: JSON.stringify({ name: "Smoke Test", stars: 5, description: "Automated verification review." }) });
  console.info("Senganthal API smoke test passed.");
} finally {
  await request(`/dresses/${dress.id}`, { method: "DELETE" }).catch(() => undefined);
  await request("/auth/logout", { method: "POST" }).catch(() => undefined);
}
