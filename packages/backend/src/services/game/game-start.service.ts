import { randomUUID } from "node:crypto";
import { ensureChannelExists } from "../../domain/channel/index.js";
import {
  buildNewGameCreatePayload,
  buildPlayersFromParticipants,
  type ChannelParticipantSnapshot,
} from "../../domain/game/index.js";
import type { AvatarRepository } from "../../repositories/avatar/index.js";
import type { ChannelParticipantRepository } from "../../repositories/channel-participant/index.js";
import type { ChannelRepository } from "../../repositories/channel/index.js";
import type { Game, GameRepository } from "../../repositories/game/index.js";
import type { Player, PlayerRepository } from "../../repositories/player/index.js";
import {
  AvatarNotFoundError,
  ChannelParticipantNotFoundError,
  NotImplementedError,
} from "../../shared/errors.js";

export type GameStartServiceDeps = {
  channels: ChannelRepository;
  channelParticipants: ChannelParticipantRepository;
  avatars: AvatarRepository;
  games: GameRepository;
  players: PlayerRepository;
};

export type StartGameInput = {
  channelId: string;
  participantIds: string[];
};

export type StartGameResult = {
  game: Game;
  players: Player[];
  /** channelParticipantId → playerId（本人へ通知する際に使う） */
  participantIdToPlayerId: Record<string, string>;
};

/**
 * エントリー人数が開始人数に達したときに呼ばれる。
 * チャンネル設定をゲームへスナップショットし、参加者から役職シャッフル済みのプレイヤーを作成する。
 */
export class GameStartService {
  constructor(private readonly deps?: GameStartServiceDeps) {}

  private requireDeps(): GameStartServiceDeps {
    if (!this.deps) throw new NotImplementedError("game-start.repositories");
    return this.deps;
  }

  async start(input: StartGameInput): Promise<StartGameResult> {
    const deps = this.requireDeps();
    const channel = ensureChannelExists(await deps.channels.findById(input.channelId));

    const game = await deps.games.create({
      id: randomUUID(),
      ...buildNewGameCreatePayload(channel.id, channel.description, channel.gameSettings),
    });

    const snapshots: ChannelParticipantSnapshot[] = [];
    for (const participantId of input.participantIds) {
      const participant =
        await deps.channelParticipants.findActiveById(participantId);
      if (!participant) throw new ChannelParticipantNotFoundError();
      const avatar = await deps.avatars.findById(participant.avatarId);
      if (!avatar) throw new AvatarNotFoundError();
      snapshots.push({
        userId: participant.userId,
        avatarId: participant.avatarId,
        name: avatar.name,
        pictureUrl: avatar.imageUrl,
      });
    }

    const playersToCreate = buildPlayersFromParticipants(
      game.id,
      snapshots,
      channel.gameSettings,
      () => randomUUID(),
    );
    const createdPlayers = await deps.players.createMany(playersToCreate);

    const participantIdToPlayerId: Record<string, string> = {};
    input.participantIds.forEach((participantId, i) => {
      const player = createdPlayers[i];
      if (player) participantIdToPlayerId[participantId] = player.id;
    });

    return { game, players: createdPlayers, participantIdToPlayerId };
  }
}
