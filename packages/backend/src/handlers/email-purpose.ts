export const EMAIL_PURPOSES = [
  "register",
  "email-change",
  "password-reset",
  "unlock",
] as const;

export type EmailPurpose = (typeof EMAIL_PURPOSES)[number];

export function isEmailPurpose(value: string): value is EmailPurpose {
  return (EMAIL_PURPOSES as readonly string[]).includes(value);
}
