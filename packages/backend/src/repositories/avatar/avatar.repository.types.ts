import type { UserId } from "../../domain/user/index.js";
import type { Avatar, AvatarId } from "../../domain/avatar/index.js";

export type { Avatar, AvatarId };

export type CreateAvatarInput = {
  /** サービス側で採番した ID（S3 キー／公開 URL に使う） */
  id: AvatarId;
  userId: UserId;
  name: string;
  imageUrl: string;
};

export interface AvatarRepository {
  create(input: CreateAvatarInput): Promise<Avatar>;
  findById(id: AvatarId): Promise<Avatar | null>;
  listByUserId(userId: UserId): Promise<Avatar[]>;
  countByUserId(userId: UserId): Promise<number>;
  updateName(id: AvatarId, name: string): Promise<Avatar | null>;
  delete(id: AvatarId): Promise<boolean>;
}
