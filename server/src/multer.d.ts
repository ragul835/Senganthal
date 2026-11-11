declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }
  }
}

declare module "multer" {
  import type { RequestHandler } from "express";
  type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;
  type Options = {
    dest?: string;
    limits?: { fileSize?: number; files?: number };
    fileFilter?: (request: import("express").Request, file: Express.Multer.File, callback: FileFilterCallback) => void;
  };
  type Multer = {
    single(fieldName: string): RequestHandler;
    fields(fields: Array<{ name: string; maxCount?: number }>): RequestHandler;
  };
  export default function multer(options?: Options): Multer;
}

