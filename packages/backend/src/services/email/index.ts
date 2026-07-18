export {
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
  EMAIL_CODE_TTL_MINUTES,
} from "./constants.js";
export {
  EmailService,
  type EmailServiceDeps,
  type SendVerificationCodeInput,
  type VerifyCodeInput,
  type VerifyCodeResult,
} from "./service.js";
