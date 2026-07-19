import { z } from "zod";
import {
  CHANNEL_DESCRIPTION_MAX_LENGTH,
  CHANNEL_TITLE_MAX_LENGTH,
  GamePhase,
  PHASE_DURATION_MAX_MINUTES,
} from "../../domain/channel/index.js";
import { nonEmptyString } from "../../shared/validation.js";

const phaseDurationSchema = z
  .number()
  .int()
  .min(0)
  .max(PHASE_DURATION_MAX_MINUTES);

const channelSettingsSchema = z
  .object({
    password: z.string().trim().optional(),
    passwordEnabled: z.boolean().optional(),
    guestAllowed: z.boolean().optional(),
  })
  .optional();

const gameSettingsSchema = z
  .object({
    roles: z.record(z.string(), z.number().int().min(0)).optional(),
    phaseDurations: z
      .object({
        [GamePhase.PRE_GAME]: phaseDurationSchema.optional(),
        [GamePhase.DAY]: phaseDurationSchema.optional(),
        [GamePhase.NIGHT]: phaseDurationSchema.optional(),
        [GamePhase.POST_GAME]: phaseDurationSchema.optional(),
      })
      .optional(),
  })
  .optional();

export const createChannelBodySchema = z.object({
  avatarId: nonEmptyString,
  title: nonEmptyString.max(CHANNEL_TITLE_MAX_LENGTH),
  description: z
    .string()
    .trim()
    .max(CHANNEL_DESCRIPTION_MAX_LENGTH)
    .optional(),
  settings: channelSettingsSchema,
  gameSettings: gameSettingsSchema,
});

export const updateChannelBodySchema = z.object({
  title: nonEmptyString.max(CHANNEL_TITLE_MAX_LENGTH).optional(),
  description: z
    .string()
    .trim()
    .max(CHANNEL_DESCRIPTION_MAX_LENGTH)
    .optional(),
  settings: channelSettingsSchema,
  gameSettings: gameSettingsSchema,
});

export const joinChannelBodySchema = z.object({
  avatarId: nonEmptyString,
  password: z.string().trim().optional(),
});

export const channelIdParamsSchema = z.object({
  id: nonEmptyString,
});

export const blockChannelUserBodySchema = z.object({
  avatarId: nonEmptyString,
});

export const blockedUserParamsSchema = z.object({
  id: nonEmptyString,
  blockedUserId: nonEmptyString,
});
