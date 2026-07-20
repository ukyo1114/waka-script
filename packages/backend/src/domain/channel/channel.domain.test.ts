import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertGuestAllowed,
  assertGuestCanCreateChannel,
  assertJoinAllowed,
  assertChannelAdmin,
  assertChannelAdminCannotLeave,
  assertChannelPasswordMatches,
  buildGameSettings,
  ensureChannelExists,
  ensureOwnedChannelParticipant,
  getCountToStartGame,
  isCountReachedToStartGame,
  isPasswordProtected,
  resolveSettingsForCreate,
  resolveSettingsForUpdate,
  GamePhase,
  type Channel,
} from "./index.js";
import {
  ChannelAdminCannotLeaveError,
  ChannelGuestNotAllowedError,
  ChannelNotFoundError,
  ChannelParticipantNotFoundError,
  ChannelPasswordRequiredError,
  GuestActionNotAllowedError,
  InvalidChannelPasswordError,
  NotChannelAdminError,
} from "../../shared/errors.js";

function channel(overrides: Partial<Channel> = {}): Channel {
  const now = new Date();
  return {
    id: "ch-1",
    adminId: "av-1",
    adminUserId: "user-admin",
    title: "Lobby",
    description: "",
    settings: {
      passwordHash: null,
      passwordEnabled: false,
      guestAllowed: true,
    },
    gameSettings: buildGameSettings(),
    entryProcessing: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("assertGuestCanCreateChannel", () => {
  it("ゲストは作成できない", () => {
    assert.throws(() => assertGuestCanCreateChannel(true), GuestActionNotAllowedError);
  });

  it("登録ユーザーは通す", () => {
    assert.doesNotThrow(() => assertGuestCanCreateChannel(false));
  });
});

describe("assertGuestAllowed / isPasswordProtected", () => {
  it("ゲスト不可のときゲストを拒否する", () => {
    assert.throws(
      () =>
        assertGuestAllowed(
          { passwordHash: null, passwordEnabled: false, guestAllowed: false },
          true,
        ),
      ChannelGuestNotAllowedError,
    );
  });

  it("ハッシュと enabled で保護を判定する", () => {
    assert.equal(
      isPasswordProtected({
        passwordHash: "hash",
        passwordEnabled: true,
        guestAllowed: true,
      }),
      true,
    );
    assert.equal(
      isPasswordProtected({
        passwordHash: null,
        passwordEnabled: true,
        guestAllowed: true,
      }),
      false,
    );
  });
});

describe("resolveSettingsForCreate", () => {
  it("passwordEnabled でパスワード必須", () => {
    assert.throws(
      () => resolveSettingsForCreate({ passwordEnabled: true }),
      ChannelPasswordRequiredError,
    );
  });

  it("デフォルトはゲスト可・パスワード無効", () => {
    const { settings, passwordPlain } = resolveSettingsForCreate();
    assert.equal(settings.guestAllowed, true);
    assert.equal(settings.passwordEnabled, false);
    assert.equal(passwordPlain, undefined);
  });
});

describe("resolveSettingsForUpdate", () => {
  it("有効化時に既存 hash も新規 password もなければ拒否", () => {
    assert.throws(
      () =>
        resolveSettingsForUpdate(
          { passwordHash: null, passwordEnabled: false, guestAllowed: true },
          { passwordEnabled: true },
        ),
      ChannelPasswordRequiredError,
    );
  });

  it("既存 hash があればパスワード無しで有効化できる", () => {
    const { next } = resolveSettingsForUpdate(
      { passwordHash: "x", passwordEnabled: false, guestAllowed: true },
      { passwordEnabled: true },
    );
    assert.equal(next.passwordEnabled, true);
  });
});

describe("assertJoinAllowed", () => {
  it("null は not found", () => {
    assert.throws(() => assertJoinAllowed(null, false, undefined), ChannelNotFoundError);
  });

  it("保護チャンネルで password 未指定は拒否", () => {
    assert.throws(
      () =>
        assertJoinAllowed(
          channel({
            settings: {
              passwordHash: "h",
              passwordEnabled: true,
              guestAllowed: true,
            },
          }),
          false,
          undefined,
        ),
      ChannelPasswordRequiredError,
    );
  });
});

describe("assertChannelAdmin / ensureChannelExists", () => {
  it("管理者以外は拒否", () => {
    assert.throws(
      () => assertChannelAdmin("admin", "other"),
      NotChannelAdminError,
    );
  });

  it("削除済みは not found", () => {
    assert.throws(
      () => ensureChannelExists(channel({ deletedAt: new Date() })),
      ChannelNotFoundError,
    );
  });
});

describe("assertChannelAdminCannotLeave", () => {
  it("管理者は退出拒否", () => {
    assert.throws(
      () => assertChannelAdminCannotLeave("admin", "admin"),
      ChannelAdminCannotLeaveError,
    );
  });

  it("一般参加者は通す", () => {
    assert.doesNotThrow(() =>
      assertChannelAdminCannotLeave("admin", "member"),
    );
  });
});

describe("buildGameSettings", () => {
  it("デフォルトのフェーズ時間を埋める", () => {
    const gs = buildGameSettings({ roles: { VILLAGER: 4 } });
    assert.equal(gs.roles.VILLAGER, 4);
    assert.equal(gs.phaseDurations[GamePhase.DAY], 10);
  });
});

describe("getCountToStartGame / isCountReachedToStartGame", () => {
  it("roles 合計と到達判定", async () => {
    const { getCountToStartGame, isCountReachedToStartGame } = await import(
      "./index.js"
    );
    const gs = buildGameSettings({ roles: { VILLAGER: 2, WEREWOLF: 1 } });
    assert.equal(getCountToStartGame(gs), 3);
    assert.equal(isCountReachedToStartGame(gs, 3), true);
    assert.equal(isCountReachedToStartGame(gs, 2), false);
  });
});

describe("ensureOwnedChannelParticipant", () => {
  it("本人かつ同チャンネルなら通す", () => {
    const now = new Date();
    const participant = {
      id: "p1",
      channelId: "ch-1",
      userId: "u1",
      avatarId: "a1",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    assert.equal(
      ensureOwnedChannelParticipant(participant, "ch-1", "u1"),
      participant,
    );
  });

  it("不一致は NotFound", () => {
    const now = new Date();
    const participant = {
      id: "p1",
      channelId: "ch-1",
      userId: "u1",
      avatarId: "a1",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    assert.throws(
      () => ensureOwnedChannelParticipant(participant, "ch-1", "u2"),
      ChannelParticipantNotFoundError,
    );
    assert.throws(
      () => ensureOwnedChannelParticipant(null, "ch-1", "u1"),
      ChannelParticipantNotFoundError,
    );
  });
});

describe("assertChannelPasswordMatches", () => {
  it("不一致のみ拒否", () => {
    assert.doesNotThrow(() => assertChannelPasswordMatches(true));
    assert.throws(
      () => assertChannelPasswordMatches(false),
      InvalidChannelPasswordError,
    );
  });
});
