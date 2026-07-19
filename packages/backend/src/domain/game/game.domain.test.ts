import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GamePhase, type GameSettings } from "../channel/index.js";
import { PlayerRole, PlayerStatus, type Player } from "../player/index.js";
import { ParticipantRoleCountMismatchError } from "../../shared/errors.js";
import {
  buildShuffledRoleOrder,
  doesAttackSucceed,
  ensureParticipantCountMatchesRoleCount,
  getExecutionTargetByVotes,
  getGameOutcome,
  getNextPhase,
} from "./game.domain.js";
import { GameLogType, GameOutcome, type Game, type GameLogEntry } from "./game.types.js";

function buildGameSettings(overrides: Partial<GameSettings> = {}): GameSettings {
  return {
    roles: {
      VILLAGER: 3,
      WEREWOLF: 1,
      FORTUNE_TELLER: 1,
    },
    phaseDurations: {
      PRE_GAME: 1,
      DAY: 10,
      NIGHT: 5,
      POST_GAME: 0,
    },
    ...overrides,
  } as GameSettings;
}

function buildGame(overrides: Partial<Game> = {}): Game {
  const now = new Date();
  return {
    id: "game-1",
    channelId: "channel-1",
    description: "desc",
    gameSettings: buildGameSettings(),
    logs: [],
    processing: false,
    phaseInfo: { phase: GamePhase.DAY, day: 1, changedAt: now, nextPhaseAt: now },
    startedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function buildPlayer(overrides: Partial<Player> = {}): Player {
  const now = new Date();
  return {
    id: "player-1",
    gameId: "game-1",
    avatarId: "avatar-1",
    userId: "user-1",
    name: "player",
    pictureUrl: "https://example.com/p.png",
    role: PlayerRole.VILLAGER,
    status: PlayerStatus.ALIVE,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("buildShuffledRoleOrder", () => {
  it("roles を人数分に展開する", () => {
    const order = buildShuffledRoleOrder(
      buildGameSettings({ roles: { VILLAGER: 2, WEREWOLF: 1 } }),
    );
    assert.equal(order.length, 3);
    assert.equal(order.filter((r) => r === PlayerRole.VILLAGER).length, 2);
    assert.equal(order.filter((r) => r === PlayerRole.WEREWOLF).length, 1);
  });
});

describe("ensureParticipantCountMatchesRoleCount", () => {
  it("一致すれば通す", () => {
    assert.doesNotThrow(() => ensureParticipantCountMatchesRoleCount(5, 5));
  });

  it("不一致なら ParticipantRoleCountMismatchError", () => {
    assert.throws(
      () => ensureParticipantCountMatchesRoleCount(5, 4),
      ParticipantRoleCountMismatchError,
    );
  });
});

describe("getExecutionTargetByVotes", () => {
  it("最多得票者を返す", () => {
    const game = buildGame({
      logs: [
        { type: GameLogType.VOTE, gameDay: 1, phase: GamePhase.DAY, actorId: "a", targetId: "t1" },
        { type: GameLogType.VOTE, gameDay: 1, phase: GamePhase.DAY, actorId: "b", targetId: "t1" },
        { type: GameLogType.VOTE, gameDay: 1, phase: GamePhase.DAY, actorId: "c", targetId: "t2" },
      ] as GameLogEntry[],
    });
    assert.equal(getExecutionTargetByVotes(game), "t1");
  });

  it("投票が無ければ null", () => {
    assert.equal(getExecutionTargetByVotes(buildGame()), null);
  });
});

describe("doesAttackSucceed", () => {
  const players = [buildPlayer({ id: "target", role: PlayerRole.VILLAGER })];

  it("護衛されていなければ成功", () => {
    const game = buildGame({
      logs: [
        { type: GameLogType.ATTACK, gameDay: 1, phase: GamePhase.NIGHT, targetId: "target" },
      ] as GameLogEntry[],
    });
    assert.equal(doesAttackSucceed(game, players), "target");
  });

  it("同じ対象が護衛されていれば null", () => {
    const game = buildGame({
      logs: [
        { type: GameLogType.ATTACK, gameDay: 1, phase: GamePhase.NIGHT, targetId: "target" },
        { type: GameLogType.GUARD, gameDay: 1, phase: GamePhase.NIGHT, targetId: "target" },
      ] as GameLogEntry[],
    });
    assert.equal(doesAttackSucceed(game, players), null);
  });

  it("対象が妖狐なら null", () => {
    const foxPlayers = [buildPlayer({ id: "target", role: PlayerRole.FOX })];
    const game = buildGame({
      logs: [
        { type: GameLogType.ATTACK, gameDay: 1, phase: GamePhase.NIGHT, targetId: "target" },
      ] as GameLogEntry[],
    });
    assert.equal(doesAttackSucceed(game, foxPlayers), null);
  });
});

describe("getGameOutcome", () => {
  it("人狼が全滅すれば村人勝利", () => {
    const outcome = getGameOutcome([
      { role: PlayerRole.VILLAGER, isAlive: true },
      { role: PlayerRole.WEREWOLF, isAlive: false },
    ]);
    assert.equal(outcome, GameOutcome.VILLAGE_WIN);
  });

  it("人狼が村人以上なら人狼勝利", () => {
    const outcome = getGameOutcome([
      { role: PlayerRole.VILLAGER, isAlive: true },
      { role: PlayerRole.WEREWOLF, isAlive: true },
    ]);
    assert.equal(outcome, GameOutcome.WEREWOLF_WIN);
  });

  it("決着条件を満たしつつ妖狐が生存していれば妖狐勝利", () => {
    const outcome = getGameOutcome([
      { role: PlayerRole.WEREWOLF, isAlive: false },
      { role: PlayerRole.FOX, isAlive: true },
    ]);
    assert.equal(outcome, GameOutcome.THIRD_PARTY_WIN);
  });

  it("決着していなければ null", () => {
    const outcome = getGameOutcome([
      { role: PlayerRole.VILLAGER, isAlive: true },
      { role: PlayerRole.VILLAGER, isAlive: true },
      { role: PlayerRole.WEREWOLF, isAlive: true },
    ]);
    assert.equal(outcome, null);
  });
});

describe("getNextPhase", () => {
  const gameSettings = buildGameSettings();

  it("PRE_GAME → DAY(1)", () => {
    const next = getNextPhase(GamePhase.PRE_GAME, 0, gameSettings);
    assert.equal(next?.phase, GamePhase.DAY);
    assert.equal(next?.day, 1);
  });

  it("DAY → NIGHT（同じ日）", () => {
    const next = getNextPhase(GamePhase.DAY, 1, gameSettings);
    assert.equal(next?.phase, GamePhase.NIGHT);
    assert.equal(next?.day, 1);
  });

  it("NIGHT → DAY（次の日）", () => {
    const next = getNextPhase(GamePhase.NIGHT, 1, gameSettings);
    assert.equal(next?.phase, GamePhase.DAY);
    assert.equal(next?.day, 2);
  });

  it("isGameSet なら常に POST_GAME", () => {
    const next = getNextPhase(GamePhase.DAY, 1, gameSettings, true);
    assert.equal(next?.phase, GamePhase.POST_GAME);
  });

  it("POST_GAME の次は null", () => {
    assert.equal(getNextPhase(GamePhase.POST_GAME, 1, gameSettings), null);
  });
});
