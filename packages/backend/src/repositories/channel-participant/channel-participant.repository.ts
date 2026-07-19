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

  findActiveByChannelIdAndUserId(
    _channelId: ChannelId,
    _userId: UserId,
  ): Promise<ChannelParticipant | null> {
    return notImplemented();
  }

  listActiveChannelIdsByUserId(_userId: UserId): Promise<ChannelId[]> {
    return notImplemented();
  }
}
