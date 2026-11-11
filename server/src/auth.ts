import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { db } from "./db.js";
import { config } from "./config.js";

const COOKIE_NAME = "senganthal_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type AdminAccount = { id: string; email: string; labels: unknown };

declare module "express-serve-static-core" {
  interface Request { admin?: AdminAccount }
}

export function hashToken(token: string) {
  return createHash("sha256").update(`${config.SESSION_SECRET}:${token}`).digest("hex");
}

function parseCookies(header: string | undefined) {
  const cookies = new Map<string, string>();
  for (const part of header?.split(";") ?? []) {
    const [name, ...rest] = part.trim().split("=");
    if (name) cookies.set(name, decodeURIComponent(rest.join("=")));
  }
  return cookies;
}

export async function createSession(adminId: string, response: Response) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.adminSession.create({ data: { adminId, tokenHash: hashToken(token), expiresAt } });
  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(request: Request, response: Response) {
  const token = parseCookies(request.headers.cookie).get(COOKIE_NAME);
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  response.clearCookie(COOKIE_NAME, { httpOnly: true, secure: config.isProduction, sameSite: "lax", path: "/" });
}

export async function readAdmin(request: Request) {
  const token = parseCookies(request.headers.cookie).get(COOKIE_NAME);
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await db.adminSession.findUnique({ where: { tokenHash }, include: { admin: true } });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await db.adminSession.delete({ where: { id: session.id } });
    return null;
  }
  return { id: session.admin.id, email: session.admin.email, labels: session.admin.labels };
}

export async function requireAdmin(request: Request, response: Response, next: NextFunction) {
  try {
    const admin = await readAdmin(request);
    const labels = Array.isArray(admin?.labels) ? admin.labels : [];
    if (!admin || !labels.includes("admin")) return response.status(401).json({ message: "Administrator authentication required." });
    request.admin = admin;
    next();
  } catch (error) { next(error); }
}

export function safeTokenEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
