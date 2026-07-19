export {
  EMAIL_ACTION_TOKEN_TTL_SECONDS,
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
  EMAIL_CODE_TTL_MINUTES,
} from "./email.constants.js";
export {
  EmailService,
  type EmailServiceDeps,
  type ResolveActionTokenInput,
  type SendVerificationCodeInput,
  type VerifyCodeInput,
  type VerifyCodeResult,
} from "./email.service.js";
export { resolveActionToken } from "./email.resolve-action-token.js";
