import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createRandomToken,
  formatEmailToken,
  parseEmailToken,
} from "./random-token.js";

describe("createRandomToken", () => {
  it("URL-safe な文字列を返す", () => {
    const token = createRandomToken();
    assert.ok(token.length >= 40);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  });

  it("呼び出すたびに異なる値になる", () => {
    const a = createRandomToken();
    const b = createRandomToken();
    assert.notEqual(a, b);
  });
});

describe("formatEmailToken / parseEmailToken", () => {
  it("id と secret を往復できる", () => {
    const formatted = formatEmailToken("tok-1", "secret-value");
    assert.equal(formatted, "tok-1.secret-value");
    assert.deepEqual(parseEmailToken(formatted), {
      id: "tok-1",
      secret: "secret-value",
    });
  });

  it("不正な形式は null を返す", () => {
    assert.equal(parseEmailToken(""), null);
    assert.equal(parseEmailToken("no-dot"), null);
    assert.equal(parseEmailToken(".onlysecret"), null);
    assert.equal(parseEmailToken("onlyid."), null);
  });
});
