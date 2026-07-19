import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ChannelEntryStatus,
  type ChannelEntry,
} from "../../domain/channel-entry/index.js";
import type { Channel, ChannelParticipant } from "../../domain/channel/index.js";
import type {
  ChannelEntryRepository,
  CreateChannelEntryInput,
} from "../../repositories/channel-entry/index.js";
import type {
  ChannelParticipantRepository,
  CreateChannelParticipantInput,
} from "../../repositories/channel-participant/index.js";
import type {
  ChannelRepository,
  CreateChannelInput,
  UpdateChannelInput,
} from "../../repositories/channel/index.js";
import { EntryProcessingError } from "../../shared/errors.js";
import { EntryService } from "./entry.service.js";

function baseChannel(
  overrides: Partial<Channel> & Pick<Channel, "id" | "gameSettings">,
): Channel {
  const now = new Date();
  return {
    adminId: "av-1",
    adminUserId: "user-1",
    title: "村",
    description: "",
    settings: {
      passwordHash: null,
      passwordEnabled: false,
      guestAllowed: true,
    },
    entryProcessing: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

class FakeChannelRepository implements ChannelRepository {
  items: Channel[] = [];

  async create(input: CreateChannelInput): Promise<Channel> {
    const channel = baseChannel({
      id: input.id,
      adminId: input.adminId,
      adminUserId: input.adminUserId,
      title: input.title,
      description: input.description,
      settings: input.settings,
      gameSettings: input.gameSettings,
    });
    this.items.push(channel);
    return channel;
  }

  async findById(id: string): Promise<Channel | null> {
    return this.items.find((c) => c.id === id && !c.deletedAt) ?? null;
  }

  async listActive(): Promise<Channel[]> {
    return this.items.filter((c) => !c.deletedAt);
  }

  async update(id: string, input: UpdateChannelInput): Promise<Channel | null> {
    const channel = await this.findById(id);
    if (!channel) return null;
    if (input.title !== undefined) channel.title = input.title;
    if (input.description !== undefined) channel.description = input.description;
    if (input.settings !== undefined) channel.settings = input.settings;
    if (input.gameSettings !== undefined) channel.gameSettings = input.gameSettings;
    return channel;
  }

  async acquireEntryProcessingLock(id: string): Promise<Channel | null> {
    const channel = await this.findById(id);
    if (!channel || channel.entryProcessing) return null;
    channel.entryProcessing = true;
    return channel;
  }

  async releaseEntryProcessingLock(id: string): Promise<void> {
    const channel = await this.findById(id);
    if (channel) channel.entryProcessing = false;
  }

  async softDelete(id: string): Promise<Channel | null> {
    const channel = await this.findById(id);
    if (!channel) return null;
    channel.deletedAt = new Date();
    return channel;
  }
}

class FakeChannelParticipantRepository implements ChannelParticipantRepository {
  items: ChannelParticipant[] = [];

  async create(
    input: CreateChannelParticipantInput,
  ): Promise<ChannelParticipant> {
    const now = new Date();
    const participant: ChannelParticipant = {
      id: input.id,
      channelId: input.channelId,
      userId: input.userId,
      avatarId: input.avatarId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.items.push(participant);
    return participant;
  }

  async findActiveById(id: string): Promise<ChannelParticipant | null> {
    return this.items.find((p) => p.id === id && p.deletedAt === null) ?? null;
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

class FakeChannelEntryRepository implements ChannelEntryRepository {
  items: ChannelEntry[] = [];

  async create(input: CreateChannelEntryInput): Promise<ChannelEntry> {
    const now = new Date();
    const entry: ChannelEntry = {
      id: input.id,
      channelId: input.channelId,
      participantId: input.participantId,
      userId: input.userId,
      avatarId: input.avatarId,
      status: ChannelEntryStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.items.push(entry);
    return entry;
  }

  async findActiveByChannelIdAndParticipantId(
    channelId: string,
    participantId: string,
  ): Promise<ChannelEntry | null> {
    return (
      this.items.find(
        (e) =>
          e.channelId === channelId &&
          e.participantId === participantId &&
          e.status === ChannelEntryStatus.ACTIVE,
      ) ?? null
    );
  }

  async listActiveParticipantIdsByChannelId(
    channelId: string,
  ): Promise<string[]> {
    return this.items
      .filter(
        (e) =>
          e.channelId === channelId && e.status === ChannelEntryStatus.ACTIVE,
      )
      .map((e) => e.participantId);
  }

  async softCancelByChannelIdAndParticipantId(
    channelId: string,
    participantId: string,
  ): Promise<ChannelEntry | null> {
    const entry = await this.findActiveByChannelIdAndParticipantId(
      channelId,
      participantId,
    );
    if (!entry) return null;
    entry.status = ChannelEntryStatus.CANCELLED;
    entry.deletedAt = new Date();
    entry.updatedAt = new Date();
    return entry;
  }

  async consumeAllActiveByChannelId(channelId: string): Promise<number> {
    let count = 0;
    for (const entry of this.items) {
      if (
        entry.channelId === channelId &&
        entry.status === ChannelEntryStatus.ACTIVE
      ) {
        entry.status = ChannelEntryStatus.CONSUMED;
        entry.deletedAt = new Date();
        entry.updatedAt = new Date();
        count += 1;
      }
    }
    return count;
  }
}

function setup(roles: Record<string, number> = { VILLAGER: 2 }) {
  const channels = new FakeChannelRepository();
  const channelParticipants = new FakeChannelParticipantRepository();
  const channelEntries = new FakeChannelEntryRepository();
  const now = new Date();

  channels.items.push(
    baseChannel({
      id: "ch-1",
      gameSettings: {
        roles,
        phaseDurations: {
          PRE_GAME: 5,
          DAY: 10,
          NIGHT: 5,
          POST_GAME: 10,
        },
      },
    }),
  );
  channelParticipants.items.push({
    id: "p-1",
    channelId: "ch-1",
    userId: "user-1",
    avatarId: "av-1",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  channelParticipants.items.push({
    id: "p-2",
    channelId: "ch-1",
    userId: "user-2",
    avatarId: "av-2",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  return {
    channels,
    channelParticipants,
    channelEntries,
    entryService: new EntryService({
      channels,
      channelParticipants,
      channelEntries,
    }),
  };
}

describe("EntryService.register / cancel", () => {
  it("エントリーを専用テーブルに追加できる", async () => {
    const { entryService, channelEntries } = setup({ VILLAGER: 3 });
    const result = await entryService.register({
      channelId: "ch-1",
      participantId: "p-1",
      userId: "user-1",
    });
    assert.deepEqual(result.participantIds, ["p-1"]);
    assert.equal(result.gameStarted, false);
    assert.equal(channelEntries.items.length, 1);
    assert.equal(channelEntries.items[0]?.status, ChannelEntryStatus.ACTIVE);
  });

  it("二重登録は冪等", async () => {
    const { entryService, channelEntries } = setup({ VILLAGER: 3 });
    await entryService.register({
      channelId: "ch-1",
      participantId: "p-1",
      userId: "user-1",
    });
    const again = await entryService.register({
      channelId: "ch-1",
      participantId: "p-1",
      userId: "user-1",
    });
    assert.deepEqual(again.participantIds, ["p-1"]);
    assert.equal(channelEntries.items.length, 1);
  });

  it("開始人数に達すると consume し participantIds は空", async () => {
    const gameStarts: string[] = [];
    const { channels, channelParticipants, channelEntries } = setup({
      VILLAGER: 2,
    });
    const entryService = new EntryService({
      channels,
      channelParticipants,
      channelEntries,
      onGameStart: async ({ channelId }) => {
        gameStarts.push(channelId);
      },
    });

    await entryService.register({
      channelId: "ch-1",
      participantId: "p-1",
      userId: "user-1",
    });
    const filled = await entryService.register({
      channelId: "ch-1",
      participantId: "p-2",
      userId: "user-2",
    });
    assert.equal(filled.gameStarted, true);
    assert.deepEqual(filled.participantIds, []);
    assert.deepEqual(gameStarts, ["ch-1"]);
    assert.equal(
      channelEntries.items.every(
        (e) => e.status === ChannelEntryStatus.CONSUMED,
      ),
      true,
    );
  });

  it("cancel でエントリーを取り消せる", async () => {
    const { entryService } = setup({ VILLAGER: 3 });
    await entryService.register({
      channelId: "ch-1",
      participantId: "p-1",
      userId: "user-1",
    });
    const cancelled = await entryService.cancel({
      channelId: "ch-1",
      participantId: "p-1",
      userId: "user-1",
    });
    assert.deepEqual(cancelled.participantIds, []);
  });

  it("処理中ロックが取れなければ拒否する", async () => {
    const { entryService, channels } = setup({ VILLAGER: 3 });
    const channel = channels.items[0]!;
    channel.entryProcessing = true;
    await assert.rejects(
      () =>
        entryService.register({
          channelId: "ch-1",
          participantId: "p-1",
          userId: "user-1",
        }),
      EntryProcessingError,
    );
  });
});
