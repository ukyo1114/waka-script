import type { AvatarId } from "../../domain/avatar/index.js";
import type {
  Channel,
  ChannelId,
  ChannelSettings,
  GameSettings,
} from "../../domain/channel/index.js";
import type { UserId } from "../../domain/user/index.js";

export type { Channel, ChannelId };

export type CreateChannelInput = {
  id: ChannelId;
  adminId: AvatarId;
  adminUserId: UserId;
  title: string;
  description: string;
  settings: ChannelSettings;
  gameSettings: GameSettings;
};

export type UpdateChannelInput = {
  title?: string;
  description?: string;
  settings?: ChannelSettings;
  gameSettings?: GameSettings;
};

export interface ChannelRepository {
  create(input: CreateChannelInput): Promise<Channel>;
  findById(id: ChannelId): Promise<Channel | null>;
  /** 未削除チャンネルを新しい順 */
  listActive(): Promise<Channel[]>;
  update(id: ChannelId, input: UpdateChannelInput): Promise<Channel | null>;
}
