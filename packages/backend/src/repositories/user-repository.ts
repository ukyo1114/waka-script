import type { CreateUserInput, User, UserId } from "../domain/user.js";

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  markEmailVerified(id: UserId, verifiedAt?: Date): Promise<User | null>;
  updatePasswordHash(id: UserId, passwordHash: string): Promise<User | null>;
}
