import type { UserId } from "../../domain/user/index.js";
import type { Avatar, AvatarId } from "../../domain/avatar/index.js";

export type { Avatar, AvatarId };

export type CreateAvatarInput = {
  userId: UserId;
  name: string;
  imageUrl: string;
};

export interface AvatarRepository {
  create(input: CreateAvatarInput): Promise<Avatar>;
  findById(id: AvatarId): Promise<Avatar | null>;
  listByUserId(userId: UserId): Promise<Avatar[]>;
  countByUserId(userId: UserId): Promise<number>;
}
