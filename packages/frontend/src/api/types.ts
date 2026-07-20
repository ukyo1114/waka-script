export type ValidationDetail = {
  path: string;
  message: string;
};

export type ApiErrorBody = {
  error: string;
  message?: string;
  details?: ValidationDetail[];
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ValidationDetail[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? body.error);
    this.name = "ApiError";
    this.status = status;
    this.code = body.error;
    this.details = body.details;
  }
}

export type PublicUser = {
  id: string;
  email: string | null;
  displayName: string;
  isGuest: boolean;
  emailVerifiedAt?: string | null;
  lockedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LoginResponse = PublicUser & {
  accessToken: string;
};

export type RegisterResponse = PublicUser;

export type SendCodeResponse = {
  ok: true;
};

export type VerifyCodeResponse = {
  ok: true;
  token: string | null;
};
