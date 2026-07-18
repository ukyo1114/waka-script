import { randomUUID } from "node:crypto";
import type { CreateUserInput, User, UserId } from "../../domain/user.js";
import type { UserRepository } from "../user-repository.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<UserId, User>();
  private readonly emailIndex = new Map<string, UserId>();

  async create(input: CreateUserInput): Promise<User> {
    const email = normalizeEmail(input.email);
    if (this.emailIndex.has(email)) {
      throw new Error("email already exists");
    }

    const now = new Date();
    const user: User = {
      id: randomUUID(),
      email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      emailVerifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);
    this.emailIndex.set(email, user.id);
    return { ...user };
  }

  async findById(id: UserId): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const id = this.emailIndex.get(normalizeEmail(email));
    if (!id) return null;
    return this.findById(id);
  }

  async markEmailVerified(
    id: UserId,
    verifiedAt: Date = new Date(),
  ): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    user.emailVerifiedAt = verifiedAt;
    user.updatedAt = verifiedAt;
    return { ...user };
  }

  async updatePasswordHash(
    id: UserId,
    passwordHash: string,
  ): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    user.passwordHash = passwordHash;
    user.updatedAt = new Date();
    return { ...user };
  }
}
