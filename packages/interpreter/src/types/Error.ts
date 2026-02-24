/**
 * エラー種別
 */
export enum ErrorType {
  SyntaxError = "SyntaxError",
  ReferenceError = "ReferenceError",
  TypeError = "TypeError",
  RuntimeError = "RuntimeError",
  StackOverflow = "StackOverflow",
  FileNotFound = "FileNotFound",
}

/**
 * コールフレーム情報（スタックトレース用）
 */
export interface CallFrame {
  functionName: string;
  line: number;
  column?: number;
}

/**
 * KNFエラー情報
 */
export interface KNFError {
  type: ErrorType;
  message: string;
  line: number;
  column?: number;
  stack: CallFrame[];
  suggestions?: string[];
  context?: string; // エラー発生箇所の前後のコード
}
