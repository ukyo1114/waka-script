import type { EventBus } from "../../../events/index.js";
import type { GameRepository } from "../../../repositories/game/index.js";
import type { PlayerRepository } from "../../../repositories/player/index.js";
import type { MessageService } from "../../message/index.js";

export type PhaseHandlerDeps = {
  games: GameRepository;
  players: PlayerRepository;
  messages: MessageService;
  eventBus?: EventBus;
};

/** ゲーム ID を受け取り、決着に関わる更新を行ったら true を返すハンドラ */
export type PhaseHandlerWithGameId = (
  gameId: string,
  deps: PhaseHandlerDeps,
) => Promise<boolean>;

/** タイマーが各フェーズ終了時に呼ぶハンドラ（引数なし・true で「陣営確定」など次フェーズ分岐に使う） */
export type PhaseHandler = () => Promise<boolean>;

export type PhaseHandlers = {
  PRE_GAME: PhaseHandler;
  DAY: PhaseHandler;
  NIGHT: PhaseHandler;
  POST_GAME: PhaseHandler;
};
