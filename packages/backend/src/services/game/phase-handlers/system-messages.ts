import {
  buildGameEndSystemMessage,
  buildNightActionResultSystemMessage,
  buildPreGameSystemMessage,
  buildVoteResultSystemMessage,
  ensureGameExists,
  type GameOutcome,
} from "../../../domain/game/index.js";
import { messageSentEvent } from "../../../events/index.js";
import type { PhaseHandlerDeps } from "./types.js";

/** システムメッセージを作成し、message:sent を配信する */
const sendSystemMessage = async (
  roomId: string,
  content: string,
  deps: PhaseHandlerDeps,
): Promise<void> => {
  const result = await deps.messages.createSystemMessage(roomId, content);
  deps.eventBus?.emit(messageSentEvent(roomId, result.message, result.previousMessageId));
};

/** ゲーム開始（配役）のシステムメッセージを送る */
export const sendGameStartSystemMessage = async (
  gameId: string,
  deps: PhaseHandlerDeps,
): Promise<void> => {
  const game = ensureGameExists(await deps.games.findById(gameId));
  await sendSystemMessage(gameId, buildPreGameSystemMessage(game), deps);
};

/** 昼終了時の得票結果（＋決着時はゲーム終了）のシステムメッセージを送る */
export const sendVoteResultSystemMessages = async (
  gameId: string,
  deps: PhaseHandlerDeps,
  outcome: GameOutcome | null,
): Promise<void> => {
  const game = ensureGameExists(await deps.games.findById(gameId));
  const players = await deps.players.listActiveByGameId(gameId);

  await sendSystemMessage(gameId, buildVoteResultSystemMessage(game, players), deps);
  if (outcome != null) {
    await sendSystemMessage(gameId, buildGameEndSystemMessage(outcome), deps);
  }
};

/** 夜終了時の襲撃・占い結果等（＋決着時はゲーム終了）のシステムメッセージを送る */
export const sendNightActionResultSystemMessages = async (
  gameId: string,
  deps: PhaseHandlerDeps,
  outcome: GameOutcome | null,
): Promise<void> => {
  const game = ensureGameExists(await deps.games.findById(gameId));
  const players = await deps.players.listActiveByGameId(gameId);

  await sendSystemMessage(gameId, buildNightActionResultSystemMessage(game, players), deps);
  if (outcome != null) {
    await sendSystemMessage(gameId, buildGameEndSystemMessage(outcome), deps);
  }
};
