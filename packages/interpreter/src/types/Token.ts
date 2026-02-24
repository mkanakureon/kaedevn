/**
 * トークン型
 */
export enum TokenType {
  // リテラル
  Number = "Number",
  String = "String",
  Boolean = "Boolean",
  Identifier = "Identifier",

  // 演算子
  Operator = "Operator",
  Assign = "Assign",

  // 括弧
  LeftParen = "LeftParen",
  RightParen = "RightParen",
  LeftBrace = "LeftBrace",
  RightBrace = "RightBrace",

  // 区切り
  Comma = "Comma",

  // キーワード
  Keyword = "Keyword",
}

/**
 * トークン
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}
