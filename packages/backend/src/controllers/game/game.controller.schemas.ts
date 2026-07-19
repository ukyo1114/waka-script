import { z } from "zod";
import { nonEmptyString } from "../../shared/validation.js";

export const gameIdParamsSchema = z.object({
  id: nonEmptyString,
});

export const gameActionBodySchema = z.object({
  playerId: nonEmptyString,
  targetId: nonEmptyString,
});
