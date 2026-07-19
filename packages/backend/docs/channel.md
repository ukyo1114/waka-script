# チャンネル API

人狼村（ロビー）単位のルーム。jinro の `/api/channels` を参考に、waka-script では `/channel` 配下に実装。

パスワードは平文保存せず bcrypt ハッシュ（`passwordHash`）。API レスポンスにパスワードは含めない。

リポジトリ実装は骨格（DB 未接続）。サービス層とドメインは Fake でテスト済み。

## エンドポイント

いずれも `Authorization: Bearer <accessToken>` 必須。

| Method | Path | 説明 |
|--------|------|------|
| POST | `/channel` | 作成（ゲスト不可）。作成者アバターが管理者＋参加者になる |
| GET | `/channel` | 未削除チャンネル一覧＋参加中／ブロック中 ID |
| POST | `/channel/:id/join` | 入室（idempotent。既参加なら既存を返す） |
| PATCH | `/channel/:id` | 情報変更（管理者のみ） |
| GET | `/channel/:id/blocked-users` | ブロック一覧（管理者） |
| POST | `/channel/:id/blocked-users` | ブロック＝キック＋再入室禁止（管理者） |
| DELETE | `/channel/:id/blocked-users/:blockedUserId` | ブロック解除（管理者。自動再参加はしない） |

## 作成

**Body:**

```json
{
  "avatarId": string,
  "title": string,
  "description?": string,
  "settings?": {
    "password?": string,
    "passwordEnabled?": boolean,
    "guestAllowed?": boolean
  },
  "gameSettings?": {
    "roles?": { "<ROLE>": number },
    "phaseDurations?": {
      "PRE_GAME?": number,
      "DAY?": number,
      "NIGHT?": number,
      "POST_GAME?": number
    }
  }
}
```

**成功:** `201` 公開チャンネル JSON（`settings` は `passwordEnabled` / `guestAllowed` のみ）

### 失敗

| 条件 | コード |
|------|--------|
| ゲストが作成 | `403 guest_action_not_allowed` |
| 他人のアバター | `403 avatar_access_denied` |
| passwordEnabled で password なし | `400 channel_password_required` |

## 一覧

**成功:** `200 { channels, participantChannelIds, blockedChannelIds }`

## 入室

**Body:** `{ "avatarId": string, "password?": string }`

**成功:** `201 { id, channelId, avatarId, createdAt }`

### 失敗

| 条件 | コード |
|------|--------|
| チャンネルなし | `404 channel_not_found` |
| ゲスト不可 | `403 channel_guest_not_allowed` |
| パスワード必要 / 不一致 | `400 channel_password_required` / `401 invalid_channel_password` |
| ブロック中 | `403 channel_user_blocked` |

## 情報変更

**Body:** title / description / settings / gameSettings（いずれも任意）

**成功:** `200` 公開チャンネル JSON

### 失敗

| 条件 | コード |
|------|--------|
| 非管理者 | `403 not_channel_admin` |

## ブロック

jinro のチャンネル単位ブロックに倣いつつ、次を修正している。

- 保存する `userId` は **ブロック対象**（jinro 実装は管理者 ID を誤保存していた）
- Body の `avatarId` で参加者を引く（jinro は名が avatarId だが実質 participantId）
- 操作は必ず `channelId` スコープ
- 管理者自身のブロック禁止
- 二重ブロックは `409 already_blocked`

### ブロック

`POST /channel/:id/blocked-users`

**Body:** `{ "avatarId": string }`（対象の参加中アバター）

**成功:** `201 { id, channelId, userId, avatarId, createdAt }`

参加者は論理削除され、同じ userId の再 join は拒否される。

### 一覧

`GET /channel/:id/blocked-users` → `200 { blockedUsers: [...] }`

### 解除

`DELETE /channel/:id/blocked-users/:blockedUserId` → `200 { ok: true }`

解除後も自動では再参加しない。必要なら改めて join。

### 失敗

| 条件 | コード |
|------|--------|
| 非管理者 | `403 not_channel_admin` |
| 参加者なし | `404 channel_participant_not_found` |
| 管理者をブロック | `403 cannot_block_channel_admin` |
| 既にブロック済 | `409 already_blocked` |
| 解除対象なし | `404 blocked_user_not_found` |

## 未実装（jinro にはあり）

- 詳細取得 `GET /:id`
- 退出・削除
- エントリー（ゲーム開始）/ Socket イベント
