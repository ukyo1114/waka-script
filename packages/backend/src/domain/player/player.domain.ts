import { PlayerNotFoundError, PlayerNotOwnedError } from "../../shared/errors.js";
import type { UserId } from "../user/index.js";
import { PlayerStatus, type Player } from "./player.types.js";

export const isPlayerAlive = (player: Player): boolean =>
  player.status === PlayerStatus.ALIVE;

export const ensurePlayerExists = (player: Player | null): Player => {
  if (!player || player.deletedAt) {
    throw new PlayerNotFoundError();
  }
  return player;
};

export const assertPlayerOwnedByUser = (
  playerUserId: UserId,
  requesterUserId: UserId,
): void => {
  if (playerUserId !== requesterUserId) {
    throw new PlayerNotOwnedError();
  }
};

/** 役職の日本語表示ラベル */
export const playerRoleLabel = (role: Player["role"]): string => {
  switch (role) {
    case "VILLAGER":
      return "村人";
    case "WEREWOLF":
      return "人狼";
    case "FORTUNE_TELLER":
      return "占い師";
    case "MEDIUM":
      return "霊能者";
    case "HUNTER":
      return "狩人";
    case "POSSESSED":
      return "狂人";
    case "FOX":
      return "妖狐";
    case "TRAITOR":
      return "背徳者";
    case "SHARER":
      return "共有者";
    case "FANATIC":
      return "狂信者";
    default:
      return role;
  }
};
