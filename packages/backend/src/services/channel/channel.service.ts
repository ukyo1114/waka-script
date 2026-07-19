import { randomUUID } from "node:crypto";
import { assertAvatarOwnedByUser } from "../../domain/avatar/index.js";
import {
  assertCannotBlockChannelAdmin,
  assertNotAlreadyBlocked,
  assertNotBlockedFromChannel,
  type BlockedUser,
} from "../../domain/blocked-user/index.js";
import {
  assertChannelAdmin,
  assertChannelAdminCannotLeave,
  assertGuestCanCreateChannel,
  assertJoinAllowed,
  buildGameSettings,
  ensureChannelExists,
  isPasswordProtected,
  mergeGameSettings,
  resolveSettingsForCreate,
  resolveSettingsForUpdate,
  toPublicChannelSettings,
  type Channel,
  type ChannelParticipant,
  type GameSettingsInput,
  type PublicChannelSettings,
  type SettingsInput,
} from "../../domain/channel/index.js";
import type { EventBus } from "../../events/index.js";
import {
  channelDeletedEvent,
  channelParticipantJoinedEvent,
  channelParticipantLeftEvent,
} from "../../events/index.js";
import type { AvatarRepository } from "../../repositories/avatar/index.js";
import type { BlockedUserRepository } from "../../repositories/blocked-user/index.js";
import type { ChannelParticipantRepository } from "../../repositories/channel-participant/index.js";
import type { ChannelRepository } from "../../repositories/channel/index.js";
import type { UserRepository } from "../../repositories/user/index.js";
import {
  AvatarNotFoundError,
  BlockedUserNotFoundError,
  ChannelNotFoundError,
  ChannelParticipantNotFoundError,
  InvalidChannelPasswordError,
  NotImplementedError,
  UserAccountLockedError,
  UserNotFoundError,
} from "../../shared/errors.js";
import { hashSecret, verifySecret } from "../../shared/hash.js";

export type CreateChannelInput = {
  userId: string;
  avatarId: string;
  title: string;
  description?: string;
  settings?: SettingsInput;
  gameSettings?: GameSettingsInput;
};

export type ListChannelsInput = {
  userId: string;
};

export type ListChannelsResult = {
  channels: PublicChannel[];
  participantChannelIds: string[];
  blockedChannelIds: string[];
};

export type JoinChannelInput = {
  userId: string;
  channelId: string;
  avatarId: string;
  password?: string;
};

export type UpdateChannelInput = {
  userId: string;
  channelId: string;
  title?: string;
  description?: string;
  settings?: SettingsInput;
  gameSettings?: GameSettingsInput;
};

export type BlockChannelUserInput = {
  userId: string;
  channelId: string;
  /** ブロック対象のアバター（参加中であること） */
  avatarId: string;
};

export type UnblockChannelUserInput = {
  userId: string;
  channelId: string;
  blockedUserId: string;
};

export type ListBlockedUsersInput = {
  userId: string;
  channelId: string;
};

export type GetChannelInput = {
  userId: string;
  channelId: string;
};

export type LeaveChannelInput = {
  userId: string;
  channelId: string;
};

export type DeleteChannelInput = {
  userId: string;
  channelId: string;
};

export type PublicBlockedUser = {
  id: string;
  channelId: string;
  userId: string;
  avatarId: string;
  createdAt: Date;
};

export type PublicChannel = {
  id: string;
  adminId: string;
  title: string;
  description: string;
  settings: PublicChannelSettings;
  gameSettings: Channel["gameSettings"];
  createdAt: Date;
  updatedAt: Date;
};

export type ChannelServiceDeps = {
  users: UserRepository;
  avatars: AvatarRepository;
  channels: ChannelRepository;
  channelParticipants: ChannelParticipantRepository;
  blockedUsers: BlockedUserRepository;
  /** 省略可。指定時は join / leave / delete で EventBus に配信する */
  eventBus?: EventBus;
};

/**
 * チャンネル作成・一覧・入室・情報変更・ブロックを担う。
 */
export class ChannelService {
  constructor(private readonly deps?: ChannelServiceDeps) {}

  private requireDeps(): ChannelServiceDeps {
    if (!this.deps) throw new NotImplementedError("channel.repositories");
    return this.deps;
  }

  private async requireActiveUser(userId: string) {
    const user = await this.requireDeps().users.findById(userId);
    if (!user) throw new UserNotFoundError();
    if (user.lockedAt) throw new UserAccountLockedError();
    return user;
  }

  private async requireOwnedAvatar(userId: string, avatarId: string) {
    const avatar = await this.requireDeps().avatars.findById(avatarId);
    if (!avatar) throw new AvatarNotFoundError();
    assertAvatarOwnedByUser(avatar.userId, userId);
    return avatar;
  }

  private async requireAdminChannel(userId: string, channelId: string) {
    const channel = ensureChannelExists(
      await this.requireDeps().channels.findById(channelId),
    );
    assertChannelAdmin(channel.adminUserId, userId);
    return channel;
  }

  private toPublic(channel: Channel): PublicChannel {
    return {
      id: channel.id,
      adminId: channel.adminId,
      title: channel.title,
      description: channel.description,
      settings: toPublicChannelSettings(channel.settings),
      gameSettings: channel.gameSettings,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
  }

  private toPublicBlocked(blocked: BlockedUser): PublicBlockedUser {
    return {
      id: blocked.id,
      channelId: blocked.channelId,
      userId: blocked.userId,
      avatarId: blocked.avatarId,
      createdAt: blocked.createdAt,
    };
  }

  async create(input: CreateChannelInput): Promise<PublicChannel> {
    const deps = this.requireDeps();
    const user = await this.requireActiveUser(input.userId);
    assertGuestCanCreateChannel(user.isGuest);
    await this.requireOwnedAvatar(input.userId, input.avatarId);

    const { settings: baseSettings, passwordPlain } = resolveSettingsForCreate(
      input.settings,
    );
    const settings = {
      ...baseSettings,
      passwordHash: passwordPlain ? await hashSecret(passwordPlain) : null,
    };

    const channelId = randomUUID();
    const channel = await deps.channels.create({
      id: channelId,
      adminId: input.avatarId,
      adminUserId: input.userId,
      title: input.title.trim(),
      description: (input.description ?? "").trim(),
      settings,
      gameSettings: buildGameSettings(input.gameSettings),
    });

    await deps.channelParticipants.create({
      id: randomUUID(),
      channelId: channel.id,
      userId: input.userId,
      avatarId: input.avatarId,
    });

    return this.toPublic(channel);
  }

  async list(input: ListChannelsInput): Promise<ListChannelsResult> {
    const deps = this.requireDeps();
    await this.requireActiveUser(input.userId);

    const [channels, participantChannelIds, blockedChannelIds] =
      await Promise.all([
        deps.channels.listActive(),
        deps.channelParticipants.listActiveChannelIdsByUserId(input.userId),
        deps.blockedUsers.listActiveChannelIdsByUserId(input.userId),
      ]);

    return {
      channels: channels.map((c) => this.toPublic(c)),
      participantChannelIds,
      blockedChannelIds,
    };
  }

  async join(input: JoinChannelInput): Promise<ChannelParticipant> {
    const deps = this.requireDeps();
    const user = await this.requireActiveUser(input.userId);
    await this.requireOwnedAvatar(input.userId, input.avatarId);

    const raw = await deps.channels.findById(input.channelId);
    const channel = assertJoinAllowed(raw, user.isGuest, input.password);

    if (isPasswordProtected(channel.settings)) {
      const ok = await verifySecret(
        input.password!,
        channel.settings.passwordHash!,
      );
      if (!ok) throw new InvalidChannelPasswordError();
    }

    const blocked = await deps.blockedUsers.findActiveByChannelIdAndUserId(
      channel.id,
      input.userId,
    );
    assertNotBlockedFromChannel(blocked);

    const existing =
      await deps.channelParticipants.findActiveByChannelIdAndUserId(
        channel.id,
        input.userId,
      );
    if (existing) return existing;

    const participant = await deps.channelParticipants.create({
      id: randomUUID(),
      channelId: channel.id,
      userId: input.userId,
      avatarId: input.avatarId,
    });

    deps.eventBus?.emit(
      channelParticipantJoinedEvent({
        channelId: channel.id,
        participant,
      }),
    );

    return participant;
  }

  async get(input: GetChannelInput): Promise<PublicChannel> {
    await this.requireActiveUser(input.userId);
    const channel = ensureChannelExists(
      await this.requireDeps().channels.findById(input.channelId),
    );
    return this.toPublic(channel);
  }

  async leave(input: LeaveChannelInput): Promise<void> {
    const deps = this.requireDeps();
    await this.requireActiveUser(input.userId);

    const channel = ensureChannelExists(
      await deps.channels.findById(input.channelId),
    );
    assertChannelAdminCannotLeave(channel.adminUserId, input.userId);

    const removed =
      await deps.channelParticipants.softDeleteByChannelIdAndUserId(
        channel.id,
        input.userId,
      );
    if (!removed) throw new ChannelParticipantNotFoundError();

    deps.eventBus?.emit(
      channelParticipantLeftEvent({
        channelId: channel.id,
        userId: input.userId,
        participantId: removed.id,
      }),
    );
  }

  async delete(input: DeleteChannelInput): Promise<void> {
    const deps = this.requireDeps();
    await this.requireActiveUser(input.userId);
    const channel = await this.requireAdminChannel(
      input.userId,
      input.channelId,
    );

    const deleted = await deps.channels.softDelete(channel.id);
    if (!deleted) throw new ChannelNotFoundError();

    deps.eventBus?.emit(channelDeletedEvent(channel.id));
  }

  async update(input: UpdateChannelInput): Promise<PublicChannel> {
    const deps = this.requireDeps();
    await this.requireActiveUser(input.userId);

    const raw = await deps.channels.findById(input.channelId);
    const channel = ensureChannelExists(raw);
    assertChannelAdmin(channel.adminUserId, input.userId);

    const { next, passwordPlain } = resolveSettingsForUpdate(
      channel.settings,
      input.settings,
    );
    const settings = {
      ...next,
      passwordHash: passwordPlain
        ? await hashSecret(passwordPlain)
        : channel.settings.passwordHash,
    };

    const updated = await deps.channels.update(channel.id, {
      title: input.title?.trim(),
      description: input.description?.trim(),
      settings: input.settings !== undefined ? settings : undefined,
      gameSettings:
        input.gameSettings !== undefined
          ? mergeGameSettings(channel.gameSettings, input.gameSettings)
          : undefined,
    });

    return this.toPublic(ensureChannelExists(updated));
  }

  /** 管理者: 参加者をキックしチャンネル単位でブロック */
  async blockUser(input: BlockChannelUserInput): Promise<PublicBlockedUser> {
    const deps = this.requireDeps();
    await this.requireActiveUser(input.userId);
    const channel = await this.requireAdminChannel(
      input.userId,
      input.channelId,
    );

    const participant =
      await deps.channelParticipants.findActiveByChannelIdAndAvatarId(
        channel.id,
        input.avatarId,
      );
    if (!participant) throw new ChannelParticipantNotFoundError();

    assertCannotBlockChannelAdmin(channel.adminUserId, participant.userId);

    const existing = await deps.blockedUsers.findActiveByChannelIdAndUserId(
      channel.id,
      participant.userId,
    );
    assertNotAlreadyBlocked(existing);

    const removed =
      await deps.channelParticipants.softDeleteByChannelIdAndAvatarId(
        channel.id,
        input.avatarId,
      );
    if (!removed) throw new ChannelParticipantNotFoundError();

    const blocked = await deps.blockedUsers.create({
      id: randomUUID(),
      channelId: channel.id,
      userId: participant.userId,
      avatarId: participant.avatarId,
    });

    return this.toPublicBlocked(blocked);
  }

  async unblockUser(input: UnblockChannelUserInput): Promise<void> {
    const deps = this.requireDeps();
    await this.requireActiveUser(input.userId);
    await this.requireAdminChannel(input.userId, input.channelId);

    const deleted = await deps.blockedUsers.softDeleteByIdAndChannelId(
      input.blockedUserId,
      input.channelId,
    );
    if (!deleted) {
      throw new BlockedUserNotFoundError();
    }
  }

  async listBlockedUsers(
    input: ListBlockedUsersInput,
  ): Promise<PublicBlockedUser[]> {
    const deps = this.requireDeps();
    await this.requireActiveUser(input.userId);
    await this.requireAdminChannel(input.userId, input.channelId);

    const items = await deps.blockedUsers.listActiveByChannelId(
      input.channelId,
    );
    return items.map((b) => this.toPublicBlocked(b));
  }
}
