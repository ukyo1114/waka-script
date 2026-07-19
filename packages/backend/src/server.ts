import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { createApp, type CreateAppOptions } from "./app.js";
import type { Repositories } from "./repositories/index.js";
import {
  createSocketAuthMiddleware,
  registerSocketConnectionHandlers,
} from "./socket/index.js";

export type CreateServerResult = {
  app: ReturnType<typeof createApp>;
  httpServer: HttpServer;
  io: SocketServer;
};

/**
 * Express + Socket.IO を同一 HTTP サーバーに載せる。
 * 単一インスタンス想定のため Redis adapter は使わない。
 */
export function createServer(
  options?: CreateAppOptions | Repositories,
): CreateServerResult {
  const app = createApp(options);
  const httpServer = createHttpServer(app);

  const corsOrigin = process.env.CORS_ORIGIN ?? true;
  const io = new SocketServer(httpServer, {
    cors: {
      origin: corsOrigin === "true" ? true : corsOrigin,
    },
  });

  io.use(
    createSocketAuthMiddleware({
      getRepos: () => app.locals.repos as Repositories | undefined,
      jwtSecret: process.env.JWT_SECRET,
    }),
  );
  registerSocketConnectionHandlers(io);

  return { app, httpServer, io };
}
