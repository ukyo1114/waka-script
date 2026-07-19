import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAvatarCreatable,
  AVATAR_LIMIT_GUEST,
  AVATAR_LIMIT_REGISTERED,
  getAvatarLimit,
} from "./index.js";
import { AvatarLimitExceededError } from "../../shared/errors.js";

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
