export type UserId = string;

export type User = {
  id: UserId;
  email: string;
  passwordHash: string;
  displayName: string;
  emailVerifiedAt: Date | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
