import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAvatarImageUrl,
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
  AvatarAccessDeniedError,
  AvatarLimitExceededError,
  AvatarNotFoundError,
  InvalidAvatarImageError,
  UserNotFoundError,
} from "../../shared/errors.js";
import type { ObjectStorage, PutObjectInput } from "../../shared/object-storage.js";
import { AvatarService } from "./avatar.service.js";

const PUBLIC_BASE = "https://cdn.test";

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

  async updateName(id: string, name: string): Promise<Avatar | null> {
    const avatar = this.items.find((a) => a.id === id);
    if (!avatar) return null;
    avatar.name = name;
    avatar.updatedAt = new Date();
    return avatar;
  }
}

class FakeObjectStorage implements ObjectStorage {
  puts: PutObjectInput[] = [];

  async putObject(input: PutObjectInput): Promise<void> {
    this.puts.push(input);
  }
}

function service(user: UserRecord | null) {
  const avatars = new FakeAvatarRepository();
  const objectStorage = new FakeObjectStorage();
  return {
    avatars,
    objectStorage,
    avatarService: new AvatarService({
      users: new FakeUserRepository(user),
      avatars,
      objectStorage,
      avatarImagePublicBaseUrl: PUBLIC_BASE,
    }),
  };
}

describe("AvatarService.create", () => {
  it("アバターを作成できる（imageUrl は id から生成）", async () => {
    const { avatarService, avatars } = service(createUserRecord());
    const avatar = await avatarService.create({
      userId: "user-1",
      name: "人狼",
    });
    assert.equal(avatar.name, "人狼");
    assert.equal(avatar.imageUrl, buildAvatarImageUrl(avatar.id, PUBLIC_BASE));
    assert.equal(avatars.items.length, 1);
    assert.equal(avatars.items[0]?.id, avatar.id);
  });

  it("登録ユーザーは 10 件まで", async () => {
    const { avatarService } = service(createUserRecord());
    for (let i = 0; i < 10; i += 1) {
      await avatarService.create({
        userId: "user-1",
        name: `A${i}`,
      });
    }
    await assert.rejects(
      () =>
        avatarService.create({
          userId: "user-1",
          name: "over",
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
    });
    await assert.rejects(
      () =>
        avatarService.create({
          userId: "user-1",
          name: "second",
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
        }),
      UserNotFoundError,
    );
  });
});

describe("AvatarService.createInitial", () => {
  it("表示名と id 由来の imageUrl で作成する", async () => {
    const { avatarService } = service(createUserRecord());
    const avatar = await avatarService.createInitial({
      userId: "user-1",
      displayName: "太郎",
    });
    assert.equal(avatar.name, "太郎");
    assert.equal(avatar.imageUrl, buildAvatarImageUrl(avatar.id, PUBLIC_BASE));
  });
});

describe("AvatarService.list", () => {
  it("自分のアバター一覧を返す", async () => {
    const { avatarService } = service(createUserRecord());
    await avatarService.create({
      userId: "user-1",
      name: "A",
    });
    const list = await avatarService.list({ userId: "user-1" });
    assert.equal(list.length, 1);
    assert.equal(list[0]?.name, "A");
  });
});

describe("AvatarService.updateName", () => {
  it("名前を更新できる", async () => {
    const { avatarService } = service(createUserRecord());
    const created = await avatarService.create({
      userId: "user-1",
      name: "旧",
    });
    const updated = await avatarService.updateName({
      userId: "user-1",
      avatarId: created.id,
      name: "新",
    });
    assert.equal(updated.name, "新");
    assert.equal(updated.imageUrl, created.imageUrl);
  });

  it("他人のアバターは拒否する", async () => {
    const { avatarService, avatars } = service(createUserRecord());
    const now = new Date();
    avatars.items.push({
      id: "other-avatar",
      userId: "other-user",
      name: "他",
      imageUrl: "https://cdn.test/avatars/other-avatar",
      createdAt: now,
      updatedAt: now,
    });
    await assert.rejects(
      () =>
        avatarService.updateName({
          userId: "user-1",
          avatarId: "other-avatar",
          name: "奪取",
        }),
      AvatarAccessDeniedError,
    );
  });

  it("存在しないと拒否する", async () => {
    const { avatarService } = service(createUserRecord());
    await assert.rejects(
      () =>
        avatarService.updateName({
          userId: "user-1",
          avatarId: "missing",
          name: "x",
        }),
      AvatarNotFoundError,
    );
  });
});

describe("AvatarService.updateImage", () => {
  it("同一キーへ put し imageUrl は変えない", async () => {
    const { avatarService, objectStorage } = service(createUserRecord());
    const created = await avatarService.create({
      userId: "user-1",
      name: "A",
    });
    const urlBefore = created.imageUrl;
    const result = await avatarService.updateImage({
      userId: "user-1",
      avatarId: created.id,
      body: Buffer.from("png-bytes"),
      contentType: "image/png",
    });
    assert.equal(result.imageUrl, urlBefore);
    assert.equal(objectStorage.puts.length, 1);
    assert.equal(objectStorage.puts[0]?.key, `avatars/${created.id}`);
    assert.equal(objectStorage.puts[0]?.contentType, "image/png");
  });

  it("不正な content type は拒否する", async () => {
    const { avatarService } = service(createUserRecord());
    const created = await avatarService.create({
      userId: "user-1",
      name: "A",
    });
    await assert.rejects(
      () =>
        avatarService.updateImage({
          userId: "user-1",
          avatarId: created.id,
          body: Buffer.from("x"),
          contentType: "application/pdf",
        }),
      InvalidAvatarImageError,
    );
  });
});
