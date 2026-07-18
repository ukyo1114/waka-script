import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  signEmailActionToken,
  verifyEmailActionToken,
} from "./jwt.js";

const secret = "unit-test-jwt-secret";

describe("signEmailActionToken / verifyEmailActionToken", () => {
  it("署名したクレームを検証できる", async () => {
    const token = await signEmailActionToken({
      email: "a@example.com",
      purpose: "register",
      userId: null,
      secret,
    });
    const claims = await verifyEmailActionToken({ token, secret });
    assert.equal(claims.email, "a@example.com");
    assert.equal(claims.purpose, "register");
    assert.equal(claims.userId, null);
  });

  it("userId 付きクレームを往復できる", async () => {
    const token = await signEmailActionToken({
      email: "u@example.com",
      purpose: "password-reset",
      userId: "user-1",
      secret,
    });
    const claims = await verifyEmailActionToken({ token, secret });
    assert.equal(claims.userId, "user-1");
    assert.equal(claims.purpose, "password-reset");
  });

  it("秘密鍵が違うと検証に失敗する", async () => {
    const token = await signEmailActionToken({
      email: "a@example.com",
      purpose: "email-change",
      userId: null,
      secret,
    });
    await assert.rejects(() =>
      verifyEmailActionToken({ token, secret: "other-secret" }),
    );
  });
});
