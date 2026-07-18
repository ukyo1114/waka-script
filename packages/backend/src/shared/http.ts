import type { Response } from "express";
import { AppError, NotImplementedError } from "./errors.js";

export type JsonBody = Record<string, unknown>;

export function readString(body: JsonBody, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" ? value.trim() : undefined;
}

export function badRequest(res: Response, message: string) {
  return res.status(400).json({ error: message });
}

export function handleControllerError(res: Response, error: unknown) {
  if (error instanceof NotImplementedError) {
    return res.status(501).json({
      error: error.code,
      operation: error.operation,
      message: error.message,
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
  }

  console.error(error);
  return res.status(500).json({ error: "internal_server_error" });
}
