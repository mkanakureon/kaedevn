import { Token, TokenType } from "../types/Token.js";

/**
 * トークナイザ
 * 式を解析してトークン列に分解
 */
export class Tokenizer {
  private input: string = "";
  private position: number = 0;

  /**
   * 式をトークナイズ
   * @param input 式の文字列
   * @returns トークンの配列
   */
  tokenize(input: string): Token[] {
    this.input = input;
    this.position = 0;

    const tokens: Token[] = [];

    while (this.position < this.input.length) {
      this.skipWhitespace();

      if (this.position >= this.input.length) {
        break;
      }

      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    return tokens;
  }

  /**
   * 次のトークンを取得
   */
  private nextToken(): Token | null {
    const char = this.input[this.position];

    // 数値リテラル
    if (this.isDigit(char)) {
      return this.readNumber();
    }

    // 文字列リテラル
    if (char === '"' || char === "'") {
      return this.readString(char);
    }

    // 識別子またはキーワード
    if (this.isIdentifierStart(char)) {
      return this.readIdentifier();
    }

    // 演算子と記号
    return this.readOperatorOrSymbol();
  }

  /**
   * 数値を読み取り
   */
  private readNumber(): Token {
    const start = this.position;
    let value = "";

    // 負の数
    if (this.input[this.position] === "-") {
      value += "-";
      this.position++;
    }

    // 整数部分
    while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
      value += this.input[this.position];
      this.position++;
    }

    // 小数部分
    if (this.input[this.position] === ".") {
      value += ".";
      this.position++;

      while (this.position < this.input.length && this.isDigit(this.input[this.position])) {
        value += this.input[this.position];
        this.position++;
      }
    }

    return {
      type: TokenType.Number,
      value,
      position: start,
    };
  }

  /**
   * 文字列リテラルを読み取り
   */
  private readString(quote: string): Token {
    const start = this.position;
    this.position++; // 開始クォートをスキップ

    let value = "";

    while (this.position < this.input.length) {
      const char = this.input[this.position];

      if (char === quote) {
        this.position++; // 終了クォートをスキップ
        break;
      }

      // エスケープシーケンス
      if (char === "\\") {
        this.position++;
        if (this.position < this.input.length) {
          const escaped = this.input[this.position];
          switch (escaped) {
            case "n":
              value += "\n";
              break;
            case "t":
              value += "\t";
              break;
            case "\\":
              value += "\\";
              break;
            case '"':
              value += '"';
              break;
            case "'":
              value += "'";
              break;
            default:
              value += escaped;
          }
          this.position++;
        }
      } else {
        value += char;
        this.position++;
      }
    }

    return {
      type: TokenType.String,
      value,
      position: start,
    };
  }

  /**
   * 識別子またはキーワードを読み取り
   */
  private readIdentifier(): Token {
    const start = this.position;
    let value = "";

    while (
      this.position < this.input.length &&
      this.isIdentifierPart(this.input[this.position])
    ) {
      value += this.input[this.position];
      this.position++;
    }

    // キーワードチェック
    const keywords = ["true", "false", "if", "else", "while", "def", "sub", "return", "choice"];
    const type = keywords.includes(value) ? TokenType.Keyword : TokenType.Identifier;

    // Boolean特別処理
    if (value === "true" || value === "false") {
      return {
        type: TokenType.Boolean,
        value,
        position: start,
      };
    }

    return {
      type,
      value,
      position: start,
    };
  }

  /**
   * 演算子または記号を読み取り
   */
  private readOperatorOrSymbol(): Token {
    const start = this.position;
    const char = this.input[this.position];

    // 2文字演算子をチェック
    if (this.position + 1 < this.input.length) {
      const twoChar = char + this.input[this.position + 1];

      // 代入演算子
      if (["+=", "-=", "*=", "/="].includes(twoChar)) {
        this.position += 2;
        return {
          type: TokenType.Assign,
          value: twoChar,
          position: start,
        };
      }

      // 比較演算子
      if (["==", "!=", ">=", "<="].includes(twoChar)) {
        this.position += 2;
        return {
          type: TokenType.Operator,
          value: twoChar,
          position: start,
        };
      }

      // 論理演算子
      if (["&&", "||"].includes(twoChar)) {
        this.position += 2;
        return {
          type: TokenType.Operator,
          value: twoChar,
          position: start,
        };
      }
    }

    // 1文字演算子・記号
    this.position++;

    // 代入
    if (char === "=") {
      return {
        type: TokenType.Assign,
        value: char,
        position: start,
      };
    }

    // 演算子
    if (["+", "-", "*", "/", "%", ">", "<", "!"].includes(char)) {
      return {
        type: TokenType.Operator,
        value: char,
        position: start,
      };
    }

    // 括弧
    if (char === "(") {
      return {
        type: TokenType.LeftParen,
        value: char,
        position: start,
      };
    }

    if (char === ")") {
      return {
        type: TokenType.RightParen,
        value: char,
        position: start,
      };
    }

    if (char === "{") {
      return {
        type: TokenType.LeftBrace,
        value: char,
        position: start,
      };
    }

    if (char === "}") {
      return {
        type: TokenType.RightBrace,
        value: char,
        position: start,
      };
    }

    // カンマ
    if (char === ",") {
      return {
        type: TokenType.Comma,
        value: char,
        position: start,
      };
    }

    // 未知のトークン
    throw new Error(`Unknown character at position ${start}: ${char}`);
  }

  /**
   * 空白をスキップ
   */
  private skipWhitespace(): void {
    while (
      this.position < this.input.length &&
      /\s/.test(this.input[this.position])
    ) {
      this.position++;
    }
  }

  /**
   * 数字かどうか
   */
  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  /**
   * 識別子の開始文字かどうか
   */
  private isIdentifierStart(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
  }

  /**
   * 識別子の一部かどうか
   */
  private isIdentifierPart(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }
}
