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
  AvatarMinimumRequiredError,
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
    displayName: "??",
    isGuest: false,
    emailVerifiedAt: null,
    lockedAt: null,
    loginAttempts: 0,
    deletedAt: null,
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
  async updateEmail(): Promise<UserRecord | null> {
    return this.user;
  }
  async clearLock(): Promise<UserRecord | null> {
    return this.user;
  }
  async recordFailedLogin(): Promise<UserRecord | null> {
    return this.user;
  }
  async resetLoginAttempts(): Promise<UserRecord | null> {
    return this.user;
  }
  async softDelete(): Promise<UserRecord | null> {
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

  async delete(id: string): Promise<boolean> {
    const index = this.items.findIndex((a) => a.id === id);
    if (index < 0) return false;
    this.items.splice(index, 1);
    return true;
  }
}

class FakeObjectStorage implements ObjectStorage {
  puts: PutObjectInput[] = [];
  deletedKeys: string[] = [];

  async putObject(input: PutObjectInput): Promise<void> {
    this.puts.push(input);
  }

  async deleteObject(key: string): Promise<void> {
    this.deletedKeys.push(key);
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
  it("???????????imageUrl ? id ?????", async () => {
    const { avatarService, avatars } = service(createUserRecord());
    const avatar = await avatarService.create({
      userId: "user-1",
      name: "??",
    });
    assert.equal(avatar.name, "??");
    assert.equal(avatar.imageUrl, buildAvatarImageUrl(avatar.id, PUBLIC_BASE));
    assert.equal(avatars.items.length, 1);
    assert.equal(avatars.items[0]?.id, avatar.id);
  });

  it("??????? 10 ???", async () => {
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

  it("???? 1 ???", async () => {
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

  it("?????????????", async () => {
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
  it("???? id ??? imageUrl ?????", async () => {
    const { avatarService } = service(createUserRecord());
    const avatar = await avatarService.createInitial({
      userId: "user-1",
      displayName: "??",
    });
    assert.equal(avatar.name, "??");
    assert.equal(avatar.imageUrl, buildAvatarImageUrl(avatar.id, PUBLIC_BASE));
  });
});

describe("AvatarService.list", () => {
  it("????????????", async () => {
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
  it("????????", async () => {
    const { avatarService } = service(createUserRecord());
    const created = await avatarService.create({
      userId: "user-1",
      name: "?",
    });
    const updated = await avatarService.updateName({
      userId: "user-1",
      avatarId: created.id,
      name: "?",
    });
    assert.equal(updated.name, "?");
    assert.equal(updated.imageUrl, created.imageUrl);
  });

  it("????????????", async () => {
    const { avatarService, avatars } = service(createUserRecord());
    const now = new Date();
    avatars.items.push({
      id: "other-avatar",
      userId: "other-user",
      name: "?",
      imageUrl: "https://cdn.test/avatars/other-avatar",
      createdAt: now,
      updatedAt: now,
    });
    await assert.rejects(
      () =>
        avatarService.updateName({
          userId: "user-1",
          avatarId: "other-avatar",
          name: "??",
        }),
      AvatarAccessDeniedError,
    );
  });

  it("??????????", async () => {
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
  it("????? put ? imageUrl ?????", async () => {
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

  it("??? content type ?????", async () => {
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

describe("AvatarService.delete", () => {
  it("2???????????", async () => {
    const { avatarService, avatars, objectStorage } = service(
      createUserRecord(),
    );
    const first = await avatarService.create({
      userId: "user-1",
      name: "A",
    });
    const second = await avatarService.create({
      userId: "user-1",
      name: "B",
    });
    await avatarService.delete({ userId: "user-1", avatarId: second.id });
    assert.equal(avatars.items.length, 1);
    assert.equal(avatars.items[0]?.id, first.id);
    assert.deepEqual(objectStorage.deletedKeys, [`avatars/${second.id}`]);
  });

  it("???1????????", async () => {
    const { avatarService } = service(createUserRecord());
    const only = await avatarService.create({
      userId: "user-1",
      name: "A",
    });
    const { AvatarMinimumRequiredError } = await import(
      "../../shared/errors.js"
    );
    await assert.rejects(
      () => avatarService.delete({ userId: "user-1", avatarId: only.id }),
      AvatarMinimumRequiredError,
    );
  });
});
