import { describe, it, expect } from "vitest";
import { Evaluator } from "../src/core/Evaluator.js";
import { GameState } from "../src/core/GameState.js";

describe("Phase 3: 変数と式評価", () => {
  describe("Evaluator - リテラル", () => {
    const evaluator = new Evaluator();
    const state = new GameState();

    it("数値リテラルを評価できる", async () => {
      expect(await evaluator.evaluate("42", state)).toBe(42);
      expect(await evaluator.evaluate("3.14", state)).toBe(3.14);
      expect(await evaluator.evaluate("-10", state)).toBe(-10);
    });

    it("文字列リテラルを評価できる", async () => {
      expect(await evaluator.evaluate('"hello"', state)).toBe("hello");
      expect(await evaluator.evaluate("'world'", state)).toBe("world");
    });

    it("真偽値リテラルを評価できる", async () => {
      expect(await evaluator.evaluate("true", state)).toBe(true);
      expect(await evaluator.evaluate("false", state)).toBe(false);
    });
  });

  describe("Evaluator - 算術演算", () => {
    const evaluator = new Evaluator();
    const state = new GameState();

    it("加算を評価できる", async () => {
      expect(await evaluator.evaluate("1 + 2", state)).toBe(3);
      expect(await evaluator.evaluate("10 + 20 + 30", state)).toBe(60);
    });

    it("減算を評価できる", async () => {
      expect(await evaluator.evaluate("5 - 3", state)).toBe(2);
      expect(await evaluator.evaluate("10 - 3 - 2", state)).toBe(5);
    });

    it("乗算を評価できる", async () => {
      expect(await evaluator.evaluate("3 * 4", state)).toBe(12);
      expect(await evaluator.evaluate("2 * 3 * 4", state)).toBe(24);
    });

    it("除算を評価できる", async () => {
      expect(await evaluator.evaluate("10 / 2", state)).toBe(5);
      expect(await evaluator.evaluate("20 / 4 / 2", state)).toBe(2.5);
    });

    it("剰余を評価できる", async () => {
      expect(await evaluator.evaluate("10 % 3", state)).toBe(1);
      expect(await evaluator.evaluate("15 % 4", state)).toBe(3);
    });

    it("演算子の優先順位が正しい", async () => {
      expect(await evaluator.evaluate("2 + 3 * 4", state)).toBe(14);
      expect(await evaluator.evaluate("10 - 6 / 2", state)).toBe(7);
    });

    it("括弧によるグループ化", async () => {
      expect(await evaluator.evaluate("(2 + 3) * 4", state)).toBe(20);
      expect(await evaluator.evaluate("10 / (2 + 3)", state)).toBe(2);
    });

    it("負数の単項演算", async () => {
      expect(await evaluator.evaluate("-5", state)).toBe(-5);
      expect(await evaluator.evaluate("-(3 + 2)", state)).toBe(-5);
    });
  });

  describe("Evaluator - 比較演算", () => {
    const evaluator = new Evaluator();
    const state = new GameState();

    it("等値比較", async () => {
      expect(await evaluator.evaluate("5 == 5", state)).toBe(true);
      expect(await evaluator.evaluate("5 == 3", state)).toBe(false);
    });

    it("不等値比較", async () => {
      expect(await evaluator.evaluate("5 != 3", state)).toBe(true);
      expect(await evaluator.evaluate("5 != 5", state)).toBe(false);
    });

    it("大小比較", async () => {
      expect(await evaluator.evaluate("5 > 3", state)).toBe(true);
      expect(await evaluator.evaluate("3 >= 3", state)).toBe(true);
      expect(await evaluator.evaluate("2 < 5", state)).toBe(true);
      expect(await evaluator.evaluate("5 <= 5", state)).toBe(true);
    });
  });

  describe("Evaluator - 論理演算", () => {
    const evaluator = new Evaluator();
    const state = new GameState();

    it("AND演算", async () => {
      expect(await evaluator.evaluate("true && true", state)).toBe(true);
      expect(await evaluator.evaluate("true && false", state)).toBe(false);
    });

    it("OR演算", async () => {
      expect(await evaluator.evaluate("true || false", state)).toBe(true);
      expect(await evaluator.evaluate("false || false", state)).toBe(false);
    });

    it("NOT演算", async () => {
      expect(await evaluator.evaluate("!true", state)).toBe(false);
      expect(await evaluator.evaluate("!false", state)).toBe(true);
    });

    it("複合論理式", async () => {
      expect(await evaluator.evaluate("(5 > 3) && (2 < 4)", state)).toBe(true);
      expect(await evaluator.evaluate("(5 < 3) || (2 < 4)", state)).toBe(true);
    });
  });

  describe("Evaluator - 変数", () => {
    const evaluator = new Evaluator();
    const state = new GameState();

    it("変数を設定して参照できる", async () => {
      state.setVar("x", 42);
      expect(await evaluator.evaluate("x", state)).toBe(42);
    });

    it("変数を使った計算", async () => {
      state.setVar("x", 10);
      state.setVar("y", 20);
      expect(await evaluator.evaluate("x + y", state)).toBe(30);
    });

    it("未定義変数の参照はエラー (v2.1)", async () => {
      const state2 = new GameState();
      await expect(evaluator.evaluate("undefined_var", state2)).rejects.toThrow(
        "未定義の変数"
      );
    });
  });

  describe("Evaluator - 代入", () => {
    const evaluator = new Evaluator();

    it("単純な代入", async () => {
      const state = new GameState();
      await evaluator.executeAssignment("x = 42", state);
      expect(state.getVar("x")).toBe(42);
    });

    it("式の代入", async () => {
      const state = new GameState();
      await evaluator.executeAssignment("x = 10 + 20", state);
      expect(state.getVar("x")).toBe(30);
    });

    it("複合代入演算子 +=", async () => {
      const state = new GameState();
      state.setVar("x", 10);
      await evaluator.executeAssignment("x += 5", state);
      expect(state.getVar("x")).toBe(15);
    });

    it("複合代入演算子 -=", async () => {
      const state = new GameState();
      state.setVar("x", 100);
      await evaluator.executeAssignment("x -= 20", state);
      expect(state.getVar("x")).toBe(80);
    });

    it("複合代入演算子 *=", async () => {
      const state = new GameState();
      state.setVar("x", 10);
      await evaluator.executeAssignment("x *= 2", state);
      expect(state.getVar("x")).toBe(20);
    });

    it("複合代入演算子 /=", async () => {
      const state = new GameState();
      state.setVar("x", 100);
      await evaluator.executeAssignment("x /= 4", state);
      expect(state.getVar("x")).toBe(25);
    });

    it("未定義変数への複合代入は0で初期化 (v2.1)", async () => {
      const state = new GameState();
      await evaluator.executeAssignment("y += 1", state);
      expect(state.getVar("y")).toBe(1);
    });
  });

  describe("Evaluator - 文字列操作", () => {
    const evaluator = new Evaluator();
    const state = new GameState();

    it("文字列の結合", async () => {
      expect(await evaluator.evaluate('"hello" + "world"', state)).toBe(
        "helloworld"
      );
    });

    it("文字列と数値の結合", async () => {
      state.setVar("score", 100);
      expect(await evaluator.evaluate('"Score: " + score', state)).toBe(
        "Score: 100"
      );
    });
  });

  describe("Evaluator - 複雑な式", () => {
    const evaluator = new Evaluator();
    const state = new GameState();

    it("複雑な数式", async () => {
      state.setVar("a", 5);
      state.setVar("b", 10);
      expect(await evaluator.evaluate("(a + b) * 2", state)).toBe(30);
    });

    it("複雑な論理式", async () => {
      state.setVar("x", 5);
      state.setVar("y", 10);
      expect(await evaluator.evaluate("(x > 3) && (y < 15)", state)).toBe(
        true
      );
    });
  });
});
