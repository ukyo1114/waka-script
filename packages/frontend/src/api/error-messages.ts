import { ApiError, type ApiErrorBody } from "./types.ts";

const ERROR_MESSAGES: Record<string, string> = {
  validation_error: "入力内容に誤りがあります",
  email_already_registered: "このメールアドレスは既に登録されています",
  email_not_registered: "このメールアドレスは登録されていません",
  invalid_verification_code: "認証コードが正しくないか、期限切れです",
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません",
  user_account_locked: "アカウントがロックされています",
  invalid_email_token: "トークンが無効です",
  token_send_not_allowed: "しばらくしてから再度お試しください",
  verification_attempts_exceeded: "認証の試行回数が上限に達しました",
  invalid_access_token: "ログインの有効期限が切れました。再度ログインしてください",
  internal_server_error: "サーバーエラーが発生しました",
};

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    const mapped = ERROR_MESSAGES[error.code];
    if (mapped) return mapped;
    if (error.code === "validation_error" && error.details?.length) {
      return error.details.map((d) => d.message).join(" / ");
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "予期しないエラーが発生しました";
}

export async function parseErrorResponse(
  response: Response,
): Promise<ApiError> {
  let body: ApiErrorBody = { error: "internal_server_error" };
  try {
    const json = (await response.json()) as ApiErrorBody;
    if (json && typeof json.error === "string") {
      body = json;
    }
  } catch {
    // ignore
  }
  return new ApiError(response.status, body);
}
