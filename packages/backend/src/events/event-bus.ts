export type AppEventType =
  | "entry:updated"
  | "channel:participant:joined"
  | "channel:participant:left"
  | "channel:deleted"
  | "message:sent"
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
  data: {
    participant: {
      id: string;
      channelId: string;
      avatarId: string;
      createdAt: string;
    };
  };
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
  data: { channelId: string };
};

export type AppEvent =
  | EntryUpdatedEvent
  | ChannelParticipantJoinedEvent
  | ChannelParticipantLeftEvent
  | ChannelDeletedEvent;

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

export function channelParticipantJoinedEvent(input: {
  channelId: string;
  participant: {
    id: string;
    channelId: string;
    avatarId: string;
    createdAt: Date;
  };
}): ChannelParticipantJoinedEvent {
  return {
    type: "channel:participant:joined",
    roomId: input.channelId,
    timestamp: new Date(),
    data: {
      participant: {
        id: input.participant.id,
        channelId: input.participant.channelId,
        avatarId: input.participant.avatarId,
        createdAt: input.participant.createdAt.toISOString(),
      },
    },
  };
}

export function channelParticipantLeftEvent(input: {
  channelId: string;
  userId: string;
  participantId: string;
}): ChannelParticipantLeftEvent {
  return {
    type: "channel:participant:left",
    roomId: input.channelId,
    timestamp: new Date(),
    data: { userId: input.userId, participantId: input.participantId },
  };
}

export function channelDeletedEvent(channelId: string): ChannelDeletedEvent {
  return {
    type: "channel:deleted",
    roomId: channelId,
    timestamp: new Date(),
    data: { channelId },
  };
}
