import type { Pool } from "pg";
import { AvatarRepositoryImpl } from "./avatar/index.js";
import { BlockedUserRepositoryImpl } from "./blocked-user/index.js";
import { ChannelEntryRepositoryImpl } from "./channel-entry/index.js";
import { ChannelParticipantRepositoryImpl } from "./channel-participant/index.js";
import { ChannelRepositoryImpl } from "./channel/index.js";
import { EmailCodeRepositoryImpl } from "./email-code/index.js";
import { EmailTokenRepositoryImpl } from "./email-token/index.js";
import { GameRepositoryImpl } from "./game/index.js";
import { MessageRepositoryImpl } from "./message/index.js";
import { PlayerRepositoryImpl } from "./player/index.js";
import { RefreshTokenRepositoryImpl } from "./refresh-token/index.js";
import { UserRepositoryImpl } from "./user/index.js";
import type { Repositories } from "./index.js";

/**
 * Postgres Pool から Repositories を組み立てる。
 * Phase 1 では account 系のみ SQL 実装。他は骨格（呼び出し時 throw）。
 */
export function createRepositories(pool: Pool): Repositories {
  return {
    users: new UserRepositoryImpl(pool),
    emailCodes: new EmailCodeRepositoryImpl(pool),
    emailTokens: new EmailTokenRepositoryImpl(pool),
    refreshTokens: new RefreshTokenRepositoryImpl(pool),
    avatars: new AvatarRepositoryImpl(pool),
    channels: new ChannelRepositoryImpl(),
    channelParticipants: new ChannelParticipantRepositoryImpl(),
    blockedUsers: new BlockedUserRepositoryImpl(),
    channelEntries: new ChannelEntryRepositoryImpl(),
    messages: new MessageRepositoryImpl(),
    games: new GameRepositoryImpl(),
    players: new PlayerRepositoryImpl(),
  };
}
