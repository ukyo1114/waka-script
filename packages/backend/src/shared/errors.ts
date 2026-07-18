export class NotImplementedError extends Error {
  readonly code = "not_implemented" as const;

  constructor(readonly operation: string) {
    super(`${operation} is not implemented yet`);
    this.name = "NotImplementedError";
  }
}

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class EmailAlreadyRegisteredError extends AppError {
  constructor(email: string) {
    super(409, "email_already_registered", `email already registered: ${email}`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class EmailNotRegisteredError extends AppError {
  constructor(email: string) {
    super(404, "email_not_registered", `email is not registered: ${email}`);
    this.name = "EmailNotRegisteredError";
  }
}

export class UserNotLockedError extends AppError {
  constructor(email: string) {
    super(400, "user_not_locked", `user is not locked: ${email}`);
    this.name = "UserNotLockedError";
  }
}

export class TokenSendNotAllowedError extends AppError {
  constructor(message: string) {
    super(429, "token_send_not_allowed", message);
    this.name = "TokenSendNotAllowedError";
  }
}

export class InvalidVerificationCodeError extends AppError {
  constructor() {
    super(400, "invalid_verification_code", "verification code is invalid or expired");
    this.name = "InvalidVerificationCodeError";
  }
}
