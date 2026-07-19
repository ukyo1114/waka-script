import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCannotBlockChannelAdmin,
  assertNotAlreadyBlocked,
  assertNotBlockedFromChannel,
  ensureBlockedUserExists,
  type BlockedUser,
} from "./index.js";
import {
  AlreadyBlockedError,
  BlockedUserNotFoundError,
  CannotBlockChannelAdminError,
  ChannelUserBlockedError,
} from "../../shared/errors.js";

function blocked(overrides: Partial<BlockedUser> = {}): BlockedUser {
  const now = new Date();
  return {
    id: "b1",
    channelId: "ch-1",
    userId: "user-2",
    avatarId: "av-2",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("assertCannotBlockChannelAdmin", () => {
  it("管理者自身は拒否する", () => {
    assert.throws(
      () => assertCannotBlockChannelAdmin("admin", "admin"),
      CannotBlockChannelAdminError,
    );
  });

  it("他ユーザーは通す", () => {
    assert.doesNotThrow(() => assertCannotBlockChannelAdmin("admin", "other"));
  });
});

describe("assertNotAlreadyBlocked / assertNotBlockedFromChannel", () => {
  it("既存ブロックなら拒否する", () => {
    assert.throws(
      () => assertNotAlreadyBlocked(blocked()),
      AlreadyBlockedError,
    );
    assert.throws(
      () => assertNotBlockedFromChannel(blocked()),
      ChannelUserBlockedError,
    );
  });

  it("なければ通す", () => {
    assert.doesNotThrow(() => assertNotAlreadyBlocked(null));
    assert.doesNotThrow(() => assertNotBlockedFromChannel(null));
  });
});

describe("ensureBlockedUserExists", () => {
  it("削除済みは not found", () => {
    assert.throws(
      () => ensureBlockedUserExists(blocked({ deletedAt: new Date() })),
      BlockedUserNotFoundError,
    );
  });
});
