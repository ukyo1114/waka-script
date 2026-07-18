import type { EmailCodeRepository } from "./email-code/index.js";
import type { UserRepository } from "./user/index.js";

export type Repositories = {
  users: UserRepository;
  emailCodes: EmailCodeRepository;
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

export { getRepositories } from "./get-repositories.js";
