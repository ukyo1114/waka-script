export type {
  AssertEmailCodeSendable,
  AssertEmailEligibility,
  AssertVerificationAttemptAllowed,
  EmailCode,
  EmailCodeId,
  EmailPurpose,
  IsEmailPurpose,
} from "./email.types.js";
export {
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
  EMAIL_CODE_TTL_MINUTES,
  EMAIL_PURPOSES,
} from "./email.types.js";
export {
  assertEmailCodeSendable,
  assertEmailEligibility,
  assertVerificationAttemptAllowed,
  isEmailPurpose,
} from "./email.domain.js";
