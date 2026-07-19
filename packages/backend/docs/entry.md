# エントリー（ゲーム開始前）

jinro の Socket エントリーに倣いつつ、**参加者配列は Channel に埋め込まず**専用テーブル（`channel_entries` 想定）に分離する。

Channel 側に残すのは排他用フラグ `entryProcessing` のみ。

## データモデル（想定）

### Channel

| 列 | 説明 |
|----|------|
| `entryProcessing` | エントリー処理中ロック |

### channel_entries（専用テーブル）

| 列 | 説明 |
|----|------|
| `id` | 行 ID |
| `channelId` | チャンネル |
| `participantId` | ChannelParticipant.id |
| `userId` / `avatarId` | 非正規化 |
| `status` | `active` / `cancelled` / `consumed` |
| `deletedAt` | 取消・消費時 |

一意: `(channelId, participantId)` where `status = active`

## Socket イベント

接続コンテキスト（`participantId`）必須。

| 方向 | イベント | 内容 |
|------|----------|------|
| C→S | `entry:register` | エントリー登録 |
| C→S | `entry:cancel` | 取消 |
| C→S | `disconnect` | 自動 cancel |
| S→C | `entry:updated` | `{ type, roomId, timestamp, data: { participantIds } }` |
| S→C | `entry:error` | 失敗 |

`participantIds` は **active な ChannelParticipant.id** の配列。

開始人数（`sum(gameSettings.roles)`）に達すると:

1. active 行をすべて `consumed`
2. `onGameStart` フック（現状スタブ）
3. クライアントには `participantIds: []` を配信（jinro 互換）

## レイヤー

- `domain/channel-entry/`
- `repositories/channel-entry/`
- `services/entry/entry.service.ts`
- `socket/socket.entry.ts`
- `events/event-bus.ts` → `io.to(roomId).emit('entry:updated', ...)`

REST エンドポイントはない（jinro と同様 Socket のみ）。
