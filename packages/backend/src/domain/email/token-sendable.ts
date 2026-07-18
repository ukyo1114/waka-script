import { TokenSendNotAllowedError } from "../../shared/errors.js";
import { EMAIL_CODE_RESEND_COOLDOWN_SECONDS } from "./constants.js";

/**
 * 直近トークンの作成時刻から、再送クールダウンを判定する。
 * レコード取得は呼び出し側（サービス）で行う。
 *
 * - latestCreatedAt が無い → 送信可
 * - クールダウン経過済み → 送信可
 * - クールダウン中 → TokenSendNotAllowedError
 */
export function assertTokenSendable(
  latestCreatedAt: Date | null | undefined,
  now: Date,
  cooldownSeconds: number = EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
): void {
  if (!latestCreatedAt) return;

  const elapsedMs = now.getTime() - latestCreatedAt.getTime();
  const cooldownMs = cooldownSeconds * 1000;
  if (elapsedMs < cooldownMs) {
    const retryAfterSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
    throw new TokenSendNotAllowedError(
      `resend cooldown active; retry after ${retryAfterSec}s`,
    );
  }
}
