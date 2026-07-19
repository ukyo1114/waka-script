import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_AVATAR_IMAGE_URL,
  type Avatar,
} from "../../domain/avatar/index.js";
import type {
  AvatarRepository,
  CreateAvatarInput,
} from "../../repositories/avatar/index.js";
import type {
  UserRecord,
  UserRepository,
} from "../../repositories/user/index.js";
import {
  AvatarLimitExceededError,
  UserNotFoundError,
} from "../../shared/errors.js";
import { AvatarService } from "./service.js";

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
  constructor(private user: UserRecord | null) {}

  async create(): Promise<UserRecord> {
    throw new Error("unused");
  }
  async findById(): Promise<UserRecord | null> {
    return this.user;
  }
  async findByEmail(): Promise<UserRecord | null> {
    return this.user;
  }
  async markEmailVerified(): Promise<UserRecord | null> {
    return this.user;
  }
  async updatePasswordHash(): Promise<UserRecord | null> {
    return this.user;
  }
  async updateDisplayName(): Promise<UserRecord | null> {
    return this.user;
  }
  async clearLock(): Promise<UserRecord | null> {
    return this.user;
  }
}

class FakeAvatarRepository implements AvatarRepository {
  items: Avatar[] = [];
  private seq = 0;

  async create(input: CreateAvatarInput): Promise<Avatar> {
    this.seq += 1;
    const now = new Date();
    const avatar: Avatar = {
      id: `avatar-${this.seq}`,
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
}

function service(user: UserRecord | null) {
  const avatars = new FakeAvatarRepository();
  return {
    avatars,
    avatarService: new AvatarService({
      users: new FakeUserRepository(user),
      avatars,
    }),
  };
}

describe("AvatarService.create", () => {
  it("アバターを作成できる", async () => {
    const { avatarService, avatars } = service(createUserRecord());
    const avatar = await avatarService.create({
      userId: "user-1",
      name: "人狼",
      imageUrl: "https://example.com/a.png",
    });
    assert.equal(avatar.name, "人狼");
    assert.equal(avatars.items.length, 1);
  });

  it("登録ユーザーは 10 件まで", async () => {
    const { avatarService } = service(createUserRecord());
    for (let i = 0; i < 10; i += 1) {
      await avatarService.create({
        userId: "user-1",
        name: `A${i}`,
        imageUrl: "https://example.com/a.png",
      });
    }
    await assert.rejects(
      () =>
        avatarService.create({
          userId: "user-1",
          name: "over",
          imageUrl: "https://example.com/a.png",
        }),
      AvatarLimitExceededError,
    );
  });

  it("ゲストは 1 件まで", async () => {
    const { avatarService } = service(
      createUserRecord({ isGuest: true, email: null, passwordHash: null }),
    );
    await avatarService.create({
      userId: "user-1",
      name: "GuestAvatar",
      imageUrl: "https://example.com/a.png",
    });
    await assert.rejects(
      () =>
        avatarService.create({
          userId: "user-1",
          name: "second",
          imageUrl: "https://example.com/a.png",
        }),
      AvatarLimitExceededError,
    );
  });

  it("ユーザーがいないと拒否する", async () => {
    const { avatarService } = service(null);
    await assert.rejects(
      () =>
        avatarService.create({
          userId: "missing",
          name: "x",
          imageUrl: "https://example.com/a.png",
        }),
      UserNotFoundError,
    );
  });
});

describe("AvatarService.createInitial", () => {
  it("デフォルト画像で作成する", async () => {
    const { avatarService } = service(createUserRecord());
    const avatar = await avatarService.createInitial({
      userId: "user-1",
      displayName: "太郎",
    });
    assert.equal(avatar.name, "太郎");
    assert.equal(avatar.imageUrl, DEFAULT_AVATAR_IMAGE_URL);
  });
});

describe("AvatarService.list", () => {
  it("自分のアバター一覧を返す", async () => {
    const { avatarService } = service(createUserRecord());
    await avatarService.create({
      userId: "user-1",
      name: "A",
      imageUrl: "https://example.com/a.png",
    });
    const list = await avatarService.list({ userId: "user-1" });
    assert.equal(list.length, 1);
    assert.equal(list[0]?.name, "A");
  });
});
