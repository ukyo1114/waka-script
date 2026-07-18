import type { Response } from "express";

export type JsonBody = Record<string, unknown>;

export function readString(body: JsonBody, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" ? value.trim() : undefined;
}

export function badRequest(res: Response, message: string) {
  return res.status(400).json({ error: message });
}

export function notImplemented(res: Response, endpoint: string) {
  return res.status(501).json({
    error: "not_implemented",
    endpoint,
    message: "DB / auth logic will be implemented later",
  });
}
