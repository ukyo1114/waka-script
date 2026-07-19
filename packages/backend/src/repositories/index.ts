import type { EmailCodeRepository } from "./email-code/index.js";
import type { EmailTokenRepository } from "./email-token/index.js";
import type { AvatarRepository } from "./avatar/index.js";
import type { BlockedUserRepository } from "./blocked-user/index.js";
import type { ChannelEntryRepository } from "./channel-entry/index.js";
import type { ChannelParticipantRepository } from "./channel-participant/index.js";
import type { ChannelRepository } from "./channel/index.js";
import type { GameRepository } from "./game/index.js";
import type { MessageRepository } from "./message/index.js";
import type { PlayerRepository } from "./player/index.js";
import type { RefreshTokenRepository } from "./refresh-token/index.js";
import type { UserRepository } from "./user/index.js";

export type Repositories = {
  users: UserRepository;
  emailCodes: EmailCodeRepository;
  emailTokens: EmailTokenRepository;
  refreshTokens: RefreshTokenRepository;
  avatars: AvatarRepository;
  channels: ChannelRepository;
  channelParticipants: ChannelParticipantRepository;
  blockedUsers: BlockedUserRepository;
  channelEntries: ChannelEntryRepository;
  messages: MessageRepository;
  games: GameRepository;
  players: PlayerRepository;
};

export type {
  CreateUserInput,
  UserRecord,
  UserRepository,
} from "./user/index.js";
export { UserRepositoryImpl } from "./user/index.js";

export type {
  CreateEmailCodeInput,
  EmailCode,
  EmailCodeId,
  EmailCodeRepository,
} from "./email-code/index.js";
export { EmailCodeRepositoryImpl } from "./email-code/index.js";

export type {
  CreateEmailTokenInput,
  EmailToken,
  EmailTokenId,
  EmailTokenRepository,
} from "./email-token/index.js";
export { EmailTokenRepositoryImpl } from "./email-token/index.js";

export type {
  CreateRefreshTokenInput,
  RefreshToken,
  RefreshTokenId,
  RefreshTokenRepository,
} from "./refresh-token/index.js";
export { RefreshTokenRepositoryImpl } from "./refresh-token/index.js";

export type {
  Avatar,
  AvatarId,
  AvatarRepository,
  CreateAvatarInput,
} from "./avatar/index.js";
export { AvatarRepositoryImpl } from "./avatar/index.js";

export type {
  Channel,
  ChannelId,
  ChannelRepository,
  CreateChannelInput,
  UpdateChannelInput,
} from "./channel/index.js";
export { ChannelRepositoryImpl } from "./channel/index.js";

export type {
  ChannelParticipant,
  ChannelParticipantId,
  ChannelParticipantRepository,
  CreateChannelParticipantInput,
} from "./channel-participant/index.js";
export { ChannelParticipantRepositoryImpl } from "./channel-participant/index.js";

export type {
  BlockedUser,
  BlockedUserId,
  BlockedUserRepository,
  CreateBlockedUserInput,
} from "./blocked-user/index.js";
export { BlockedUserRepositoryImpl } from "./blocked-user/index.js";

export type {
  ChannelEntry,
  ChannelEntryId,
  ChannelEntryRepository,
  CreateChannelEntryInput,
} from "./channel-entry/index.js";
export { ChannelEntryRepositoryImpl } from "./channel-entry/index.js";

export type {
  CreateMessageInput,
  Message,
  MessageId,
  MessageRepository,
} from "./message/index.js";
export { MessageRepositoryImpl } from "./message/index.js";

export type { CreateGameInput, Game, GameId, GameRepository } from "./game/index.js";
export { GameRepositoryImpl } from "./game/index.js";

export type {
  CreatePlayerInput,
  Player,
  PlayerId,
  PlayerRepository,
  UpdatePlayerInput,
} from "./player/index.js";
export { PlayerRepositoryImpl } from "./player/index.js";

export { getRepositories } from "./get-repositories.js";
