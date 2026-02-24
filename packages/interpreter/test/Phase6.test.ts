import { describe, it, expect } from "vitest";
import { Evaluator } from "../src/core/Evaluator.js";
import { GameState } from "../src/core/GameState.js";

describe("Phase 6: 文字列補間", () => {
  describe("基本的な補間", () => {
    const evaluator = new Evaluator();

    it("変数を補間できる", async () => {
      const state = new GameState();
      state.setVar("name", "太郎");
      const result = await evaluator.interpolate("こんにちは、{name}です", state);
      expect(result).toBe("こんにちは、太郎です");
    });

    it("数値を補間できる", async () => {
      const state = new GameState();
      state.setVar("score", 100);
      const result = await evaluator.interpolate("スコアは{score}点です", state);
      expect(result).toBe("スコアは100点です");
    });

    it("真偽値を補間できる", async () => {
      const state = new GameState();
      state.setVar("flag", true);
      const result = await evaluator.interpolate("フラグは{flag}です", state);
      expect(result).toBe("フラグはtrueです");
    });
  });

  describe("式の補間", () => {
    const evaluator = new Evaluator();

    it("算術式を補間できる", async () => {
      const state = new GameState();
      state.setVar("score", 50);
      const result = await evaluator.interpolate(
        "2倍すると{score * 2}点です",
        state
      );
      expect(result).toBe("2倍すると100点です");
    });

    it("比較式を補間できる", async () => {
      const state = new GameState();
      state.setVar("affection", 8);
      const result = await evaluator.interpolate(
        "好感度は高い: {affection >= 5}",
        state
      );
      expect(result).toBe("好感度は高い: true");
    });

    it("文字列結合を補間できる", async () => {
      const state = new GameState();
      state.setVar("firstName", "山田");
      state.setVar("lastName", " 太郎");
      const result = await evaluator.interpolate(
        "名前は{firstName + lastName}です",
        state
      );
      expect(result).toBe("名前は山田 太郎です");
    });
  });

  describe("複数の補間", () => {
    const evaluator = new Evaluator();

    it("1行に複数の補間を含められる", async () => {
      const state = new GameState();
      state.setVar("name", "太郎");
      state.setVar("age", 16);
      const result = await evaluator.interpolate(
        "僕は{name}、{age}歳です",
        state
      );
      expect(result).toBe("僕は太郎、16歳です");
    });

    it("複数行でそれぞれ補間できる", async () => {
      const state = new GameState();
      state.setVar("name", "太郎");
      const result = await evaluator.interpolate("僕は{name}です", state);
      expect(result).toBe("僕は太郎です");
    });
  });

  describe("エラーケース", () => {
    const evaluator = new Evaluator();

    it("未定義変数の補間はエラー", async () => {
      const state = new GameState();
      await expect(
        evaluator.interpolate("値は{undefined_var}です", state)
      ).rejects.toThrow();
    });

    it("式の評価エラーを検出", async () => {
      const state = new GameState();
      state.setVar("x", 10);
      await expect(
        evaluator.interpolate("結果は{x / 0}です", state)
      ).rejects.toThrow();
    });
  });
});
