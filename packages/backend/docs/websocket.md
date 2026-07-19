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
| `participantId` | チャンネル参加者 ID（`channelId` はクライアントから受け取らず DB から導出） |

検証内容:

1. JWT → `userId`
2. 参加者の存在・未削除・`userId` 一致
3. チャンネルの存在・未削除

成功時: `socket.data = { userId, channelId, participantId }` のあと `socket.join(channelId)`。

### サーバー → クライアント（骨格）

| イベント | とき |
|----------|------|
| `socket:ready` | ルーム参加完了 |
| `error` | コンテキスト欠損など（切断） |

チャンネル更新・入室・ブロックなどの業務イベント配線は未実装（次の段階）。

## 起動

`src/index.ts` → `createServer()`（`src/server.ts`）。

リポジトリが `app.locals.repos` に無いと認証は失敗する（本番では DB 実装注入が必要）。

## 環境変数

| 変数 | 用途 |
|------|------|
| `JWT_SECRET` | access token 検証（REST と共通） |
| `CORS_ORIGIN` | Socket.IO CORS。未設定時は反射許可相当（`true`） |
| `PORT` | HTTP / WS 共通ポート |
