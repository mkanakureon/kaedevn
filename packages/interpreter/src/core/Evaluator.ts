import { Token, TokenType } from "../types/Token.js";
import { Tokenizer } from "./Tokenizer.js";
import type { GameState } from "./GameState.js";

/**
 * 関数呼び出しハンドラー型 (Phase 5)
 */
export type FunctionCallHandler = (
  name: string,
  args: unknown[]
) => Promise<unknown>;

/**
 * 式評価器
 * 再帰下降パーサーで式を評価
 */
export class Evaluator {
  private tokenizer: Tokenizer;
  private tokens: Token[] = [];
  private currentIndex: number = 0;
  private functionCallHandler?: FunctionCallHandler;

  constructor() {
    this.tokenizer = new Tokenizer();
  }

  /**
   * 関数呼び出しハンドラーを設定 (Phase 5)
   */
  setFunctionCallHandler(handler: FunctionCallHandler): void {
    this.functionCallHandler = handler;
  }

  /**
   * 式を評価 (Phase 5完成: 非同期化)
   * @param expr 式の文字列
   * @param state ゲーム状態
   * @returns 評価結果
   */
  async evaluate(expr: string, state: GameState): Promise<unknown> {
    this.tokens = this.tokenizer.tokenize(expr);
    this.currentIndex = 0;

    if (this.tokens.length === 0) {
      return null;
    }

    return await this.parseExpression(state);
  }

  /**
   * 代入文を実行 (Phase 5完成: 非同期化)
   * @param expr 代入式（例: "x = 5", "y += 3"）
   * @param state ゲーム状態
   */
  async executeAssignment(expr: string, state: GameState): Promise<void> {
    this.tokens = this.tokenizer.tokenize(expr);
    this.currentIndex = 0;

    if (this.tokens.length === 0) {
      return;
    }

    // 変数名を取得
    const varToken = this.tokens[0];
    if (varToken.type !== TokenType.Identifier) {
      throw new Error(`代入の左辺は変数名である必要があります: ${expr}`);
    }

    const varName = varToken.value;
    this.currentIndex++;

    // 代入演算子を取得
    const assignToken = this.tokens[this.currentIndex];
    if (assignToken.type !== TokenType.Assign) {
      throw new Error(`代入演算子が必要です: ${expr}`);
    }

    const operator = assignToken.value;
    this.currentIndex++;

    // 右辺を評価
    const value = await this.parseExpression(state);

    // 代入実行
    switch (operator) {
      case "=":
        state.setVar(varName, value);
        break;

      case "+=": {
        // v2.1: 未定義の場合は0で初期化
        const current = state.hasVar(varName) ? state.getVar(varName) : 0;
        state.setVar(varName, (current as number) + (value as number));
        break;
      }

      case "-=": {
        const current = state.hasVar(varName) ? state.getVar(varName) : 0;
        state.setVar(varName, (current as number) - (value as number));
        break;
      }

      case "*=": {
        const current = state.hasVar(varName) ? state.getVar(varName) : 0;
        state.setVar(varName, (current as number) * (value as number));
        break;
      }

      case "/=": {
        const current = state.hasVar(varName) ? state.getVar(varName) : 0;
        if ((value as number) === 0) {
          throw new Error("0除算エラー");
        }
        state.setVar(varName, (current as number) / (value as number));
        break;
      }

      default:
        throw new Error(`未知の代入演算子: ${operator}`);
    }
  }

  /**
   * 条件式を評価（if文用）(Phase 5完成: 非同期化)
   * @param expr 条件式
   * @param state ゲーム状態
   * @returns 真偽値
   */
  async evaluateCondition(expr: string, state: GameState): Promise<boolean> {
    const result = await this.evaluate(expr, state);
    return this.isTruthy(result);
  }

  /**
   * 値が真かどうか判定
   */
  private isTruthy(value: unknown): boolean {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "string") {
      return value.length > 0;
    }
    return value != null;
  }

  /**
   * 文字列補間を実行 (Phase 6, Phase 7完成: async化)
   * セリフブロック内の {式} を評価して置換する (v2.1: セリフブロック内のみ)
   * @param text 補間対象のテキスト
   * @param state ゲーム状態
   * @returns 補間後のテキスト
   */
  async interpolate(text: string, state: GameState): Promise<string> {
    // {式} パターンを検出
    const pattern = /\{([^}]+)\}/g;
    let result = text;
    let match: RegExpExecArray | null;

    // すべてのマッチを処理
    const matches: Array<{ expr: string; fullMatch: string }> = [];
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        expr: match[1],
        fullMatch: match[0],
      });
    }

    // 後ろから置換（インデックスがずれないように）
    for (let i = matches.length - 1; i >= 0; i--) {
      const { expr, fullMatch } = matches[i];

      try {
        // 式を評価
        const value = await this.evaluate(expr, state);

        // 文字列に変換
        let replacement: string;
        if (value === null || value === undefined) {
          replacement = "";
        } else if (typeof value === "string") {
          replacement = value;
        } else if (typeof value === "number" || typeof value === "boolean") {
          replacement = String(value);
        } else {
          replacement = JSON.stringify(value);
        }

        // 置換
        result = result.replace(fullMatch, replacement);
      } catch (error) {
        // v2.1: 補間エラーは即座に実行停止
        throw new Error(`文字列補間エラー（{${expr}}）: ${error}`);
      }
    }

    return result;
  }

  // ========== 再帰下降パーサー ==========

  /**
   * expression → logic_or
   */
  private async parseExpression(state: GameState): Promise<unknown> {
    return await this.parseLogicOr(state);
  }

  /**
   * logic_or → logic_and ( "||" logic_and )*
   */
  private async parseLogicOr(state: GameState): Promise<unknown> {
    let left = await this.parseLogicAnd(state);

    while (this.match("||")) {
      this.advance();
      const right = await this.parseLogicAnd(state);
      left = this.isTruthy(left) || this.isTruthy(right);
    }

    return left;
  }

  /**
   * logic_and → equality ( "&&" equality )*
   */
  private async parseLogicAnd(state: GameState): Promise<unknown> {
    let left = await this.parseEquality(state);

    while (this.match("&&")) {
      this.advance();
      const right = await this.parseEquality(state);
      left = this.isTruthy(left) && this.isTruthy(right);
    }

    return left;
  }

  /**
   * equality → comparison ( ( "==" | "!=" ) comparison )*
   */
  private async parseEquality(state: GameState): Promise<unknown> {
    let left = await this.parseComparison(state);

    while (this.match("==", "!=")) {
      const operator = this.current().value;
      this.advance();
      const right = await this.parseComparison(state);

      if (operator === "==") {
        left = left === right;
      } else {
        left = left !== right;
      }
    }

    return left;
  }

  /**
   * comparison → addition ( ( ">" | ">=" | "<" | "<=" ) addition )*
   */
  private async parseComparison(state: GameState): Promise<unknown> {
    let left = await this.parseAddition(state);

    while (this.match(">", ">=", "<", "<=")) {
      const operator = this.current().value;
      this.advance();
      const right = await this.parseAddition(state);

      const leftNum = left as number;
      const rightNum = right as number;

      switch (operator) {
        case ">":
          left = leftNum > rightNum;
          break;
        case ">=":
          left = leftNum >= rightNum;
          break;
        case "<":
          left = leftNum < rightNum;
          break;
        case "<=":
          left = leftNum <= rightNum;
          break;
      }
    }

    return left;
  }

  /**
   * addition → multiplication ( ( "+" | "-" ) multiplication )*
   */
  private async parseAddition(state: GameState): Promise<unknown> {
    let left = await this.parseMultiplication(state);

    while (this.match("+", "-")) {
      const operator = this.current().value;
      this.advance();
      const right = await this.parseMultiplication(state);

      if (operator === "+") {
        // 文字列結合または加算
        if (typeof left === "string" || typeof right === "string") {
          left = String(left) + String(right);
        } else {
          left = (left as number) + (right as number);
        }
      } else {
        left = (left as number) - (right as number);
      }
    }

    return left;
  }

  /**
   * multiplication → unary ( ( "*" | "/" | "%" ) unary )*
   */
  private async parseMultiplication(state: GameState): Promise<unknown> {
    let left = await this.parseUnary(state);

    while (this.match("*", "/", "%")) {
      const operator = this.current().value;
      this.advance();
      const right = await this.parseUnary(state);

      const leftNum = left as number;
      const rightNum = right as number;

      switch (operator) {
        case "*":
          left = leftNum * rightNum;
          break;
        case "/":
          if (rightNum === 0) {
            throw new Error("0除算エラー");
          }
          left = leftNum / rightNum;
          break;
        case "%":
          left = leftNum % rightNum;
          break;
      }
    }

    return left;
  }

  /**
   * unary → ( "!" | "-" ) unary | primary
   */
  private async parseUnary(state: GameState): Promise<unknown> {
    if (this.match("!", "-")) {
      const operator = this.current().value;
      this.advance();
      const operand = await this.parseUnary(state);

      if (operator === "!") {
        return !this.isTruthy(operand);
      } else {
        return -(operand as number);
      }
    }

    return await this.parsePrimary(state);
  }

  /**
   * primary → NUMBER | STRING | BOOLEAN | IDENTIFIER | "(" expression ")"
   */
  private async parsePrimary(state: GameState): Promise<unknown> {
    const token = this.current();

    // リテラル
    if (token.type === TokenType.Number) {
      this.advance();
      return parseFloat(token.value);
    }

    if (token.type === TokenType.String) {
      this.advance();
      return token.value;
    }

    if (token.type === TokenType.Boolean) {
      this.advance();
      return token.value === "true";
    }

    // 変数参照 or 関数呼び出し (Phase 5完成)
    if (token.type === TokenType.Identifier) {
      const name = token.value;
      this.advance();

      // 次が"("なら関数呼び出し
      if (
        this.currentIndex < this.tokens.length &&
        this.current().type === TokenType.LeftParen
      ) {
        this.advance(); // "("をスキップ

        // 引数を評価
        const args: unknown[] = [];

        // 空の引数リストをチェック
        if (this.current().type !== TokenType.RightParen) {
          args.push(await this.parseExpression(state));

          // カンマ区切りの引数
          while (this.current().type === TokenType.Comma) {
            this.advance(); // ","をスキップ
            args.push(await this.parseExpression(state));
          }
        }

        // ")"を確認
        if (this.current().type !== TokenType.RightParen) {
          throw new Error("関数呼び出しの閉じ括弧 ')' がありません");
        }
        this.advance();

        // 関数呼び出しハンドラーを使用
        if (!this.functionCallHandler) {
          throw new Error(`式の中での関数呼び出しにはハンドラーが必要です: ${name}()`);
        }

        // 関数を実行して結果を返す
        return await this.functionCallHandler(name, args);
      }

      // 変数参照
      // v2.1: 未定義変数はエラー
      if (!state.hasVar(name)) {
        throw new Error(`未定義の変数: ${name}`);
      }

      return state.getVar(name);
    }

    // 括弧によるグループ化
    if (token.type === TokenType.LeftParen) {
      this.advance();
      const expr = await this.parseExpression(state);

      if (this.current().type !== TokenType.RightParen) {
        throw new Error("閉じ括弧 ')' がありません");
      }
      this.advance();

      return expr;
    }

    throw new Error(`予期しないトークン: ${token.value}`);
  }

  // ========== ヘルパーメソッド ==========

  /**
   * 現在のトークンを取得
   */
  private current(): Token {
    if (this.currentIndex >= this.tokens.length) {
      return {
        type: TokenType.Identifier,
        value: "EOF",
        position: -1,
      };
    }
    return this.tokens[this.currentIndex];
  }

  /**
   * 次のトークンに進む
   */
  private advance(): void {
    if (this.currentIndex < this.tokens.length) {
      this.currentIndex++;
    }
  }

  /**
   * 現在のトークンが指定した値のいずれかに一致するか
   */
  private match(...values: string[]): boolean {
    const token = this.current();
    return values.includes(token.value);
  }
}
