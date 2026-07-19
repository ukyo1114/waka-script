import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  signAccessToken,
  verifyAccessToken,
} from "./access-token.js";
import { InvalidAccessTokenError } from "./errors.js";

const secret = "unit-test-access-jwt";

describe("signAccessToken / verifyAccessToken", () => {
  it("署名したクレームを検証できる", async () => {
    const token = await signAccessToken({ userId: "user-1", secret });
    const claims = await verifyAccessToken({ token, secret });
    assert.equal(claims.userId, "user-1");
  });

  it("秘密鍵が違うと検証に失敗する", async () => {
    const token = await signAccessToken({ userId: "user-1", secret });
    await assert.rejects(
      () => verifyAccessToken({ token, secret: "other" }),
      InvalidAccessTokenError,
    );
  });
});
