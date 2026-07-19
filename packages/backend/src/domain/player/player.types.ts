import type { AvatarId } from "../avatar/index.js";
import type { GameId } from "../game/index.js";
import type { UserId } from "../user/index.js";

export type PlayerId = string;

/**
 * プレイヤー役職（一覧はここが単一の情報源）。
 * HUNTER は護衛役（狩人）として扱う。
 */
export const PlayerRole = {
  VILLAGER: "VILLAGER",
  WEREWOLF: "WEREWOLF",
  FORTUNE_TELLER: "FORTUNE_TELLER",
  MEDIUM: "MEDIUM",
  HUNTER: "HUNTER",
  POSSESSED: "POSSESSED",
  FOX: "FOX",
  TRAITOR: "TRAITOR",
  SHARER: "SHARER",
  FANATIC: "FANATIC",
} as const;

export type PlayerRole = (typeof PlayerRole)[keyof typeof PlayerRole];

/** 役職のキー（RoleKey は PlayerRole と同一。ゲーム設定の roles マップのキーに使う） */
export type RoleKey = PlayerRole;

export const PlayerStatus = {
  ALIVE: "ALIVE",
  DEAD: "DEAD",
  NON_PLAYER: "NON_PLAYER",
} as const;

export type PlayerStatus = (typeof PlayerStatus)[keyof typeof PlayerStatus];

export type Player = {
  id: PlayerId;
  gameId: GameId;
  /** 参加時点のアバター参照 */
  avatarId: AvatarId;
  /** 所有ユーザー（本人確認用。アバターのスナップショット） */
  userId: UserId;
  /** 名前（アバターのスナップショット） */
  name: string;
  /** 画像URL（アバターのスナップショット） */
  pictureUrl: string;
  role: PlayerRole;
  status: PlayerStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreatePlayerInput = {
  id: PlayerId;
  gameId: GameId;
  avatarId: AvatarId;
  userId: UserId;
  name: string;
  pictureUrl: string;
  role: PlayerRole;
};

/** 夜行動でターゲット選択が必要な役職 */
export const ROLE_KEYS_NEEDING_TARGET: readonly RoleKey[] = [
  PlayerRole.FORTUNE_TELLER,
  PlayerRole.WEREWOLF,
  PlayerRole.HUNTER,
] as const;
