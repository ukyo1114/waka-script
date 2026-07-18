import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { hashSecret, verifySecret } from "./hash.js";

describe("hashSecret / verifySecret", () => {
  it("同じ平文を照合できる", async () => {
    const plain = "123456";
    const hashed = await hashSecret(plain);
    assert.equal(await verifySecret(plain, hashed), true);
  });

  it("異なる平文は照合に失敗する", async () => {
    const hashed = await hashSecret("123456");
    assert.equal(await verifySecret("654321", hashed), false);
  });

  it("呼び出しごとにソルトが変わりハッシュ文字列は異なる", async () => {
    const a = await hashSecret("password");
    const b = await hashSecret("password");
    assert.notEqual(a, b);
    assert.equal(await verifySecret("password", a), true);
    assert.equal(await verifySecret("password", b), true);
  });

  it("パスワード文字列をハッシュ化・照合できる", async () => {
    const password = "S3cure-P@ssw0rd!";
    const hashed = await hashSecret(password);
    assert.equal(await verifySecret(password, hashed), true);
  });

  it("長いトークン（72バイト超）もハッシュ化・照合できる", async () => {
    const token = randomBytes(64).toString("hex"); // 128 hex chars
    assert.ok(Buffer.byteLength(token, "utf8") > 72);
    const hashed = await hashSecret(token);
    assert.equal(await verifySecret(token, hashed), true);
    assert.equal(await verifySecret(token.slice(0, -1) + "0", hashed), false);
  });

  it("長いトークンは内部で SHA-256 してから bcrypt している", async () => {
    const token = "x".repeat(100);
    const hashed = await hashSecret(token);
    const prehashed = createHash("sha256").update(token).digest("hex");
    const bcrypt = await import("bcrypt");
    assert.equal(await bcrypt.compare(prehashed, hashed), true);
  });
});
