# WebSocket（Socket.IO）

単一インスタンス想定。**Redis adapter / Pub/Sub は使わない**（後で水平展開するとき追加）。

jinro と同様に Express と同一の `http.Server` 上で Socket.IO を起動する。

## 接続

クライアント例（概念）:

```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: "<accessToken>",
    // チャンネル接続: participantId
    // ゲーム接続: playerId （どちらか一方のみ）
    participantId: "<channelParticipantId>",
  },
});

socket.on("socket:ready", (payload) => {
  // { channelId, participantId, userId }
});
```

### 認証（接続前 middleware）

| handshake.auth | 説明 |
|----------------|------|
| `token` | REST と同じ access JWT |
| `participantId` **または** `playerId` | 排他。チャンネル参加者 ID / ゲームプレイヤー ID |

検証内容（チャンネル）:

1. JWT → `userId`
2. 参加者の存在・未削除・`userId` 一致
3. チャンネルの存在・未削除

成功時: `socket.data = { userId, channelId, participantId }` のあと `socket.join(channelId)`。

検証内容（ゲーム）:

1. JWT → `userId`
2. Player の存在・未削除・アバター所有者一致
3. Game の存在

成功時: `socket.data = { userId, gameId, playerId }` のあと `socket.join(gameId)`。

### サーバー → クライアント

| イベント | とき |
|----------|------|
| `socket:ready` | ルーム参加完了 |
| `entry:updated` | エントリー一覧更新（詳細は `docs/entry.md`） |
| `entry:error` | エントリー操作失敗 |
| `channel:participant:joined` / `left` / `channel:deleted` | チャンネル参加・退出・削除 |
| `message:sent` | メッセージ送信 |
| `game:phase:changed` | ゲームフェーズ切替 |
| `error` | コンテキスト欠損など（切断） |

## 起動

`src/index.ts` → `createServer()`（`src/server.ts`）。

リポジトリが `app.locals.repos` に無いと認証は失敗する（本番では DB 実装注入が必要）。

## 環境変数

| 変数 | 用途 |
|------|------|
| `JWT_SECRET` | access token 検証（REST と共通） |
| `CORS_ORIGIN` | Socket.IO CORS。未設定時は反射許可相当（`true`） |
| `PORT` | HTTP / WS 共通ポート |
