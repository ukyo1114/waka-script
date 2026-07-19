export class NotImplementedError extends Error {
  readonly code = "not_implemented" as const;

  constructor(readonly operation: string) {
    super(`${operation} is not implemented yet`);
    this.name = "NotImplementedError";
  }
}

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class EmailAlreadyRegisteredError extends AppError {
  constructor(email: string) {
    super(409, "email_already_registered", `email already registered: ${email}`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class EmailNotRegisteredError extends AppError {
  constructor(email: string) {
    super(404, "email_not_registered", `email is not registered: ${email}`);
    this.name = "EmailNotRegisteredError";
  }
}

export class UserNotLockedError extends AppError {
  constructor(email: string) {
    super(400, "user_not_locked", `user is not locked: ${email}`);
    this.name = "UserNotLockedError";
  }
}

export class TokenSendNotAllowedError extends AppError {
  constructor(message: string) {
    super(429, "token_send_not_allowed", message);
    this.name = "TokenSendNotAllowedError";
  }
}

export class InvalidVerificationCodeError extends AppError {
  constructor() {
    super(400, "invalid_verification_code", "verification code is invalid or expired");
    this.name = "InvalidVerificationCodeError";
  }
}

export class VerificationAttemptsExceededError extends AppError {
  constructor(maxAttempts: number) {
    super(
      429,
      "verification_attempts_exceeded",
      `verification attempts exceeded (max ${maxAttempts})`,
    );
    this.name = "VerificationAttemptsExceededError";
  }
}

export class InvalidEmailTokenError extends AppError {
  constructor() {
    super(400, "invalid_email_token", "email action token is invalid or expired");
    this.name = "InvalidEmailTokenError";
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, "invalid_credentials", "email or password is incorrect");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidAccessTokenError extends AppError {
  constructor() {
    super(401, "invalid_access_token", "access token is invalid or expired");
    this.name = "InvalidAccessTokenError";
  }
}

export class InvalidRefreshTokenError extends AppError {
  constructor() {
    super(401, "invalid_refresh_token", "refresh token is invalid or expired");
    this.name = "InvalidRefreshTokenError";
  }
}

export class UserAccountLockedError extends AppError {
  constructor() {
    super(403, "user_account_locked", "user account is locked");
    this.name = "UserAccountLockedError";
  }
}

export class UserNotFoundError extends AppError {
  constructor() {
    super(404, "user_not_found", "user not found");
    this.name = "UserNotFoundError";
  }
}

export class GuestActionNotAllowedError extends AppError {
  constructor(action: string) {
    super(
      403,
      "guest_action_not_allowed",
      `guest users cannot perform: ${action}`,
    );
    this.name = "GuestActionNotAllowedError";
  }
}

export class AvatarLimitExceededError extends AppError {
  constructor(limit: number) {
    super(
      409,
      "avatar_limit_exceeded",
      `avatar limit exceeded (max ${limit})`,
    );
    this.name = "AvatarLimitExceededError";
  }
}

export class AvatarNotFoundError extends AppError {
  constructor() {
    super(404, "avatar_not_found", "avatar not found");
    this.name = "AvatarNotFoundError";
  }
}

export class AvatarAccessDeniedError extends AppError {
  constructor() {
    super(403, "avatar_access_denied", "avatar does not belong to the user");
    this.name = "AvatarAccessDeniedError";
  }
}

export class AvatarMinimumRequiredError extends AppError {
  constructor() {
    super(
      409,
      "avatar_minimum_required",
      "at least one avatar must remain",
    );
    this.name = "AvatarMinimumRequiredError";
  }
}

export class InvalidAvatarImageError extends AppError {
  constructor(message = "avatar image is invalid") {
    super(400, "invalid_avatar_image", message);
    this.name = "InvalidAvatarImageError";
  }
}

export class ChannelNotFoundError extends AppError {
  constructor() {
    super(404, "channel_not_found", "channel not found");
    this.name = "ChannelNotFoundError";
  }
}

export class NotChannelAdminError extends AppError {
  constructor() {
    super(403, "not_channel_admin", "user is not the channel admin");
    this.name = "NotChannelAdminError";
  }
}

export class ChannelGuestNotAllowedError extends AppError {
  constructor() {
    super(
      403,
      "channel_guest_not_allowed",
      "guests are not allowed to join this channel",
    );
    this.name = "ChannelGuestNotAllowedError";
  }
}

export class ChannelPasswordRequiredError extends AppError {
  constructor(message = "password is required") {
    super(400, "channel_password_required", message);
    this.name = "ChannelPasswordRequiredError";
  }
}

export class InvalidChannelPasswordError extends AppError {
  constructor() {
    super(401, "invalid_channel_password", "channel password is incorrect");
    this.name = "InvalidChannelPasswordError";
  }
}

export class ChannelParticipantNotFoundError extends AppError {
  constructor() {
    super(404, "channel_participant_not_found", "channel participant not found");
    this.name = "ChannelParticipantNotFoundError";
  }
}

export class ChannelUserBlockedError extends AppError {
  constructor() {
    super(403, "channel_user_blocked", "user is blocked from this channel");
    this.name = "ChannelUserBlockedError";
  }
}

export class BlockedUserNotFoundError extends AppError {
  constructor() {
    super(404, "blocked_user_not_found", "blocked user not found");
    this.name = "BlockedUserNotFoundError";
  }
}

export class AlreadyBlockedError extends AppError {
  constructor() {
    super(409, "already_blocked", "user is already blocked from this channel");
    this.name = "AlreadyBlockedError";
  }
}

export class CannotBlockChannelAdminError extends AppError {
  constructor() {
    super(
      403,
      "cannot_block_channel_admin",
      "channel admin cannot be blocked",
    );
    this.name = "CannotBlockChannelAdminError";
  }
}

export class ChannelAdminCannotLeaveError extends AppError {
  constructor() {
    super(
      403,
      "channel_admin_cannot_leave",
      "channel admin cannot leave; delete the channel instead",
    );
    this.name = "ChannelAdminCannotLeaveError";
  }
}

export class EntryProcessingError extends AppError {
  constructor() {
    super(
      409,
      "entry_processing",
      "channel entry is being processed; try again",
    );
    this.name = "EntryProcessingError";
  }
}

export class ParticipantRoleCountMismatchError extends AppError {
  constructor(participantCount: number, roleCount: number) {
    super(
      409,
      "participant_role_count_mismatch",
      `participant count (${participantCount}) does not match role count (${roleCount})`,
    );
    this.name = "ParticipantRoleCountMismatchError";
  }
}

// ---------------------------------------------------------------------------
// メッセージ
// ---------------------------------------------------------------------------

export class RoomNotFoundError extends AppError {
  constructor() {
    super(404, "room_not_found", "room not found");
    this.name = "RoomNotFoundError";
  }
}

export class MessageNotFoundError extends AppError {
  constructor() {
    super(404, "message_not_found", "message not found");
    this.name = "MessageNotFoundError";
  }
}

export class MessageRoomMismatchError extends AppError {
  constructor() {
    super(400, "message_room_mismatch", "message does not belong to this room");
    this.name = "MessageRoomMismatchError";
  }
}

export class MessageTypeMismatchError extends AppError {
  constructor() {
    super(400, "message_type_mismatch", "message does not belong to this message type");
    this.name = "MessageTypeMismatchError";
  }
}

export class MessageAccessDeniedError extends AppError {
  constructor() {
    super(403, "message_access_denied", "no access to this message type");
    this.name = "MessageAccessDeniedError";
  }
}

export class MessageCountLimitExceededError extends AppError {
  constructor(limit: number) {
    super(
      400,
      "message_count_limit_exceeded",
      `message count exceeds limit (max ${limit})`,
    );
    this.name = "MessageCountLimitExceededError";
  }
}

// ---------------------------------------------------------------------------
// プレイヤー・ゲーム
// ---------------------------------------------------------------------------

export class PlayerNotFoundError extends AppError {
  constructor() {
    super(404, "player_not_found", "player not found");
    this.name = "PlayerNotFoundError";
  }
}

export class PlayerNotOwnedError extends AppError {
  constructor() {
    super(403, "player_not_owned", "player does not belong to the user");
    this.name = "PlayerNotOwnedError";
  }
}

export class GameNotFoundError extends AppError {
  constructor() {
    super(404, "game_not_found", "game not found");
    this.name = "GameNotFoundError";
  }
}

export class GameProcessingError extends AppError {
  constructor() {
    super(409, "game_processing", "game is being processed; try again");
    this.name = "GameProcessingError";
  }
}

export class InvalidGamePhaseError extends AppError {
  constructor() {
    super(409, "invalid_game_phase", "this action is not allowed in the current phase");
    this.name = "InvalidGamePhaseError";
  }
}

export class ActionPlayerRoleInvalidError extends AppError {
  constructor() {
    super(403, "action_player_role_invalid", "player role cannot perform this action");
    this.name = "ActionPlayerRoleInvalidError";
  }
}

export class ActionPlayerDeadError extends AppError {
  constructor() {
    super(409, "action_player_dead", "player is dead; cannot perform this action");
    this.name = "ActionPlayerDeadError";
  }
}

export class TargetPlayerDeadError extends AppError {
  constructor() {
    super(409, "target_player_dead", "target player is dead");
    this.name = "TargetPlayerDeadError";
  }
}

export class TargetPlayerNotFoundError extends AppError {
  constructor() {
    super(400, "target_player_not_found", "target player not found in this game");
    this.name = "TargetPlayerNotFoundError";
  }
}

export class TargetRoleSameError extends AppError {
  constructor() {
    super(400, "target_role_same", "target player has the same role as the actor");
    this.name = "TargetRoleSameError";
  }
}

export class SocketAuthContextInvalidError extends AppError {
  constructor() {
    super(
      400,
      "socket_auth_context_invalid",
      "exactly one of participantId or playerId must be provided",
    );
    this.name = "SocketAuthContextInvalidError";
  }
}
