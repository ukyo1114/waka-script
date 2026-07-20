import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  formatApiError,
  register,
  sendRegisterCode,
  verifyRegisterCode,
} from "../api/index.ts";

type Step = "email" | "code" | "profile";

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [actionToken, setActionToken] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendEmail(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendRegisterCode(email);
      setStep("code");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await verifyRegisterCode(email, code);
      if (!result.token) {
        setError("認証トークンを取得できませんでした");
        return;
      }
      setActionToken(result.token);
      setStep("profile");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ token: actionToken, password, displayName });
      navigate(`/login?email=${encodeURIComponent(email)}`, {
        replace: true,
        state: { registered: true },
      });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <h1>ユーザー登録</h1>
      <p className="muted">
        ステップ {step === "email" ? 1 : step === "code" ? 2 : 3} / 3
      </p>

      {error && <p className="error">{error}</p>}

      {step === "email" && (
        <form className="form" onSubmit={handleSendEmail}>
          <label className="field">
            <span>メールアドレス</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "送信中…" : "認証コードを送信"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form className="form" onSubmit={handleVerifyCode}>
          <p className="muted">送信先: {email}</p>
          <label className="field">
            <span>認証コード</span>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoComplete="one-time-code"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "確認中…" : "コードを確認"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setStep("email")}
          >
            メールアドレスを変更
          </button>
        </form>
      )}

      {step === "profile" && (
        <form className="form" onSubmit={handleRegister}>
          <label className="field">
            <span>表示名</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="nickname"
            />
          </label>
          <label className="field">
            <span>パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "登録中…" : "登録する"}
          </button>
        </form>
      )}

      <p className="footer-link">
        既にアカウントをお持ちの方は <Link to="/login">ログイン</Link>
      </p>
    </main>
  );
}
