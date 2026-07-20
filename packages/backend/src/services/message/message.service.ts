import { randomUUID } from "node:crypto";
import {
  CHANNEL_MESSAGE_CONTEXT,
  MESSAGE_LIST_LIMIT,
  MessageType,
  SYSTEM_SENDER_ID,
  assertCanAccessMessageType,
  buildGameMessageContext,
  ensureMessageBelongsToRoom,
  ensureMessageBelongsToType,
  ensureMessageCountWithinLimit,
  ensureMessageExists,
  validateReplyToMessage,
  type Message,
  type MessageSendContext,
} from "../../domain/message/index.js";
import {
  ensureOwnedChannelParticipant,
} from "../../domain/channel/index.js";
import { ensureOwnedPlayerForGame } from "../../domain/player/index.js";
import type { ChannelParticipantRepository } from "../../repositories/channel-participant/index.js";
import type { ChannelRepository } from "../../repositories/channel/index.js";
import type { GameRepository } from "../../repositories/game/index.js";
import type { MessageRepository } from "../../repositories/message/index.js";
import type { PlayerRepository } from "../../repositories/player/index.js";
import {
  NotImplementedError,
  RoomNotFoundError,
} from "../../shared/errors.js";

export type MessageServiceDeps = {
  channels: ChannelRepository;
  channelParticipants: ChannelParticipantRepository;
  games: GameRepository;
  players: PlayerRepository;
  messages: MessageRepository;
};

export type CreateMessageInput = {
  roomId: string;
  senderId: string;
  userId: string;
  messageType: MessageType;
  content: string;
  replyToMessageId?: string;
};

export type CreateMessageResult = {
  message: Message;
  previousMessageId: string | null;
};

export type ListMessagesInput = {
  roomId: string;
  senderId: string;
  userId: string;
  messageType: MessageType;
  beforeMessageId?: string;
};

export type ListMessagesAfterInput = {
  roomId: string;
  senderId: string;
  userId: string;
  messageType: MessageType;
  afterMessageId: string;
};

export type ListMessageRepliesInput = {
  roomId: string;
  senderId: string;
  userId: string;
  messageId: string;
};

export type ListMessageRepliesResult = {
  replyToMessageId: string;
  replyMessageIds: string[];
};

/**
 * チャンネル（ゲーム開始前）とゲーム（開始後）の両方のルームでメッセージの
 * 取得・作成・返信参照を担う。ルームの種別・アクセス可否はドメイン層に委譲する。
 */
export class MessageService {
  constructor(private readonly deps?: MessageServiceDeps) {}

  private requireDeps(): MessageServiceDeps {
    if (!this.deps) throw new NotImplementedError("message.repositories");
    return this.deps;
  }

  /** ルームがチャンネルかゲームかを判別し、送受信コンテキストを構築する */
  private async resolveContext(
    roomId: string,
    senderId: string,
    userId: string,
  ): Promise<MessageSendContext> {
    const deps = this.requireDeps();

    const channel = await deps.channels.findById(roomId);
    if (channel && !channel.deletedAt) {
      ensureOwnedChannelParticipant(
        await deps.channelParticipants.findActiveById(senderId),
        roomId,
        userId,
      );
      return CHANNEL_MESSAGE_CONTEXT;
    }

    const game = await deps.games.findById(roomId);
    if (game && !game.deletedAt) {
      const player = ensureOwnedPlayerForGame(
        await deps.players.findActiveById(senderId),
        roomId,
        userId,
      );
      return buildGameMessageContext({
        player,
        endedAt: game.endedAt,
        processing: game.processing,
      });
    }

    throw new RoomNotFoundError();
  }

  async create(input: CreateMessageInput): Promise<CreateMessageResult> {
    const deps = this.requireDeps();
    const context = await this.resolveContext(
      input.roomId,
      input.senderId,
      input.userId,
    );
    assertCanAccessMessageType(context, input.messageType, "send");

    let replyToMessageId: string | null = null;
    if (input.replyToMessageId) {
      const replyTarget = await deps.messages.findById(input.replyToMessageId);
      validateReplyToMessage(replyTarget, input.roomId, input.messageType);
      replyToMessageId = input.replyToMessageId;
    }

    const previous = await deps.messages.findLatestByRoomAndType(
      input.roomId,
      input.messageType,
    );

    const message = await deps.messages.create({
      id: randomUUID(),
      roomId: input.roomId,
      senderId: input.senderId,
      content: input.content.trim(),
      messageType: input.messageType,
      replyToMessageId,
    });

    return { message, previousMessageId: previous?.id ?? null };
  }

  /** サーバー内部専用。権限チェックなしでシステムメッセージを作成する */
  async createSystemMessage(
    roomId: string,
    content: string,
  ): Promise<CreateMessageResult> {
    const deps = this.requireDeps();
    const previous = await deps.messages.findLatestByRoomAndType(
      roomId,
      MessageType.SYSTEM,
    );
    const message = await deps.messages.create({
      id: randomUUID(),
      roomId,
      senderId: SYSTEM_SENDER_ID,
      content,
      messageType: MessageType.SYSTEM,
      replyToMessageId: null,
    });
    return { message, previousMessageId: previous?.id ?? null };
  }

  /** beforeMessageId より前を遡って取得する（作成日時の降順） */
  async list(input: ListMessagesInput): Promise<Message[]> {
    const deps = this.requireDeps();
    const context = await this.resolveContext(
      input.roomId,
      input.senderId,
      input.userId,
    );
    assertCanAccessMessageType(context, input.messageType, "receive");

    return deps.messages.listByRoomAndTypeBefore(
      input.roomId,
      input.messageType,
      input.beforeMessageId,
      MESSAGE_LIST_LIMIT,
    );
  }

  /** afterMessageId 以降を取得する（作成日時の昇順・50件超は拒否） */
  async listAfter(input: ListMessagesAfterInput): Promise<Message[]> {
    const deps = this.requireDeps();
    const context = await this.resolveContext(
      input.roomId,
      input.senderId,
      input.userId,
    );
    assertCanAccessMessageType(context, input.messageType, "receive");

    const raw = await deps.messages.findById(input.afterMessageId);
    const afterMessage = ensureMessageExists(raw);
    ensureMessageBelongsToRoom(afterMessage, input.roomId);
    ensureMessageBelongsToType(afterMessage, input.messageType);

    const messages = await deps.messages.listByRoomAndTypeAfter(
      input.roomId,
      input.messageType,
      input.afterMessageId,
      MESSAGE_LIST_LIMIT + 1,
    );
    ensureMessageCountWithinLimit(messages.length, MESSAGE_LIST_LIMIT);
    return messages;
  }

  /** 返信先メッセージIDと、同じ返信先を持つメッセージIDの配列を取得する */
  async listReplies(
    input: ListMessageRepliesInput,
  ): Promise<ListMessageRepliesResult> {
    const deps = this.requireDeps();
    const raw = await deps.messages.findById(input.messageId);
    const message = ensureMessageExists(raw);
    ensureMessageBelongsToRoom(message, input.roomId);

    const context = await this.resolveContext(
      input.roomId,
      input.senderId,
      input.userId,
    );
    assertCanAccessMessageType(context, message.messageType, "receive");

    const replyToMessageId = message.replyToMessageId ?? message.id;
    const replies = await deps.messages.listByReplyToMessageId(
      input.roomId,
      replyToMessageId,
      input.messageId,
    );

    return {
      replyToMessageId,
      replyMessageIds: replies.map((m) => m.id),
    };
  }
}
