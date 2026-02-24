import { LineType } from "../types/LineType.js";
import type { ChoiceNode, ChoiceOptionNode } from "../types/Choice.js";

/**
 * 構文解析器
 * Phase 1: 行分類とセリフブロック検出のみ実装
 */
export class Parser {
  /**
   * 行の種別を判定
   * @param line トリム済みの行
   */
  classifyLine(line: string): LineType {
    if (line === "") {
      return LineType.Empty;
    }

    const firstChar = line[0];

    if (firstChar === "#") {
      // セリフ開始: #キャラ名
      // セリフ終了: # (単体)
      return line.length === 1 ? LineType.DialogueEnd : LineType.DialogueStart;
    }

    if (firstChar === "*") {
      // ラベル定義: *ラベル名
      return LineType.Label;
    }

    if (line.startsWith("//")) {
      // コメント: // ...
      return LineType.Comment;
    }

    // それ以外はJS式/文
    return LineType.Expression;
  }

  /**
   * セリフブロックの終了位置を検索
   * @param lines 全行の配列
   * @param start セリフ開始行のインデックス
   * @returns セリフ終了行 (#) のインデックス、見つからない場合は lines.length
   */
  findDialogueEnd(lines: string[], start: number): number {
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "#") {
        return i;
      }
    }
    return lines.length;
  }

  /**
   * ラベル名を抽出
   * @param line ラベル行 (例: "*オープニング")
   * @returns ラベル名
   */
  extractLabelName(line: string): string {
    // "*" の後の文字列を取得（前後の空白をトリム）
    return line.slice(1).trim();
  }

  /**
   * セリフ開始行から話者名を抽出
   * @param line セリフ開始行 (例: "#hero")
   * @returns 話者名
   */
  extractSpeaker(line: string): string {
    // "#" の後の文字列を取得（前後の空白をトリム）
    return line.slice(1).trim();
  }

  /**
   * ブロック（{ ... }）の終了位置を検索
   * Phase 1では未実装、Phase 4で実装予定
   * @param lines 全行の配列
   * @param start ブロック開始行のインデックス
   * @returns ブロック終了行 (}) のインデックス
   */
  findBlockEnd(lines: string[], start: number): number {
    // Phase 1では簡易実装
    // Phase 4で v2.1 の書式制約に従った実装を追加
    let braceCount = 0;
    let foundFirstBrace = false;

    for (let i = start; i < lines.length; i++) {
      const line = lines[i].trim();

      // セリフブロック内は無視
      if (line.startsWith("#") && line !== "#") {
        const endIdx = this.findDialogueEnd(lines, i);
        i = endIdx;
        continue;
      }

      for (const char of line) {
        if (char === "{") {
          braceCount++;
          foundFirstBrace = true;
        } else if (char === "}") {
          braceCount--;
          if (foundFirstBrace && braceCount === 0) {
            return i;
          }
        }
      }
    }

    return lines.length - 1;
  }

  /**
   * スクリプト全体をスキャンしてラベルマップを構築
   * @param lines 全行の配列
   * @returns ラベル名 → 行番号のマップ
   */
  buildLabelMap(lines: string[]): Map<string, number> {
    const labelMap = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (this.classifyLine(line) === LineType.Label) {
        const labelName = this.extractLabelName(line);
        labelMap.set(labelName, i);
      }
    }

    return labelMap;
  }

  /**
   * def/sub 関数定義をパース
   * @param lines 全行の配列
   * @param start def/sub開始行のインデックス
   * @returns FunctionDef
   */
  parseFunctionDef(lines: string[], start: number): import("./GameState.js").FunctionDef {
    const line = lines[start].trim();

    // "def name(params) {" または "sub name(params) {" の形式
    const match = line.match(/^(def|sub)\s+(\w+)\s*\(([^)]*)\)\s*\{$/);
    if (!match) {
      throw new Error(`[KNF Error] Line ${start + 1}: 関数定義の構文が正しくありません`);
    }

    const name = match[2];
    const paramsStr = match[3].trim();
    const params = paramsStr.length > 0 ? paramsStr.split(",").map((p) => p.trim()) : [];

    // ブロックの終了位置を検索
    const bodyStart = start + 1;
    const bodyEnd = this.findBlockEnd(lines, start);

    return {
      name,
      params,
      bodyStart,
      bodyEnd: bodyEnd - 1, // findBlockEndは"}"の行を返すので、bodyは1つ前まで
    };
  }

  /**
   * choice構文をパース
   * @param lines 全行の配列
   * @param start choice開始行のインデックス
   * @returns ChoiceNode
   */
  parseChoice(lines: string[], start: number): ChoiceNode {
    const options: ChoiceOptionNode[] = [];
    let i = start + 1; // "choice {" の次の行から

    while (i < lines.length) {
      const line = lines[i].trim();

      // choice終了
      if (line === "}") {
        return {
          options,
          end: i,
        };
      }

      // 空行・コメントはスキップ
      if (line === "" || line.startsWith("//")) {
        i++;
        continue;
      }

      // 選択肢: "テキスト" [if (条件)] {
      const optionMatch = line.match(/^"([^"]+)"\s*(if\s*\((.+)\))?\s*\{$/);
      if (optionMatch) {
        const text = optionMatch[1];
        const condition = optionMatch[3]; // if (条件) の条件部分

        // ブロックの終了位置を検索
        const bodyStart = i + 1;
        const bodyEnd = this.findBlockEnd(lines, i);

        options.push({
          text,
          condition,
          bodyStart,
          bodyEnd,
        });

        i = bodyEnd + 1;
        continue;
      }

      throw new Error(`[KNF Error] Line ${i + 1}: choice構文の選択肢が正しくありません`);
    }

    throw new Error(`[KNF Error] choice構文が閉じられていません`);
  }
}
