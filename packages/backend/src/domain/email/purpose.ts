export const EMAIL_PURPOSES = [
  "register",
  "email-change",
  "password-reset",
  "unlock",
] as const;

export type EmailPurpose = (typeof EMAIL_PURPOSES)[number];

export type IsEmailPurpose = (value: string) => value is EmailPurpose;

export const isEmailPurpose: IsEmailPurpose = (
  value,
): value is EmailPurpose =>
  (EMAIL_PURPOSES as readonly string[]).includes(value);
