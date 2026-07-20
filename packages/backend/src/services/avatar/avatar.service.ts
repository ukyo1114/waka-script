import { randomUUID } from "node:crypto";
import {
  assertAvatarCreatable,
  assertAvatarDeletable,
  assertAvatarImageValid,
  assertAvatarOwnedByUser,
  buildAvatarImageUrl,
  buildAvatarObjectKey,
  ensureAvatarExists,
  normalizeAvatarName,
  AVATAR_IMAGE_MAX_BYTES,
  type Avatar,
} from "../../domain/avatar/index.js";
import { ensureActiveUser } from "../../domain/user/index.js";
import type { AvatarRepository } from "../../repositories/avatar/index.js";
import type { UserRepository } from "../../repositories/user/index.js";
import {
  AvatarNotFoundError,
  NotImplementedError,
} from "../../shared/errors.js";
import type { ObjectStorage } from "../../shared/object-storage.js";

export { AVATAR_IMAGE_MAX_BYTES };

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
    const user = await this.requireDeps().users.findById(userId);
    return ensureActiveUser(user);
  }

  private async requireOwnedAvatar(userId: string, avatarId: string) {
    const avatar = await this.requireDeps().avatars.findById(avatarId);
    const existing = ensureAvatarExists(avatar);
    assertAvatarOwnedByUser(existing.userId, userId);
    return existing;
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
      name: normalizeAvatarName(input.displayName),
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

    assertAvatarImageValid(input.body, input.contentType);

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
