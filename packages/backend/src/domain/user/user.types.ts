export type UserId = string;

/** 公開・業務ロジック向けのユーザー（認証秘密は含まない） */
export type User = {
  id: UserId;
  /** 登録ユーザーのみ。ゲストは null */
  email: string | null;
  displayName: string;
  /** ゲスト（メール・パスワードなしの一度限りユーザー） */
  isGuest: boolean;
  emailVerifiedAt: Date | null;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
