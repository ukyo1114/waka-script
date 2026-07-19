import type { AvatarId } from "../../domain/avatar/index.js";
import type {
  ChannelId,
  ChannelParticipant,
  ChannelParticipantId,
} from "../../domain/channel/index.js";
import type { UserId } from "../../domain/user/index.js";

export type { ChannelParticipant, ChannelParticipantId };

export type CreateChannelParticipantInput = {
  id: ChannelParticipantId;
  channelId: ChannelId;
  userId: UserId;
  avatarId: AvatarId;
};

export interface ChannelParticipantRepository {
  create(input: CreateChannelParticipantInput): Promise<ChannelParticipant>;
  findActiveByChannelIdAndUserId(
    channelId: ChannelId,
    userId: UserId,
  ): Promise<ChannelParticipant | null>;
  listActiveChannelIdsByUserId(userId: UserId): Promise<ChannelId[]>;
}
