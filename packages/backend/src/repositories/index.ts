import type { EmailCodeRepository } from "./email-code/index.js";
import type { EmailTokenRepository } from "./email-token/index.js";
import type { AvatarRepository } from "./avatar/index.js";
import type { BlockedUserRepository } from "./blocked-user/index.js";
import type { ChannelEntryRepository } from "./channel-entry/index.js";
import type { ChannelParticipantRepository } from "./channel-participant/index.js";
import type { ChannelRepository } from "./channel/index.js";
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

export { getRepositories } from "./get-repositories.js";
