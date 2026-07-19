import type { ChannelId } from "../../domain/channel/index.js";
import type { UserId } from "../../domain/user/index.js";
import type {
  BlockedUser,
  BlockedUserId,
  BlockedUserRepository,
  CreateBlockedUserInput,
} from "./blocked-user.repository.types.js";

function notImplemented(): never {
  throw new Error("BlockedUserRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class BlockedUserRepositoryImpl implements BlockedUserRepository {
  create(_input: CreateBlockedUserInput): Promise<BlockedUser> {
    return notImplemented();
  }

  findActiveByIdAndChannelId(
    _id: BlockedUserId,
    _channelId: ChannelId,
  ): Promise<BlockedUser | null> {
    return notImplemented();
  }

  findActiveByChannelIdAndUserId(
    _channelId: ChannelId,
    _userId: UserId,
  ): Promise<BlockedUser | null> {
    return notImplemented();
  }

  listActiveByChannelId(_channelId: ChannelId): Promise<BlockedUser[]> {
    return notImplemented();
  }

  listActiveChannelIdsByUserId(_userId: UserId): Promise<ChannelId[]> {
    return notImplemented();
  }

  softDeleteByIdAndChannelId(
    _id: BlockedUserId,
    _channelId: ChannelId,
  ): Promise<BlockedUser | null> {
    return notImplemented();
  }
}
