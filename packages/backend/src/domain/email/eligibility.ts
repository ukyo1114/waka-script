import type { User } from "../user/index.js";
import {
  EmailAlreadyRegisteredError,
  EmailNotRegisteredError,
  UserNotLockedError,
} from "../../shared/errors.js";
import type { EmailPurpose } from "./purpose.js";

export type AssertEmailEligibility = (
  purpose: EmailPurpose,
  email: string,
  user: User | null,
) => User | null;

/**
 * purpose に応じて「未登録必須」または「登録済み必須」などを判定する。
 * user はリポジトリ取得済みの結果を渡す。
 */
export const assertEmailEligibility: AssertEmailEligibility = (
  purpose,
  email,
  user,
) => {
  switch (purpose) {
    case "register":
    case "email-change":
      if (user) throw new EmailAlreadyRegisteredError(email);
      return null;

    case "password-reset":
      if (!user) throw new EmailNotRegisteredError(email);
      return user;

    case "unlock":
      if (!user) throw new EmailNotRegisteredError(email);
      if (!user.lockedAt) throw new UserNotLockedError(email);
      return user;

    default: {
      const _exhaustive: never = purpose;
      return _exhaustive;
    }
  }
};
