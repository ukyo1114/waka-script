export type AppEventType = "entry:updated";

export type EntryUpdatedEvent = {
  type: "entry:updated";
  roomId: string;
  timestamp: Date;
  data: { participantIds: string[] };
};

export type AppEvent = EntryUpdatedEvent;

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
