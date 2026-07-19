import { playerRoleLabel } from "../player/index.js";
import type { Player } from "../player/index.js";
import { GameLogType, GameOutcome, type Game } from "./game.types.js";
import {
  buildFoxCurseText as buildFoxCurseTextRaw,
  buildSuicideText as buildSuicideTextRaw,
  buildVictimText as buildVictimTextRaw,
} from "./game.system-messages.internal.js";

const outcomeLabel = (outcome: GameOutcome): string => {
  switch (outcome) {
    case GameOutcome.VILLAGE_WIN:
      return "村人";
    case GameOutcome.WEREWOLF_WIN:
      return "人狼";
    case GameOutcome.THIRD_PARTY_WIN:
      return "妖狐";
    default:
      return outcome;
  }
};

const roleOrder: string[] = [
  "WEREWOLF",
  "FORTUNE_TELLER",
  "MEDIUM",
  "HUNTER",
  "POSSESSED",
  "FOX",
  "TRAITOR",
  "SHARER",
  "FANATIC",
  "VILLAGER",
];

const buildRoleSetupItems = (roles: Game["gameSettings"]["roles"]): string[] => {
  const entries = Object.entries(roles).filter(([, count]) => count > 0);
  const sorted = entries.sort(
    ([a], [b]) => roleOrder.indexOf(a) - roleOrder.indexOf(b),
  );
  return sorted.map(([roleKey, count]) => {
    const label = playerRoleLabel(roleKey as Player["role"]);
    return `【${label}】: ${count}人`;
  });
};

export const buildPreGameSystemMessage = (game: Game): string => {
  const items = buildRoleSetupItems(game.gameSettings.roles);
  return `ゲームの準備中です。開始までしばらくお待ちください。配役は次の通りです。${items.join(", ")}`;
};

export const buildVoteResultSystemMessage = (game: Game, players: Player[]): string => {
  const day = game.phaseInfo.day;
  const executionLog = game.logs.find(
    (e) => e.type === GameLogType.EXECUTION && e.gameDay === day,
  );
  if (!executionLog || !("targetId" in executionLog)) {
    return "投票の結果、処刑対象は決まりませんでした。日没の時間です。";
  }
  const player = players.find((p) => p.id === executionLog.targetId);
  if (!player) {
    return "投票の結果、処刑対象は決まりませんでした。日没の時間です。";
  }
  return `投票の結果【${player.name}】さんが処刑されました。日没の時間です。`;
};

export const buildNightActionResultSystemMessage = (
  game: Game,
  players: Player[],
): string => {
  const day = game.phaseInfo.day;
  const parts = [
    buildVictimTextRaw(game, players),
    buildFoxCurseTextRaw(game, players),
    buildSuicideTextRaw(game, players),
  ].filter((part): part is string => Boolean(part));
  const nextDay = day + 1;
  const body = parts.length > 0 ? parts.join("") : "";
  return `夜（Day ${day}）終了！${body}昼（Day ${nextDay}）になりました。投票をしてください。`;
};

export const buildGameEndSystemMessage = (outcome: GameOutcome): string =>
  `ゲームが決着しました。${outcomeLabel(outcome)}チームの勝利です。`;
