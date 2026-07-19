import {
  ensureGameExists,
  getAliveConfiguredRoleKeys,
  getConfiguredRoles,
} from "../../../domain/game/index.js";
import type { RoleKey } from "../../../domain/player/index.js";
import { runAttack } from "./attack.js";
import { withSuicideForCurse, withSuicideForExecution } from "./depraved-suicide.js";
import { runDivination } from "./divination.js";
import { withEnsureTargets } from "./ensure-night-targets.js";
import { execution } from "./execution.js";
import { runMedium } from "./medium.js";
import {
  sendGameStartSystemMessage,
  sendNightActionResultSystemMessages,
  sendVoteResultSystemMessages,
} from "./system-messages.js";
import type { PhaseHandler, PhaseHandlerDeps, PhaseHandlerWithGameId, PhaseHandlers } from "./types.js";
import { withJudgment, withJudgmentForHandlers } from "./win-judgment.js";

/** PRE_GAME 開始時: ゲーム開始（配役）のシステムメッセージを送る */
export const createPreGameHandler = (gameId: string, deps: PhaseHandlerDeps): PhaseHandler => {
  return async (): Promise<boolean> => {
    await sendGameStartSystemMessage(gameId, deps);
    return false;
  };
};

/** DAY 終了時: 処刑（＋背徳後追い・勝敗判定）後、昼結果のシステムメッセージを送る */
export const createDayHandler = (gameId: string, deps: PhaseHandlerDeps): PhaseHandler => {
  const executionWithWinJudgment = withJudgment(withSuicideForExecution(execution));
  return async (): Promise<boolean> => {
    const outcome = await executionWithWinJudgment(gameId, deps);
    await sendVoteResultSystemMessages(gameId, deps, outcome);
    return outcome != null;
  };
};

/** 役職 → 夜行動ハンドラの対応（霊能 → 占い → 襲撃の順で列挙） */
export const ROLE_TO_HANDLER_MAP = new Map<RoleKey, PhaseHandlerWithGameId>([
  ["MEDIUM", runMedium],
  [
    "FORTUNE_TELLER",
    withSuicideForCurse((gameId, deps) => runDivination(gameId, deps, true)),
  ],
  ["WEREWOLF", runAttack],
]);

/** 霊能→占い→襲撃の順で、指定した役職キーに含まれるエントリだけを抜き出したマップを返す */
export const getNightHandlersInOrder = (
  roleKeys: RoleKey[],
  roleToHandlerMap: Map<RoleKey, PhaseHandlerWithGameId> = ROLE_TO_HANDLER_MAP,
): Map<RoleKey, PhaseHandlerWithGameId> => {
  const allowed = new Set(roleKeys);
  return new Map([...roleToHandlerMap.entries()].filter(([key]) => allowed.has(key)));
};

/** NIGHT: 未行動分のランダム補完のあと夜ハンドラ列を実行し、結果をシステムメッセージに載せる */
export const createNightHandler = async (
  gameId: string,
  deps: PhaseHandlerDeps,
): Promise<PhaseHandler> => {
  const game = ensureGameExists(await deps.games.findById(gameId));
  const configuredRoles = getConfiguredRoles(game.gameSettings);
  const roleToHandlerMap = getNightHandlersInOrder(configuredRoles, ROLE_TO_HANDLER_MAP);

  return async (): Promise<boolean> => {
    const currentGame = ensureGameExists(await deps.games.findById(gameId));
    const players = await deps.players.listActiveByGameId(gameId);
    const aliveConfigured = getAliveConfiguredRoleKeys(configuredRoles, players);
    const nightHandlers = getNightHandlersInOrder(aliveConfigured, roleToHandlerMap);

    const outcome = await withEnsureTargets(
      currentGame,
      players,
      aliveConfigured,
      deps,
      async () => withJudgmentForHandlers(gameId, deps, nightHandlers.values()),
    );

    await sendNightActionResultSystemMessages(gameId, deps, outcome);
    return outcome !== null;
  };
};

/** POST_GAME: 現状は何もしない */
export const createPostGameHandler = (): PhaseHandler => async () => false;

/** ゲーム ID に紐づくフェーズ別ハンドラ一式を生成する */
export const createPhaseHandlers = async (
  gameId: string,
  deps: PhaseHandlerDeps,
): Promise<PhaseHandlers> => ({
  PRE_GAME: createPreGameHandler(gameId, deps),
  DAY: createDayHandler(gameId, deps),
  NIGHT: await createNightHandler(gameId, deps),
  POST_GAME: createPostGameHandler(),
});
