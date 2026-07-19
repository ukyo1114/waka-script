import {
  assertAvatarCreatable,
  DEFAULT_AVATAR_IMAGE_URL,
  type Avatar,
} from "../../domain/avatar/index.js";
import type { AvatarRepository } from "../../repositories/avatar/index.js";
import type { UserRepository } from "../../repositories/user/index.js";
import {
  NotImplementedError,
  UserAccountLockedError,
  UserNotFoundError,
} from "../../shared/errors.js";

export type CreateAvatarInput = {
  userId: string;
  name: string;
  imageUrl: string;
};

export type ListAvatarsInput = {
  userId: string;
};

export type CreateInitialAvatarInput = {
  userId: string;
  displayName: string;
};

export type AvatarServiceDeps = {
  users: UserRepository;
  avatars: AvatarRepository;
};

/**
 * アバターの作成・一覧を担う。
 */
export class AvatarService {
  constructor(private readonly deps?: AvatarServiceDeps) {}

  private requireDeps(): AvatarServiceDeps {
    if (!this.deps) throw new NotImplementedError("avatar.repositories");
    return this.deps;
  }

  async create(input: CreateAvatarInput): Promise<Avatar> {
    const deps = this.requireDeps();
    const name = input.name.trim();
    const imageUrl = input.imageUrl.trim();

    const user = await deps.users.findById(input.userId);
    if (!user) throw new UserNotFoundError();
    if (user.lockedAt) throw new UserAccountLockedError();

    const count = await deps.avatars.countByUserId(input.userId);
    assertAvatarCreatable(user.isGuest, count);

    return deps.avatars.create({
      userId: input.userId,
      name,
      imageUrl,
    });
  }

  /** ユーザー作成直後に呼ぶ初期アバター（上限チェック前の1件目） */
  async createInitial(input: CreateInitialAvatarInput): Promise<Avatar> {
    const deps = this.requireDeps();
    return deps.avatars.create({
      userId: input.userId,
      name: input.displayName.trim() || "Avatar",
      imageUrl: DEFAULT_AVATAR_IMAGE_URL,
    });
  }

  async list(input: ListAvatarsInput): Promise<Avatar[]> {
    const deps = this.requireDeps();

    const user = await deps.users.findById(input.userId);
    if (!user) throw new UserNotFoundError();
    if (user.lockedAt) throw new UserAccountLockedError();

    return deps.avatars.listByUserId(input.userId);
  }
}
