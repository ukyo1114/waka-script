/**
 * Socket.IO の socket.data に載せる接続コンテキスト。
 * チャンネル接続用（participantId）とゲーム接続用（playerId）の 2 種類があり、
 * 1 接続につきどちらか一方のみを持つ（相互排他）。
 */
export type SocketChannelContext = {
  userId: string;
  channelId: string;
  participantId: string;
};

export type SocketGameContext = {
  userId: string;
  gameId: string;
  playerId: string;
};

export type SocketContext = SocketChannelContext | SocketGameContext;

export type SocketAuthPayload = {
  token?: unknown;
  /** 参加中チャンネルへの接続用。channelId は DB から導出（クライアント送信を信用しない） */
  participantId?: unknown;
  /** 参加中ゲームへの接続用。gameId は DB から導出（クライアント送信を信用しない） */
  playerId?: unknown;
};
