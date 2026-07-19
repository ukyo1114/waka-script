import type { ChannelParticipantRepository } from "../repositories/channel-participant/index.js";
import type { ChannelRepository } from "../repositories/channel/index.js";
import { verifyAccessToken } from "../shared/access-token.js";
import {
  ChannelNotFoundError,
  ChannelParticipantNotFoundError,
  InvalidAccessTokenError,
} from "../shared/errors.js";
import type {
  SocketAuthPayload,
  SocketChannelContext,
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
