/**
 * 呼び出しフレーム (v2.1仕様)
 * call(label)、def/sub 呼び出しを統一管理
 */
export interface CallFrame {
  /** 呼び出し元に戻るPC */
  returnPc: number;

  /** 呼び出し時点のローカルスコープ深度 */
  scopeDepth: number;

  /** 呼び出し種別 */
  kind: "label" | "function" | "subroutine" | "method";

  /** return値の受け取り先（関数呼び出し時のみ使用） */
  returnVar?: string;

  /** メソッド呼び出し時の this 参照（kind: "method" 時に使用） */
  thisRef?: unknown;

  /** デバッグ用の呼び出し元情報 */
  source?: {
    line: number;
    name: string;
  };
}
