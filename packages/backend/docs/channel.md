# チャンネル API

人狼村（ロビー）単位のルーム。jinro の `/api/channels` を参考に、waka-script では `/channel` 配下に実装。

パスワードは平文保存せず bcrypt ハッシュ（`passwordHash`）。API レスポンスにパスワードは含めない。

リポジトリ実装は骨格（DB 未接続）。サービス層とドメインは Fake でテスト済み。

## エンドポイント

いずれも `Authorization: Bearer <accessToken>` 必須。

| Method | Path | 説明 |
|--------|------|------|
| POST | `/channel` | 作成（ゲスト不可）。作成者アバターが管理者＋参加者になる |
| GET | `/channel` | 未削除チャンネル一覧＋自分の参加中 ID |
| POST | `/channel/:id/join` | 入室（idempotent。既参加なら既存を返す） |
| PATCH | `/channel/:id` | 情報変更（管理者のみ） |

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

**成功:** `200 { channels, participantChannelIds }`

## 入室

**Body:** `{ "avatarId": string, "password?": string }`

**成功:** `201 { id, channelId, avatarId, createdAt }`

### 失敗

| 条件 | コード |
|------|--------|
| チャンネルなし | `404 channel_not_found` |
| ゲスト不可 | `403 channel_guest_not_allowed` |
| パスワード必要 / 不一致 | `400 channel_password_required` / `401 invalid_channel_password` |

## 情報変更

**Body:** title / description / settings / gameSettings（いずれも任意）

**成功:** `200` 公開チャンネル JSON

### 失敗

| 条件 | コード |
|------|--------|
| 非管理者 | `403 not_channel_admin` |

## 未実装（jinro にはあり）

- 詳細取得 `GET /:id`
- 退出・削除
- ブロックユーザー
- エントリー（ゲーム開始）/ Socket イベント
