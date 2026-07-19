import type { Response } from "express";
import { z } from "zod";

/** 空でない文字列（前後空白は除去） */
export const nonEmptyString = z.string().trim().min(1);

export const emailString = nonEmptyString.email();

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false };

/**
 * Zod で値を検証する。失敗時は 400 validation_error を返す。
 */
export function parseWithSchema<T extends z.ZodType>(
  schema: T,
  value: unknown,
  res: Response,
): ParseResult<z.infer<T>> {
  const result = schema.safeParse(value);
  if (!result.success) {
    res.status(400).json({
      error: "validation_error",
      details: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return { ok: false };
  }
  return { ok: true, data: result.data };
}
