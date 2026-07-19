import { randomUUID } from "node:crypto";
import {
  assertAvatarCreatable,
  assertAvatarDeletable,
  assertAvatarOwnedByUser,
  buildAvatarImageUrl,
  buildAvatarObjectKey,
  type Avatar,
} from "../../domain/avatar/index.js";
import type { AvatarRepository } from "../../repositories/avatar/index.js";
import type { UserRepository } from "../../repositories/user/index.js";
import {
  AvatarNotFoundError,
  InvalidAvatarImageError,
  NotImplementedError,
  UserAccountLockedError,
  UserNotFoundError,
} from "../../shared/errors.js";
import type { ObjectStorage } from "../../shared/object-storage.js";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** アバター画像の最大サイズ（バイト） */
export const AVATAR_IMAGE_MAX_BYTES = 1 * 1024 * 1024;

export type CreateAvatarInput = {
  userId: string;
  name: string;
};

export type ListAvatarsInput = {
  userId: string;
};

export type CreateInitialAvatarInput = {
  userId: string;
  displayName: string;
};

export type UpdateAvatarNameInput = {
  userId: string;
  avatarId: string;
  name: string;
};

export type UpdateAvatarImageInput = {
  userId: string;
  avatarId: string;
  body: Buffer;
  contentType: string;
};

export type DeleteAvatarInput = {
  userId: string;
  avatarId: string;
};

export type AvatarServiceDeps = {
  users: UserRepository;
  avatars: AvatarRepository;
  /** 画像差し替え時に必須。作成・一覧・名前変更では不要 */
  objectStorage?: ObjectStorage;
  /** テスト用。省略時は env / デフォルト */
  avatarImagePublicBaseUrl?: string;
};

/**
 * アバターの作成・一覧・名前変更・画像差し替えを担う。
 * 画像は S3 想定。同一キーへ上書きし、imageUrl は変えない。
 */
export class AvatarService {
  constructor(private readonly deps?: AvatarServiceDeps) {}

  private requireDeps(): AvatarServiceDeps {
    if (!this.deps) throw new NotImplementedError("avatar.repositories");
    return this.deps;
  }

  private async requireActiveUser(userId: string) {
    const deps = this.requireDeps();
    const user = await deps.users.findById(userId);
    if (!user) throw new UserNotFoundError();
    if (user.lockedAt) throw new UserAccountLockedError();
    return user;
  }

  private async requireOwnedAvatar(userId: string, avatarId: string) {
    const deps = this.requireDeps();
    const avatar = await deps.avatars.findById(avatarId);
    if (!avatar) throw new AvatarNotFoundError();
    assertAvatarOwnedByUser(avatar.userId, userId);
    return avatar;
  }

  async create(input: CreateAvatarInput): Promise<Avatar> {
    const deps = this.requireDeps();
    const name = input.name.trim();
    const user = await this.requireActiveUser(input.userId);

    const count = await deps.avatars.countByUserId(input.userId);
    assertAvatarCreatable(user.isGuest, count);

    const id = randomUUID();
    return deps.avatars.create({
      id,
      userId: input.userId,
      name,
      imageUrl: buildAvatarImageUrl(id, deps.avatarImagePublicBaseUrl),
    });
  }

  /** ユーザー作成直後に呼ぶ初期アバター（上限チェック前の1件目） */
  async createInitial(input: CreateInitialAvatarInput): Promise<Avatar> {
    const deps = this.requireDeps();
    const id = randomUUID();
    return deps.avatars.create({
      id,
      userId: input.userId,
      name: input.displayName.trim() || "Avatar",
      imageUrl: buildAvatarImageUrl(id, deps.avatarImagePublicBaseUrl),
    });
  }

  async list(input: ListAvatarsInput): Promise<Avatar[]> {
    await this.requireActiveUser(input.userId);
    return this.requireDeps().avatars.listByUserId(input.userId);
  }

  async updateName(input: UpdateAvatarNameInput): Promise<Avatar> {
    const deps = this.requireDeps();
    await this.requireActiveUser(input.userId);
    await this.requireOwnedAvatar(input.userId, input.avatarId);

    const updated = await deps.avatars.updateName(
      input.avatarId,
      input.name.trim(),
    );
    if (!updated) throw new AvatarNotFoundError();
    return updated;
  }

  /**
   * 画像ファイルのみ差し替える。DB の imageUrl は変更しない（S3 同一キー上書き）。
   */
  async updateImage(input: UpdateAvatarImageInput): Promise<Avatar> {
    const deps = this.requireDeps();
    await this.requireActiveUser(input.userId);
    const avatar = await this.requireOwnedAvatar(input.userId, input.avatarId);

    if (!ALLOWED_IMAGE_TYPES.has(input.contentType)) {
      throw new InvalidAvatarImageError(
        "content type must be image/jpeg, image/png, or image/webp",
      );
    }
    if (input.body.length === 0) {
      throw new InvalidAvatarImageError("image file is empty");
    }
    if (input.body.length > AVATAR_IMAGE_MAX_BYTES) {
      throw new InvalidAvatarImageError("image file must be 1MB or less");
    }

    if (!deps.objectStorage) {
      throw new NotImplementedError("objectStorage");
    }

    await deps.objectStorage.putObject({
      key: buildAvatarObjectKey(avatar.id),
      body: input.body,
      contentType: input.contentType,
    });

    return avatar;
  }

  /**
   * 所有アバターを削除する。最低1件は残す。
   * オブジェクトストレージがある場合は対応キーも削除する。
   */
  async delete(input: DeleteAvatarInput): Promise<void> {
    const deps = this.requireDeps();
    await this.requireActiveUser(input.userId);
    await this.requireOwnedAvatar(input.userId, input.avatarId);

    const count = await deps.avatars.countByUserId(input.userId);
    assertAvatarDeletable(count);

    const deleted = await deps.avatars.delete(input.avatarId);
    if (!deleted) throw new AvatarNotFoundError();

    if (deps.objectStorage) {
      await deps.objectStorage.deleteObject(buildAvatarObjectKey(input.avatarId));
    }
  }
}
