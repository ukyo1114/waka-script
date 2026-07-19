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

export class VerificationAttemptsExceededError extends AppError {
  constructor(maxAttempts: number) {
    super(
      429,
      "verification_attempts_exceeded",
      `verification attempts exceeded (max ${maxAttempts})`,
    );
    this.name = "VerificationAttemptsExceededError";
  }
}

export class InvalidEmailTokenError extends AppError {
  constructor() {
    super(400, "invalid_email_token", "email action token is invalid or expired");
    this.name = "InvalidEmailTokenError";
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, "invalid_credentials", "email or password is incorrect");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidAccessTokenError extends AppError {
  constructor() {
    super(401, "invalid_access_token", "access token is invalid or expired");
    this.name = "InvalidAccessTokenError";
  }
}

export class InvalidRefreshTokenError extends AppError {
  constructor() {
    super(401, "invalid_refresh_token", "refresh token is invalid or expired");
    this.name = "InvalidRefreshTokenError";
  }
}

export class UserAccountLockedError extends AppError {
  constructor() {
    super(403, "user_account_locked", "user account is locked");
    this.name = "UserAccountLockedError";
  }
}
