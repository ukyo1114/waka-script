import { GamePhase, type ChannelId, type GameSettings } from "../channel/index.js";
import {
  PlayerRole,
  PlayerStatus,
  ROLE_KEYS_NEEDING_TARGET,
  type CreatePlayerInput,
  type Player,
  type PlayerId,
  type RoleKey,
} from "../player/index.js";
import {
  GameNotFoundError,
  ParticipantRoleCountMismatchError,
} from "../../shared/errors.js";
import {
  GameLogType,
  GameOutcome,
  PlayerTeam,
  type AttackLogEntry,
  type ChannelParticipantSnapshot,
  type Game,
  type GameActionType,
  type GameId,
  type GameLogEntry,
  type GuardLogEntry,
  type PlayerStateForWin,
  type VoteLogEntry,
} from "./game.types.js";

const PLAYING_ROLES: RoleKey[] = [
  PlayerRole.VILLAGER,
  PlayerRole.WEREWOLF,
  PlayerRole.FORTUNE_TELLER,
  PlayerRole.MEDIUM,
  PlayerRole.HUNTER,
  PlayerRole.POSSESSED,
  PlayerRole.FOX,
  PlayerRole.TRAITOR,
  PlayerRole.SHARER,
  PlayerRole.FANATIC,
];

/** 夜行動でターゲットが必要な役職と、そのログタイプの対応 */
export const ROLE_TO_NIGHT_LOG_TYPE: Partial<Record<RoleKey, GameActionType>> = {
  FORTUNE_TELLER: GameLogType.DIVINATION,
  WEREWOLF: GameLogType.ATTACK,
  HUNTER: GameLogType.GUARD,
};

export const ensureGameExists = (game: Game | null): Game => {
  if (!game || game.deletedAt) {
    throw new GameNotFoundError();
  }
  return game;
};

/** チャンネルから Game 作成用の入力を組み立てる */
export const buildNewGameCreatePayload = (
  channelId: ChannelId,
  description: string,
  gameSettings: GameSettings,
): {
  channelId: ChannelId;
  description: string;
  gameSettings: GameSettings;
} => ({
  channelId,
  description,
  gameSettings,
});

const shuffle = <T>(items: readonly T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
};

/** roles を人数分に展開し shuffle した役職キー配列 */
export const buildShuffledRoleOrder = (gameSettings: GameSettings): RoleKey[] => {
  const expanded = Object.entries(gameSettings.roles).flatMap(([key, count]) =>
    typeof count === "number" && count > 0 && key in PlayerRole
      ? (Array(count).fill(key) as RoleKey[])
      : [],
  );
  return shuffle(expanded);
};

export const ensureParticipantCountMatchesRoleCount = (
  participantCount: number,
  roleCount: number,
): void => {
  if (participantCount !== roleCount) {
    throw new ParticipantRoleCountMismatchError(participantCount, roleCount);
  }
};

/** 参加者スナップショットから役職シャッフル割当済みの createMany 用配列を作る */
export const buildPlayersFromParticipants = (
  gameId: GameId,
  participants: readonly ChannelParticipantSnapshot[],
  gameSettings: GameSettings,
  idFactory: () => string,
): CreatePlayerInput[] => {
  const roleOrder = buildShuffledRoleOrder(gameSettings);
  ensureParticipantCountMatchesRoleCount(participants.length, roleOrder.length);
  return participants.map((participant, i) => ({
    id: idFactory(),
    gameId,
    avatarId: participant.avatarId,
    userId: participant.userId,
    name: participant.name,
    pictureUrl: participant.pictureUrl,
    role: roleOrder[i] as RoleKey,
  }));
};

export const getConfiguredRoles = (gameSettings: GameSettings): RoleKey[] =>
  Object.keys(gameSettings.roles).filter((key) => key in PlayerRole) as RoleKey[];

export const getAliveConfiguredRoleKeys = (
  configuredRoles: RoleKey[],
  players: Player[],
): RoleKey[] => {
  const aliveRoles = new Set(
    players.filter((p) => p.status === PlayerStatus.ALIVE).map((p) => p.role),
  );
  return configuredRoles.filter((role) => aliveRoles.has(role));
};

export const getRandomAlivePlayer = (
  players: Player[],
  excludeRole: RoleKey,
): Player | null => {
  const candidates = players.filter(
    (p) => p.status === PlayerStatus.ALIVE && p.role !== excludeRole,
  );
  if (candidates.length === 0) return null;
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index] ?? null;
};

/** その日、設定・生存している「ターゲット必要役職」のうちログが無いものを返す */
export const getRolesMissingLog = (
  game: Game,
  aliveConfigured: RoleKey[],
): RoleKey[] => {
  const day = game.phaseInfo.day;
  const logsOfDay = game.logs.filter((e) => e.gameDay === day);
  const targetRoleSet = new Set(ROLE_KEYS_NEEDING_TARGET);
  const targetRoles = aliveConfigured.filter((r) => targetRoleSet.has(r));
  const missing: RoleKey[] = [];
  for (const role of targetRoles) {
    const logType = ROLE_TO_NIGHT_LOG_TYPE[role];
    if (logType == null) continue;
    const logsOfRole = logsOfDay.filter((e) => e.type === logType);
    if (logsOfRole.length === 0) missing.push(role);
  }
  return missing;
};

/** ログ未登録の役職についてランダムにターゲットを決め、追加すべきログ配列を返す */
export const buildRandomTargetLogs = (
  game: Game,
  aliveConfigured: RoleKey[],
  players: Player[],
): GameLogEntry[] => {
  const missingRoles = getRolesMissingLog(game, aliveConfigured);
  if (missingRoles.length === 0) return [];

  const day = game.phaseInfo.day;
  const logs: GameLogEntry[] = [];
  for (const role of missingRoles) {
    const logType = ROLE_TO_NIGHT_LOG_TYPE[role];
    if (logType == null) continue;
    const target = getRandomAlivePlayer(players, role);
    if (target == null) continue;
    logs.push({
      type: logType,
      gameDay: day,
      phase: game.phaseInfo.phase,
      targetId: target.id,
    } as GameLogEntry);
  }
  return logs;
};

export const buildVictimLog = (game: Game, targetId: PlayerId): GameLogEntry[] => [
  {
    type: GameLogType.VICTIM,
    gameDay: game.phaseInfo.day,
    phase: game.phaseInfo.phase,
    targetId,
  },
];

export const buildFoxCurseLog = (game: Game, targetId: PlayerId): GameLogEntry[] => [
  {
    type: GameLogType.FOX_CURSE,
    gameDay: game.phaseInfo.day,
    phase: game.phaseInfo.phase,
    targetId,
  },
];

export const buildDepravedSuicideLog = (
  game: Game,
  targetId: PlayerId,
): GameLogEntry[] => [
  {
    type: GameLogType.DEPRAVED_SUICIDE,
    gameDay: game.phaseInfo.day,
    phase: game.phaseInfo.phase,
    targetId,
  },
];

export const getAliveTraitorIds = (players: Player[]): PlayerId[] =>
  players
    .filter((p) => p.role === PlayerRole.TRAITOR && p.status === PlayerStatus.ALIVE)
    .map((p) => p.id);

export const buildExecutionLog = (game: Game, targetId: PlayerId): GameLogEntry[] => [
  {
    type: GameLogType.EXECUTION,
    gameDay: game.phaseInfo.day,
    phase: game.phaseInfo.phase,
    targetId,
  },
];

export const buildMediumLog = (
  game: Game,
  targetId: PlayerId,
  result: PlayerTeam,
): GameLogEntry[] => [
  {
    type: GameLogType.MEDIUM,
    gameDay: game.phaseInfo.day,
    phase: game.phaseInfo.phase,
    targetId,
    payload: { result },
  },
];

/** 現在の日・指定ログタイプで最初に見つかったログの targetId に対応するプレイヤーを返す */
export const extractTargetFromLog = (
  game: Game,
  players: Player[],
  logType: GameLogType,
): Player | null => {
  const day = game.phaseInfo.day;
  const log = game.logs.find((e) => e.gameDay === day && e.type === logType);
  if (!log || !("targetId" in log)) return null;
  return players.find((p) => p.id === log.targetId) ?? null;
};

export const detectPlayerTeam = (target: Player): PlayerTeam =>
  target.role === PlayerRole.WEREWOLF ? PlayerTeam.WEREWOLF : PlayerTeam.VILLAGER;

/** 現在の日で指定ログタイプのエントリに payload（結果）を付与した新しいログ配列を返す */
export const applyResultToLogs = (
  game: Game,
  logType: GameLogType,
  result: PlayerTeam,
): GameLogEntry[] => {
  const day = game.phaseInfo.day;
  return game.logs.map((e) => {
    if (e.type === logType && e.gameDay === day) {
      return { ...e, payload: { result } } as GameLogEntry;
    }
    return e;
  });
};

export const getGuardTargetId = (game: Game): PlayerId | null => {
  const day = game.phaseInfo.day;
  const guardLog = game.logs.find(
    (e): e is GuardLogEntry => e.gameDay === day && e.type === GameLogType.GUARD,
  );
  return guardLog?.targetId ?? null;
};

export const getAttackTargetId = (game: Game): PlayerId | null => {
  const day = game.phaseInfo.day;
  const attackLog = game.logs.find(
    (e): e is AttackLogEntry => e.gameDay === day && e.type === GameLogType.ATTACK,
  );
  return attackLog?.targetId ?? null;
};

export const isTargetFox = (players: Player[], targetId: PlayerId): boolean => {
  const target = players.find((p) => p.id === targetId);
  return target?.role === PlayerRole.FOX;
};

/** 襲撃成功時は対象 ID、護衛されている・対象が妖狐の場合は null */
export const doesAttackSucceed = (game: Game, players: Player[]): PlayerId | null => {
  const attackTargetId = getAttackTargetId(game);
  if (attackTargetId == null) return null;
  const guardTargetId = getGuardTargetId(game);
  if (guardTargetId === attackTargetId) return null;
  if (isTargetFox(players, attackTargetId)) return null;
  return attackTargetId;
};

/** 現在の日の投票ログから最多得票者を1名返す（同数はランダム） */
export const getExecutionTargetByVotes = (game: Game): PlayerId | null => {
  const { day } = game.phaseInfo;
  const voteLogs = game.logs.filter(
    (e): e is VoteLogEntry => e.type === GameLogType.VOTE && e.gameDay === day,
  );
  if (voteLogs.length === 0) return null;

  const countByTarget = new Map<PlayerId, number>();
  for (const entry of voteLogs) {
    countByTarget.set(entry.targetId, (countByTarget.get(entry.targetId) ?? 0) + 1);
  }
  const maxCount = Math.max(...countByTarget.values());
  const topTargets = [...countByTarget.entries()]
    .filter(([, count]) => count === maxCount)
    .map(([id]) => id);
  const index = Math.floor(Math.random() * topTargets.length);
  return topTargets[index] ?? null;
};

const mapPlayersToStateForWin = (players: Player[]): PlayerStateForWin[] =>
  players
    .filter((p) => PLAYING_ROLES.includes(p.role))
    .map((p) => ({ role: p.role, isAlive: p.status === PlayerStatus.ALIVE }));

/** 判定順: 妖狐の勝ち → 村人側の勝ち → 人狼の勝ち。いずれも満たさない場合は null（継続） */
export const getGameOutcome = (players: PlayerStateForWin[]): GameOutcome | null => {
  const aliveWerewolves = players.filter(
    (p) => p.role === PlayerRole.WEREWOLF && p.isAlive,
  ).length;
  const aliveVillageSide = players.filter(
    (p) => p.role !== PlayerRole.WEREWOLF && p.isAlive,
  ).length;
  const foxAlive = players.some((p) => p.role === PlayerRole.FOX && p.isAlive);

  const werewolvesEliminated = aliveWerewolves === 0;
  const werewolvesMajority = aliveVillageSide <= aliveWerewolves;
  const gameSet = werewolvesEliminated || werewolvesMajority;

  if (foxAlive && gameSet) return GameOutcome.THIRD_PARTY_WIN;
  if (werewolvesEliminated) return GameOutcome.VILLAGE_WIN;
  if (werewolvesMajority) return GameOutcome.WEREWOLF_WIN;
  return null;
};

export const getGameOutcomeFromPlayers = (players: Player[]): GameOutcome | null =>
  getGameOutcome(mapPlayersToStateForWin(players));

// ---------------------------------------------------------------------------
// フェーズ・タイマー計算
// ---------------------------------------------------------------------------

export const getPhaseDurationMinutes = (
  gameSettings: GameSettings,
  phase: GamePhase,
): number => gameSettings.phaseDurations[phase];

export const getPhaseDurationMs = (
  gameSettings: GameSettings,
  phase: GamePhase,
): number => getPhaseDurationMinutes(gameSettings, phase) * 60 * 1000;

export const computeNextPhaseAt = (
  changedAt: Date,
  gameSettings: GameSettings,
  phase: GamePhase,
): Date => {
  const durationMinutes = getPhaseDurationMinutes(gameSettings, phase);
  const next = new Date(changedAt);
  next.setMinutes(next.getMinutes() + durationMinutes);
  return next;
};

export type NextPhaseResult = {
  phase: GamePhase;
  day: number;
  changedAt: Date;
  nextPhaseAt: Date;
};

/** 現在のフェーズから次のフェーズを決定する。POST_GAME の次は null（進行なし） */
export const getNextPhase = (
  phase: GamePhase,
  day: number,
  gameSettings: GameSettings,
  isGameSet = false,
): NextPhaseResult | null => {
  const changedAt = new Date();
  const nextPhaseAt = computeNextPhaseAt(changedAt, gameSettings, phase);

  if (isGameSet) {
    return { phase: GamePhase.POST_GAME, day, changedAt, nextPhaseAt };
  }
  switch (phase) {
    case GamePhase.PRE_GAME:
      return { phase: GamePhase.DAY, day: 1, changedAt, nextPhaseAt };
    case GamePhase.DAY:
      return { phase: GamePhase.NIGHT, day, changedAt, nextPhaseAt };
    case GamePhase.NIGHT:
      return { phase: GamePhase.DAY, day: day + 1, changedAt, nextPhaseAt };
    case GamePhase.POST_GAME:
      return null;
    default:
      return null;
  }
};
