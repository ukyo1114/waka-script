# メッセージ API

チャンネル（ゲーム開始前）とゲーム（開始後）の両方のルームで共通利用する。ルーム種別はサーバー側が `roomId` から自動判別する（`channels` に存在すればチャンネル、`games` に存在すればゲーム）。

## ルームとメッセージタイプ

| メッセージタイプ | 説明 | 送信可能ロール |
|-------------------|------|-----------------|
| `NORMAL` | 通常発言 | 全員（人狼陣営含む） |
| `WEREWOLF` | 人狼専用チャット | 人狼のみ |
| `SHARED` | 共有者専用チャット | 共有者のみ |
| `SPECTATOR` | 観戦者チャット（死亡者・非プレイヤー） | 観戦者のみ |
| `SYSTEM` | 進行系メッセージ | サーバーのみ（クライアントからの送信不可） |

- チャンネル（ゲーム開始前）では `NORMAL` のみ送受信可能。
- ゲーム終了後（`endedAt` が設定されたゲーム）は全員 `NORMAL` を送受信できる。
- 行動フェーズ処理中（`game.processing = true`）は送信不可。

---

## 一覧取得（遡り）

`GET /message/:roomId`

**Header:** `Authorization: Bearer <accessToken>`

**Query:** `senderId`（自分の participantId または playerId）, `messageType`, `beforeMessageId?`

**成功:** `200 { messages: Message[] }`（作成日時の降順、最大50件）

---

## 一覧取得（追従）

`GET /message/:roomId/after`

**Query:** `senderId`, `messageType`, `afterMessageId`

**成功:** `200 { messages: Message[] }`（作成日時の昇順）

### 失敗時

| 条件 | レスポンス |
|------|------------|
| `afterMessageId` が見つからない | `404 message_not_found` |
| 件数が50件を超える | `400 message_count_limit_exceeded` |

---

## 返信先の関連メッセージ取得

`GET /message/:roomId/:messageId/replies`

**Query:** `senderId`

**成功:** `200 { replyToMessageId, replyMessageIds: string[] }`

`messageId` 自体が返信メッセージなら、その返信先とその返信先を持つ他のメッセージ ID を返す。`messageId` が返信されていないメッセージなら、自分自身を `replyToMessageId` として返す。

---

## メッセージ送信

`POST /message/:roomId`

**Body:** `{ "senderId": string, "messageType": MessageType, "content": string, "replyToMessageId"?: string }`

`content` は最大1000文字。

**成功:** `201 { message: Message, previousMessageId: string | null }`

送信成功時、process 内 `EventBus` に `message:sent`（ルームへ配信、`{ message, previousMessageId }`）を配信する。

### 失敗時

| 条件 | レスポンス |
|------|------------|
| access token 無効・欠落 | `401 invalid_access_token` |
| roomId がチャンネル・ゲームいずれにも存在しない | `404 room_not_found` |
| senderId が本人の participant/player でない | `404 channel_participant_not_found` / `404 player_not_found` |
| ロール・フェーズ上送受信不可なメッセージタイプ | `403 message_access_denied` |
| `replyToMessageId` が同ルーム・同タイプで存在しない | `404 message_not_found` / `400 message_room_mismatch` / `400 message_type_mismatch` |

---

## システムメッセージ

ゲーム進行（配役・投票結果・夜結果・決着）は `MessageService.createSystemMessage` によりサーバー内部から `senderId: "system"` で作成される。クライアントから `SYSTEM` を指定して送信することはできない。
