import { getGameOutcomeFromPlayers, type GameOutcome } from "../../../domain/game/index.js";
import type { PhaseHandlerDeps, PhaseHandlerWithGameId } from "./types.js";

export type JudgmentHandler = (
  gameId: string,
  deps: PhaseHandlerDeps,
) => Promise<GameOutcome | null>;

/** 処刑・襲撃・呪殺など「誰かが死亡する処理」の直後に呼ぶ共通の勝敗判定 */
export const runJudgment: JudgmentHandler = async (gameId, deps) => {
  const players = await deps.players.listActiveByGameId(gameId);
  return getGameOutcomeFromPlayers(players);
};

/** ハンドラ実行直後に勝敗判定を行うハンドラを返す */
export const withJudgment =
  (handler: PhaseHandlerWithGameId): JudgmentHandler =>
  async (gameId, deps) => {
    await handler(gameId, deps);
    return runJudgment(gameId, deps);
  };

/** 複数の「死亡系」ハンドラを順に実行し、いずれかの直後の勝敗判定で決着がついたらその結果を返す */
export const withJudgmentForHandlers = async (
  gameId: string,
  deps: PhaseHandlerDeps,
  handlers: Iterable<PhaseHandlerWithGameId>,
): Promise<GameOutcome | null> => {
  for (const handler of handlers) {
    const outcome = await withJudgment(handler)(gameId, deps);
    if (outcome !== null) return outcome;
  }
  return null;
};
