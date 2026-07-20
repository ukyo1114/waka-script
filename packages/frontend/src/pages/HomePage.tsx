import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatApiError,
  getMe,
  isLoggedIn,
  logout,
  type PublicUser,
} from "../api/index.ts";

export function HomePage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isLoggedIn());

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (!cancelled) setUser(me);
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err));
          await logout();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogout() {
    void (async () => {
      await logout();
      setUser(null);
      setError(null);
    })();
  }

  if (loading) {
    return (
      <main className="page">
        <p className="muted">読み込み中…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <h1>人狼</h1>
        <p>ログインしてゲームを始めましょう。</p>
        <nav className="nav-links">
          <Link to="/login">ログイン</Link>
          <Link to="/register">新規登録</Link>
        </nav>
        {error && <p className="error">{error}</p>}
      </main>
    );
  }

  return (
    <main className="page">
      <h1>ようこそ、{user.displayName} さん</h1>
      <dl className="user-info">
        <dt>メール</dt>
        <dd>{user.email ?? "—"}</dd>
        <dt>ゲスト</dt>
        <dd>{user.isGuest ? "はい" : "いいえ"}</dd>
      </dl>
      <button type="button" className="secondary" onClick={handleLogout}>
        ログアウト
      </button>
    </main>
  );
}
