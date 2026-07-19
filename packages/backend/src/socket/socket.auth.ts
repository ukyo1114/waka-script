import type { ChannelParticipantRepository } from "../repositories/channel-participant/index.js";
import type { ChannelRepository } from "../repositories/channel/index.js";
import type { GameRepository } from "../repositories/game/index.js";
import type { PlayerRepository } from "../repositories/player/index.js";
import { verifyAccessToken } from "../shared/access-token.js";
import {
  ChannelNotFoundError,
  ChannelParticipantNotFoundError,
  GameNotFoundError,
  InvalidAccessTokenError,
  PlayerNotFoundError,
  SocketAuthContextInvalidError,
} from "../shared/errors.js";
import type {
  SocketAuthPayload,
  SocketChannelContext,
  SocketContext,
  SocketGameContext,
} from "./socket.types.js";

export type ResolveSocketAuthInput = {
  auth: SocketAuthPayload;
  channels: ChannelRepository;
  channelParticipants: ChannelParticipantRepository;
  jwtSecret?: string;
};

/**
 * handshake.auth を検証し、チャンネル接続コンテキストを返す。
 * JWT + participantId → 所有者・チャンネル存在を確認。
 */
export async function resolveSocketChannelAuth(
  input: ResolveSocketAuthInput,
): Promise<SocketChannelContext> {
  const token =
    typeof input.auth.token === "string" ? input.auth.token.trim() : "";
  const participantId =
    typeof input.auth.participantId === "string"
      ? input.auth.participantId.trim()
      : "";

  if (!token) throw new InvalidAccessTokenError();
  if (!participantId) throw new ChannelParticipantNotFoundError();

  const claims = await verifyAccessToken({
    token,
    secret: input.jwtSecret,
  });

  const participant =
    await input.channelParticipants.findActiveById(participantId);
  if (!participant || participant.userId !== claims.userId) {
    throw new ChannelParticipantNotFoundError();
  }

  const channel = await input.channels.findById(participant.channelId);
  if (!channel || channel.deletedAt) {
    throw new ChannelNotFoundError();
  }

  return {
    userId: claims.userId,
    channelId: channel.id,
    participantId: participant.id,
  };
}

export type ResolveSocketGameAuthInput = {
  auth: SocketAuthPayload;
  games: GameRepository;
  players: PlayerRepository;
  jwtSecret?: string;
};

/**
 * handshake.auth を検証し、ゲーム接続コンテキストを返す。
 * JWT + playerId → 所有者・ゲーム存在を確認。
 */
export async function resolveSocketGameAuth(
  input: ResolveSocketGameAuthInput,
): Promise<SocketGameContext> {
  const token =
    typeof input.auth.token === "string" ? input.auth.token.trim() : "";
  const playerId =
    typeof input.auth.playerId === "string" ? input.auth.playerId.trim() : "";

  if (!token) throw new InvalidAccessTokenError();
  if (!playerId) throw new PlayerNotFoundError();

  const claims = await verifyAccessToken({
    token,
    secret: input.jwtSecret,
  });

  const player = await input.players.findActiveById(playerId);
  if (!player || player.userId !== claims.userId) {
    throw new PlayerNotFoundError();
  }

  const game = await input.games.findById(player.gameId);
  if (!game || game.deletedAt) {
    throw new GameNotFoundError();
  }

  return {
    userId: claims.userId,
    gameId: game.id,
    playerId: player.id,
  };
}

export type ResolveSocketContextInput = {
  auth: SocketAuthPayload;
  channels: ChannelRepository;
  channelParticipants: ChannelParticipantRepository;
  games: GameRepository;
  players: PlayerRepository;
  jwtSecret?: string;
};

/**
 * participantId（チャンネル）と playerId（ゲーム）は相互排他。
 * どちらか一方のみが指定されている場合に、対応する認証を行う。
 */
export async function resolveSocketContext(
  input: ResolveSocketContextInput,
): Promise<SocketContext> {
  const hasParticipantId = typeof input.auth.participantId === "string";
  const hasPlayerId = typeof input.auth.playerId === "string";

  if (hasParticipantId === hasPlayerId) {
    throw new SocketAuthContextInvalidError();
  }

  if (hasParticipantId) {
    return resolveSocketChannelAuth({
      auth: input.auth,
      channels: input.channels,
      channelParticipants: input.channelParticipants,
      jwtSecret: input.jwtSecret,
    });
  }

  return resolveSocketGameAuth({
    auth: input.auth,
    games: input.games,
    players: input.players,
    jwtSecret: input.jwtSecret,
  });
}

export function isSocketGameContext(
  context: SocketContext,
): context is SocketGameContext {
  return "gameId" in context;
}
