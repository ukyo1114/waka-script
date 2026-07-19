import type { AvatarId } from "../../domain/avatar/index.js";
import type {
  BlockedUser,
  BlockedUserId,
} from "../../domain/blocked-user/index.js";
import type { ChannelId } from "../../domain/channel/index.js";
import type { UserId } from "../../domain/user/index.js";

export type { BlockedUser, BlockedUserId };

export type CreateBlockedUserInput = {
  id: BlockedUserId;
  channelId: ChannelId;
  userId: UserId;
  avatarId: AvatarId;
};

export interface BlockedUserRepository {
  create(input: CreateBlockedUserInput): Promise<BlockedUser>;
  findActiveByIdAndChannelId(
    id: BlockedUserId,
    channelId: ChannelId,
  ): Promise<BlockedUser | null>;
  findActiveByChannelIdAndUserId(
    channelId: ChannelId,
    userId: UserId,
  ): Promise<BlockedUser | null>;
  listActiveByChannelId(channelId: ChannelId): Promise<BlockedUser[]>;
  listActiveChannelIdsByUserId(userId: UserId): Promise<ChannelId[]>;
  /** チャンネルスコープ付き論理削除 */
  softDeleteByIdAndChannelId(
    id: BlockedUserId,
    channelId: ChannelId,
  ): Promise<BlockedUser | null>;
}
