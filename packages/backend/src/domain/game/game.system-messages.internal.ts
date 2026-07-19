import type { Player } from "../player/index.js";
import { GameLogType, type Game } from "./game.types.js";

const buildPlayerIdToName = (players: Player[]): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const p of players) {
    map[p.id] = `【${p.name}】さん`;
  }
  return map;
};

export const buildVictimText = (game: Game, players: Player[]): string | undefined => {
  const day = game.phaseInfo.day;
  const playerIdToName = buildPlayerIdToName(players);
  const victimLog = game.logs.find(
    (e) => e.type === GameLogType.VICTIM && e.gameDay === day,
  );
  const victimName =
    victimLog && "targetId" in victimLog ? playerIdToName[victimLog.targetId] : undefined;
  return victimName && `${victimName}が犠牲になりました。`;
};

export const buildFoxCurseText = (game: Game, players: Player[]): string | undefined => {
  const day = game.phaseInfo.day;
  const playerIdToName = buildPlayerIdToName(players);
  const foxCurseLog = game.logs.find(
    (e) => e.type === GameLogType.FOX_CURSE && e.gameDay === day,
  );
  const foxCurseName =
    foxCurseLog && "targetId" in foxCurseLog
      ? playerIdToName[foxCurseLog.targetId]
      : undefined;
  return foxCurseName && `${foxCurseName}が呪殺されました。`;
};

export const buildSuicideText = (game: Game, players: Player[]): string | undefined => {
  const day = game.phaseInfo.day;
  const playerIdToName = buildPlayerIdToName(players);
  const suicideLog = game.logs.find(
    (e) => e.type === GameLogType.DEPRAVED_SUICIDE && e.gameDay === day,
  );
  const suicideName =
    suicideLog && "targetId" in suicideLog
      ? playerIdToName[suicideLog.targetId]
      : undefined;
  return suicideName && `${suicideName}が後追い自殺しました。`;
};
