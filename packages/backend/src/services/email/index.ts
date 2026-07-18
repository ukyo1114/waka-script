export {
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
  EMAIL_CODE_TTL_MINUTES,
} from "./constants.js";
export {
  EmailService,
  type EmailServiceDeps,
  type SendVerificationCodeInput,
  type VerifyCodeInput,
} from "./service.js";
