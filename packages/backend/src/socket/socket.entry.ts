import type { Server, Socket } from "socket.io";
import type { EventBus } from "../events/index.js";
import { entryUpdatedEvent } from "../events/index.js";
import type { Repositories } from "../repositories/index.js";
import { EntryService } from "../services/entry/index.js";
import { startGameFromEntries } from "../services/game/index.js";
import type { SocketChannelContext } from "./socket.types.js";

export type EntryHandlersDeps = {
  getRepos: () => Repositories | undefined;
  eventBus: EventBus;
};

function createEntryService(repos: Repositories, eventBus: EventBus): EntryService {
  return new EntryService({
    channels: repos.channels,
    channelParticipants: repos.channelParticipants,
    channelEntries: repos.channelEntries,
    onGameStart: (input) =>
      startGameFromEntries(input, {
        channels: repos.channels,
        channelParticipants: repos.channelParticipants,
        avatars: repos.avatars,
        games: repos.games,
        players: repos.players,
        messages: repos.messages,
        eventBus,
      }),
  });
}

async function emitEntryUpdated(
  eventBus: EventBus,
  channelId: string,
  participantIds: string[],
) {
  eventBus.emit(entryUpdatedEvent(channelId, participantIds));
}

/**
 * entry:register / entry:cancel / disconnect(?? cancel)
 */
export function registerEntryHandlers(
  _io: Server,
  socket: Socket,
  deps: EntryHandlersDeps,
): void {
  const context = socket.data as SocketChannelContext;

  socket.on("entry:register", async () => {
    try {
      const repos = deps.getRepos();
      if (!repos) throw new Error("repositories_not_configured");
      if (!context.userId || !context.channelId || !context.participantId) {
        throw new Error("socket_context_missing");
      }
      const result = await createEntryService(repos, deps.eventBus).register({
        channelId: context.channelId,
        participantId: context.participantId,
        userId: context.userId,
      });
      await emitEntryUpdated(
        deps.eventBus,
        context.channelId,
        result.participantIds,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "entry_failed";
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : "entry_error";
      socket.emit("entry:error", { code, message });
    }
  });

  socket.on("entry:cancel", async () => {
    try {
      const repos = deps.getRepos();
      if (!repos) throw new Error("repositories_not_configured");
      if (!context.userId || !context.channelId || !context.participantId) {
        throw new Error("socket_context_missing");
      }
      const result = await createEntryService(repos, deps.eventBus).cancel({
        channelId: context.channelId,
        participantId: context.participantId,
        userId: context.userId,
      });
      await emitEntryUpdated(
        deps.eventBus,
        context.channelId,
        result.participantIds,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "entry_failed";
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : "entry_error";
      socket.emit("entry:error", { code, message });
    }
  });

  socket.on("disconnect", async () => {
    try {
      const repos = deps.getRepos();
      if (!repos) return;
      if (!context.userId || !context.channelId || !context.participantId) {
        return;
      }
      const result = await createEntryService(repos, deps.eventBus).cancel({
        channelId: context.channelId,
        participantId: context.participantId,
        userId: context.userId,
      });
      await emitEntryUpdated(
        deps.eventBus,
        context.channelId,
        result.participantIds,
      );
    } catch {
      // disconnect ?????????????
    }
  });
}
