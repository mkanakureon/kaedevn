import { describe, it, expect, beforeEach } from "vitest";
import { Interpreter } from "../src/core/Interpreter.js";

// Mock Engine
class MockEngine {
  async showDialogue() {}
  async setBg() {}
  async showChar() {}
  async hideChar() {}
  async moveChar() {}
  playBgm() {}
  stopBgm() {}
  async fadeBgm() {}
  playSe() {}
  async playTimeline() {}
  async showChoice() {
    return 0;
  }
  async waitForClick() {}
  async wait() {}
}

describe("Phase 7: Error Handling", () => {
  let interpreter: Interpreter;
  let engine: MockEngine;

  beforeEach(() => {
    engine = new MockEngine();
    interpreter = new Interpreter(engine);
  });

  describe("未定義変数エラー", () => {
    it("類似変数名を提案する", async () => {
      const script = `
affection = 5
result = afection + 1
`;

      try {
        await interpreter.run(script);
        expect.fail("エラーが発生すべき");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("未定義の変数: afection");
        expect(message).toContain("affection");
      }
    });

    it("スタックトレースを表示する", async () => {
      const script = `
def foo() {
  return bar + 1
}

result = foo()
`;

      try {
        await interpreter.run(script);
        expect.fail("エラーが発生すべき");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("未定義の変数: bar");
        expect(message).toContain("at");
      }
    });

    it("エラー発生箇所のコンテキストを表示する", async () => {
      const script = `
x = 10
y = 20
result = z + 1
`;

      try {
        await interpreter.run(script);
        expect.fail("エラーが発生すべき");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("未定義の変数: z");
        // コンテキストに行番号とコードが含まれる
        expect(message).toContain("result = z + 1");
      }
    });
  });

  describe("未定義関数エラー", () => {
    it("類似関数名を提案する", async () => {
      const script = `
def factorial(n) {
  if (n <= 1) {
    return 1
  }
  return n * factrial(n - 1)
}

result = factorial(5)
`;

      try {
        await interpreter.run(script);
        expect.fail("エラーが発生すべき");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("未定義の関数: factrial");
        expect(message).toContain("factorial");
      }
    });
  });

  describe("0除算エラー", () => {
    it("0除算エラーメッセージを表示する", async () => {
      const script = `
score = 100
bonus = 0
result = score / bonus
`;

      try {
        await interpreter.run(script);
        expect.fail("エラーが発生すべき");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("0除算");
      }
    });
  });

  describe("スタックオーバーフロー", () => {
    it("再帰深度超過を検出する", async () => {
      const script = `
def infinite() {
  return infinite()
}

result = infinite()
`;

      try {
        await interpreter.run(script);
        expect.fail("エラーが発生すべき");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("再帰");
        expect(message).toContain("16");
      }
    });
  });
});
