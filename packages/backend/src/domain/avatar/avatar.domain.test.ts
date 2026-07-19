import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAvatarCreatable,
  assertAvatarDeletable,
  assertAvatarOwnedByUser,
  AVATAR_LIMIT_GUEST,
  AVATAR_LIMIT_REGISTERED,
  buildAvatarImageUrl,
  buildAvatarObjectKey,
  getAvatarLimit,
} from "./index.js";
import {
  AvatarAccessDeniedError,
  AvatarLimitExceededError,
  AvatarMinimumRequiredError,
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
