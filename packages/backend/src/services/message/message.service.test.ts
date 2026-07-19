import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GamePhase, type Channel, type ChannelParticipant, type GameSettings } from "../../domain/channel/index.js";
import type { Game, GamePhaseInfo, GameLogEntry } from "../../domain/game/index.js";
import { MessageType, type Message } from "../../domain/message/index.js";
import { PlayerRole, PlayerStatus, type Player } from "../../domain/player/index.js";
import type {
  ChannelParticipantRepository,
  CreateChannelParticipantInput,
} from "../../repositories/channel-participant/index.js";
import type { ChannelRepository, UpdateChannelInput, CreateChannelInput } from "../../repositories/channel/index.js";
import type { CreateGameInput, GameRepository } from "../../repositories/game/index.js";
import type {
  CreateMessageInput,
  MessageRepository,
} from "../../repositories/message/index.js";
import type {
  CreatePlayerInput,
  PlayerRepository,
  UpdatePlayerInput,
} from "../../repositories/player/index.js";
import {
  ChannelParticipantNotFoundError,
  MessageAccessDeniedError,
  PlayerNotFoundError,
  RoomNotFoundError,
} from "../../shared/errors.js";
import { MessageService } from "./message.service.js";

class FakeChannelRepository implements ChannelRepository {
  items: Channel[] = [];
  async create(_input: CreateChannelInput): Promise<Channel> {
    throw new Error("unused");
  }
  async findById(id: string): Promise<Channel | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }
  async listActive(): Promise<Channel[]> {
    return this.items;
  }
  async update(_id: string, _input: UpdateChannelInput): Promise<Channel | null> {
    return null;
  }
  async acquireEntryProcessingLock(): Promise<Channel | null> {
    return null;
  }
  async releaseEntryProcessingLock(): Promise<void> {}
  async softDelete(): Promise<Channel | null> {
    return null;
  }
}

class FakeChannelParticipantRepository implements ChannelParticipantRepository {
  items: ChannelParticipant[] = [];
  async create(_input: CreateChannelParticipantInput): Promise<ChannelParticipant> {
    throw new Error("unused");
  }
  async findActiveById(id: string): Promise<ChannelParticipant | null> {
    return this.items.find((p) => p.id === id && !p.deletedAt) ?? null;
  }
  async findActiveByChannelIdAndUserId(): Promise<ChannelParticipant | null> {
    return null;
  }
  async findActiveByChannelIdAndAvatarId(): Promise<ChannelParticipant | null> {
    return null;
  }
  async listActiveChannelIdsByUserId(): Promise<string[]> {
    return [];
  }
  async softDeleteByChannelIdAndAvatarId(): Promise<ChannelParticipant | null> {
    return null;
  }
  async softDeleteByChannelIdAndUserId(): Promise<ChannelParticipant | null> {
    return null;
  }
}

class FakeGameRepository implements GameRepository {
  items: Game[] = [];
  async create(_input: CreateGameInput): Promise<Game> {
    throw new Error("unused");
  }
  async findById(id: string): Promise<Game | null> {
    return this.items.find((g) => g.id === id) ?? null;
  }
  async findActiveByChannelId(): Promise<Game | null> {
    return null;
  }
  async setProcessing(): Promise<Game | null> {
    return null;
  }
  async updatePhaseInfo(): Promise<Game | null> {
    return null;
  }
  async addLogs(): Promise<Game | null> {
    return null;
  }
  async replaceLogs(): Promise<Game | null> {
    return null;
  }
  async markEnded(): Promise<Game | null> {
    return null;
  }
}

class FakePlayerRepository implements PlayerRepository {
  items: Player[] = [];
  async create(_input: CreatePlayerInput): Promise<Player> {
    throw new Error("unused");
  }
  async createMany(): Promise<Player[]> {
    return [];
  }
  async findActiveById(id: string): Promise<Player | null> {
    return this.items.find((p) => p.id === id && !p.deletedAt) ?? null;
  }
  async findActiveByIdAndGameId(id: string, gameId: string): Promise<Player | null> {
    return this.items.find((p) => p.id === id && p.gameId === gameId && !p.deletedAt) ?? null;
  }
  async listActiveByGameId(gameId: string): Promise<Player[]> {
    return this.items.filter((p) => p.gameId === gameId && !p.deletedAt);
  }
  async update(_id: string, _input: UpdatePlayerInput): Promise<Player | null> {
    return null;
  }
  async findActiveByAvatarIdAndGameId(): Promise<Player | null> {
    return null;
  }
  async findActiveByUserIdAndGameId(): Promise<Player | null> {
    return null;
  }
}

class FakeMessageRepository implements MessageRepository {
  items: Message[] = [];
  async create(input: CreateMessageInput): Promise<Message> {
    const now = new Date();
    const message: Message = {
      id: input.id,
      roomId: input.roomId,
      senderId: input.senderId,
      content: input.content,
      messageType: input.messageType,
      replyToMessageId: input.replyToMessageId ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.items.push(message);
    return message;
  }
  async findById(id: string): Promise<Message | null> {
    return this.items.find((m) => m.id === id) ?? null;
  }
  async findLatestByRoomAndType(roomId: string, messageType: MessageType): Promise<Message | null> {
    const filtered = this.items.filter((m) => m.roomId === roomId && m.messageType === messageType);
    return filtered.at(-1) ?? null;
  }
  async listByRoomAndTypeBefore(roomId: string, messageType: MessageType): Promise<Message[]> {
    return this.items.filter((m) => m.roomId === roomId && m.messageType === messageType);
  }
  async listByRoomAndTypeAfter(roomId: string, messageType: MessageType): Promise<Message[]> {
    return this.items.filter((m) => m.roomId === roomId && m.messageType === messageType);
  }
  async listByReplyToMessageId(
    roomId: string,
    replyToMessageId: string,
    excludeMessageId?: string,
  ): Promise<Message[]> {
    return this.items.filter(
      (m) =>
        m.roomId === roomId &&
        (m.replyToMessageId === replyToMessageId || m.id === replyToMessageId) &&
        m.id !== excludeMessageId,
    );
  }
}

function buildChannel(overrides: Partial<Channel> = {}): Channel {
  const now = new Date();
  return {
    id: "channel-1",
    adminId: "avatar-admin",
    adminUserId: "user-admin",
    title: "title",
    description: "desc",
    settings: { passwordHash: null, passwordEnabled: false, guestAllowed: true },
    gameSettings: {
      roles: { VILLAGER: 1 },
      phaseDurations: { PRE_GAME: 1, DAY: 10, NIGHT: 5, POST_GAME: 0 },
    } as GameSettings,
    entryProcessing: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function buildParticipant(overrides: Partial<ChannelParticipant> = {}): ChannelParticipant {
  const now = new Date();
  return {
    id: "participant-1",
    channelId: "channel-1",
    userId: "user-1",
    avatarId: "avatar-1",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function buildGame(overrides: Partial<Game> = {}): Game {
  const now = new Date();
  const phaseInfo: GamePhaseInfo = { phase: GamePhase.DAY, day: 1, changedAt: now, nextPhaseAt: now };
  return {
    id: "game-1",
    channelId: "channel-1",
    description: "desc",
    gameSettings: {
      roles: { VILLAGER: 1, WEREWOLF: 1 },
      phaseDurations: { PRE_GAME: 1, DAY: 10, NIGHT: 5, POST_GAME: 0 },
    } as GameSettings,
    logs: [] as GameLogEntry[],
    processing: false,
    phaseInfo,
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

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

function createDeps() {
  const channels = new FakeChannelRepository();
  const channelParticipants = new FakeChannelParticipantRepository();
  const games = new FakeGameRepository();
  const players = new FakePlayerRepository();
  const messages = new FakeMessageRepository();
  return { channels, channelParticipants, games, players, messages };
}

describe("MessageService.create (channel room)", () => {
  it("チャンネル参加者は NORMAL を送信できる", async () => {
    const deps = createDeps();
    deps.channels.items.push(buildChannel());
    deps.channelParticipants.items.push(buildParticipant());
    const service = new MessageService(deps);

    const result = await service.create({
      roomId: "channel-1",
      senderId: "participant-1",
      userId: "user-1",
      messageType: MessageType.NORMAL,
      content: " hello ",
    });

    assert.equal(result.message.content, "hello");
    assert.equal(result.previousMessageId, null);
  });

  it("チャンネルで WEREWOLF は送信できない", async () => {
    const deps = createDeps();
    deps.channels.items.push(buildChannel());
    deps.channelParticipants.items.push(buildParticipant());
    const service = new MessageService(deps);

    await assert.rejects(
      () =>
        service.create({
          roomId: "channel-1",
          senderId: "participant-1",
          userId: "user-1",
          messageType: MessageType.WEREWOLF,
          content: "secret",
        }),
      MessageAccessDeniedError,
    );
  });

  it("本人でない participantId は拒否する", async () => {
    const deps = createDeps();
    deps.channels.items.push(buildChannel());
    deps.channelParticipants.items.push(buildParticipant());
    const service = new MessageService(deps);

    await assert.rejects(
      () =>
        service.create({
          roomId: "channel-1",
          senderId: "participant-1",
          userId: "someone-else",
          messageType: MessageType.NORMAL,
          content: "hi",
        }),
      ChannelParticipantNotFoundError,
    );
  });

  it("チャンネル・ゲームどちらにも存在しない roomId は RoomNotFoundError", async () => {
    const deps = createDeps();
    const service = new MessageService(deps);

    await assert.rejects(
      () =>
        service.create({
          roomId: "unknown-room",
          senderId: "participant-1",
          userId: "user-1",
          messageType: MessageType.NORMAL,
          content: "hi",
        }),
      RoomNotFoundError,
    );
  });
});

describe("MessageService.create (game room)", () => {
  it("人狼は WEREWOLF チャットを送信できる", async () => {
    const deps = createDeps();
    deps.games.items.push(buildGame());
    deps.players.items.push(buildPlayer({ id: "player-1", role: PlayerRole.WEREWOLF }));
    const service = new MessageService(deps);

    const result = await service.create({
      roomId: "game-1",
      senderId: "player-1",
      userId: "user-1",
      messageType: MessageType.WEREWOLF,
      content: "kill villager",
    });

    assert.equal(result.message.messageType, MessageType.WEREWOLF);
  });

  it("村人は WEREWOLF チャットを送信できない", async () => {
    const deps = createDeps();
    deps.games.items.push(buildGame());
    deps.players.items.push(buildPlayer({ id: "player-1", role: PlayerRole.VILLAGER }));
    const service = new MessageService(deps);

    await assert.rejects(
      () =>
        service.create({
          roomId: "game-1",
          senderId: "player-1",
          userId: "user-1",
          messageType: MessageType.WEREWOLF,
          content: "hi",
        }),
      MessageAccessDeniedError,
    );
  });

  it("死亡者は SPECTATOR チャットを送信できる", async () => {
    const deps = createDeps();
    deps.games.items.push(buildGame());
    deps.players.items.push(
      buildPlayer({ id: "player-1", role: PlayerRole.VILLAGER, status: PlayerStatus.DEAD }),
    );
    const service = new MessageService(deps);

    const result = await service.create({
      roomId: "game-1",
      senderId: "player-1",
      userId: "user-1",
      messageType: MessageType.SPECTATOR,
      content: "gg",
    });
    assert.equal(result.message.messageType, MessageType.SPECTATOR);
  });

  it("ゲーム終了後は NORMAL のみ送信できる", async () => {
    const deps = createDeps();
    deps.games.items.push(buildGame({ endedAt: new Date() }));
    deps.players.items.push(buildPlayer({ id: "player-1", role: PlayerRole.WEREWOLF }));
    const service = new MessageService(deps);

    await assert.rejects(
      () =>
        service.create({
          roomId: "game-1",
          senderId: "player-1",
          userId: "user-1",
          messageType: MessageType.WEREWOLF,
          content: "hi",
        }),
      MessageAccessDeniedError,
    );

    const result = await service.create({
      roomId: "game-1",
      senderId: "player-1",
      userId: "user-1",
      messageType: MessageType.NORMAL,
      content: "gg",
    });
    assert.equal(result.message.messageType, MessageType.NORMAL);
  });

  it("処理中は送信できない", async () => {
    const deps = createDeps();
    deps.games.items.push(buildGame({ processing: true }));
    deps.players.items.push(buildPlayer({ id: "player-1" }));
    const service = new MessageService(deps);

    await assert.rejects(
      () =>
        service.create({
          roomId: "game-1",
          senderId: "player-1",
          userId: "user-1",
          messageType: MessageType.NORMAL,
          content: "hi",
        }),
      MessageAccessDeniedError,
    );
  });

  it("本人でない playerId は拒否する", async () => {
    const deps = createDeps();
    deps.games.items.push(buildGame());
    deps.players.items.push(buildPlayer({ id: "player-1", userId: "user-1" }));
    const service = new MessageService(deps);

    await assert.rejects(
      () =>
        service.create({
          roomId: "game-1",
          senderId: "player-1",
          userId: "someone-else",
          messageType: MessageType.NORMAL,
          content: "hi",
        }),
      PlayerNotFoundError,
    );
  });
});

describe("MessageService.createSystemMessage", () => {
  it("senderId system でメッセージを作成する", async () => {
    const deps = createDeps();
    const service = new MessageService(deps);

    const result = await service.createSystemMessage("game-1", "ゲーム開始");
    assert.equal(result.message.senderId, "system");
    assert.equal(result.message.messageType, MessageType.SYSTEM);
  });
});

describe("MessageService.listReplies", () => {
  it("返信メッセージなら返信先とその他返信を返す", async () => {
    const deps = createDeps();
    deps.channels.items.push(buildChannel());
    deps.channelParticipants.items.push(buildParticipant());
    deps.messages.items.push(
      {
        id: "root",
        roomId: "channel-1",
        senderId: "participant-1",
        content: "root",
        messageType: MessageType.NORMAL,
        replyToMessageId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: "reply-1",
        roomId: "channel-1",
        senderId: "participant-1",
        content: "reply1",
        messageType: MessageType.NORMAL,
        replyToMessageId: "root",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: "reply-2",
        roomId: "channel-1",
        senderId: "participant-1",
        content: "reply2",
        messageType: MessageType.NORMAL,
        replyToMessageId: "root",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    );
    const service = new MessageService(deps);

    const result = await service.listReplies({
      roomId: "channel-1",
      senderId: "participant-1",
      userId: "user-1",
      messageId: "reply-1",
    });

    assert.equal(result.replyToMessageId, "root");
    assert.deepEqual(result.replyMessageIds.sort(), ["reply-2", "root"]);
  });
});
