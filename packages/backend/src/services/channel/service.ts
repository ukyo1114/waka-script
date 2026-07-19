import { randomUUID } from "node:crypto";
import {
  assertAvatarOwnedByUser,
} from "../../domain/avatar/index.js";
import {
  assertChannelAdmin,
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
import type { AvatarRepository } from "../../repositories/avatar/index.js";
import type { ChannelParticipantRepository } from "../../repositories/channel-participant/index.js";
import type { ChannelRepository } from "../../repositories/channel/index.js";
import type { UserRepository } from "../../repositories/user/index.js";
import {
  AvatarNotFoundError,
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
};

/**
 * チャンネル作成・一覧・入室・情報変更を担う。
 * ブロック・退出・削除は別途。
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

    const [channels, participantChannelIds] = await Promise.all([
      deps.channels.listActive(),
      deps.channelParticipants.listActiveChannelIdsByUserId(input.userId),
    ]);

    return {
      channels: channels.map((c) => this.toPublic(c)),
      participantChannelIds,
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

    const existing =
      await deps.channelParticipants.findActiveByChannelIdAndUserId(
        channel.id,
        input.userId,
      );
    if (existing) return existing;

    return deps.channelParticipants.create({
      id: randomUUID(),
      channelId: channel.id,
      userId: input.userId,
      avatarId: input.avatarId,
    });
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
}
