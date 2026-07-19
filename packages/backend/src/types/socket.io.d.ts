import "socket.io";

declare module "socket.io" {
  interface SocketData {
    userId?: string;
    channelId?: string;
    participantId?: string;
  }
}

export {};
