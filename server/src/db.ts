import { PrismaClient } from "../generated/prisma/index.js";

declare global {
  var senganthalPrisma: PrismaClient | undefined;
}

export const db = globalThis.senganthalPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.senganthalPrisma = db;
