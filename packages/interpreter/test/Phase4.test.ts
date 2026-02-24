import { describe, it, expect, beforeEach } from "vitest";
import { Interpreter } from "../src/core/Interpreter.js";
import type { IEngineAPI, ChoiceOption } from "../src/engine/IEngineAPI.js";

// モックエンジンAPI
class MockEngineAPI implements IEngineAPI {
  calls: Array<{ method: string; args: unknown[] }> = [];
  choiceResults: number[] = [0]; // デフォルトは最初の選択肢
  choiceIndex: number = 0;

  async showDialogue(speaker: string, lines: string[]): Promise<void> {
    this.calls.push({ method: "showDialogue", args: [speaker, lines] });
  }

  async setBg(name: string, effect?: string): Promise<void> {
    this.calls.push({ method: "setBg", args: [name, effect] });
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
    const result = this.choiceResults[this.choiceIndex] || 0;
    this.choiceIndex++;
    return result;
  }

  async waitForClick(): Promise<void> {
    this.calls.push({ method: "waitForClick", args: [] });
  }

  async wait(ms: number): Promise<void> {
    this.calls.push({ method: "wait", args: [ms] });
  }

  reset(): void {
    this.calls = [];
    this.choiceIndex = 0;
  }

  setChoiceResults(results: number[]): void {
    this.choiceResults = results;
    this.choiceIndex = 0;
  }
}

describe("Phase 4: if文とchoice", () => {
  let engine: MockEngineAPI;
  let interpreter: Interpreter;

  beforeEach(() => {
    engine = new MockEngineAPI();
    interpreter = new Interpreter(engine);
  });

  describe("if文", () => {
    it("条件が真の場合、ifブロックを実行", async () => {
      const script = `
x = 10

if (x >= 5) {
  bg("true_branch")
}
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "setBg");
      expect(bgCalls).toHaveLength(1);
      expect(bgCalls[0].args[0]).toBe("true_branch");
    });

    it("条件が偽の場合、ifブロックをスキップ", async () => {
      const script = `
x = 3

if (x >= 5) {
  bg("true_branch")
}

bg("after_if")
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "setBg");
      expect(bgCalls).toHaveLength(1);
      expect(bgCalls[0].args[0]).toBe("after_if");
    });

    it("if-else文が動作する", async () => {
      const script = `
x = 3

if (x >= 5) {
  bg("true_branch")
} else {
  bg("false_branch")
}
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "setBg");
      expect(bgCalls).toHaveLength(1);
      expect(bgCalls[0].args[0]).toBe("false_branch");
    });

    it("if-else if-else文が動作する", async () => {
      const script = `
x = 5

if (x >= 8) {
  bg("branch1")
} else if (x >= 5) {
  bg("branch2")
} else {
  bg("branch3")
}
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "setBg");
      expect(bgCalls).toHaveLength(1);
      expect(bgCalls[0].args[0]).toBe("branch2");
    });

    it("ifブロック内でセリフを表示できる", async () => {
      const script = `
affection = 8

if (affection >= 5) {
  #heroine
  好感度が高いわね
  #
}
`;

      await interpreter.run(script);

      const dialogueCalls = engine.calls.filter((c) => c.method === "showDialogue");
      expect(dialogueCalls).toHaveLength(1);
      expect(dialogueCalls[0].args[0]).toBe("heroine");
    });

    it("複雑な条件式を評価できる", async () => {
      const script = `
affection = 8
flag = true

if (affection >= 8 && flag) {
  bg("true_branch")
}
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "setBg");
      expect(bgCalls).toHaveLength(1);
      expect(bgCalls[0].args[0]).toBe("true_branch");
    });
  });

  describe("choice", () => {
    it("選択肢を表示して分岐できる", async () => {
      engine.setChoiceResults([0]); // 最初の選択肢を選ぶ

      const script = `
bg("start")

choice {
  "選択肢A" {
    bg("choice_a")
  }
  "選択肢B" {
    bg("choice_b")
  }
}

bg("end")
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "setBg");
      expect(bgCalls[0].args[0]).toBe("start");
      expect(bgCalls[1].args[0]).toBe("choice_a");
      expect(bgCalls[2].args[0]).toBe("end");
    });

    it("2番目の選択肢を選べる", async () => {
      engine.setChoiceResults([1]); // 2番目の選択肢を選ぶ

      const script = `
choice {
  "選択肢A" {
    bg("choice_a")
  }
  "選択肢B" {
    bg("choice_b")
  }
}
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "setBg");
      expect(bgCalls).toHaveLength(1);
      expect(bgCalls[0].args[0]).toBe("choice_b");
    });

    it("条件付き選択肢が動作する", async () => {
      engine.setChoiceResults([0]); // 最初の表示される選択肢を選ぶ

      const script = `
affection = 8

choice {
  "選択肢A" if (affection >= 5) {
    bg("choice_a")
  }
  "選択肢B" if (affection >= 10) {
    bg("choice_b")
  }
  "選択肢C" {
    bg("choice_c")
  }
}
`;

      await interpreter.run(script);

      // 選択肢Bは条件を満たさないので非表示
      // 表示されるのは A と C
      const choiceCalls = engine.calls.filter((c) => c.method === "showChoice");
      expect(choiceCalls).toHaveLength(1);
      const options = choiceCalls[0].args[0] as ChoiceOption[];
      expect(options).toHaveLength(2);
      expect(options[0].text).toBe("選択肢A");
      expect(options[1].text).toBe("選択肢C");

      // 最初の選択肢（A）が選ばれる
      const bgCalls = engine.calls.filter((c) => c.method === "setBg");
      expect(bgCalls[0].args[0]).toBe("choice_a");
    });

    it("選択肢内で変数を変更できる", async () => {
      engine.setChoiceResults([0]);

      const script = `
score = 0

choice {
  "加点" {
    score += 10
  }
  "減点" {
    score -= 5
  }
}

if (score > 0) {
  bg("positive")
}
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "setBg");
      expect(bgCalls).toHaveLength(1);
      expect(bgCalls[0].args[0]).toBe("positive");
    });

    it("選択肢内でjumpできる", async () => {
      engine.setChoiceResults([0]);

      const script = `
choice {
  "ルートA" {
    jump("route_a")
  }
  "ルートB" {
    jump("route_b")
  }
}

*route_a
bg("route_a")
jump("end")

*route_b
bg("route_b")
jump("end")

*end
`;

      await interpreter.run(script);

      const bgCalls = engine.calls.filter((c) => c.method === "setBg");
      expect(bgCalls).toHaveLength(1);
      expect(bgCalls[0].args[0]).toBe("route_a");
    });
  });
});
