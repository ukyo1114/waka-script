import { z } from "zod";
import { emailString, nonEmptyString } from "../../shared/validation.js";

export const registerBodySchema = z.object({
  token: nonEmptyString,
  password: nonEmptyString,
  displayName: nonEmptyString,
});

export const loginBodySchema = z.object({
  email: emailString,
  password: nonEmptyString,
});

export const refreshTokenBodySchema = z.object({
  refreshToken: nonEmptyString,
});

export const updateDisplayNameBodySchema = z.object({
  displayName: nonEmptyString,
});

export const changePasswordBodySchema = z.object({
  currentPassword: nonEmptyString,
  newPassword: nonEmptyString,
});

export const guestLoginBodySchema = z
  .object({
    displayName: nonEmptyString.optional(),
  })
  .default({});
