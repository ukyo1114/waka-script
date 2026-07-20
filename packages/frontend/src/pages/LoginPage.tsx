import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { formatApiError, login } from "../api/index.ts";

type LocationState = {
  registered?: boolean;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as LocationState | null;

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <h1>ログイン</h1>

      {state?.registered && (
        <p className="success">登録が完了しました。ログインしてください。</p>
      )}

      {error && <p className="error">{error}</p>}

      <form className="form" onSubmit={handleSubmit}>
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
        <label className="field">
          <span>パスワード</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "ログイン中…" : "ログイン"}
        </button>
      </form>

      <p className="footer-link">
        アカウントをお持ちでない方は <Link to="/register">新規登録</Link>
      </p>
    </main>
  );
}
