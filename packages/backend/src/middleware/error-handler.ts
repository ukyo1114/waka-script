import type { NextFunction, Request, Response } from "express";
import { handleControllerError } from "../shared/http.js";

/**
 * Express エラーミドルウェア。asyncHandler 経由で next(error) されたものを整形する。
 * 4 引数シグネチャが必須のため、未使用の next は残す。
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  return handleControllerError(res, error);
}
