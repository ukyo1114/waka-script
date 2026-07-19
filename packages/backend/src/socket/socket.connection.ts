import type { Server, Socket } from "socket.io";
import type { EventBus } from "../events/index.js";
import type { Repositories } from "../repositories/index.js";
import { resolveSocketContext } from "./socket.auth.js";
import { registerEntryHandlers } from "./socket.entry.js";
import type { SocketChannelContext, SocketGameContext } from "./socket.types.js";

export type SocketAuthMiddlewareDeps = {
  getRepos: () => Repositories | undefined;
  jwtSecret?: string;
};

export type SocketConnectionHandlerDeps = {
  getRepos: () => Repositories | undefined;
  eventBus: EventBus;
};

/** Socket.IO 用認証ミドルウェア（接続前） */
export function createSocketAuthMiddleware(deps: SocketAuthMiddlewareDeps) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const repos = deps.getRepos();
      if (!repos) {
        next(new Error("repositories_not_configured"));
        return;
      }

      const context = await resolveSocketContext({
        auth: socket.handshake.auth,
        channels: repos.channels,
        channelParticipants: repos.channelParticipants,
        games: repos.games,
        players: repos.players,
        jwtSecret: deps.jwtSecret,
      });

      socket.data.userId = context.userId;
      if ("channelId" in context) {
        socket.data.channelId = context.channelId;
        socket.data.participantId = context.participantId;
      } else {
        socket.data.gameId = context.gameId;
        socket.data.playerId = context.playerId;
      }
      next();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "socket_auth_failed";
      next(new Error(message));
    }
  };
}

/** 接続後: チャンネル／ゲームルームへ join + イベントハンドラ登録 */
export function registerSocketConnectionHandlers(
  io: Server,
  deps: SocketConnectionHandlerDeps,
): void {
  io.on("connection", (socket: Socket) => {
    const { userId, channelId, participantId, gameId, playerId } =
      socket.data as Partial<SocketChannelContext & SocketGameContext>;

    if (!userId || (!channelId && !gameId)) {
      socket.emit("error", {
        code: "socket_context_missing",
        message: "socket context is incomplete",
      });
      socket.disconnect(true);
      return;
    }

    if (channelId && participantId) {
      socket.join(channelId);
      socket.emit("socket:ready", { channelId, participantId, userId });
      registerEntryHandlers(io, socket, {
        getRepos: deps.getRepos,
        eventBus: deps.eventBus,
      });
      return;
    }

    if (gameId && playerId) {
      socket.join(gameId);
      socket.emit("socket:ready", { gameId, playerId, userId });
    }
  });
}
