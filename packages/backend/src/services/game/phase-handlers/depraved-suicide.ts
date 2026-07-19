import {
  buildDepravedSuicideLog,
  ensureGameExists,
  extractTargetFromLog,
  getAliveTraitorIds,
  GameLogType,
  type Game,
} from "../../../domain/game/index.js";
import { PlayerRole, PlayerStatus, type Player } from "../../../domain/player/index.js";
import type { PhaseHandlerDeps, PhaseHandlerWithGameId } from "./types.js";

/** 生存背徳者を死亡にし、後追い自殺ログを追加する */
export const depravedSuicide = async (
  game: Game,
  players: Player[],
  deps: PhaseHandlerDeps,
): Promise<void> => {
  const aliveTraitorIds = getAliveTraitorIds(players);
  if (aliveTraitorIds.length === 0) return;

  await Promise.all(
    aliveTraitorIds.map((traitorId) =>
      Promise.all([
        deps.players.update(traitorId, { status: PlayerStatus.DEAD }),
        deps.games.addLogs(game.id, buildDepravedSuicideLog(game, traitorId)),
      ]),
    ),
  );
};

/** ハンドラ実行後、当日の処刑で妖狐が死亡していれば背徳者の後追い自殺を行う */
export const withSuicideForExecution =
  (fn: PhaseHandlerWithGameId): PhaseHandlerWithGameId =>
  async (gameId, deps) => {
    const result = await fn(gameId, deps);

    const game = ensureGameExists(await deps.games.findById(gameId));
    const players = await deps.players.listActiveByGameId(gameId);
    const executedTarget = extractTargetFromLog(game, players, GameLogType.EXECUTION);
    if (executedTarget?.role === PlayerRole.FOX) {
      await depravedSuicide(game, players, deps);
    }
    return result;
  };

/** ハンドラ実行後、当日の妖狐呪殺ログがあれば背徳者の後追い自殺を行う */
export const withSuicideForCurse =
  (fn: PhaseHandlerWithGameId): PhaseHandlerWithGameId =>
  async (gameId, deps) => {
    const result = await fn(gameId, deps);

    const game = ensureGameExists(await deps.games.findById(gameId));
    const players = await deps.players.listActiveByGameId(gameId);
    const cursedTarget = extractTargetFromLog(game, players, GameLogType.FOX_CURSE);
    if (cursedTarget) {
      await depravedSuicide(game, players, deps);
    }
    return result;
  };
