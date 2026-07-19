import type {
  ChannelId,
  ChannelParticipantId,
} from "../../domain/channel/index.js";
import type {
  ChannelEntry,
  ChannelEntryRepository,
  CreateChannelEntryInput,
} from "./channel-entry.repository.types.js";

function notImplemented(): never {
  throw new Error("ChannelEntryRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class ChannelEntryRepositoryImpl implements ChannelEntryRepository {
  create(_input: CreateChannelEntryInput): Promise<ChannelEntry> {
    return notImplemented();
  }

  findActiveByChannelIdAndParticipantId(
    _channelId: ChannelId,
    _participantId: ChannelParticipantId,
  ): Promise<ChannelEntry | null> {
    return notImplemented();
  }

  listActiveParticipantIdsByChannelId(
    _channelId: ChannelId,
  ): Promise<ChannelParticipantId[]> {
    return notImplemented();
  }

  softCancelByChannelIdAndParticipantId(
    _channelId: ChannelId,
    _participantId: ChannelParticipantId,
  ): Promise<ChannelEntry | null> {
    return notImplemented();
  }

  consumeAllActiveByChannelId(_channelId: ChannelId): Promise<number> {
    return notImplemented();
  }
}
