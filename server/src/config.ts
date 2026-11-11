import path from "node:path";
import { loadEnvFile } from "node:process";
import { z } from "zod";

try { loadEnvFile(); } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const parsed = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  SESSION_SECRET: z.string().min(32).default("development-only-secret-change-me-now"),
  UPLOAD_DIR: z.string().default("./server/uploads"),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:5173"),
  SMTP_HOST: z.string().optional().transform(v => v || undefined),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.string().default("false").transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default("Senganthal <no-reply@example.com>"),
}).parse(process.env);

if (parsed.NODE_ENV === "production" && parsed.SESSION_SECRET.startsWith("development")) {
  throw new Error("SESSION_SECRET must be configured in production.");
}

export const config = {
  ...parsed,
  uploadDir: path.resolve(parsed.UPLOAD_DIR),
  isProduction: parsed.NODE_ENV === "production",
};
