import type { AvatarId } from "../avatar/index.js";
import type { ChannelId, GamePhase, GameSettings } from "../channel/index.js";
import type { PlayerId, RoleKey } from "../player/index.js";
import type { UserId } from "../user/index.js";

export type GameId = string;

export type GamePhaseInfo = {
  phase: GamePhase;
  /** ゲーム内の日付（0日目から） */
  day: number;
  changedAt: Date;
  nextPhaseAt: Date | null;
};

/** ゲームログエントリのタイプ */
export const GameLogType = {
  VOTE: "VOTE",
  EXECUTION: "EXECUTION",
  DIVINATION: "DIVINATION",
  MEDIUM: "MEDIUM",
  ATTACK: "ATTACK",
  VICTIM: "VICTIM",
  GUARD: "GUARD",
  GAME_RESULT: "GAME_RESULT",
  FOX_CURSE: "FOX_CURSE",
  DEPRAVED_SUICIDE: "DEPRAVED_SUICIDE",
} as const;

export type GameLogType = (typeof GameLogType)[keyof typeof GameLogType];

export type GameActionType =
  | typeof GameLogType.VOTE
  | typeof GameLogType.DIVINATION
  | typeof GameLogType.ATTACK
  | typeof GameLogType.GUARD;

/** 占い・霊能の結果（役職の陣営） */
export const PlayerTeam = {
  VILLAGER: "VILLAGER",
  WEREWOLF: "WEREWOLF",
} as const;

export type PlayerTeam = (typeof PlayerTeam)[keyof typeof PlayerTeam];

export const GameOutcome = {
  VILLAGE_WIN: "VILLAGE_WIN",
  WEREWOLF_WIN: "WEREWOLF_WIN",
  THIRD_PARTY_WIN: "THIRD_PARTY_WIN",
} as const;

export type GameOutcome = (typeof GameOutcome)[keyof typeof GameOutcome];

type GameLogEntryBase = {
  gameDay: number;
  phase: GamePhase;
};

type GameLogEntryWithTarget = GameLogEntryBase & {
  targetId: PlayerId;
};

export type VoteLogEntry = GameLogEntryWithTarget & {
  type: typeof GameLogType.VOTE;
  actorId: PlayerId;
};

export type ExecutionLogEntry = GameLogEntryWithTarget & {
  type: typeof GameLogType.EXECUTION;
};

export type DivinationLogEntry = GameLogEntryWithTarget & {
  type: typeof GameLogType.DIVINATION;
  actorId?: PlayerId;
  payload?: { result: PlayerTeam };
};

export type MediumLogEntry = GameLogEntryWithTarget & {
  type: typeof GameLogType.MEDIUM;
  payload?: { result: PlayerTeam };
};

export type AttackLogEntry = GameLogEntryWithTarget & {
  type: typeof GameLogType.ATTACK;
  actorId?: PlayerId;
};

export type VictimLogEntry = GameLogEntryWithTarget & {
  type: typeof GameLogType.VICTIM;
};

export type GuardLogEntry = GameLogEntryWithTarget & {
  type: typeof GameLogType.GUARD;
  actorId?: PlayerId;
};

export type GameResultLogEntry = GameLogEntryBase & {
  type: typeof GameLogType.GAME_RESULT;
  payload?: { outcome: GameOutcome };
};

export type FoxCurseLogEntry = GameLogEntryWithTarget & {
  type: typeof GameLogType.FOX_CURSE;
};

export type DepravedSuicideLogEntry = GameLogEntryWithTarget & {
  type: typeof GameLogType.DEPRAVED_SUICIDE;
};

export type GameLogEntry =
  | VoteLogEntry
  | ExecutionLogEntry
  | DivinationLogEntry
  | MediumLogEntry
  | AttackLogEntry
  | VictimLogEntry
  | GuardLogEntry
  | GameResultLogEntry
  | FoxCurseLogEntry
  | DepravedSuicideLogEntry;

export type Game = {
  id: GameId;
  channelId: ChannelId;
  /** チャンネル説明文のスナップショット */
  description: string;
  /** チャンネル gameSettings のスナップショット */
  gameSettings: GameSettings;
  logs: GameLogEntry[];
  /** フェーズハンドラ実行中フラグ（多重実行防止） */
  processing: boolean;
  phaseInfo: GamePhaseInfo;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

/** 勝敗判定用の最小状態 */
export type PlayerStateForWin = {
  role: RoleKey;
  isAlive: boolean;
};

export type ChannelParticipantSnapshot = {
  userId: UserId;
  avatarId: AvatarId;
  name: string;
  pictureUrl: string;
};
