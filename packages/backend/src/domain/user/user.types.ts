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
  /** 連続ログイン失敗回数（成功時・ロック解除時に 0） */
  loginAttempts: number;
  /** 論理削除時刻。設定後はログイン不可 */
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** 連続ログイン失敗でロックするまでの上限 */
export const MAX_LOGIN_ATTEMPTS = 5;
