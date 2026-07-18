import type { UserId } from "./id.js";

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
