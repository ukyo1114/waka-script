import { z } from "zod";
import { emailString, nonEmptyString } from "../../shared/validation.js";

export const emailPurposeParamSchema = z.object({
  purpose: z.enum([
    "register",
    "email-change",
    "password-reset",
    "unlock",
  ]),
});

export const sendCodeBodySchema = z.object({
  email: emailString,
});

export const verifyCodeBodySchema = z.object({
  email: emailString,
  code: nonEmptyString,
});
