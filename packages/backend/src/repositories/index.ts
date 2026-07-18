import type { EmailTokenRepository } from "./email-token/types.js";
import type { UserRepository } from "./user/types.js";

export type Repositories = {
  users: UserRepository;
  emailTokens: EmailTokenRepository;
};

export type { UserRepository } from "./user/index.js";
export { UserRepositoryImpl } from "./user/index.js";

export type { EmailTokenRepository } from "./email-token/index.js";
export { EmailTokenRepositoryImpl } from "./email-token/index.js";

export { getRepositories } from "./get-repositories.js";
