export type UserId = string;

export type User = {
  id: UserId;
  email: string;
  passwordHash: string;
  displayName: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  displayName: string;
};

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  markEmailVerified(id: UserId, verifiedAt?: Date): Promise<User | null>;
  updatePasswordHash(id: UserId, passwordHash: string): Promise<User | null>;
}
