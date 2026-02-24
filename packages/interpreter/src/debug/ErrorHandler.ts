import { ErrorType, type KNFError, type CallFrame } from "../types/Error.js";

/**
 * Levenshtein距離を計算（類似度判定用）
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * エラーハンドリングユーティリティ
 */
export class ErrorHandler {
  /**
   * 未定義の変数エラーに対して類似変数名を提案
   * @param varName 未定義の変数名
   * @param availableVars 定義済み変数名のリスト
   * @returns 提案する変数名（最大3件）
   */
  static suggestSimilarVariables(
    varName: string,
    availableVars: string[]
  ): string[] {
    const suggestions: Array<{ name: string; distance: number }> = [];

    for (const available of availableVars) {
      const distance = levenshteinDistance(varName, available);
      // 編集距離が3以下、かつ元の文字列の半分以下なら候補とする
      if (distance <= 3 && distance <= varName.length / 2) {
        suggestions.push({ name: available, distance });
      }
    }

    // 距離が近い順にソート
    suggestions.sort((a, b) => a.distance - b.distance);

    // 上位3件を返す
    return suggestions.slice(0, 3).map((s) => s.name);
  }

  /**
   * スタックトレースをフォーマット
   * @param stack コールフレームの配列
   * @returns フォーマットされたスタックトレース文字列
   */
  static formatStackTrace(stack: CallFrame[]): string {
    if (stack.length === 0) {
      return "";
    }

    const lines: string[] = [];
    for (const frame of stack) {
      const location = frame.column
        ? `${frame.line}:${frame.column}`
        : `${frame.line}`;
      lines.push(`  at ${frame.functionName} (line ${location})`);
    }

    return lines.join("\n");
  }

  /**
   * エラーメッセージをフォーマット
   * @param error KNFエラー情報
   * @returns フォーマットされたエラーメッセージ
   */
  static formatError(error: KNFError): string {
    const lines: string[] = [];

    // エラーヘッダー
    lines.push(`[KNF ${error.type}] Line ${error.line}: ${error.message}`);

    // スタックトレース
    if (error.stack.length > 0) {
      lines.push(this.formatStackTrace(error.stack));
    }

    // コンテキスト（該当行の前後）
    if (error.context) {
      lines.push("");
      lines.push(error.context);
    }

    // 提案
    if (error.suggestions && error.suggestions.length > 0) {
      lines.push("");
      if (error.suggestions.length === 1) {
        lines.push(`ヒント: '${error.suggestions[0]}' ではありませんか？`);
      } else {
        lines.push(
          `ヒント: もしかして '${error.suggestions.join("', '")}' のいずれかではありませんか？`
        );
      }
    }

    return lines.join("\n");
  }

  /**
   * エラーコンテキストを生成（該当行とその前後）
   * @param script スクリプト全体
   * @param line エラー行（1始まり）
   * @param contextLines 前後に表示する行数
   * @returns コンテキスト文字列
   */
  static generateContext(
    script: string,
    line: number,
    contextLines: number = 2
  ): string {
    const lines = script.split("\n");
    const startLine = Math.max(0, line - 1 - contextLines);
    const endLine = Math.min(lines.length, line + contextLines);

    const contextParts: string[] = [];

    for (let i = startLine; i < endLine; i++) {
      const lineNum = i + 1;
      const prefix = lineNum === line ? "→ " : "  ";
      const lineContent = lines[i] || "";
      contextParts.push(`${prefix}${lineNum}: ${lineContent}`);
    }

    return contextParts.join("\n");
  }

  /**
   * 未定義変数エラーを作成
   */
  static createReferenceError(
    varName: string,
    line: number,
    availableVars: string[],
    stack: CallFrame[],
    script?: string
  ): KNFError {
    const suggestions = this.suggestSimilarVariables(varName, availableVars);
    const context = script
      ? this.generateContext(script, line)
      : undefined;

    return {
      type: ErrorType.ReferenceError,
      message: `未定義の変数: ${varName}`,
      line,
      stack,
      suggestions,
      context,
    };
  }

  /**
   * 未定義関数エラーを作成
   */
  static createFunctionNotFoundError(
    funcName: string,
    line: number,
    availableFuncs: string[],
    stack: CallFrame[],
    script?: string
  ): KNFError {
    const suggestions = this.suggestSimilarVariables(funcName, availableFuncs);
    const context = script
      ? this.generateContext(script, line)
      : undefined;

    return {
      type: ErrorType.ReferenceError,
      message: `未定義の関数: ${funcName}`,
      line,
      stack,
      suggestions,
      context,
    };
  }

  /**
   * 型エラーを作成
   */
  static createTypeError(
    message: string,
    line: number,
    stack: CallFrame[],
    script?: string
  ): KNFError {
    const context = script
      ? this.generateContext(script, line)
      : undefined;

    return {
      type: ErrorType.TypeError,
      message,
      line,
      stack,
      context,
    };
  }

  /**
   * 実行時エラーを作成
   */
  static createRuntimeError(
    message: string,
    line: number,
    stack: CallFrame[],
    script?: string
  ): KNFError {
    const context = script
      ? this.generateContext(script, line)
      : undefined;

    return {
      type: ErrorType.RuntimeError,
      message,
      line,
      stack,
      context,
    };
  }

  /**
   * スタックオーバーフローエラーを作成
   */
  static createStackOverflowError(
    line: number,
    stack: CallFrame[]
  ): KNFError {
    return {
      type: ErrorType.StackOverflow,
      message: "スタックオーバーフロー: 再帰の深さが上限を超えました",
      line,
      stack,
      suggestions: [
        "再帰関数の終了条件を確認してください",
        "再帰の深さを減らしてください",
      ],
    };
  }
}
