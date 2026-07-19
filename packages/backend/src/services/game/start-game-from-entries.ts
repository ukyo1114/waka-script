import type { AvatarRepository } from "../../repositories/avatar/index.js";
import type { ChannelParticipantRepository } from "../../repositories/channel-participant/index.js";
import type { ChannelRepository } from "../../repositories/channel/index.js";
import type { GameRepository } from "../../repositories/game/index.js";
import type { MessageRepository } from "../../repositories/message/index.js";
import type { PlayerRepository } from "../../repositories/player/index.js";
import { gameStartedEvent, type EventBus } from "../../events/index.js";
import { MessageService } from "../message/index.js";
import { GameStartService } from "./game-start.service.js";
import { GamePhaseTimer } from "./game-phase-timer.js";
import { createPhaseHandlers, type PhaseHandlerDeps } from "./phase-handlers/index.js";

export type StartGameFromEntriesDeps = {
  channels: ChannelRepository;
  channelParticipants: ChannelParticipantRepository;
  avatars: AvatarRepository;
  games: GameRepository;
  players: PlayerRepository;
  messages: MessageRepository;
  eventBus: EventBus;
};

export type StartGameFromEntriesInput = {
  channelId: string;
  participantIds: string[];
};

/**
 * entry.service.ts の onGameStart フックから呼ばれる実処理。
 * ゲーム・プレイヤーを作成し、game:started を通知したうえで
 * フェーズハンドラを組み立てて GamePhaseTimer を起動する。
 */
export async function startGameFromEntries(
  input: StartGameFromEntriesInput,
  deps: StartGameFromEntriesDeps,
): Promise<void> {
  const gameStartService = new GameStartService({
    channels: deps.channels,
    channelParticipants: deps.channelParticipants,
    avatars: deps.avatars,
    games: deps.games,
    players: deps.players,
  });
  const { game, participantIdToPlayerId } = await gameStartService.start(input);

  deps.eventBus.emit(
    gameStartedEvent(input.channelId, game.id, participantIdToPlayerId),
  );

  const messageService = new MessageService({
    channels: deps.channels,
    channelParticipants: deps.channelParticipants,
    games: deps.games,
    players: deps.players,
    messages: deps.messages,
  });

  const phaseHandlerDeps: PhaseHandlerDeps = {
    games: deps.games,
    players: deps.players,
    messages: messageService,
    eventBus: deps.eventBus,
  };
  const phaseHandlers = await createPhaseHandlers(game.id, phaseHandlerDeps);

  new GamePhaseTimer(
    game.id,
    game.phaseInfo.day,
    game.phaseInfo.phase,
    game.gameSettings,
    phaseHandlers,
    { games: deps.games, players: deps.players, eventBus: deps.eventBus },
    { changedAt: game.phaseInfo.changedAt },
  );
}
