import type { CallFrame } from "../types/CallFrame.js";

/**
 * ゲーム状態管理
 * 変数、コールスタック、ラベルマップなどを保持
 */
export class GameState {
  /** グローバル変数 (v2.1: number/boolean/string/null のみ) */
  variables: Map<string, unknown> = new Map();

  /** ローカルスコープスタック（関数呼び出し時に使用、Phase 5で実装） */
  localScopes: Map<string, unknown>[] = [];

  /** 呼び出しフレームスタック（call/def/sub呼び出しの管理、Phase 2で実装） */
  callStack: CallFrame[] = [];

  /** ラベル名 → 行番号のマップ */
  labelMap: Map<string, number> = new Map();

  /** 関数定義マップ（Phase 5で実装） */
  functions: Map<string, FunctionDef> = new Map();

  /** サブルーチン定義マップ（Phase 5で実装） */
  subroutines: Map<string, FunctionDef> = new Map();

  /**
   * 変数を取得
   * Phase 5: ローカルスコープ → グローバルの順で検索
   * v2.1: 未定義の場合はエラー
   */
  getVar(name: string): unknown {
    // ローカルスコープを逆順で検索（最も内側から）
    for (let i = this.localScopes.length - 1; i >= 0; i--) {
      if (this.localScopes[i].has(name)) {
        return this.localScopes[i].get(name);
      }
    }

    // グローバルスコープから取得
    return this.variables.get(name);
  }

  /**
   * 変数を設定
   * Phase 5: ローカルスコープがあればローカルに、なければグローバルに設定
   */
  setVar(name: string, value: unknown): void {
    // ローカルスコープを逆順で検索
    for (let i = this.localScopes.length - 1; i >= 0; i--) {
      if (this.localScopes[i].has(name)) {
        this.localScopes[i].set(name, value);
        return;
      }
    }

    // ローカルスコープにない場合はグローバルに設定
    this.variables.set(name, value);
  }

  /**
   * ローカルスコープに変数を設定（関数の引数束縛用）
   */
  setLocalVar(name: string, value: unknown): void {
    if (this.localScopes.length === 0) {
      throw new Error("ローカルスコープが存在しません");
    }
    this.localScopes[this.localScopes.length - 1].set(name, value);
  }

  /**
   * 変数が定義されているか確認
   * Phase 5: ローカル → グローバルの順で検索
   */
  hasVar(name: string): boolean {
    // ローカルスコープを逆順で検索
    for (let i = this.localScopes.length - 1; i >= 0; i--) {
      if (this.localScopes[i].has(name)) {
        return true;
      }
    }

    // グローバルスコープを確認
    return this.variables.has(name);
  }

  /**
   * ローカルスコープをプッシュ（Phase 5で実装）
   */
  pushScope(): void {
    this.localScopes.push(new Map());
  }

  /**
   * ローカルスコープをポップ（Phase 5で実装）
   */
  popScope(): void {
    this.localScopes.pop();
  }

  /**
   * 呼び出しフレームをプッシュ（Phase 2で実装）
   */
  pushFrame(frame: CallFrame): void {
    this.callStack.push(frame);
  }

  /**
   * 呼び出しフレームをポップ（Phase 2で実装）
   */
  popFrame(): CallFrame | undefined {
    return this.callStack.pop();
  }
}

/**
 * 関数定義（Phase 5で使用）
 */
export interface FunctionDef {
  name: string;
  params: string[];
  bodyStart: number;
  bodyEnd: number;
}
