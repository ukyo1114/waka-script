import type {
  Channel,
  ChannelId,
  CreateChannelInput,
  UpdateChannelInput,
  ChannelRepository,
} from "./channel.repository.types.js";

function notImplemented(): never {
  throw new Error("ChannelRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class ChannelRepositoryImpl implements ChannelRepository {
  create(_input: CreateChannelInput): Promise<Channel> {
    return notImplemented();
  }

  findById(_id: ChannelId): Promise<Channel | null> {
    return notImplemented();
  }

  listActive(): Promise<Channel[]> {
    return notImplemented();
  }

  update(_id: ChannelId, _input: UpdateChannelInput): Promise<Channel | null> {
    return notImplemented();
  }

  acquireEntryProcessingLock(_id: ChannelId): Promise<Channel | null> {
    return notImplemented();
  }

  releaseEntryProcessingLock(_id: ChannelId): Promise<void> {
    return notImplemented();
  }

  softDelete(_id: ChannelId): Promise<Channel | null> {
    return notImplemented();
  }
}
