import type { EmailCodeRepository } from "./email-code/types.js";
import type { UserRepository } from "./user/types.js";

export type Repositories = {
  users: UserRepository;
  emailCodes: EmailCodeRepository;
};

export type { CreateUserInput, UserRepository } from "./user/index.js";
export { UserRepositoryImpl } from "./user/index.js";

export type {
  CreateEmailCodeInput,
  EmailCodeRepository,
} from "./email-code/index.js";
export { EmailCodeRepositoryImpl } from "./email-code/index.js";

export { getRepositories } from "./get-repositories.js";
