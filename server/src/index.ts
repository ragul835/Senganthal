import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { ZodError, z } from "zod";
import { config } from "./config.js";
import { db } from "./db.js";
import { createSession, destroySession, hashToken, readAdmin, requireAdmin } from "./auth.js";
import { persistUpload, removeStoredFile, storedFilePath, upload } from "./uploads.js";
import { contactInput, dressInput, orderInput, orderStatus, reviewInput } from "./validation.js";
import { priceOrder } from "./domain.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(cors({ origin: [config.FRONTEND_ORIGIN, `http://localhost:${config.PORT}`], credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use((_request, response, next) => {
  response.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  next();
});

app.use((request, response, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
  const origin = request.headers.origin;
  const selfOrigin = `http://localhost:${config.PORT}`;
  if (origin && origin !== config.FRONTEND_ORIGIN && origin !== selfOrigin) return response.status(403).json({ message: "Origin not allowed." });
  next();
});

type AsyncHandler = (request: Request, response: Response, next: NextFunction) => Promise<unknown>;
const asyncRoute = (handler: AsyncHandler) => (request: Request, response: Response, next: NextFunction) => { void handler(request, response, next).catch(next); };
const routeParam = (request: Request, key: string) => {
  const value = request.params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(max: number, windowMs: number) {
  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${request.ip}:${request.path}`;
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    else if (++bucket.count > max) return response.status(429).json({ message: "Too many requests. Please try again later." });
    next();
  };
}

function imageUrl(request: Request, fileId: string) {
  return `${request.protocol}://${request.get("host")}/api/images/${encodeURIComponent(fileId)}`;
}

function serializeDress(request: Request, dress: { id: string; name: string; price: number; category: string; sizes: string; description: string; washCare: string; shipping: string; createdAt: Date; images: Array<{ id: string; fileId: string }> }) {
  return {
    id: dress.id, name: dress.name, price: String(dress.price), category: dress.category, sizes: dress.sizes,
    description: dress.description, washCare: dress.washCare, shipping: dress.shipping, createdAt: dress.createdAt.toISOString(),
    images: dress.images.map((image) => ({ fileId: image.fileId, rowId: image.id, imageUrl: imageUrl(request, image.fileId) })),
  };
}

app.get("/api/health", asyncRoute(async (_request, response) => {
  await db.$queryRaw`SELECT 1`;
  response.json({ ok: true });
}));

app.get("/api/dresses", asyncRoute(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 100));
  const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
  const category = typeof request.query.category === "string" ? request.query.category.trim() : "";
  const where = {
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}),
  };
  const [items, total] = await Promise.all([
    db.dress.findMany({ where, include: { images: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    db.dress.count({ where }),
  ]);
  response.json({ items: items.map((item) => serializeDress(request, item)), total, page, limit });
}));

app.get("/api/dresses/:id", asyncRoute(async (request, response) => {
  const dress = await db.dress.findUnique({ where: { id: routeParam(request, "id") }, include: { images: { orderBy: { createdAt: "asc" } } } });
  if (!dress) return response.status(404).json({ message: "Dress not found." });
  response.json(serializeDress(request, dress));
}));

app.post("/api/dresses", requireAdmin, asyncRoute(async (request, response) => {
  const dress = await db.dress.create({ data: dressInput.parse(request.body), include: { images: true } });
  response.status(201).json(serializeDress(request, dress));
}));

app.patch("/api/dresses/:id", requireAdmin, asyncRoute(async (request, response) => {
  const dress = await db.dress.update({ where: { id: routeParam(request, "id") }, data: dressInput.partial().parse(request.body), include: { images: true } });
  response.json(serializeDress(request, dress));
}));

app.delete("/api/dresses/:id", requireAdmin, asyncRoute(async (request, response) => {
  const dressId = routeParam(request, "id");
  const images = await db.dressImage.findMany({ where: { dressId } });
  await db.dress.delete({ where: { id: dressId } });
  await Promise.all(images.map((image) => removeStoredFile(image.fileName)));
  response.status(204).end();
}));

app.post("/api/dresses/:id/images", requireAdmin, upload.single("file"), asyncRoute(async (request, response) => {
  if (!request.file) return response.status(400).json({ message: "An image file is required." });
  const dress = await db.dress.findUnique({ where: { id: routeParam(request, "id") }, select: { id: true } });
  if (!dress) { await fs.rm(request.file.path, { force: true }); return response.status(404).json({ message: "Dress not found." }); }
  const saved = await persistUpload(request.file, request);
  if (!saved.complete) return response.status(202).json({ complete: false, uploadId: saved.uploadId });
  try {
    const image = await db.dressImage.create({ data: { dressId: dress.id, fileId: saved.fileId, fileName: saved.fileName, mimeType: saved.mimeType } });
    response.status(201).json({ complete: true, fileId: image.fileId, rowId: image.id, imageUrl: imageUrl(request, image.fileId) });
  } catch (error) { await removeStoredFile(saved.fileName); throw error; }
}));

app.get("/api/images/:fileId", asyncRoute(async (request, response) => {
  const fileId = routeParam(request, "fileId");
  const dressImage = await db.dressImage.findUnique({ where: { fileId } });
  let fileName = dressImage?.fileName;
  let mimeType = dressImage?.mimeType;
  if (!fileName) {
    const upcoming = await db.upcomingDress.findFirst({ where: { OR: [{ mainImages: { has: fileId } }, { workingImages: { has: fileId } }] } });
    if (upcoming) {
      const matches = await fs.readdir(config.uploadDir);
      fileName = matches.find((name) => name.startsWith(`${fileId}.`));
      mimeType = fileName?.endsWith(".png") ? "image/png" : fileName?.endsWith(".webp") ? "image/webp" : "image/jpeg";
    }
  }
  if (!fileName) return response.status(404).json({ message: "Image not found." });
  response.type(mimeType || "application/octet-stream").set("Cache-Control", "public, max-age=31536000, immutable").sendFile(storedFilePath(fileName));
}));

app.delete("/api/images/:fileId", requireAdmin, asyncRoute(async (request, response) => {
  const image = await db.dressImage.findUnique({ where: { fileId: routeParam(request, "fileId") } });
  if (!image) return response.status(404).json({ message: "Image not found." });
  await db.dressImage.delete({ where: { id: image.id } });
  await removeStoredFile(image.fileName);
  response.status(204).end();
}));

app.post("/api/orders", rateLimit(20, 60 * 60 * 1000), asyncRoute(async (request, response) => {
  const input = orderInput.parse(request.body);
  const ids = [...new Set(input.items.map((item) => item.id))];
  const dresses = await db.dress.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, price: true } });
  const { items, total } = priceOrder(input.items, dresses);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayCount = await db.customerOrder.count({ where: { createdAt: { gte: todayStart } } });
  const seq = String(todayCount + 1).padStart(4, "0");
  const orderId = `SEN-${dateStr}-${seq}`;
  const order = await db.customerOrder.create({ data: { ...input.customer, items, total, orderId } });
  response.status(201).json({ ok: true, orderId: order.orderId, createdAt: order.createdAt.toISOString(), total: order.total });
}));

app.post("/api/orders/lookup", rateLimit(30, 60 * 60 * 1000), asyncRoute(async (request, response) => {
  const input = z.object({ orderId: z.string().trim().max(30).optional(), phone: z.string().trim().min(7).max(20).optional() }).parse(request.body);
  if (!input.orderId && !input.phone) return response.status(400).json({ message: "Provide an order ID or phone number." });
  const where: Record<string, unknown> = {};
  if (input.orderId) where.orderId = input.orderId.toUpperCase();
  if (input.phone) where.phone = input.phone;
  const orders = await db.customerOrder.findMany({ where, orderBy: { createdAt: "desc" }, take: 10 });
  if (!orders.length) return response.status(404).json({ message: "No orders found." });
  response.json({ ok: true, orders: orders.map(o => ({ orderId: o.orderId, status: o.status, createdAt: o.createdAt.toISOString(), name: `${o.firstName} ${o.lastName}`, total: o.total })) });
}));

app.get("/api/orders", requireAdmin, asyncRoute(async (_request, response) => {
  const orders = await db.customerOrder.findMany({ orderBy: { createdAt: "desc" } });
  response.json(orders.map((order) => ({ ...order, orderId: order.orderId, createdAt: order.createdAt.toISOString() })));
}));

app.patch("/api/orders/:id/status", requireAdmin, asyncRoute(async (request, response) => {
  const status = orderStatus.parse(request.body.status);
  const order = await db.customerOrder.update({ where: { id: routeParam(request, "id") }, data: { status } });
  response.json({ id: order.id, status: order.status });
}));

app.post("/api/contact", rateLimit(10, 60 * 60 * 1000), asyncRoute(async (request, response) => {
  await db.contactMessage.create({ data: contactInput.parse(request.body) });
  response.status(201).json({ ok: true });
}));

app.get("/api/contact", requireAdmin, asyncRoute(async (_request, response) => {
  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  response.json(messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString() })));
}));

app.post("/api/subscribe", rateLimit(10, 60 * 60 * 1000), asyncRoute(async (request, response) => {
  const email = z.string().trim().email().max(254).parse(request.body.email).toLowerCase();
  await db.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email } });
  response.status(201).json({ ok: true });
}));

app.get("/api/subscribers", requireAdmin, asyncRoute(async (_request, response) => {
  const subscribers = await db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
  response.json(subscribers.map((subscriber) => ({ email: subscriber.email, createdAt: subscriber.createdAt.toISOString() })));
}));

app.get("/api/reviews", asyncRoute(async (_request, response) => {
  response.json(await db.customerReview.findMany({ orderBy: { createdAt: "desc" } }));
}));

app.post("/api/reviews", requireAdmin, asyncRoute(async (request, response) => {
  response.status(201).json(await db.customerReview.create({ data: reviewInput.parse(request.body) }));
}));

app.get("/api/upcoming", asyncRoute(async (request, response) => {
  const items = await db.upcomingDress.findMany({ orderBy: { createdAt: "desc" } });
  response.json(items.map((item) => ({ ...item, mainImages: item.mainImages.map((id) => imageUrl(request, id)), workingImages: item.workingImages.map((id) => imageUrl(request, id)) })));
}));

app.post("/api/upcoming", requireAdmin, upload.fields([{ name: "mainImages", maxCount: 10 }, { name: "workingImages", maxCount: 10 }]), asyncRoute(async (request, response) => {
  const values = z.object({ title: z.string().trim().min(1).max(160), status: z.string().trim().min(1).max(80), description: z.string().trim().min(1).max(5000) }).parse(request.body);
  const files = request.files as Record<string, Express.Multer.File[]> | undefined;
  const mainFiles = files?.mainImages ?? [];
  const workingFiles = files?.workingImages ?? [];
  if (!mainFiles.length) return response.status(400).json({ message: "At least one main image is required." });
  const saved: Array<{ fileId: string; fileName: string }> = [];
  try {
    for (const file of [...mainFiles, ...workingFiles]) {
      const result = await persistUpload(file, request);
      if (!result.complete) throw new Error("Chunked uploads are not supported for grouped upcoming images.");
      saved.push({ fileId: result.fileId, fileName: result.fileName });
    }
    const mainImages = saved.slice(0, mainFiles.length).map((file) => file.fileId);
    const workingImages = saved.slice(mainFiles.length).map((file) => file.fileId);
    const item = await db.upcomingDress.create({ data: { ...values, mainImages, workingImages } });
    response.status(201).json({ ...item, mainImages: mainImages.map((id) => imageUrl(request, id)), workingImages: workingImages.map((id) => imageUrl(request, id)) });
  } catch (error) {
    await Promise.all(saved.map((file) => removeStoredFile(file.fileName)));
    await Promise.all([...mainFiles, ...workingFiles].map((file) => fs.rm(file.path, { force: true })));
    throw error;
  }
}));

app.post("/api/auth/login", rateLimit(10, 15 * 60 * 1000), asyncRoute(async (request, response) => {
  const { email, password } = z.object({ email: z.string().trim().email(), password: z.string().min(8).max(200) }).parse(request.body);
  const admin = await db.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) return response.status(401).json({ message: "Invalid email or password." });
  const labels = Array.isArray(admin.labels) ? admin.labels : [];
  if (!labels.includes("admin")) return response.status(403).json({ message: "This account is not an administrator." });
  await createSession(admin.id, response);
  response.json({ id: admin.id, email: admin.email, labels });
}));

app.post("/api/auth/logout", asyncRoute(async (request, response) => {
  await destroySession(request, response);
  response.status(204).end();
}));

app.get("/api/auth/me", asyncRoute(async (request, response) => {
  const admin = await readAdmin(request);
  if (!admin) return response.status(401).json({ message: "Not authenticated." });
  response.json(admin);
}));

app.post("/api/auth/recovery", rateLimit(5, 60 * 60 * 1000), asyncRoute(async (request, response) => {
  const email = z.string().trim().email().parse(request.body.email).toLowerCase();
  const admin = await db.admin.findUnique({ where: { email } });
  if (admin) {
    const token = randomBytes(32).toString("base64url");
    await db.passwordResetToken.create({ data: { adminId: admin.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const resetUrl = `${config.PUBLIC_APP_URL}/admin/reset-password?secret=${encodeURIComponent(token)}`;
    if (config.SMTP_HOST) {
      const transporter = nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE, auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined });
      await transporter.sendMail({
        from: config.SMTP_FROM,
        to: admin.email,
        subject: "Reset your Senganthal admin password",
        text: `Open this link within one hour to reset your password: ${resetUrl}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdf6ee;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6ee;padding:40px 16px">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(38,0,1,0.08)">
  <tr><td style="background:linear-gradient(135deg,#260001 0%,#4a0e0e 100%);padding:36px 32px;text-align:center">
    <div style="font-size:28px;font-weight:700;color:#c8922a;letter-spacing:0.04em;font-family:Georgia,'Times New Roman',serif">Senganthal</div>
    <div style="font-size:12px;color:rgba(200,146,42,0.7);letter-spacing:0.2em;text-transform:uppercase;margin-top:4px">Boutique</div>
  </td></tr>
  <tr><td style="padding:40px 32px 16px;text-align:center">
    <div style="width:56px;height:56px;margin:0 auto 20px;background:#fdf6ee;border-radius:50%;line-height:56px;font-size:24px">&#128274;</div>
    <h1 style="margin:0 0 12px;color:#260001;font-size:22px;font-weight:700">Password Reset</h1>
    <p style="margin:0 0 28px;color:#5a4040;font-size:15px;line-height:1.6">We received a request to reset your admin password. Click the button below to choose a new password.</p>
    <a href="${resetUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#c8922a 0%,#a67720 100%);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.02em">Reset Password</a>
  </td></tr>
  <tr><td style="padding:24px 32px 36px;text-align:center">
    <p style="margin:0 0 16px;color:#8a7070;font-size:13px;line-height:1.5">This link will expire in <strong style="color:#6f1d1d">1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
    <div style="border-top:1px solid #f0e6e0;padding-top:20px;margin-top:8px">
      <p style="margin:0;color:#b8a8a0;font-size:11px;line-height:1.5">If the button doesn't work, copy and paste this link:<br>
      <a href="${resetUrl}" style="color:#c8922a;word-break:break-all;font-size:11px">${resetUrl}</a></p>
    </div>
  </td></tr>
  <tr><td style="background:#faf5f0;padding:20px 32px;text-align:center;border-top:1px solid #f0e6e0">
    <p style="margin:0;color:#b8a8a0;font-size:11px">&copy; Senganthal Boutique. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
      });
    } else if (!config.isProduction) console.info(`[development] Password reset: ${resetUrl}`);
  }
  response.json({ ok: true, message: "If that admin account exists, a reset link has been sent." });
}));

app.put("/api/auth/recovery", rateLimit(10, 60 * 60 * 1000), asyncRoute(async (request, response) => {
  const { secret, password } = z.object({ secret: z.string().min(20), password: z.string().min(8).max(200) }).parse(request.body);
  const token = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(secret) } });
  if (!token || token.usedAt || token.expiresAt <= new Date()) return response.status(400).json({ message: "This reset link is invalid or expired." });
  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.admin.update({ where: { id: token.adminId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    db.adminSession.deleteMany({ where: { adminId: token.adminId } }),
  ]);
  response.json({ ok: true });
}));

app.use("/api", (_request, response) => response.status(404).json({ message: "API route not found." }));
if (config.isProduction) {
  const frontendDir = path.resolve(process.cwd(), "dist");
  app.use(express.static(frontendDir));
  app.get("/{*splat}", (_request, response) => response.sendFile(path.join(frontendDir, "index.html")));
}
app.use((_request, response) => response.status(404).json({ message: "Route not found." }));
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  void _next;
  console.error(error);
  if (error instanceof ZodError) return response.status(400).json({ message: "Invalid request data.", issues: error.issues });
  const typed = error as { status?: number; code?: string; message?: string };
  if (typed.code === "P2025") return response.status(404).json({ message: "Record not found." });
  if (typed.code === "P2002") return response.status(409).json({ message: "That record already exists." });
  response.status(typed.status ?? 500).json({ message: typed.status ? typed.message : "An unexpected server error occurred." });
});

await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
await db.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] } });

const server = app.listen(config.PORT, () => console.info(`Senganthal API listening on http://localhost:${config.PORT}`));

async function shutdown() {
  server.close();
  await db.$disconnect();
}
process.on("SIGINT", () => { void shutdown(); });
process.on("SIGTERM", () => { void shutdown(); });

export { app };
