import type { AvatarId } from "../avatar/index.js";
import type { UserId } from "../user/index.js";

export type ChannelId = string;

/** ゲームフェーズ（チャンネルの gameSettings テンプレートでも使用） */
export const GamePhase = {
  PRE_GAME: "PRE_GAME",
  DAY: "DAY",
  NIGHT: "NIGHT",
  POST_GAME: "POST_GAME",
} as const;

export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export type PhaseDurations = Record<GamePhase, number>;

/** 役職キー → 人数（後で game ドメインで厳密化） */
export type GameRoleSettings = Record<string, number>;

export type GameSettings = {
  roles: GameRoleSettings;
  phaseDurations: PhaseDurations;
};

/** DB に保存するチャンネル設定（パスワードはハッシュのみ） */
export type ChannelSettings = {
  passwordHash: string | null;
  passwordEnabled: boolean;
  guestAllowed: boolean;
};

/** API 公開用（パスワードは出さない） */
export type PublicChannelSettings = {
  passwordEnabled: boolean;
  guestAllowed: boolean;
};

export type Channel = {
  id: ChannelId;
  /** 管理者アバター */
  adminId: AvatarId;
  /** 管理者ユーザー（所有・退出判定用。adminId の所有者と一致） */
  adminUserId: UserId;
  title: string;
  description: string;
  settings: ChannelSettings;
  gameSettings: GameSettings;
  entryProcessing: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ChannelParticipantId = string;

export type ChannelParticipant = {
  id: ChannelParticipantId;
  channelId: ChannelId;
  userId: UserId;
  avatarId: AvatarId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export const CHANNEL_TITLE_MAX_LENGTH = 100;
export const CHANNEL_DESCRIPTION_MAX_LENGTH = 500;
export const PHASE_DURATION_MAX_MINUTES = 1440;

export const DEFAULT_PHASE_DURATIONS: PhaseDurations = {
  [GamePhase.PRE_GAME]: 5,
  [GamePhase.DAY]: 10,
  [GamePhase.NIGHT]: 5,
  [GamePhase.POST_GAME]: 10,
};

export type SettingsInput = {
  password?: string;
  passwordEnabled?: boolean;
  guestAllowed?: boolean;
};

export type GameSettingsInput = {
  roles?: GameRoleSettings;
  phaseDurations?: Partial<PhaseDurations>;
};
