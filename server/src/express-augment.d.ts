import type {} from "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    file?: Express.Multer.File;
    files?: Record<string, Express.Multer.File[]> | Express.Multer.File[];
  }
}
