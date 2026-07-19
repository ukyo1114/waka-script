# アバター API

アバターはユーザーに紐づくプレイヤー表象。`name` と `imageUrl`（S3 公開 URL）を持つ。

画像は AWS S3 想定。キーは `avatars/{avatarId}` で固定し、差し替え時は **同一キーへ上書き**するため `imageUrl` は変わらない。

## 上限

| ユーザー種別 | 上限 |
|--------------|------|
| 登録済み | 10 |
| ゲスト | 1 |

ユーザー作成時（本登録・ゲストログイン）に、表示名を名前とした **初期アバター** を1件自動作成する。`imageUrl` は `{AVATAR_IMAGE_PUBLIC_BASE_URL}/avatars/{id}`（環境変数未設定時は `https://static.jinro.local`）。

## 作成

`POST /avatar`

**Header:** `Authorization: Bearer <accessToken>`

**Body:** `{ "name": string }`

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

## 名前変更

`PATCH /avatar/:id`

**Header:** `Authorization: Bearer <accessToken>`

**Body:** `{ "name": string }`

**成功:** `200 { id, userId, name, imageUrl }`

### 失敗時

| 条件 | レスポンス |
|------|------------|
| アバター不存在 | `404 avatar_not_found` |
| 他人のアバター | `403 avatar_access_denied` |

## 画像差し替え

`PUT /avatar/:id/image`

**Header:** `Authorization: Bearer <accessToken>`

**Body:** `multipart/form-data`、フィールド名 `image`（JPEG / PNG / WebP、最大 1MB）

同一 S3 キーへ上書きする。レスポンスの `imageUrl` は変更前と同じ。

**成功:** `200 { id, userId, name, imageUrl }`

### 失敗時

| 条件 | レスポンス |
|------|------------|
| ファイルなし・不正形式・サイズ超過 | `400 invalid_avatar_image` |
| アバター不存在 | `404 avatar_not_found` |
| 他人のアバター | `403 avatar_access_denied` |

## 削除

`DELETE /avatar/:id`

**Header:** `Authorization: Bearer <accessToken>`

所有アバターを削除する。**最低1件は残す**（初期アバター含む）。オブジェクトストレージがあれば対応キーも削除する。

**成功:** `204`

### 失敗時

| 条件 | レスポンス |
|------|------------|
| 最後の1件 | `409 avatar_minimum_required` |
| アバター不存在 | `404 avatar_not_found` |
| 他人のアバター | `403 avatar_access_denied` |
