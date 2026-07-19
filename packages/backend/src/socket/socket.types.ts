/**
 * Socket.IO の socket.data に載せる接続コンテキスト。
 * チャンネル接続（現状のスケルトン）専用。ゲーム接続は後続。
 */
export type SocketChannelContext = {
  userId: string;
  channelId: string;
  participantId: string;
};

export type SocketAuthPayload = {
  token?: unknown;
  /** 参加中チャンネルへの接続用。channelId は DB から導出（クライアント送信を信用しない） */
  participantId?: unknown;
};
