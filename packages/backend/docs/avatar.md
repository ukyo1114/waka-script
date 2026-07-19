# アバター API

アバターはユーザーに紐づくプレイヤー表象。`name` と `imageUrl`（画像URL）を持つ。

## 上限

| ユーザー種別 | 上限 |
|--------------|------|
| 登録済み | 10 |
| ゲスト | 1 |

ユーザー作成時（本登録・ゲストログイン）に、表示名を名前とした **初期アバター** を1件自動作成する（デフォルト画像 URL）。

## 作成

`POST /avatar`

**Header:** `Authorization: Bearer <accessToken>`

**Body:** `{ "name": string, "imageUrl": string }`（`imageUrl` は URL 形式）

**成功:** `201 { id, userId, name, imageUrl }`

### 失敗時

| 条件 | レスポンス |
|------|------------|
| access token 無効 | `401 invalid_access_token` |
| 上限超過 | `409 avatar_limit_exceeded` |
| ユーザー不存在 / ロック | `404` / `403` |

## 一覧

`GET /avatar`

**Header:** `Authorization: Bearer <accessToken>`

**成功:** `200 { avatars: [{ id, userId, name, imageUrl }, ...] }`
