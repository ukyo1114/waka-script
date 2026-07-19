import {
  ChannelGuestNotAllowedError,
  ChannelNotFoundError,
  ChannelPasswordRequiredError,
  GuestActionNotAllowedError,
  NotChannelAdminError,
} from "../../shared/errors.js";
import type { UserId } from "../user/index.js";
import {
  DEFAULT_PHASE_DURATIONS,
  GamePhase,
  type Channel,
  type ChannelSettings,
  type GameSettings,
  type GameSettingsInput,
  type PublicChannelSettings,
  type SettingsInput,
} from "./channel.types.js";

export const isPasswordProtected = (settings: ChannelSettings): boolean =>
  settings.passwordEnabled && settings.passwordHash !== null;

export const toPublicChannelSettings = (
  settings: ChannelSettings,
): PublicChannelSettings => ({
  passwordEnabled: settings.passwordEnabled,
  guestAllowed: settings.guestAllowed,
});

export const assertGuestCanCreateChannel = (isGuest: boolean): void => {
  if (isGuest) {
    throw new GuestActionNotAllowedError("create_channel");
  }
};

export const assertGuestAllowed = (
  settings: ChannelSettings,
  isGuest: boolean,
): void => {
  if (isGuest && !settings.guestAllowed) {
    throw new ChannelGuestNotAllowedError();
  }
};

/** パスワード保護時に入力がなければ拒否（照合はサービス側） */
export const assertPasswordProvidedIfProtected = (
  settings: ChannelSettings,
  password: string | undefined,
): void => {
  if (!isPasswordProtected(settings)) return;
  if (!password) {
    throw new ChannelPasswordRequiredError();
  }
};

/**
 * passwordEnabled 時は password または既存 hash が必要。
 * 戻り値の password はハッシュ化前の平文（サービスで hash する）。未変更なら undefined。
 */
export const resolveSettingsForCreate = (
  input?: SettingsInput,
): { settings: Omit<ChannelSettings, "passwordHash">; passwordPlain: string | undefined } => {
  const passwordEnabled = input?.passwordEnabled ?? false;
  const guestAllowed = input?.guestAllowed ?? true;
  const passwordPlain = input?.password?.trim() || undefined;

  if (passwordEnabled && !passwordPlain) {
    throw new ChannelPasswordRequiredError(
      "password is required when passwordEnabled is true",
    );
  }

  return {
    settings: { passwordEnabled, guestAllowed },
    passwordPlain,
  };
};

export const resolveSettingsForUpdate = (
  existing: ChannelSettings,
  input?: SettingsInput,
): {
  next: Omit<ChannelSettings, "passwordHash">;
  passwordPlain: string | undefined;
} => {
  if (!input) {
    return {
      next: {
        passwordEnabled: existing.passwordEnabled,
        guestAllowed: existing.guestAllowed,
      },
      passwordPlain: undefined,
    };
  }

  const passwordEnabled = input.passwordEnabled ?? existing.passwordEnabled;
  const guestAllowed = input.guestAllowed ?? existing.guestAllowed;
  const passwordPlain = input.password?.trim() || undefined;

  if (passwordEnabled && !passwordPlain && !existing.passwordHash) {
    throw new ChannelPasswordRequiredError(
      "password is required when passwordEnabled is true",
    );
  }

  return {
    next: { passwordEnabled, guestAllowed },
    passwordPlain,
  };
};

export const buildGameSettings = (input?: GameSettingsInput): GameSettings => ({
  roles: { ...(input?.roles ?? {}) },
  phaseDurations: {
    [GamePhase.PRE_GAME]:
      input?.phaseDurations?.[GamePhase.PRE_GAME] ??
      DEFAULT_PHASE_DURATIONS[GamePhase.PRE_GAME],
    [GamePhase.DAY]:
      input?.phaseDurations?.[GamePhase.DAY] ?? DEFAULT_PHASE_DURATIONS[GamePhase.DAY],
    [GamePhase.NIGHT]:
      input?.phaseDurations?.[GamePhase.NIGHT] ??
      DEFAULT_PHASE_DURATIONS[GamePhase.NIGHT],
    [GamePhase.POST_GAME]:
      input?.phaseDurations?.[GamePhase.POST_GAME] ??
      DEFAULT_PHASE_DURATIONS[GamePhase.POST_GAME],
  },
});

export const mergeGameSettings = (
  existing: GameSettings,
  input?: GameSettingsInput,
): GameSettings => {
  if (!input) return existing;
  return {
    roles: { ...existing.roles, ...(input.roles ?? {}) },
    phaseDurations: {
      [GamePhase.PRE_GAME]:
        input.phaseDurations?.[GamePhase.PRE_GAME] ??
        existing.phaseDurations[GamePhase.PRE_GAME],
      [GamePhase.DAY]:
        input.phaseDurations?.[GamePhase.DAY] ?? existing.phaseDurations[GamePhase.DAY],
      [GamePhase.NIGHT]:
        input.phaseDurations?.[GamePhase.NIGHT] ??
        existing.phaseDurations[GamePhase.NIGHT],
      [GamePhase.POST_GAME]:
        input.phaseDurations?.[GamePhase.POST_GAME] ??
        existing.phaseDurations[GamePhase.POST_GAME],
    },
  };
};

export const ensureChannelExists = (
  channel: Channel | null,
): Channel => {
  if (!channel || channel.deletedAt) {
    throw new ChannelNotFoundError();
  }
  return channel;
};

export const assertChannelAdmin = (
  adminUserId: UserId,
  requesterUserId: UserId,
): void => {
  if (adminUserId !== requesterUserId) {
    throw new NotChannelAdminError();
  }
};

export const assertJoinAllowed = (
  channel: Channel | null,
  isGuest: boolean,
  password: string | undefined,
): Channel => {
  const existing = ensureChannelExists(channel);
  assertGuestAllowed(existing.settings, isGuest);
  assertPasswordProvidedIfProtected(existing.settings, password);
  return existing;
};
