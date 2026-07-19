import type { Request } from "express";
import {
  ObjectStorageImpl,
  type ObjectStorage,
} from "./object-storage.js";

/** リクエストから ObjectStorage を取得（app.locals） */
export function getObjectStorage(req: Request): ObjectStorage {
  const storage = req.app.locals.objectStorage as ObjectStorage | undefined;
  if (!storage) {
    throw new Error("object storage is not configured");
  }
  return storage;
}

/** 本番起動時のデフォルト（S3 実装は未接続） */
export function getObjectStorageImpl(): ObjectStorage {
  return new ObjectStorageImpl();
}
