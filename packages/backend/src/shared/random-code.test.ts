import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRandomCode } from "./random-code.js";

describe("createRandomCode", () => {
  it("6桁の数字文字列を返す", () => {
    const code = createRandomCode();
    assert.equal(code.length, 6);
    assert.match(code, /^\d{6}$/);
  });

  it("複数回呼んでも常に6桁の数字文字列を返す", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = createRandomCode();
      assert.equal(code.length, 6);
      assert.match(code, /^\d{6}$/);
    }
  });

  it("複数回呼ぶと異なるコードが含まれる", () => {
    const codes = new Set(Array.from({ length: 50 }, () => createRandomCode()));
    assert.ok(codes.size > 1);
  });
});
