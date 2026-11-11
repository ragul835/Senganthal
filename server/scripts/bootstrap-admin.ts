import bcrypt from "bcrypt";
import { loadEnvFile } from "node:process";
import { PrismaClient } from "../generated/prisma/index.js";

try { loadEnvFile(); } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 8) throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters.");

const db = new PrismaClient();
try {
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await db.admin.upsert({ where: { email }, update: { passwordHash, labels: ["admin"] }, create: { email, passwordHash, labels: ["admin"] } });
  console.info(`Admin ready: ${admin.email}`);
} finally { await db.$disconnect(); }
