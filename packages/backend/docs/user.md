# ユーザー API

## 本登録

`POST /user/register`

メール認証コード検証（`POST /email/verify/register`）で得たアクション用トークンを使い、ユーザーを作成する。

**Body:** `{ "token": string, "password": string, "displayName": string }`

メールアドレスはトークンに紐づく値を使う（body では受け取らない）。

成功時: `201 { id, email, displayName }`（トークンは発行しない。ログインで取得）

### 前提フロー

1. `POST /email/send/register` `{ email }`
2. `POST /email/verify/register` `{ email, code }` → `{ token }`
3. `POST /user/register` `{ token, password, displayName }`（初期アバター自動作成）
4. `POST /user/login` `{ email, password }` → access / refresh

---

## ログイン

`POST /user/login`

**Body:** `{ "email": string, "password": string }`

**成功:** `200 { id, email, displayName, isGuest, accessToken, refreshToken }`

| トークン | 形式 | 保存 | 有効期限 |
|----------|------|------|----------|
| Access | JWT (`typ: access`) | なし（署名検証のみ） | 15分 |
| Refresh | opaque `{id}.{secret}` | DB に hash のみ | 30日 |

保護 API では `Authorization: Bearer <accessToken>` を使う（`requireAccessToken` ミドルウェア）。

リクエストの形状バリデーションは Zod（失敗時 `400 { error: "validation_error", details: [...] }`）。

### 失敗時

| 条件 | レスポンス |
|------|------------|
| 認証失敗 | `401 invalid_credentials` |
| アカウントロック | `403 user_account_locked` |

---

## ゲストログイン

`POST /user/guest`

メール・パスワードなしのゲストユーザーを新規作成し、通常ユーザーと同じ access / refresh を発行する。

**Body:** `{ "displayName"?: string }`（省略時 `"Guest"`）

**成功:** `201 { id, email: null, displayName, isGuest: true, accessToken, refreshToken }`

- 認証情報は持たない（`email` / password なし）
- 表示名変更・チャンネル入室など、トークンで保護された操作は通常ユーザーと同様
- パスワード変更は不可（`403 guest_action_not_allowed`）
- refresh が有効な間は同一ゲストとして継続できる
- トークンを失ったら同一ゲストには戻れない（再呼び出しは別ゲスト）

---

## トークン更新

`POST /user/token/refresh`

**Body:** `{ "refreshToken": string }`

**成功:** `200 { accessToken, refreshToken }`

旧 refresh は失効し、新しいペアを返す（ローテーション）。

---

## ログアウト

`POST /user/logout`

**Body:** `{ "refreshToken": string }`

**成功:** `204`

当該 refresh を revoke する。access JWT は DB 管理しないため、期限切れまで形式上は有効（短命）。

---

## 自分の情報

`GET /user/me`

**Header:** `Authorization: Bearer <accessToken>`

**成功:** `200 { id, email, displayName, isGuest, emailVerifiedAt, lockedAt, createdAt, updatedAt }`

### 失敗時

| 条件 | レスポンス |
|------|------------|
| access token 無効・欠落 | `401 invalid_access_token` |
| ユーザー不存在 | `404 user_not_found` |
| アカウントロック | `403 user_account_locked` |

---

## 表示名変更

`PATCH /user/display-name`

**Header:** `Authorization: Bearer <accessToken>`

**Body:** `{ "displayName": string }`

**成功:** `200 { id, email, displayName }`

### 失敗時

| 条件 | レスポンス |
|------|------------|
| access token 無効・欠落 | `401 invalid_access_token` |
| ユーザー不存在 | `404 user_not_found` |
| アカウントロック | `403 user_account_locked` |

---

## パスワード変更

`PATCH /user/password`

**Header:** `Authorization: Bearer <accessToken>`

**Body:** `{ "currentPassword": string, "newPassword": string }`

**成功:** `204`

現在のパスワードを確認してから更新する。成功後、そのユーザーのリフレッシュトークンはすべて失効する（再ログインが必要）。

### 失敗時

| 条件 | レスポンス |
|------|------------|
| access token 無効・欠落 | `401 invalid_access_token` |
| 現在のパスワード不一致 | `401 invalid_credentials` |
| ユーザー不存在 | `404 user_not_found` |
| アカウントロック | `403 user_account_locked` |

---

## 環境変数

| 変数 | 用途 |
|------|------|
| `JWT_SECRET` | アクセス JWT の署名鍵 |
