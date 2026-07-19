import type { AvatarId } from "../avatar/index.js";
import type { ChannelId } from "../channel/index.js";
import type { UserId } from "../user/index.js";

export type BlockedUserId = string;

/** チャンネル単位のブロック（再入室禁止） */
export type BlockedUser = {
  id: BlockedUserId;
  channelId: ChannelId;
  /** ブロックされたユーザー */
  userId: UserId;
  /** ブロック時点のアバター */
  avatarId: AvatarId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
