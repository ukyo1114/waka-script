export type {
  AssertEmailCodeSendable,
  AssertEmailEligibility,
  AssertVerificationAttemptAllowed,
  EmailActionPurpose,
  EmailPurpose,
  IsEmailActionPurpose,
  IsEmailPurpose,
} from "./email.types.js";
export {
  EMAIL_ACTION_PURPOSES,
  EMAIL_ACTION_TOKEN_TTL_SECONDS,
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
  EMAIL_CODE_TTL_MINUTES,
  EMAIL_PURPOSES,
} from "./email.types.js";
export {
  assertEmailCodeSendable,
  assertEmailEligibility,
  assertEmailTokenSecretMatches,
  assertVerificationAttemptAllowed,
  assertVerificationCodeMatches,
  ensureActionTokenRecordValid,
  ensureVerificationCodeLive,
  isEmailActionPurpose,
  isEmailPurpose,
  resolveVerifyCodeOutcome,
  type EmailCodeLiveness,
  type EmailTokenLiveness,
  type VerifyCodeOutcome,
} from "./email.domain.js";
