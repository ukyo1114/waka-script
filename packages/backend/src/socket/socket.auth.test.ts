import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Channel, ChannelParticipant } from "../domain/channel/index.js";
import type {
  ChannelParticipantRepository,
  CreateChannelParticipantInput,
} from "../repositories/channel-participant/index.js";
import type {
  ChannelRepository,
  CreateChannelInput,
  UpdateChannelInput,
} from "../repositories/channel/index.js";
import { signAccessToken } from "../shared/access-token.js";
import {
  ChannelNotFoundError,
  ChannelParticipantNotFoundError,
  InvalidAccessTokenError,
} from "../shared/errors.js";
import { resolveSocketChannelAuth } from "./socket.auth.js";

const JWT_SECRET = "socket-auth-test-secret";

class FakeChannelRepository implements ChannelRepository {
  items: Channel[] = [];

  async create(input: CreateChannelInput): Promise<Channel> {
    const now = new Date();
    const channel: Channel = {
      id: input.id,
      adminId: input.adminId,
      adminUserId: input.adminUserId,
      title: input.title,
      description: input.description,
      settings: input.settings,
      gameSettings: input.gameSettings,
      entryProcessing: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.items.push(channel);
    return channel;
  }

  async findById(id: string): Promise<Channel | null> {
    return this.items.find((c) => c.id === id && !c.deletedAt) ?? null;
  }

  async listActive(): Promise<Channel[]> {
    return this.items.filter((c) => !c.deletedAt);
  }

  async update(_id: string, _input: UpdateChannelInput): Promise<Channel | null> {
    return null;
  }

  async acquireEntryProcessingLock(_id: string): Promise<Channel | null> {
    return null;
  }

  async releaseEntryProcessingLock(_id: string): Promise<void> {}

  async softDelete(): Promise<Channel | null> {
    return null;
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

describe("resolveSocketChannelAuth", () => {
  it("JWT と参加者からコンテキストを返す", async () => {
    const channels = new FakeChannelRepository();
    const channelParticipants = new FakeChannelParticipantRepository();
    const now = new Date();
    channels.items.push({
      id: "ch-1",
      adminId: "av-1",
      adminUserId: "user-1",
      title: "村",
      description: "",
      settings: {
        passwordHash: null,
        passwordEnabled: false,
        guestAllowed: true,
      },
      gameSettings: {
        roles: {},
        phaseDurations: {
          PRE_GAME: 5,
          DAY: 10,
          NIGHT: 5,
          POST_GAME: 10,
        },
      },
      entryProcessing: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    channelParticipants.items.push({
      id: "p-1",
      channelId: "ch-1",
      userId: "user-1",
      avatarId: "av-1",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    const token = await signAccessToken({
      userId: "user-1",
      secret: JWT_SECRET,
    });

    const ctx = await resolveSocketChannelAuth({
      auth: { token, participantId: "p-1" },
      channels,
      channelParticipants,
      jwtSecret: JWT_SECRET,
    });

    assert.deepEqual(ctx, {
      userId: "user-1",
      channelId: "ch-1",
      participantId: "p-1",
    });
  });

  it("token が無いと拒否する", async () => {
    await assert.rejects(
      () =>
        resolveSocketChannelAuth({
          auth: { participantId: "p-1" },
          channels: new FakeChannelRepository(),
          channelParticipants: new FakeChannelParticipantRepository(),
          jwtSecret: JWT_SECRET,
        }),
      InvalidAccessTokenError,
    );
  });

  it("他人の参加者は拒否する", async () => {
    const channels = new FakeChannelRepository();
    const channelParticipants = new FakeChannelParticipantRepository();
    const now = new Date();
    channels.items.push({
      id: "ch-1",
      adminId: "av-1",
      adminUserId: "user-1",
      title: "村",
      description: "",
      settings: {
        passwordHash: null,
        passwordEnabled: false,
        guestAllowed: true,
      },
      gameSettings: {
        roles: {},
        phaseDurations: {
          PRE_GAME: 5,
          DAY: 10,
          NIGHT: 5,
          POST_GAME: 10,
        },
      },
      entryProcessing: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
    channelParticipants.items.push({
      id: "p-1",
      channelId: "ch-1",
      userId: "user-1",
      avatarId: "av-1",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    const token = await signAccessToken({
      userId: "user-2",
      secret: JWT_SECRET,
    });

    await assert.rejects(
      () =>
        resolveSocketChannelAuth({
          auth: { token, participantId: "p-1" },
          channels,
          channelParticipants,
          jwtSecret: JWT_SECRET,
        }),
      ChannelParticipantNotFoundError,
    );
  });

  it("削除済みチャンネルは拒否する", async () => {
    const channels = new FakeChannelRepository();
    const channelParticipants = new FakeChannelParticipantRepository();
    const now = new Date();
    channels.items.push({
      id: "ch-1",
      adminId: "av-1",
      adminUserId: "user-1",
      title: "村",
      description: "",
      settings: {
        passwordHash: null,
        passwordEnabled: false,
        guestAllowed: true,
      },
      gameSettings: {
        roles: {},
        phaseDurations: {
          PRE_GAME: 5,
          DAY: 10,
          NIGHT: 5,
          POST_GAME: 10,
        },
      },
      entryProcessing: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: new Date(),
    });
    channelParticipants.items.push({
      id: "p-1",
      channelId: "ch-1",
      userId: "user-1",
      avatarId: "av-1",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    // findById filters deleted — simulate by empty find via only deleted item
    // Our Fake findById returns null for deletedAt set — good
    const token = await signAccessToken({
      userId: "user-1",
      secret: JWT_SECRET,
    });

    await assert.rejects(
      () =>
        resolveSocketChannelAuth({
          auth: { token, participantId: "p-1" },
          channels,
          channelParticipants,
          jwtSecret: JWT_SECRET,
        }),
      ChannelNotFoundError,
    );
  });
});
