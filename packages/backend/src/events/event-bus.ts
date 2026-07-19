import type { ChannelParticipant, GamePhaseType } from "../domain/channel/index.js";
import type { Message } from "../domain/message/index.js";

export type AppEventType =
  | "entry:updated"
  | "channel:participant:joined"
  | "channel:participant:left"
  | "channel:deleted"
  | "message:sent"
  | "game:started"
  | "game:phase:changed";

export type EntryUpdatedEvent = {
  type: "entry:updated";
  roomId: string;
  timestamp: Date;
  data: { participantIds: string[] };
};

export type ChannelParticipantJoinedEvent = {
  type: "channel:participant:joined";
  roomId: string;
  timestamp: Date;
  data: { participant: ChannelParticipant };
};

export type ChannelParticipantLeftEvent = {
  type: "channel:participant:left";
  roomId: string;
  timestamp: Date;
  data: { userId: string; participantId: string };
};

export type ChannelDeletedEvent = {
  type: "channel:deleted";
  roomId: string;
  timestamp: Date;
  data: Record<string, never>;
};

export type MessageSentEvent = {
  type: "message:sent";
  roomId: string;
  timestamp: Date;
  data: { message: Message; previousMessageId: string | null };
};

export type GameStartedEvent = {
  type: "game:started";
  /** チャンネルID（エントリー中だった参加者へ通知） */
  roomId: string;
  timestamp: Date;
  data: { gameId: string; participantIdToPlayerId: Record<string, string> };
};

export type GamePhaseChangedPlayerPayload = {
  playerId: string;
  status: string;
};

export type GamePhaseChangedEvent = {
  type: "game:phase:changed";
  /** ゲームID */
  roomId: string;
  timestamp: Date;
  data: {
    day: number;
    phase: GamePhaseType;
    changedAt: string;
    players: GamePhaseChangedPlayerPayload[];
  };
};

export type AppEvent =
  | EntryUpdatedEvent
  | ChannelParticipantJoinedEvent
  | ChannelParticipantLeftEvent
  | ChannelDeletedEvent
  | MessageSentEvent
  | GameStartedEvent
  | GamePhaseChangedEvent;

type AppEventListener = (event: AppEvent) => void;

/**
 * プロセス内イベントバス（単一インスタンス）。
 * Socket.IO へ橋渡しする。Redis Pub/Sub は使わない。
 */
export class EventBus {
  private readonly listeners = new Set<AppEventListener>();

  on(listener: AppEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: AppEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export function entryUpdatedEvent(
  channelId: string,
  participantIds: string[],
): EntryUpdatedEvent {
  return {
    type: "entry:updated",
    roomId: channelId,
    timestamp: new Date(),
    data: { participantIds },
  };
}

export function channelParticipantJoinedEvent(params: {
  channelId: string;
  participant: ChannelParticipant;
}): ChannelParticipantJoinedEvent {
  return {
    type: "channel:participant:joined",
    roomId: params.channelId,
    timestamp: new Date(),
    data: { participant: params.participant },
  };
}

export function channelParticipantLeftEvent(params: {
  channelId: string;
  userId: string;
  participantId: string;
}): ChannelParticipantLeftEvent {
  return {
    type: "channel:participant:left",
    roomId: params.channelId,
    timestamp: new Date(),
    data: { userId: params.userId, participantId: params.participantId },
  };
}

export function channelDeletedEvent(channelId: string): ChannelDeletedEvent {
  return {
    type: "channel:deleted",
    roomId: channelId,
    timestamp: new Date(),
    data: {},
  };
}

export function messageSentEvent(
  roomId: string,
  message: Message,
  previousMessageId: string | null,
): MessageSentEvent {
  return {
    type: "message:sent",
    roomId,
    timestamp: new Date(),
    data: { message, previousMessageId },
  };
}

export function gameStartedEvent(
  channelId: string,
  gameId: string,
  participantIdToPlayerId: Record<string, string>,
): GameStartedEvent {
  return {
    type: "game:started",
    roomId: channelId,
    timestamp: new Date(),
    data: { gameId, participantIdToPlayerId },
  };
}

export function gamePhaseChangedEvent(
  gameId: string,
  params: {
    day: number;
    phase: GamePhaseType;
    changedAt: Date;
    players: GamePhaseChangedPlayerPayload[];
  },
): GamePhaseChangedEvent {
  return {
    type: "game:phase:changed",
    roomId: gameId,
    timestamp: new Date(),
    data: {
      day: params.day,
      phase: params.phase,
      changedAt: params.changedAt.toISOString(),
      players: params.players,
    },
  };
}
