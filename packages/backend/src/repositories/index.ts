import type { EmailCodeRepository } from "./email-code/index.js";
import type { EmailTokenRepository } from "./email-token/index.js";
import type { RefreshTokenRepository } from "./refresh-token/index.js";
import type { UserRepository } from "./user/index.js";

export type Repositories = {
  users: UserRepository;
  emailCodes: EmailCodeRepository;
  emailTokens: EmailTokenRepository;
  refreshTokens: RefreshTokenRepository;
};

export type {
  CreateUserInput,
  UserRecord,
  UserRepository,
} from "./user/index.js";
export { UserRepositoryImpl } from "./user/index.js";

export type {
  CreateEmailCodeInput,
  EmailCode,
  EmailCodeId,
  EmailCodeRepository,
} from "./email-code/index.js";
export { EmailCodeRepositoryImpl } from "./email-code/index.js";

export type {
  CreateEmailTokenInput,
  EmailToken,
  EmailTokenId,
  EmailTokenRepository,
} from "./email-token/index.js";
export { EmailTokenRepositoryImpl } from "./email-token/index.js";

export type {
  CreateRefreshTokenInput,
  RefreshToken,
  RefreshTokenId,
  RefreshTokenRepository,
} from "./refresh-token/index.js";
export { RefreshTokenRepositoryImpl } from "./refresh-token/index.js";

export { getRepositories } from "./get-repositories.js";
