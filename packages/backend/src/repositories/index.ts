import type { EmailTokenRepository } from "./email-token-repository.js";
import type { UserRepository } from "./user-repository.js";

export type Repositories = {
  users: UserRepository;
  emailTokens: EmailTokenRepository;
};

export type { UserRepository } from "./user-repository.js";
export type { EmailTokenRepository } from "./email-token-repository.js";
export { getRepositories } from "./get-repositories.js";
