import type { GameState } from "../core/GameState.js";

/**
 * ブレークポイント情報
 */
export interface BreakpointInfo {
  line: number;
  condition?: string; // 条件付きブレークポイント
  enabled: boolean;
}

/**
 * デバッグイベントの種類
 */
export enum DebugEventType {
  VariableChanged = "variable_changed",
  Breakpoint = "breakpoint",
  StepComplete = "step_complete",
  FunctionCall = "function_call",
  FunctionReturn = "function_return",
}

/**
 * デバッグイベント
 */
export interface DebugEvent {
  type: DebugEventType;
  line: number;
  data?: unknown;
}

/**
 * 変数変更履歴
 */
export interface VariableChange {
  line: number;
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
}

/**
 * デバッガー
 * スクリプト実行中の内部状態を可視化し、ステップ実行を可能にする
 */
export class Debugger {
  /** デバッグモードが有効か */
  private enabled: boolean = false;

  /** 監視対象の変数名 */
  private watchedVars: Set<string> = new Set();

  /** 変数変更履歴 */
  private varHistory: Map<string, VariableChange[]> = new Map();

  /** ブレークポイント */
  private breakpoints: Map<number, BreakpointInfo> = new Map();

  /** 実行が一時停止中か */
  private paused: boolean = false;

  /** 次のステップまで実行を継続するか */
  private stepMode: "none" | "over" | "into" | "out" = "none";

  /** トレースログを記録するか */
  private traceEnabled: boolean = false;

  /** トレースログ */
  private traceLog: string[] = [];

  /** デバッグイベントリスナー */
  private eventListeners: Array<(event: DebugEvent) => void> = [];

  constructor(options?: {
    enabled?: boolean;
    watchVariables?: string[];
    breakpoints?: number[];
    trace?: boolean;
  }) {
    if (options) {
      this.enabled = options.enabled ?? false;
      this.traceEnabled = options.trace ?? false;

      if (options.watchVariables) {
        options.watchVariables.forEach((v) => this.watchVariable(v));
      }

      if (options.breakpoints) {
        options.breakpoints.forEach((line) => this.addBreakpoint(line));
      }
    }
  }

  /**
   * デバッグモードを有効化
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * デバッグモードを無効化
   */
  disable(): void {
    this.enabled = false;
    this.paused = false;
    this.stepMode = "none";
  }

  /**
   * デバッグモードが有効か
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  // ========== 変数ウォッチ機能 ==========

  /**
   * 変数を監視対象に追加
   */
  watchVariable(name: string): void {
    this.watchedVars.add(name);
    if (!this.varHistory.has(name)) {
      this.varHistory.set(name, []);
    }
  }

  /**
   * 変数の監視を解除
   */
  unwatchVariable(name: string): void {
    this.watchedVars.delete(name);
  }

  /**
   * 監視対象の変数一覧を取得
   */
  getWatchedVariables(): string[] {
    return Array.from(this.watchedVars);
  }

  /**
   * 変数の変更履歴を取得
   */
  getVariableHistory(name: string): VariableChange[] {
    return this.varHistory.get(name) || [];
  }

  /**
   * 変数変更を記録
   * @param name 変数名
   * @param oldValue 変更前の値
   * @param newValue 変更後の値
   * @param line 変更が発生した行
   */
  recordVariableChange(
    name: string,
    oldValue: unknown,
    newValue: unknown,
    line: number
  ): void {
    if (!this.enabled || !this.watchedVars.has(name)) {
      return;
    }

    const change: VariableChange = {
      line,
      oldValue,
      newValue,
      timestamp: Date.now(),
    };

    const history = this.varHistory.get(name) || [];
    history.push(change);
    this.varHistory.set(name, history);

    // イベント発火
    this.emitEvent({
      type: DebugEventType.VariableChanged,
      line,
      data: { name, oldValue, newValue },
    });

    // トレースログに記録
    if (this.traceEnabled) {
      this.addTrace(
        `[Line ${line}] ${name} changed: ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}`
      );
    }
  }

  // ========== ブレークポイント機能 ==========

  /**
   * ブレークポイントを追加
   */
  addBreakpoint(line: number, condition?: string): void {
    this.breakpoints.set(line, {
      line,
      condition,
      enabled: true,
    });
  }

  /**
   * ブレークポイントを削除
   */
  removeBreakpoint(line: number): void {
    this.breakpoints.delete(line);
  }

  /**
   * ブレークポイントを有効化/無効化
   */
  toggleBreakpoint(line: number, enabled: boolean): void {
    const bp = this.breakpoints.get(line);
    if (bp) {
      bp.enabled = enabled;
    }
  }

  /**
   * 全ブレークポイントを取得
   */
  getBreakpoints(): BreakpointInfo[] {
    return Array.from(this.breakpoints.values());
  }

  /**
   * 指定行でブレークすべきか判定
   * @param line 現在の行番号
   * @param state ゲーム状態（条件評価用）
   */
  async shouldBreak(
    line: number,
    state: GameState,
    evaluateCondition?: (condition: string, state: GameState) => Promise<boolean>
  ): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const bp = this.breakpoints.get(line);
    if (!bp || !bp.enabled) {
      return false;
    }

    // 条件付きブレークポイントの評価
    if (bp.condition && evaluateCondition) {
      try {
        const result = await evaluateCondition(bp.condition, state);
        return result;
      } catch (error) {
        // 条件評価に失敗した場合は無条件でブレーク
        return true;
      }
    }

    return true;
  }

  // ========== ステップ実行制御 ==========

  /**
   * 実行を一時停止
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * 実行を再開（次のブレークポイントまで）
   */
  continue(): void {
    this.paused = false;
    this.stepMode = "none";
  }

  /**
   * 次の行へステップ実行（ステップオーバー）
   */
  stepOver(): void {
    this.paused = false;
    this.stepMode = "over";
  }

  /**
   * 関数内にステップイン
   */
  stepInto(): void {
    this.paused = false;
    this.stepMode = "into";
  }

  /**
   * 関数から抜ける（ステップアウト）
   */
  stepOut(): void {
    this.paused = false;
    this.stepMode = "out";
  }

  /**
   * 一時停止中か
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * ステップモードを取得
   */
  getStepMode(): "none" | "over" | "into" | "out" {
    return this.stepMode;
  }

  /**
   * ステップ実行完了を通知
   */
  notifyStepComplete(line: number): void {
    if (this.stepMode !== "none") {
      this.paused = true;
      this.stepMode = "none";

      this.emitEvent({
        type: DebugEventType.StepComplete,
        line,
      });
    }
  }

  // ========== トレースログ機能 ==========

  /**
   * トレースログを有効化
   */
  enableTrace(): void {
    this.traceEnabled = true;
  }

  /**
   * トレースログを無効化
   */
  disableTrace(): void {
    this.traceEnabled = false;
  }

  /**
   * トレースログにメッセージを追加
   */
  addTrace(message: string): void {
    if (this.traceEnabled) {
      this.traceLog.push(`[${new Date().toISOString()}] ${message}`);
    }
  }

  /**
   * トレースログを取得
   */
  getTraceLog(): string[] {
    return [...this.traceLog];
  }

  /**
   * トレースログをクリア
   */
  clearTraceLog(): void {
    this.traceLog = [];
  }

  /**
   * 関数呼び出しをトレース
   */
  traceFunctionCall(name: string, args: unknown[], line: number): void {
    if (this.traceEnabled) {
      const argsStr = args.map((a) => JSON.stringify(a)).join(", ");
      this.addTrace(`[Line ${line}] call ${name}(${argsStr})`);
    }

    this.emitEvent({
      type: DebugEventType.FunctionCall,
      line,
      data: { name, args },
    });
  }

  /**
   * 関数戻りをトレース
   */
  traceFunctionReturn(name: string, returnValue: unknown, line: number): void {
    if (this.traceEnabled) {
      this.addTrace(
        `[Line ${line}] ${name}() returned ${JSON.stringify(returnValue)}`
      );
    }

    this.emitEvent({
      type: DebugEventType.FunctionReturn,
      line,
      data: { name, returnValue },
    });
  }

  // ========== イベントリスナー ==========

  /**
   * デバッグイベントリスナーを追加
   */
  addEventListener(listener: (event: DebugEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * デバッグイベントリスナーを削除
   */
  removeEventListener(listener: (event: DebugEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * デバッグイベントを発火
   */
  private emitEvent(event: DebugEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("デバッグイベントリスナーでエラー:", error);
      }
    }
  }

  // ========== リセット機能 ==========

  /**
   * デバッガー状態をリセット
   */
  reset(): void {
    this.varHistory.clear();
    this.traceLog = [];
    this.paused = false;
    this.stepMode = "none";
  }
}
