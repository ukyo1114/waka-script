# @jinro/frontend

人狼ゲームの Web フロントエンド（React + Vite + TypeScript）。

## 開発手順

### 前提

- Node.js（ルートの `package.json` で管理）
- backend が起動していること（デフォルト `http://localhost:3000`）

### 起動

```bash
# ターミナル 1: API
npm run dev -w @jinro/backend

# ターミナル 2: フロント
npm run dev:frontend
```

ブラウザで http://localhost:5173/register を開く。

開発時は Vite の proxy 経由で backend に接続するため、`.env` の `VITE_API_BASE_URL` は空のままでよい。

### ビルド・型チェック

```bash
npm run typecheck -w @jinro/frontend
npm run build -w @jinro/frontend
```

## ユーザー登録フロー

1. `/register` — メールアドレス入力 → `POST /email/send/register`
2. 認証コード入力 → `POST /email/verify/register` → アクション用トークン取得
3. 表示名・パスワード入力 → `POST /user/register`
4. `/login` — ログイン → `POST /user/login` → トークン保存
5. `/` — `GET /user/me` で自分の情報を表示

本登録 API はトークンを返さないため、登録後はログイン画面へ誘導する。

## メール認証コードについて

Fake backend では実際のメールは送信されない。開発時は backend の Fake 実装やログでコードを確認する。

## 環境変数

| 変数 | 説明 |
|------|------|
| `VITE_API_BASE_URL` | API のベース URL。未設定時は同一オリジン（dev proxy） |

`.env.example` を参照。
