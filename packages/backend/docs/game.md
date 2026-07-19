# ゲーム API

人狼本編。entry 満員時に Game / Player が生成され、プロセス内 `GamePhaseTimer` でフェーズが進む。

## 開始

チャネル entry が役職人数合計に達すると `startGameFromEntries` が実行される。

1. 役職をシャッフルして参加者へ割当
2. Game（PRE_GAME）+ Player レコード作成
3. entry を consume
4. SYSTEM 開始メッセージ
5. `GamePhaseTimer` 起動

## アクション

いずれも `Authorization: Bearer <accessToken>`。

| Method | Path | 役職 / フェーズ |
|--------|------|----------------|
| POST | `/game/:id/vote` | 生存者 / DAY |
| POST | `/game/:id/divination` | FORTUNE_TELLER / NIGHT |
| POST | `/game/:id/attack` | WEREWOLF / NIGHT |
| POST | `/game/:id/guard` | HUNTER / NIGHT |

**Body:** `{ "playerId": string, "targetId": string }`

ログは `game.logs` に upsert（投票は actor 単位上書き）。

## Socket

接続時 `auth: { token, playerId }`（`participantId` と排他）。

| イベント | 説明 |
|----------|------|
| `game:phase:changed` | フェーズ切替（day / phase / players status） |
| `message:sent` | システム文含むチャット |

## フェーズ処理（概要）

- DAY 終了: 処刑 → 背徳後追い → 勝敗 → システム文
- NIGHT: 欠けターゲット補完 → 霊能 → 占い（狐呪殺）→ 襲撃 → 勝敗 → システム文
- 勝敗確定で POST_GAME
