import { describe, it, expect, beforeEach } from "vitest";
import { Interpreter } from "../src/core/Interpreter.js";
import type { IEngineAPI, ChoiceOption } from "../src/engine/IEngineAPI.js";

// モックエンジンAPI
class MockEngineAPI implements IEngineAPI {
  calls: Array<{ method: string; args: unknown[] }> = [];

  async showDialogue(speaker: string, lines: string[]): Promise<void> {
    this.calls.push({ method: "showDialogue", args: [speaker, lines] });
  }

  async setBg(name: string, effect?: string): Promise<void> {
    this.calls.push({ method: "showBg", args: [name, effect] });
  }

  async showChar(name: string, pose: string, position?: string): Promise<void> {
    this.calls.push({ method: "showChar", args: [name, pose, position] });
  }

  async hideChar(name: string): Promise<void> {
    this.calls.push({ method: "hideChar", args: [name] });
  }

  async moveChar(name: string, position: string, time: number): Promise<void> {
    this.calls.push({ method: "moveChar", args: [name, position, time] });
  }

  playBgm(name: string): void {
    this.calls.push({ method: "playBgm", args: [name] });
  }

  stopBgm(): void {
    this.calls.push({ method: "stopBgm", args: [] });
  }

  async fadeBgm(time: number): Promise<void> {
    this.calls.push({ method: "fadeBgm", args: [time] });
  }

  playSe(name: string): void {
    this.calls.push({ method: "playSe", args: [name] });
  }

  async playTimeline(name: string): Promise<void> {
    this.calls.push({ method: "playTimeline", args: [name] });
  }

  async showChoice(options: ChoiceOption[]): Promise<number> {
    this.calls.push({ method: "showChoice", args: [options] });
    return 0;
  }

  async waitForClick(): Promise<void> {
    this.calls.push({ method: "waitForClick", args: [] });
  }

  async wait(ms: number): Promise<void> {
    this.calls.push({ method: "wait", args: [ms] });
  }

  reset(): void {
    this.calls = [];
  }
}

describe("Phase 5: 関数とサブルーチン", () => {
  let engine: MockEngineAPI;
  let interpreter: Interpreter;

  beforeEach(() => {
    engine = new MockEngineAPI();
    interpreter = new Interpreter(engine);
  });

  describe("def (関数定義)", () => {
    it("値を返す関数を定義して呼び出せる", async () => {
      const script = `
def double(x) {
  return x * 2
}

result = double(5)
`;

      await interpreter.run(script);

      const state = interpreter.getState();
      expect(state.variables.result).toBe(10);
    });

    it("複数の引数を受け取れる", async () => {
      const script = `
def add(a, b) {
  return a + b
}

result = add(3, 7)
`;

      await interpreter.run(script);

      const state = interpreter.getState();
      expect(state.variables.result).toBe(10);
    });

    it("引数なしの関数を定義できる", async () => {
      const script = `
def getMessage() {
  return "Hello"
}

msg = getMessage()
`;

      await interpreter.run(script);

      const state = interpreter.getState();
      expect(state.variables.msg).toBe("Hello");
    });

    it("条件分岐を含む関数", async () => {
      const script = `
def mood(affection) {
  if (affection >= 8) {
    return "happy"
  } else if (affection >= 4) {
    return "normal"
  } else {
    return "sad"
  }
}

result1 = mood(9)
result2 = mood(5)
result3 = mood(2)
`;

      await interpreter.run(script);

      const state = interpreter.getState();
      expect(state.variables.result1).toBe("happy");
      expect(state.variables.result2).toBe("normal");
      expect(state.variables.result3).toBe("sad");
    });

    it("ローカル変数はグローバルに影響しない", async () => {
      const script = `
x = 10

def setLocal(val) {
  x = val
  return x
}

result = setLocal(5)
`;

      await interpreter.run(script);

      const state = interpreter.getState();
      expect(state.variables.result).toBe(5);
      expect(state.variables.x).toBe(5); // setLocalでグローバルxが変更される
    });
  });

  describe("sub (サブルーチン定義)", () => {
    it("サブルーチンを定義して呼び出せる", async () => {
      const script = `
sub greeting() {
  bg("school")
}

greeting()
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "showBg");
      expect(bgCalls).toHaveLength(1);
      expect(bgCalls[0].args[0]).toBe("school");
    });

    it("引数を受け取るサブルーチン", async () => {
      const script = `
sub setBgWithName(name) {
  bg(name)
}

setBgWithName("classroom")
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "showBg");
      expect(bgCalls).toHaveLength(1);
      expect(bgCalls[0].args[0]).toBe("classroom");
    });

    it("サブルーチン内で変数を変更できる", async () => {
      const script = `
score = 0

sub addScore(points) {
  score = score + points
}

addScore(10)
addScore(5)
`;

      await interpreter.run(script);

      const state = interpreter.getState();
      expect(state.variables.score).toBe(15);
    });
  });

  describe("エラーケース", () => {
    it("組み込み関数名で関数を定義するとエラー", async () => {
      const script = `
def bg(x) {
  return x
}
`;

      await expect(interpreter.run(script)).rejects.toThrow("組み込み関数名");
    });

    it("未定義の関数を呼ぶとエラー", async () => {
      const script = `
result = unknownFunc()
`;

      await expect(interpreter.run(script)).rejects.toThrow("未定義の関数");
    });

    it("引数の数が一致しないとエラー", async () => {
      const script = `
def add(a, b) {
  return a + b
}

result = add(5)
`;

      await expect(interpreter.run(script)).rejects.toThrow("引数の数が一致しません");
    });

    it("sub内でreturn値を返すとエラー", async () => {
      const script = `
sub invalid() {
  return 10
}

invalid()
`;

      await expect(interpreter.run(script)).rejects.toThrow(
        "サブルーチン内では値を返すreturnは使用できません"
      );
    });

    it("関数外でreturnするとエラー", async () => {
      const script = `
return 5
`;

      await expect(interpreter.run(script)).rejects.toThrow(
        "関数/サブルーチン内でのみ使用できます"
      );
    });
  });

  describe("高度な機能", () => {
    it("再帰呼び出しが動作する", async () => {
      const script = `
def factorial(n) {
  if (n <= 1) {
    return 1
  }
  return n * factorial(n - 1)
}

result = factorial(5)
`;

      await interpreter.run(script);

      const state = interpreter.getState();
      expect(state.variables.result).toBe(120);
    });

    it("関数内から組み込み関数を呼べる", async () => {
      const script = `
sub showScene(bgName) {
  bg(bgName)
  wait(100)
}

showScene("classroom")
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "showBg");
      const waitCalls = engine.calls.filter((c) => c.method === "wait");
      expect(bgCalls).toHaveLength(1);
      expect(waitCalls).toHaveLength(1);
    });

    it("関数内で他のユーザー関数を呼べる", async () => {
      const script = `
def double(x) {
  return x * 2
}

def quadruple(x) {
  return double(double(x))
}

result = quadruple(3)
`;

      await interpreter.run(script);

      const state = interpreter.getState();
      expect(state.variables.result).toBe(12);
    });
  });
});
