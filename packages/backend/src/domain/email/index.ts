export type {
  AssertEmailEligibility,
  AssertTokenSendable,
  EmailPurpose,
  EmailToken,
  EmailTokenId,
  IsEmailPurpose,
} from "./types.js";
export {
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
  EMAIL_CODE_TTL_MINUTES,
  EMAIL_PURPOSES,
} from "./types.js";
export {
  assertEmailEligibility,
  assertTokenSendable,
  isEmailPurpose,
} from "./domain.js";
