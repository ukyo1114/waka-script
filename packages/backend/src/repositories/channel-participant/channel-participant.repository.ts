import type { AvatarId } from "../../domain/avatar/index.js";
import type { ChannelId } from "../../domain/channel/index.js";
import type { UserId } from "../../domain/user/index.js";
import type {
  ChannelParticipant,
  ChannelParticipantRepository,
  CreateChannelParticipantInput,
} from "./channel-participant.repository.types.js";

function notImplemented(): never {
  throw new Error("ChannelParticipantRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class ChannelParticipantRepositoryImpl
  implements ChannelParticipantRepository
{
  create(
    _input: CreateChannelParticipantInput,
  ): Promise<ChannelParticipant> {
    return notImplemented();
  }

  findActiveById(
    _id: string,
  ): Promise<ChannelParticipant | null> {
    return notImplemented();
  }

  findActiveByChannelIdAndUserId(
    _channelId: ChannelId,
    _userId: UserId,
  ): Promise<ChannelParticipant | null> {
    return notImplemented();
  }

  findActiveByChannelIdAndAvatarId(
    _channelId: ChannelId,
    _avatarId: AvatarId,
  ): Promise<ChannelParticipant | null> {
    return notImplemented();
  }

  listActiveChannelIdsByUserId(_userId: UserId): Promise<ChannelId[]> {
    return notImplemented();
  }

  softDeleteByChannelIdAndAvatarId(
    _channelId: ChannelId,
    _avatarId: AvatarId,
  ): Promise<ChannelParticipant | null> {
    return notImplemented();
  }

  softDeleteByChannelIdAndUserId(
    _channelId: ChannelId,
    _userId: UserId,
  ): Promise<ChannelParticipant | null> {
    return notImplemented();
  }
}
