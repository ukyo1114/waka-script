import type { AvatarId } from "../../domain/avatar/index.js";
import type {
  ChannelEntry,
  ChannelEntryId,
} from "../../domain/channel-entry/index.js";
import type {
  ChannelId,
  ChannelParticipantId,
} from "../../domain/channel/index.js";
import type { UserId } from "../../domain/user/index.js";

export type { ChannelEntry, ChannelEntryId };

export type CreateChannelEntryInput = {
  id: ChannelEntryId;
  channelId: ChannelId;
  participantId: ChannelParticipantId;
  userId: UserId;
  avatarId: AvatarId;
};

export interface ChannelEntryRepository {
  create(input: CreateChannelEntryInput): Promise<ChannelEntry>;
  findActiveByChannelIdAndParticipantId(
    channelId: ChannelId,
    participantId: ChannelParticipantId,
  ): Promise<ChannelEntry | null>;
  /** アクティブな参加者 ID（ChannelParticipant.id）一覧 */
  listActiveParticipantIdsByChannelId(
    channelId: ChannelId,
  ): Promise<ChannelParticipantId[]>;
  softCancelByChannelIdAndParticipantId(
    channelId: ChannelId,
    participantId: ChannelParticipantId,
  ): Promise<ChannelEntry | null>;
  /** ゲーム開始時: active をすべて consumed にする */
  consumeAllActiveByChannelId(channelId: ChannelId): Promise<number>;
}
