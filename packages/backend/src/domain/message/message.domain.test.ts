import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlayerRole, PlayerStatus, type Player } from "../player/index.js";
import {
  MessageAccessDeniedError,
  MessageCountLimitExceededError,
  MessageNotFoundError,
  MessageRoomMismatchError,
  MessageTypeMismatchError,
} from "../../shared/errors.js";
import {
  CHANNEL_MESSAGE_CONTEXT,
  assertCanAccessMessageType,
  canReceiveMessageType,
  canSendMessageType,
  ensureMessageBelongsToRoom,
  ensureMessageBelongsToType,
  ensureMessageCountWithinLimit,
  ensureMessageExists,
  getMessageSenderRoleFromPlayer,
  validateReplyToMessage,
} from "./message.domain.js";
import { MessageType, type Message } from "./message.types.js";

function buildPlayer(overrides: Partial<Player> = {}): Player {
  const now = new Date();
  return {
    id: "player-1",
    gameId: "game-1",
    avatarId: "avatar-1",
    userId: "user-1",
    name: "player",
    pictureUrl: "https://example.com/p.png",
    role: PlayerRole.VILLAGER,
    status: PlayerStatus.ALIVE,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function buildMessage(overrides: Partial<Message> = {}): Message {
  const now = new Date();
  return {
    id: "message-1",
    roomId: "room-1",
    senderId: "sender-1",
    content: "hello",
    messageType: MessageType.NORMAL,
    replyToMessageId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("getMessageSenderRoleFromPlayer", () => {
  it("死亡・非プレイヤーは SPECTATOR", () => {
    assert.equal(
      getMessageSenderRoleFromPlayer(buildPlayer({ status: PlayerStatus.DEAD })),
      "SPECTATOR",
    );
    assert.equal(
      getMessageSenderRoleFromPlayer(buildPlayer({ status: PlayerStatus.NON_PLAYER })),
      "SPECTATOR",
    );
  });

  it("生存人狼は WEREWOLF、生存共有者は SHARER、他は NORMAL", () => {
    assert.equal(
      getMessageSenderRoleFromPlayer(buildPlayer({ role: PlayerRole.WEREWOLF })),
      "WEREWOLF",
    );
    assert.equal(
      getMessageSenderRoleFromPlayer(buildPlayer({ role: PlayerRole.SHARER })),
      "SHARER",
    );
    assert.equal(
      getMessageSenderRoleFromPlayer(buildPlayer({ role: PlayerRole.VILLAGER })),
      "NORMAL",
    );
  });
});

describe("canSendMessageType / canReceiveMessageType", () => {
  it("チャンネルは NORMAL のみ送受信可能", () => {
    assert.equal(
      canSendMessageType(CHANNEL_MESSAGE_CONTEXT, MessageType.NORMAL),
      true,
    );
    assert.equal(
      canSendMessageType(CHANNEL_MESSAGE_CONTEXT, MessageType.WEREWOLF),
      false,
    );
  });

  it("人狼は NORMAL/WEREWOLF を送信でき、SPECTATOR は送信できない", () => {
    const context = { messageUserRole: "WEREWOLF" as const, isGameEnded: false, isProcessing: false };
    assert.equal(canSendMessageType(context, MessageType.NORMAL), true);
    assert.equal(canSendMessageType(context, MessageType.WEREWOLF), true);
    assert.equal(canSendMessageType(context, MessageType.SPECTATOR), false);
  });

  it("SYSTEM はクライアントから送信不可", () => {
    const context = { messageUserRole: "NORMAL" as const, isGameEnded: false, isProcessing: false };
    assert.equal(canSendMessageType(context, MessageType.SYSTEM), false);
  });

  it("処理中は送信不可", () => {
    const context = { messageUserRole: "NORMAL" as const, isGameEnded: false, isProcessing: true };
    assert.equal(canSendMessageType(context, MessageType.NORMAL), false);
  });

  it("ゲーム終了後は NORMAL のみ送信可能、受信は全タイプ可能", () => {
    const context = { messageUserRole: "SPECTATOR" as const, isGameEnded: true, isProcessing: false };
    assert.equal(canSendMessageType(context, MessageType.NORMAL), true);
    assert.equal(canSendMessageType(context, MessageType.WEREWOLF), false);
    assert.equal(canReceiveMessageType(context, MessageType.WEREWOLF), true);
  });

  it("観戦者は SYSTEM/NORMAL を受信できるが WEREWOLF は受信できない", () => {
    const context = { messageUserRole: "SPECTATOR" as const, isGameEnded: false, isProcessing: false };
    assert.equal(canReceiveMessageType(context, MessageType.NORMAL), true);
    assert.equal(canReceiveMessageType(context, MessageType.SYSTEM), true);
    assert.equal(canReceiveMessageType(context, MessageType.WEREWOLF), false);
  });
});

describe("assertCanAccessMessageType", () => {
  it("許可されないと MessageAccessDeniedError", () => {
    assert.throws(
      () =>
        assertCanAccessMessageType(CHANNEL_MESSAGE_CONTEXT, MessageType.WEREWOLF, "send"),
      MessageAccessDeniedError,
    );
  });

  it("許可されると通す", () => {
    assert.doesNotThrow(() =>
      assertCanAccessMessageType(CHANNEL_MESSAGE_CONTEXT, MessageType.NORMAL, "send"),
    );
  });
});

describe("ensureMessageExists", () => {
  it("null または削除済みは MessageNotFoundError", () => {
    assert.throws(() => ensureMessageExists(null), MessageNotFoundError);
    assert.throws(
      () => ensureMessageExists(buildMessage({ deletedAt: new Date() })),
      MessageNotFoundError,
    );
  });

  it("存在すればそのまま返す", () => {
    const message = buildMessage();
    assert.equal(ensureMessageExists(message), message);
  });
});

describe("ensureMessageBelongsToRoom / ensureMessageBelongsToType", () => {
  it("ルーム不一致は MessageRoomMismatchError", () => {
    assert.throws(
      () => ensureMessageBelongsToRoom(buildMessage({ roomId: "room-a" }), "room-b"),
      MessageRoomMismatchError,
    );
  });

  it("タイプ不一致は MessageTypeMismatchError", () => {
    assert.throws(
      () =>
        ensureMessageBelongsToType(
          buildMessage({ messageType: MessageType.NORMAL }),
          MessageType.WEREWOLF,
        ),
      MessageTypeMismatchError,
    );
  });
});

describe("validateReplyToMessage", () => {
  it("正しい返信先ならそのまま返す", () => {
    const message = buildMessage({ roomId: "room-1", messageType: MessageType.NORMAL });
    assert.equal(validateReplyToMessage(message, "room-1", MessageType.NORMAL), message);
  });

  it("存在しない・ルーム不一致・タイプ不一致は throw", () => {
    assert.throws(
      () => validateReplyToMessage(null, "room-1", MessageType.NORMAL),
      MessageNotFoundError,
    );
    assert.throws(
      () =>
        validateReplyToMessage(
          buildMessage({ roomId: "room-2" }),
          "room-1",
          MessageType.NORMAL,
        ),
      MessageRoomMismatchError,
    );
    assert.throws(
      () =>
        validateReplyToMessage(
          buildMessage({ roomId: "room-1", messageType: MessageType.WEREWOLF }),
          "room-1",
          MessageType.NORMAL,
        ),
      MessageTypeMismatchError,
    );
  });
});

describe("ensureMessageCountWithinLimit", () => {
  it("上限以下なら通す", () => {
    assert.doesNotThrow(() => ensureMessageCountWithinLimit(50, 50));
  });

  it("上限を超えたら MessageCountLimitExceededError", () => {
    assert.throws(
      () => ensureMessageCountWithinLimit(51, 50),
      MessageCountLimitExceededError,
    );
  });
});
