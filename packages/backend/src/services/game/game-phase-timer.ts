import { GamePhase, type GamePhaseType, type GameSettings } from "../../domain/channel/index.js";
import { computeNextPhaseAt, getNextPhase, getPhaseDurationMs, type GamePhaseInfo } from "../../domain/game/index.js";
import { gamePhaseChangedEvent, type EventBus } from "../../events/index.js";
import type { GameRepository } from "../../repositories/game/index.js";
import type { PlayerRepository } from "../../repositories/player/index.js";
import type { PhaseHandlers } from "./phase-handlers/index.js";

export type GamePhaseTimerDeps = {
  games: GameRepository;
  players: PlayerRepository;
  eventBus?: EventBus;
};

export type GamePhaseTimerOptions = {
  changedAt?: Date;
  onStopped?: () => void;
  onError?: (err: Error) => void;
};

/**
 * ゲームの現在フェーズに応じた経過時間で setTimeout し、
 * タイムアウト時にフェーズハンドラを実行、必要なら次フェーズへ進めて DB を更新する。
 * プロセス内タイマーのみ（Redis など外部スケジューラは使わない）。
 */
export class GamePhaseTimer {
  private readonly gameId: string;
  private day: number;
  private phase: GamePhaseType;
  private changedAt: Date;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly gameSettings: GameSettings;
  private readonly phaseHandlers: PhaseHandlers;
  private readonly deps: GamePhaseTimerDeps;
  private readonly onStopped: (() => void) | undefined;
  private readonly onError: ((err: Error) => void) | undefined;

  constructor(
    gameId: string,
    day: number,
    phase: GamePhaseType,
    gameSettings: GameSettings,
    phaseHandlers: PhaseHandlers,
    deps: GamePhaseTimerDeps,
    options?: GamePhaseTimerOptions,
  ) {
    this.gameId = gameId;
    this.day = day;
    this.phase = phase;
    this.gameSettings = gameSettings;
    this.phaseHandlers = phaseHandlers;
    this.deps = deps;
    this.changedAt = options?.changedAt ?? new Date();
    this.onStopped = options?.onStopped;
    this.onError = options?.onError;
    this.startTimer();
  }

  startTimer(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    const phaseDurationMs = getPhaseDurationMs(this.gameSettings, this.phase);
    this.timeoutId = setTimeout(
      () => void this.handleTimeoutWithProcessing(),
      phaseDurationMs,
    );
  }

  private async handleTimeoutWithProcessing(): Promise<void> {
    await this.runWithProcessing(() => this.handleTimeout());
  }

  private async handleTimeout(): Promise<void> {
    const isGameSet = await this.phaseHandlers[this.phase]();
    const isPhaseAdvanced = await this.advancePhase(isGameSet);
    if (isPhaseAdvanced) {
      this.startTimer();
    } else {
      this.stopTimer();
    }
  }

  private async advancePhase(isGameSet = false): Promise<boolean> {
    const nextPhase = getNextPhase(this.phase, this.day, this.gameSettings, isGameSet);
    if (!nextPhase) return false;

    this.day = nextPhase.day;
    this.phase = nextPhase.phase;
    this.changedAt = nextPhase.changedAt;

    await this.updatePhaseInfo(nextPhase.nextPhaseAt);
    if (this.phase === GamePhase.POST_GAME) {
      await this.deps.games.markEnded(this.gameId, this.changedAt);
    }
    await this.emitPhaseChanged();
    return true;
  }

  private computeNextPhaseAt(): Date {
    return computeNextPhaseAt(this.changedAt, this.gameSettings, this.phase);
  }

  private async updatePhaseInfo(nextPhaseAt?: Date): Promise<void> {
    const phaseInfo: GamePhaseInfo = {
      phase: this.phase,
      day: this.day,
      changedAt: this.changedAt,
      nextPhaseAt: nextPhaseAt ?? this.computeNextPhaseAt(),
    };
    await this.deps.games.updatePhaseInfo(this.gameId, phaseInfo);
  }

  private async emitPhaseChanged(): Promise<void> {
    const players = await this.deps.players.listActiveByGameId(this.gameId);
    this.deps.eventBus?.emit(
      gamePhaseChangedEvent(this.gameId, {
        day: this.day,
        phase: this.phase,
        changedAt: this.changedAt,
        players: players.map((p) => ({ playerId: p.id, status: p.status })),
      }),
    );
  }

  private stopTimer(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;
    try {
      this.onStopped?.();
    } catch {
      // onStopped コールバックの失敗はタイマー停止処理に影響させない
    }
  }

  private async runWithProcessing(task: () => Promise<void>): Promise<void> {
    try {
      await this.deps.games.setProcessing(this.gameId, true);
      await task();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.stopTimer();
      this.onError?.(error);
    } finally {
      try {
        await this.deps.games.setProcessing(this.gameId, false);
      } catch (e) {
        const flagError = e instanceof Error ? e : new Error(String(e));
        this.onError?.(flagError);
      }
    }
  }
}
