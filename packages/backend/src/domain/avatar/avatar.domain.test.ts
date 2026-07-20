import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAvatarCreatable,
  assertAvatarDeletable,
  assertAvatarImageValid,
  assertAvatarOwnedByUser,
  AVATAR_IMAGE_MAX_BYTES,
  AVATAR_LIMIT_GUEST,
  AVATAR_LIMIT_REGISTERED,
  buildAvatarImageUrl,
  buildAvatarObjectKey,
  ensureAvatarExists,
  getAvatarLimit,
  normalizeAvatarName,
} from "./index.js";
import {
  AvatarAccessDeniedError,
  AvatarLimitExceededError,
  AvatarMinimumRequiredError,
  AvatarNotFoundError,
  InvalidAvatarImageError,
} from "../../shared/errors.js";

describe("getAvatarLimit", () => {
  it("登録済みは 10、ゲストは 1", () => {
    assert.equal(getAvatarLimit(false), AVATAR_LIMIT_REGISTERED);
    assert.equal(getAvatarLimit(true), AVATAR_LIMIT_GUEST);
  });
});

describe("assertAvatarCreatable", () => {
  it("上限未満なら通す", () => {
    assert.doesNotThrow(() => assertAvatarCreatable(false, 0));
    assert.doesNotThrow(() => assertAvatarCreatable(false, 9));
    assert.doesNotThrow(() => assertAvatarCreatable(true, 0));
  });

  it("上限以上なら拒否する", () => {
    assert.throws(
      () => assertAvatarCreatable(false, 10),
      AvatarLimitExceededError,
    );
    assert.throws(() => assertAvatarCreatable(true, 1), AvatarLimitExceededError);
  });
});

describe("assertAvatarOwnedByUser", () => {
  it("所有者なら通す", () => {
    assert.doesNotThrow(() => assertAvatarOwnedByUser("u1", "u1"));
  });

  it("他人なら拒否する", () => {
    assert.throws(
      () => assertAvatarOwnedByUser("u1", "u2"),
      AvatarAccessDeniedError,
    );
  });
});

describe("assertAvatarDeletable", () => {
  it("2件以上なら通す", () => {
    assert.doesNotThrow(() => assertAvatarDeletable(2));
  });

  it("1件以下なら拒否する", () => {
    assert.throws(() => assertAvatarDeletable(1), AvatarMinimumRequiredError);
    assert.throws(() => assertAvatarDeletable(0), AvatarMinimumRequiredError);
  });
});

describe("buildAvatarObjectKey / buildAvatarImageUrl", () => {
  it("キーと公開 URL を組み立てる", () => {
    assert.equal(buildAvatarObjectKey("abc"), "avatars/abc");
    assert.equal(
      buildAvatarImageUrl("abc", "https://cdn.example.com/"),
      "https://cdn.example.com/avatars/abc",
    );
  });
});

describe("ensureAvatarExists", () => {
  it("null なら NotFound", () => {
    assert.throws(() => ensureAvatarExists(null), AvatarNotFoundError);
  });

  it("あれば返す", () => {
    const avatar = {
      id: "a1",
      userId: "u1",
      name: "N",
      imageUrl: "https://example.com/a",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    assert.equal(ensureAvatarExists(avatar), avatar);
  });
});

describe("assertAvatarImageValid", () => {
  it("jpeg かつ非空なら通す", () => {
    assert.doesNotThrow(() =>
      assertAvatarImageValid(Buffer.from("x"), "image/jpeg"),
    );
  });

  it("不正 MIME / 空 / 超過を拒否する", () => {
    assert.throws(
      () => assertAvatarImageValid(Buffer.from("x"), "image/gif"),
      InvalidAvatarImageError,
    );
    assert.throws(
      () => assertAvatarImageValid(Buffer.alloc(0), "image/png"),
      InvalidAvatarImageError,
    );
    assert.throws(
      () =>
        assertAvatarImageValid(
          Buffer.alloc(AVATAR_IMAGE_MAX_BYTES + 1),
          "image/png",
        ),
      InvalidAvatarImageError,
    );
  });
});

describe("normalizeAvatarName", () => {
  it("trim し空ならフォールバック", () => {
    assert.equal(normalizeAvatarName("  A  "), "A");
    assert.equal(normalizeAvatarName("   "), "Avatar");
  });
});
