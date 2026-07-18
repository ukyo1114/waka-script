# メール認証 API

`POST /email/send/:purpose` と `POST /email/verify/:purpose` の処理フロー。

`:purpose` は次のいずれか。

| purpose | 用途 |
|---------|------|
| `register` | ユーザー登録 |
| `email-change` | メールアドレス変更 |
| `password-reset` | パスワードリセット |
| `unlock` | ユーザーロック解除 |

認証コードの永続化レコード型 `EmailCode` とリポジトリは `repositories/email-code` が担当する。  
検証成功後のアクション用トークンは `repositories/email-token` が担当する（平文は保存せずハッシュのみ）。

---

## 共通レイヤー

```
Route → Controller → Service → Repository
```

1. **Controller** — `purpose` / body の検証
2. **Service** — メール登録有無・送信可否判定、コード生成・検証
3. **Repository** — ユーザー・認証コードの永続化

---

## 認証コード送信

`POST /email/send/:purpose`

**Body:** `{ "email": string }`

```mermaid
sequenceDiagram
  participant C as Client
  participant Ctrl as Controller
  participant Svc as EmailService
  participant Repo as Repository

  C->>Ctrl: POST /email/send/:purpose
  Ctrl->>Ctrl: purpose / email を検証
  Ctrl->>Svc: sendVerificationCode
  Svc->>Repo: findByEmail
  Svc->>Svc: purpose ごとの登録有無チェック
  Svc->>Repo: findLatestByEmailAndPurpose
  Svc->>Svc: 再送クールダウン判定
  Svc->>Svc: 6桁コード生成・ハッシュ化
  Svc->>Repo: 既存認証コード無効化・保存
  Svc->>Svc: メール送信（TODO）
  Svc-->>Ctrl: ok
  Ctrl-->>C: 202 { ok: true }
```

### メール登録有無チェック

| purpose | 条件 | 失敗時 |
|---------|------|--------|
| `register` | **未登録**であること | `409 email_already_registered` |
| `email-change` | 変更先が **未登録**であること | `409 email_already_registered` |
| `password-reset` | **登録済み**であること | `404 email_not_registered` |
| `unlock` | **登録済み**かつ **ロック中** (`lockedAt` あり) | `404` / `400 user_not_locked` |

### 認証コード送信可否

次をすべて満たすとき送信可能。

1. 上記の登録有無チェックを通過している
2. 同一 `email` + `purpose` の直近認証コードから **60秒以上**経過している  
   - 未経過なら `429 token_send_not_allowed`

通過後の処理:

1. 6桁コードを生成し bcrypt でハッシュして保存（平文は保存しない）
2. 同 `email` + `purpose` の未使用認証コードを無効化
3. 有効期限 **10分** の認証コードを作成
4. メール送信（未実装）

---

## 認証コード検証

`POST /email/verify/:purpose`

**Body:** `{ "email": string, "code": string }`

**成功レスポンス:**

| purpose | レスポンス |
|---------|------------|
| `register` / `email-change` / `password-reset` | `200 { ok: true, token: string }` |
| `unlock` | `200 { ok: true, token: null }` |

`token` は後続 API（本登録・メアド変更・パスワード再設定）で提示する **メール認証トークン**。  
形式は `{id}.{secret}`。DB には `tokenHash` のみ保存し、ワンタイム利用・失効が可能。有効期限は **15分**。

```mermaid
sequenceDiagram
  participant C as Client
  participant Ctrl as Controller
  participant Svc as EmailService
  participant Repo as Repository

  C->>Ctrl: POST /email/verify/:purpose
  Ctrl->>Ctrl: purpose / email / code を検証
  Ctrl->>Svc: verifyCode
  Svc->>Repo: email+purpose の有効認証コード取得
  Svc->>Svc: 試行回数チェック（5回以上なら拒否）
  Svc->>Svc: bcrypt でコード照合
  alt 試行上限超過
    Svc-->>Ctrl: error
    Ctrl-->>C: 429 verification_attempts_exceeded
  else 不一致 or 期限切れ
    Svc->>Repo: attemptCount を加算
    Svc-->>Ctrl: error
    Ctrl-->>C: 400 invalid_verification_code
  else 一致 (register / email-change / password-reset)
    Svc->>Repo: 認証コードを使用済みに
    Svc->>Repo: 既存アクション用トークンを無効化・作成
    Svc-->>Ctrl: { token: id.secret }
    Ctrl-->>C: 200 { ok: true, token }
  else 一致 (unlock)
    Svc->>Repo: 認証コードを使用済みに
    Svc->>Repo: clearLock
    Svc-->>Ctrl: { token: null }
    Ctrl-->>C: 200 { ok: true, token: null }
  end
```

**検証処理（実装済み）**

1. `email` + `purpose` の直近認証コードを取得（未使用・期限内）
2. `attemptCount >= 5` なら `429 verification_attempts_exceeded`
3. 平文コードを bcrypt で照合
4. 不一致なら `attemptCount` を +1 して `400 invalid_verification_code`
5. 一致したら使用済みにする
6. purpose に応じた後続処理（下表）

**purpose ごとの検証成功後**

| purpose | 検証成功後 |
|---------|------------|
| `register` | アクション用トークンを DB に保存して返す（本登録 API で使用） |
| `email-change` | アクション用トークンを DB に保存して返す（メアド変更 API で使用） |
| `password-reset` | アクション用トークンを DB に保存して返す（パスワード再設定 API で使用） |
| `unlock` | アカウントロックを解除。トークンは不要（この時点で完結） |

---

## 定数

| 項目 | 値 |
|------|-----|
| コード桁数 | 6 |
| 有効期限 | 10分 |
| 再送クールダウン | 60秒 |
| 検証最大試行回数 | 5回 |
| アクション用トークン有効期限 | 15分 |

---

## 補足

- コード生成: `shared/createRandomCode`
- トークン生成: `shared/createRandomToken` / `formatEmailToken` / `parseEmailToken`
- ハッシュ / 照合: `shared/hashSecret` / `shared/verifySecret`（bcrypt）
  - 一方向ハッシュのため復号は不可。照合のみ行う
  - 認証コード・パスワード・アクション用トークンで共通利用する想定
- 後続 API でのトークン検証: `EmailService.resolveActionToken`（使用済み化は呼び出し側で `emailTokens.markUsed`）
- `email-change` の「ログイン必須」は今後ミドルウェアで担保する
