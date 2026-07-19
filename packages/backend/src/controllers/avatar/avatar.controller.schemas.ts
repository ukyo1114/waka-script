import { z } from "zod";
import { nonEmptyString } from "../../shared/validation.js";

export const createAvatarBodySchema = z.object({
  name: nonEmptyString,
  imageUrl: nonEmptyString.url(),
});
