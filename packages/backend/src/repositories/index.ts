import type { EmailTokenRepository } from "./email-token-repository.js";
import { MemoryEmailTokenRepository } from "./memory/memory-email-token-repository.js";
import { MemoryUserRepository } from "./memory/memory-user-repository.js";
import type { UserRepository } from "./user-repository.js";

export type Repositories = {
  users: UserRepository;
  emailTokens: EmailTokenRepository;
};

export function createRepositories(): Repositories {
  // Postgres 接続後はここを差し替える
  return {
    users: new MemoryUserRepository(),
    emailTokens: new MemoryEmailTokenRepository(),
  };
}

export type { UserRepository } from "./user-repository.js";
export type { EmailTokenRepository } from "./email-token-repository.js";
export { getRepositories } from "./get-repositories.js";
