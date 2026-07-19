import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Avatar } from "../../domain/avatar/index.js";
import type { BlockedUser } from "../../domain/blocked-user/index.js";
import type { Channel, ChannelParticipant } from "../../domain/channel/index.js";
import type {
  AvatarRepository,
  CreateAvatarInput,
} from "../../repositories/avatar/index.js";
import type {
  BlockedUserRepository,
  CreateBlockedUserInput,
} from "../../repositories/blocked-user/index.js";
import type {
  ChannelParticipantRepository,
  CreateChannelParticipantInput,
} from "../../repositories/channel-participant/index.js";
import type {
  ChannelRepository,
  CreateChannelInput,
  UpdateChannelInput,
} from "../../repositories/channel/index.js";
import type {
  UserRecord,
  UserRepository,
} from "../../repositories/user/index.js";
import {
  AlreadyBlockedError,
  CannotBlockChannelAdminError,
  ChannelGuestNotAllowedError,
  ChannelUserBlockedError,
  GuestActionNotAllowedError,
  InvalidChannelPasswordError,
  NotChannelAdminError,
} from "../../shared/errors.js";
import { ChannelService } from "./channel.service.js";

function createUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  const now = new Date();
  return {
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hash",
    displayName: "太郎",
    isGuest: false,
    emailVerifiedAt: null,
    lockedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

class FakeUserRepository implements UserRepository {
  constructor(private readonly byId: Map<string, UserRecord>) {}

  static fromUsers(...users: UserRecord[]) {
    return new FakeUserRepository(new Map(users.map((u) => [u.id, u])));
  }

  async create(): Promise<UserRecord> {
    throw new Error("unused");
  }
  async findById(id: string): Promise<UserRecord | null> {
    return this.byId.get(id) ?? null;
  }
  async findByEmail(): Promise<UserRecord | null> {
    return null;
  }
  async markEmailVerified(): Promise<UserRecord | null> {
    return null;
  }
  async updatePasswordHash(): Promise<UserRecord | null> {
    return null;
  }
  async updateDisplayName(): Promise<UserRecord | null> {
    return null;
  }
  async clearLock(): Promise<UserRecord | null> {
    return null;
  }
}

class FakeAvatarRepository implements AvatarRepository {
  items: Avatar[] = [];

  async create(input: CreateAvatarInput): Promise<Avatar> {
    const now = new Date();
    const avatar: Avatar = {
      id: input.id,
      userId: input.userId,
      name: input.name,
      imageUrl: input.imageUrl,
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(avatar);
    return avatar;
  }

  async findById(id: string): Promise<Avatar | null> {
    return this.items.find((a) => a.id === id) ?? null;
  }

  async listByUserId(userId: string): Promise<Avatar[]> {
    return this.items.filter((a) => a.userId === userId);
  }

  async countByUserId(userId: string): Promise<number> {
    return this.items.filter((a) => a.userId === userId).length;
  }

  async updateName(): Promise<Avatar | null> {
    return null;
  }
}

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
    return this.items
      .filter((c) => !c.deletedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(id: string, input: UpdateChannelInput): Promise<Channel | null> {
    const channel = await this.findById(id);
    if (!channel) return null;
    if (input.title !== undefined) channel.title = input.title;
    if (input.description !== undefined) channel.description = input.description;
    if (input.settings !== undefined) channel.settings = input.settings;
    if (input.gameSettings !== undefined) channel.gameSettings = input.gameSettings;
    channel.updatedAt = new Date();
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

  async findActiveByChannelIdAndUserId(
    channelId: string,
    userId: string,
  ): Promise<ChannelParticipant | null> {
    return (
      this.items.find(
        (p) =>
          p.channelId === channelId &&
          p.userId === userId &&
          p.deletedAt === null,
      ) ?? null
    );
  }

  async findActiveByChannelIdAndAvatarId(
    channelId: string,
    avatarId: string,
  ): Promise<ChannelParticipant | null> {
    return (
      this.items.find(
        (p) =>
          p.channelId === channelId &&
          p.avatarId === avatarId &&
          p.deletedAt === null,
      ) ?? null
    );
  }

  async listActiveChannelIdsByUserId(userId: string): Promise<string[]> {
    return this.items
      .filter((p) => p.userId === userId && p.deletedAt === null)
      .map((p) => p.channelId);
  }

  async softDeleteByChannelIdAndAvatarId(
    channelId: string,
    avatarId: string,
  ): Promise<ChannelParticipant | null> {
    const participant = await this.findActiveByChannelIdAndAvatarId(
      channelId,
      avatarId,
    );
    if (!participant) return null;
    participant.deletedAt = new Date();
    participant.updatedAt = new Date();
    return participant;
  }
}

class FakeBlockedUserRepository implements BlockedUserRepository {
  items: BlockedUser[] = [];

  async create(input: CreateBlockedUserInput): Promise<BlockedUser> {
    const now = new Date();
    const blocked: BlockedUser = {
      id: input.id,
      channelId: input.channelId,
      userId: input.userId,
      avatarId: input.avatarId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.items.push(blocked);
    return blocked;
  }

  async findActiveByIdAndChannelId(
    id: string,
    channelId: string,
  ): Promise<BlockedUser | null> {
    return (
      this.items.find(
        (b) => b.id === id && b.channelId === channelId && b.deletedAt === null,
      ) ?? null
    );
  }

  async findActiveByChannelIdAndUserId(
    channelId: string,
    userId: string,
  ): Promise<BlockedUser | null> {
    return (
      this.items.find(
        (b) =>
          b.channelId === channelId &&
          b.userId === userId &&
          b.deletedAt === null,
      ) ?? null
    );
  }

  async listActiveByChannelId(channelId: string): Promise<BlockedUser[]> {
    return this.items.filter(
      (b) => b.channelId === channelId && b.deletedAt === null,
    );
  }

  async listActiveChannelIdsByUserId(userId: string): Promise<string[]> {
    return this.items
      .filter((b) => b.userId === userId && b.deletedAt === null)
      .map((b) => b.channelId);
  }

  async softDeleteByIdAndChannelId(
    id: string,
    channelId: string,
  ): Promise<BlockedUser | null> {
    const blocked = await this.findActiveByIdAndChannelId(id, channelId);
    if (!blocked) return null;
    blocked.deletedAt = new Date();
    blocked.updatedAt = new Date();
    return blocked;
  }
}

function setup(users: UserRecord[] = [createUserRecord()]) {
  const avatars = new FakeAvatarRepository();
  const channels = new FakeChannelRepository();
  const channelParticipants = new FakeChannelParticipantRepository();
  const blockedUsers = new FakeBlockedUserRepository();
  const now = new Date();
  for (const user of users) {
    avatars.items.push({
      id: `av-${user.id}`,
      userId: user.id,
      name: user.displayName,
      imageUrl: "https://example.com/a.png",
      createdAt: now,
      updatedAt: now,
    });
  }
  return {
    avatars,
    channels,
    channelParticipants,
    blockedUsers,
    channelService: new ChannelService({
      users: FakeUserRepository.fromUsers(...users),
      avatars,
      channels,
      channelParticipants,
      blockedUsers,
    }),
  };
}

describe("ChannelService.create", () => {
  it("チャンネルを作成し管理者を参加者にする", async () => {
    const { channelService, channelParticipants } = setup();
    const channel = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "村A",
      gameSettings: { roles: { VILLAGER: 3 } },
    });
    assert.equal(channel.title, "村A");
    assert.equal(channel.settings.passwordEnabled, false);
    assert.equal(channel.gameSettings.roles.VILLAGER, 3);
    assert.equal(channelParticipants.items.length, 1);
    assert.equal(channelParticipants.items[0]?.channelId, channel.id);
  });

  it("ゲストは作成できない", async () => {
    const { channelService } = setup([
      createUserRecord({
        isGuest: true,
        email: null,
        passwordHash: null,
      }),
    ]);
    await assert.rejects(
      () =>
        channelService.create({
          userId: "user-1",
          avatarId: "av-user-1",
          title: "x",
        }),
      GuestActionNotAllowedError,
    );
  });
});

describe("ChannelService.list", () => {
  it("一覧と参加中・ブロック中 ID を返す", async () => {
    const { channelService } = setup();
    const created = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "村A",
    });
    const result = await channelService.list({ userId: "user-1" });
    assert.equal(result.channels.length, 1);
    assert.deepEqual(result.participantChannelIds, [created.id]);
    assert.deepEqual(result.blockedChannelIds, []);
  });
});

describe("ChannelService.join", () => {
  it("パスワード付きチャンネルに正しいパスワードで入室できる", async () => {
    const admin = createUserRecord({ id: "user-1" });
    const joiner = createUserRecord({ id: "user-2", email: "b@example.com" });
    const { channelService, channelParticipants } = setup([admin, joiner]);

    const created = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "秘密",
      settings: { passwordEnabled: true, password: "secret1" },
    });

    const participant = await channelService.join({
      userId: "user-2",
      channelId: created.id,
      avatarId: "av-user-2",
      password: "secret1",
    });
    assert.equal(participant.userId, "user-2");
    assert.equal(channelParticipants.items.length, 2);
  });

  it("パスワード不一致は拒否する", async () => {
    const admin = createUserRecord({ id: "user-1" });
    const joiner = createUserRecord({ id: "user-2", email: "b@example.com" });
    const { channelService } = setup([admin, joiner]);

    const created = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "秘密",
      settings: { passwordEnabled: true, password: "secret1" },
    });

    await assert.rejects(
      () =>
        channelService.join({
          userId: "user-2",
          channelId: created.id,
          avatarId: "av-user-2",
          password: "wrong",
        }),
      InvalidChannelPasswordError,
    );
  });

  it("ゲスト不可チャンネルへのゲスト入室を拒否する", async () => {
    const admin = createUserRecord({ id: "user-1" });
    const guest = createUserRecord({
      id: "user-2",
      email: null,
      passwordHash: null,
      isGuest: true,
    });
    const { channelService } = setup([admin, guest]);

    const created = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "会員のみ",
      settings: { guestAllowed: false },
    });

    await assert.rejects(
      () =>
        channelService.join({
          userId: "user-2",
          channelId: created.id,
          avatarId: "av-user-2",
        }),
      ChannelGuestNotAllowedError,
    );
  });

  it("再入室は既存参加者を返す", async () => {
    const { channelService, channelParticipants } = setup();
    const created = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "村A",
    });
    const again = await channelService.join({
      userId: "user-1",
      channelId: created.id,
      avatarId: "av-user-1",
    });
    assert.equal(channelParticipants.items.length, 1);
    assert.equal(again.channelId, created.id);
  });
});

describe("ChannelService.update", () => {
  it("管理者がタイトルを更新できる", async () => {
    const { channelService } = setup();
    const created = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "旧",
    });
    const updated = await channelService.update({
      userId: "user-1",
      channelId: created.id,
      title: "新",
    });
    assert.equal(updated.title, "新");
  });

  it("管理者以外は更新できない", async () => {
    const admin = createUserRecord({ id: "user-1" });
    const other = createUserRecord({ id: "user-2", email: "b@example.com" });
    const { channelService } = setup([admin, other]);

    const created = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "村A",
    });

    await assert.rejects(
      () =>
        channelService.update({
          userId: "user-2",
          channelId: created.id,
          title: "乗っ取り",
        }),
      NotChannelAdminError,
    );
  });
});

describe("ChannelService.blockUser / unblockUser", () => {
  it("参加者をキックしてブロックし再入室を拒否する", async () => {
    const admin = createUserRecord({ id: "user-1" });
    const target = createUserRecord({ id: "user-2", email: "b@example.com" });
    const { channelService, channelParticipants, blockedUsers } = setup([
      admin,
      target,
    ]);

    const channel = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "村A",
    });
    await channelService.join({
      userId: "user-2",
      channelId: channel.id,
      avatarId: "av-user-2",
    });

    const blocked = await channelService.blockUser({
      userId: "user-1",
      channelId: channel.id,
      avatarId: "av-user-2",
    });
    assert.equal(blocked.userId, "user-2");
    assert.equal(blocked.avatarId, "av-user-2");
    assert.equal(
      channelParticipants.items.find((p) => p.userId === "user-2")?.deletedAt !=
        null,
      true,
    );
    assert.equal(blockedUsers.items[0]?.userId, "user-2");

    await assert.rejects(
      () =>
        channelService.join({
          userId: "user-2",
          channelId: channel.id,
          avatarId: "av-user-2",
        }),
      ChannelUserBlockedError,
    );

    const listForTarget = await channelService.list({ userId: "user-2" });
    assert.deepEqual(listForTarget.blockedChannelIds, [channel.id]);

    await channelService.unblockUser({
      userId: "user-1",
      channelId: channel.id,
      blockedUserId: blocked.id,
    });

    const rejoined = await channelService.join({
      userId: "user-2",
      channelId: channel.id,
      avatarId: "av-user-2",
    });
    assert.equal(rejoined.userId, "user-2");
  });

  it("管理者自身はブロックできない", async () => {
    const { channelService } = setup();
    const channel = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "村A",
    });
    await assert.rejects(
      () =>
        channelService.blockUser({
          userId: "user-1",
          channelId: channel.id,
          avatarId: "av-user-1",
        }),
      CannotBlockChannelAdminError,
    );
  });

  it("二重ブロックは拒否する", async () => {
    const admin = createUserRecord({ id: "user-1" });
    const target = createUserRecord({ id: "user-2", email: "b@example.com" });
    const { channelService, channelParticipants } = setup([admin, target]);

    const channel = await channelService.create({
      userId: "user-1",
      avatarId: "av-user-1",
      title: "村A",
    });
    await channelService.join({
      userId: "user-2",
      channelId: channel.id,
      avatarId: "av-user-2",
    });
    await channelService.blockUser({
      userId: "user-1",
      channelId: channel.id,
      avatarId: "av-user-2",
    });

    // ブロック済みのまま参加者が残っている状態を再現
    const now = new Date();
    channelParticipants.items.push({
      id: "readded",
      channelId: channel.id,
      userId: "user-2",
      avatarId: "av-user-2",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    await assert.rejects(
      () =>
        channelService.blockUser({
          userId: "user-1",
          channelId: channel.id,
          avatarId: "av-user-2",
        }),
      AlreadyBlockedError,
    );
  });
});
