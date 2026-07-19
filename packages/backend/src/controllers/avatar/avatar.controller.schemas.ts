import { z } from "zod";
import { nonEmptyString } from "../../shared/validation.js";

export const createAvatarBodySchema = z.object({
  name: nonEmptyString,
});

export const updateAvatarNameBodySchema = z.object({
  name: nonEmptyString,
});

export const avatarIdParamsSchema = z.object({
  id: nonEmptyString,
});
