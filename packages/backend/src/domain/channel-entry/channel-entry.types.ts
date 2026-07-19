import type { AvatarId } from "../avatar/index.js";
import type { ChannelId, ChannelParticipantId } from "../channel/index.js";
import type { UserId } from "../user/index.js";

export type ChannelEntryId = string;

/**
 * エントリー行の状態。
 * jinro の Channel.entries.participants[] の代わりに行として持つ。
 */
export const ChannelEntryStatus = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  CONSUMED: "consumed",
} as const;

export type ChannelEntryStatus =
  (typeof ChannelEntryStatus)[keyof typeof ChannelEntryStatus];

export type ChannelEntry = {
  id: ChannelEntryId;
  channelId: ChannelId;
  participantId: ChannelParticipantId;
  userId: UserId;
  avatarId: AvatarId;
  status: ChannelEntryStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
