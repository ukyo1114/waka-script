import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Response } from "express";
import { z } from "zod";
import { parseWithSchema } from "./validation.js";

function createMockRes() {
  const state: { statusCode?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, state };
}

describe("parseWithSchema", () => {
  const schema = z.object({
    email: z.string().email(),
  });

  it("成功時は data を返す", () => {
    const { res, state } = createMockRes();
    const result = parseWithSchema(
      schema,
      { email: "a@example.com" },
      res,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.email, "a@example.com");
    }
    assert.equal(state.statusCode, undefined);
  });

  it("失敗時は 400 validation_error を返す", () => {
    const { res, state } = createMockRes();
    const result = parseWithSchema(schema, { email: "bad" }, res);
    assert.equal(result.ok, false);
    assert.equal(state.statusCode, 400);
    assert.deepEqual(
      (state.body as { error: string }).error,
      "validation_error",
    );
  });
});
