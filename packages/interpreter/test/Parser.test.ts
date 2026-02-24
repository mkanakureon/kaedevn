import { describe, it, expect } from "vitest";
import { Parser } from "../src/core/Parser.js";
import { LineType } from "../src/types/LineType.js";

describe("Parser", () => {
  const parser = new Parser();

  describe("classifyLine", () => {
    it("空行を判定できる", () => {
      expect(parser.classifyLine("")).toBe(LineType.Empty);
    });

    it("コメントを判定できる", () => {
      expect(parser.classifyLine("// これはコメント")).toBe(LineType.Comment);
    });

    it("ラベルを判定できる", () => {
      expect(parser.classifyLine("*オープニング")).toBe(LineType.Label);
      expect(parser.classifyLine("*chapter1")).toBe(LineType.Label);
    });

    it("セリフ開始を判定できる", () => {
      expect(parser.classifyLine("#hero")).toBe(LineType.DialogueStart);
      expect(parser.classifyLine("#主人公")).toBe(LineType.DialogueStart);
    });

    it("セリフ終了を判定できる", () => {
      expect(parser.classifyLine("#")).toBe(LineType.DialogueEnd);
    });

    it("JS式を判定できる", () => {
      expect(parser.classifyLine('bg("school")')).toBe(LineType.Expression);
      expect(parser.classifyLine("affection = 0")).toBe(LineType.Expression);
      expect(parser.classifyLine("if (affection >= 5) {")).toBe(LineType.Expression);
    });
  });

  describe("extractLabelName", () => {
    it("ラベル名を抽出できる", () => {
      expect(parser.extractLabelName("*オープニング")).toBe("オープニング");
      expect(parser.extractLabelName("*chapter1")).toBe("chapter1");
      expect(parser.extractLabelName("* 告白シーン ")).toBe("告白シーン");
    });
  });

  describe("extractSpeaker", () => {
    it("話者名を抽出できる", () => {
      expect(parser.extractSpeaker("#hero")).toBe("hero");
      expect(parser.extractSpeaker("#主人公")).toBe("主人公");
      expect(parser.extractSpeaker("# さくら ")).toBe("さくら");
    });
  });

  describe("buildLabelMap", () => {
    it("ラベルマップを構築できる", () => {
      const lines = [
        "*start",
        'bg("school")',
        "#hero",
        "こんにちは",
        "#",
        "*chapter1",
        "#hero",
        "第1章",
        "#",
      ];

      const labelMap = parser.buildLabelMap(lines);

      expect(labelMap.get("start")).toBe(0);
      expect(labelMap.get("chapter1")).toBe(5);
      expect(labelMap.size).toBe(2);
    });
  });

  describe("findDialogueEnd", () => {
    it("セリフ終了位置を検索できる", () => {
      const lines = [
        "#hero",
        "こんにちは",
        "良い天気ですね",
        "#",
        'bg("school")',
      ];

      const endIdx = parser.findDialogueEnd(lines, 0);
      expect(endIdx).toBe(3);
    });

    it("セリフ終了タグがない場合は末尾を返す", () => {
      const lines = [
        "#hero",
        "こんにちは",
        "良い天気ですね",
      ];

      const endIdx = parser.findDialogueEnd(lines, 0);
      expect(endIdx).toBe(3);
    });
  });
});
