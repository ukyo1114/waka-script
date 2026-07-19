import { GamePhase } from "../channel/index.js";
import { PlayerRole, PlayerStatus, type Player } from "../player/index.js";
import {
  ActionPlayerDeadError,
  ActionPlayerRoleInvalidError,
  GameProcessingError,
  InvalidGamePhaseError,
  TargetPlayerDeadError,
  TargetRoleSameError,
} from "../../shared/errors.js";
import {
  GameLogType,
  type Game,
  type GameActionType,
  type GameLogEntry,
} from "./game.types.js";

type ActionCondition = {
  phase: GamePhase;
  role?: PlayerRole;
};

/** アクション種別ごとの受付条件（役職・フェーズ） */
export const ACTION_CONDITION_MAP: Record<GameActionType, ActionCondition> = {
  [GameLogType.VOTE]: { phase: GamePhase.DAY },
  [GameLogType.DIVINATION]: {
    role: PlayerRole.FORTUNE_TELLER,
    phase: GamePhase.NIGHT,
  },
  [GameLogType.ATTACK]: { role: PlayerRole.WEREWOLF, phase: GamePhase.NIGHT },
  [GameLogType.GUARD]: { role: PlayerRole.HUNTER, phase: GamePhase.NIGHT },
};

export type GameActionContext = {
  game: Game;
  actionPlayer: Player;
  targetPlayer: Player;
  actionType: GameActionType;
};

/** ゲーム処理中・行動者/対象の生存を共通検証する */
export const judgeByCommonCondition = (
  ctx: Pick<GameActionContext, "game" | "actionPlayer" | "targetPlayer">,
): void => {
  const { game, actionPlayer, targetPlayer } = ctx;
  if (game.processing) {
    throw new GameProcessingError();
  }
  if (actionPlayer.status !== PlayerStatus.ALIVE) {
    throw new ActionPlayerDeadError();
  }
  if (targetPlayer.status !== PlayerStatus.ALIVE) {
    throw new TargetPlayerDeadError();
  }
};

/** フェーズ・行動者役職・対象役職（同一役職不可）を検証する */
export const judgeByActionCondition = (ctx: GameActionContext): void => {
  const { game, actionPlayer, targetPlayer, actionType } = ctx;
  const condition = ACTION_CONDITION_MAP[actionType];

  if (condition.phase !== game.phaseInfo.phase) {
    throw new InvalidGamePhaseError();
  }
  if (condition.role !== undefined && condition.role !== actionPlayer.role) {
    throw new ActionPlayerRoleInvalidError();
  }
  if (condition.role !== undefined && condition.role === targetPlayer.role) {
    throw new TargetRoleSameError();
  }
};

/** 共通条件・アクション種別条件の両方を検証する。違反時は throw */
export const canReceiveRequest = (ctx: GameActionContext): void => {
  judgeByCommonCondition(ctx);
  judgeByActionCondition(ctx);
};

/**
 * 指定アクション種別・日・フェーズのログが既に存在するか判定する。
 * VOTE は同一 actorId のログがある場合に true。
 */
export const existsActionRequest = (
  game: Game,
  actorId: string,
  actionType: GameActionType,
): boolean => {
  const { phase, day } = game.phaseInfo;
  return game.logs.some((log) => {
    const matchTypePhaseDay =
      log.type === actionType && log.phase === phase && log.gameDay === day;
    if (actionType !== GameLogType.VOTE) return matchTypePhaseDay;
    return matchTypePhaseDay && "actorId" in log && log.actorId === actorId;
  });
};

/** アクションログを追加または上書きし、更新後のログ配列を返す（永続化はしない） */
export const upsertActionRequest = (ctx: {
  game: Game;
  actorId: string;
  targetId: string;
  actionType: GameActionType;
}): GameLogEntry[] => {
  const { game, actorId, targetId, actionType } = ctx;
  const exists = existsActionRequest(game, actorId, actionType);

  if (exists) {
    return game.logs.map((log) => {
      const matchTypePhaseDay =
        log.type === actionType &&
        log.phase === game.phaseInfo.phase &&
        log.gameDay === game.phaseInfo.day;
      const matchActor =
        actionType !== GameLogType.VOTE ||
        ("actorId" in log && log.actorId === actorId);
      if (matchTypePhaseDay && matchActor) {
        return actionType !== GameLogType.VOTE
          ? { ...log, actorId, targetId }
          : { ...log, targetId };
      }
      return log;
    }) as GameLogEntry[];
  }

  const newLog = {
    type: actionType,
    phase: game.phaseInfo.phase,
    gameDay: game.phaseInfo.day,
    actorId,
    targetId,
  } as GameLogEntry;
  return [...game.logs, newLog];
};
