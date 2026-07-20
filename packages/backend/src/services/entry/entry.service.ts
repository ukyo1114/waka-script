import { randomUUID } from "node:crypto";
import {
  ensureEntryProcessingLockAcquired,
} from "../../domain/channel-entry/index.js";
import {
  ensureChannelExists,
  ensureOwnedChannelParticipant,
  isCountReachedToStartGame,
} from "../../domain/channel/index.js";
import type { ChannelEntryRepository } from "../../repositories/channel-entry/index.js";
import type { ChannelParticipantRepository } from "../../repositories/channel-participant/index.js";
import type { ChannelRepository } from "../../repositories/channel/index.js";
import { NotImplementedError } from "../../shared/errors.js";

export type EntryResult = {
  participantIds: string[];
  /** 開始人数に達しゲーム開始処理（スタブ）を走らせた場合 true */
  gameStarted: boolean;
};

export type RegisterEntryInput = {
  channelId: string;
  participantId: string;
  userId: string;
};

export type CancelEntryInput = RegisterEntryInput;

export type EntryServiceDeps = {
  channels: ChannelRepository;
  channelParticipants: ChannelParticipantRepository;
  channelEntries: ChannelEntryRepository;
  /**
   * ゲーム開始フック（後で本物に差し替え）。
   * 省略時はエントリーを consume するだけ。
   */
  onGameStart?: (input: {
    channelId: string;
    participantIds: string[];
  }) => Promise<void>;
};

/**
 * チャンネルへのゲームエントリー登録・取消。
 * 参加者一覧は Channel 配列ではなく channel_entries テーブル想定。
 */
export class EntryService {
  constructor(private readonly deps?: EntryServiceDeps) {}

  private requireDeps(): EntryServiceDeps {
    if (!this.deps) throw new NotImplementedError("entry.repositories");
    return this.deps;
  }

  private async withEntryLock<T>(
    channelId: string,
    task: () => Promise<T>,
  ): Promise<T> {
    const deps = this.requireDeps();
    const locked = await deps.channels.acquireEntryProcessingLock(channelId);
    ensureEntryProcessingLockAcquired(locked);
    try {
      return await task();
    } finally {
      await deps.channels.releaseEntryProcessingLock(channelId);
    }
  }

  private async requireOwnedParticipant(
    channelId: string,
    participantId: string,
    userId: string,
  ) {
    return ensureOwnedChannelParticipant(
      await this.requireDeps().channelParticipants.findActiveById(participantId),
      channelId,
      userId,
    );
  }

  async register(input: RegisterEntryInput): Promise<EntryResult> {
    const deps = this.requireDeps();
    const channel = ensureChannelExists(
      await deps.channels.findById(input.channelId),
    );
    const participant = await this.requireOwnedParticipant(
      input.channelId,
      input.participantId,
      input.userId,
    );

    return this.withEntryLock(input.channelId, async () => {
      const existing =
        await deps.channelEntries.findActiveByChannelIdAndParticipantId(
          channel.id,
          participant.id,
        );
      if (!existing) {
        await deps.channelEntries.create({
          id: randomUUID(),
          channelId: channel.id,
          participantId: participant.id,
          userId: participant.userId,
          avatarId: participant.avatarId,
        });
      }

      const participantIds =
        await deps.channelEntries.listActiveParticipantIdsByChannelId(
          channel.id,
        );

      if (
        isCountReachedToStartGame(channel.gameSettings, participantIds.length)
      ) {
        await deps.channelEntries.consumeAllActiveByChannelId(channel.id);
        if (deps.onGameStart) {
          await deps.onGameStart({
            channelId: channel.id,
            participantIds,
          });
        }
        return { participantIds: [], gameStarted: true };
      }

      return { participantIds, gameStarted: false };
    });
  }

  async cancel(input: CancelEntryInput): Promise<EntryResult> {
    const deps = this.requireDeps();
    ensureChannelExists(await deps.channels.findById(input.channelId));
    await this.requireOwnedParticipant(
      input.channelId,
      input.participantId,
      input.userId,
    );

    return this.withEntryLock(input.channelId, async () => {
      await deps.channelEntries.softCancelByChannelIdAndParticipantId(
        input.channelId,
        input.participantId,
      );
      const participantIds =
        await deps.channelEntries.listActiveParticipantIdsByChannelId(
          input.channelId,
        );
      return { participantIds, gameStarted: false };
    });
  }
}
