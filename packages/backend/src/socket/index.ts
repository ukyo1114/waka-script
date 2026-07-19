export type {
  SocketAuthPayload,
  SocketChannelContext,
  SocketContext,
  SocketGameContext,
} from "./socket.types.js";
export {
  isSocketGameContext,
  resolveSocketChannelAuth,
  resolveSocketContext,
  resolveSocketGameAuth,
  type ResolveSocketAuthInput,
  type ResolveSocketContextInput,
  type ResolveSocketGameAuthInput,
} from "./socket.auth.js";
export {
  createSocketAuthMiddleware,
  registerSocketConnectionHandlers,
  type SocketAuthMiddlewareDeps,
  type SocketConnectionHandlerDeps,
} from "./socket.connection.js";
export { registerEntryHandlers, type EntryHandlersDeps } from "./socket.entry.js";
