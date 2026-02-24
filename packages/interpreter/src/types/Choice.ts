/**
 * choice構文の選択肢
 */
export interface ChoiceOptionNode {
  /** 選択肢のテキスト */
  text: string;

  /** 表示条件（オプション） */
  condition?: string;

  /** ブロックの開始行 */
  bodyStart: number;

  /** ブロックの終了行 */
  bodyEnd: number;
}

/**
 * choice構文のノード
 */
export interface ChoiceNode {
  /** 選択肢の配列 */
  options: ChoiceOptionNode[];

  /** choice全体の終了行 */
  end: number;
}
