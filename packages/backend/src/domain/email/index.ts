export type {
  AssertEmailEligibility,
  AssertTokenSendable,
  AssertVerificationAttemptAllowed,
  EmailPurpose,
  EmailToken,
  EmailTokenId,
  IsEmailPurpose,
} from "./email.types.js";
export {
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
  EMAIL_CODE_TTL_MINUTES,
  EMAIL_PURPOSES,
} from "./email.types.js";
export {
  assertEmailEligibility,
  assertTokenSendable,
  assertVerificationAttemptAllowed,
  isEmailPurpose,
} from "./email.domain.js";
