import { describe, it, expect, beforeEach } from "vitest";
import { Interpreter } from "../src/core/Interpreter.js";
import type { IEngineAPI, ChoiceOption } from "../src/engine/IEngineAPI.js";

// Mock Engine (IEngineAPI 準拠)
class MockEngine implements IEngineAPI {
  dialogueLog: string[] = [];
  commandLog: string[] = [];
  choiceResults: number[] = [0];
  choiceIndex: number = 0;

  async showDialogue(speaker: string, lines: string[]): Promise<void> {
    this.dialogueLog.push(`${speaker || "narrator"}: ${lines.join(" ")}`);
  }

  async setBg(name: string, effect?: string): Promise<void> {
    this.commandLog.push(`bg:${name}`);
  }

  async showChar(name: string, pose: string, position?: string, fadeMs?: number): Promise<void> {
    this.commandLog.push(`char_show:${name}`);
  }

  async showCharAnim(name: string, pose: string, position: string): Promise<void> {
    this.commandLog.push(`char_anim:${name}`);
  }

  async hideChar(name: string, fadeMs?: number): Promise<void> {
    this.commandLog.push(`char_hide:${name}`);
  }

  async clearChars(fadeMs?: number): Promise<void> {
    this.commandLog.push(`char_clear`);
  }

  async moveChar(name: string, position: string, time: number): Promise<void> {
    this.commandLog.push(`char_move:${name}`);
  }

  playBgm(name: string, vol?: number, fadeMs?: number): void {
    this.commandLog.push(`bgm:${name}`);
  }

  stopBgm(): void {
    this.commandLog.push(`bgm_stop`);
  }

  async fadeBgm(time: number): Promise<void> {
    this.commandLog.push(`bgm_fade`);
  }

  playSe(name: string, vol?: number): void {
    this.commandLog.push(`se:${name}`);
  }

  playVoice(name: string): void {
    this.commandLog.push(`voice:${name}`);
  }

  async playTimeline(name: string): Promise<void> {
    this.commandLog.push(`timeline:${name}`);
  }

  async battleStart(troopId: string): Promise<'win' | 'lose'> {
    this.commandLog.push(`battle:${troopId}`);
    return 'win';
  }

  async showChoice(options: ChoiceOption[]): Promise<number> {
    const result = this.choiceResults[this.choiceIndex] || 0;
    this.choiceIndex++;
    return result;
  }

  async waitForClick(): Promise<void> {}
  async wait(ms: number): Promise<void> {}
}

describe("Phase 7-3: Integration Tests (Simple)", () => {
  let interpreter: Interpreter;
  let engine: MockEngine;

  beforeEach(() => {
    engine = new MockEngine();
    interpreter = new Interpreter(engine);
  });

  it("基本的なスクリプトが実行できる", async () => {
    const script = `
x = 10
y = 20
result = x + y

#narrator
結果はresultです
#
`;

    await interpreter.run(script);

    const state = interpreter.getState();
    expect(state.variables.result).toBe(30);
    expect(engine.dialogueLog.length).toBeGreaterThan(0);
  });

  it("関数が正しく動作する", async () => {
    const script = `
def add(a, b) {
  return a + b
}

result = add(5, 3)
`;

    await interpreter.run(script);

    const state = interpreter.getState();
    expect(state.variables.result).toBe(8);
  });

  it("条件分岐が動作する", async () => {
    const script = `
score = 80

if (score >= 90) {
  grade = "A"
}

if (score >= 80) {
  grade = "B"
}

if (score < 80) {
  grade = "C"
}
`;

    await interpreter.run(script);

    const state = interpreter.getState();
    expect(state.variables.grade).toBe("B");
  });

  it("ラベルとジャンプが動作する", async () => {
    const script = `
x = 1
jump("end")

x = 2

*end
y = 10
`;

    await interpreter.run(script);

    const state = interpreter.getState();
    expect(state.variables.x).toBe(1); // jump したので x=2 はスキップされる
    expect(state.variables.y).toBe(10);
  });

  it("選択肢が動作する", async () => {
    const script = `
score = 0

choice {
  "選択肢A" {
    score = 10
  }
  "選択肢B" {
    score = 20
  }
}
`;

    await interpreter.run(script);

    const state = interpreter.getState();
    expect(state.variables.score).toBe(10); // 最初の選択肢が選ばれる
  });

  it("サブルーチンが動作する", async () => {
    const script = `
counter = 0

sub increment() {
  counter += 1
}

increment()
increment()
`;

    await interpreter.run(script);

    const state = interpreter.getState();
    expect(state.variables.counter).toBe(2);
  });

  it("文字列補間が動作する", async () => {
    const script = `
name = "太郎"
age = 16

#narrator
私は{name}です
#
`;

    await interpreter.run(script);

    expect(engine.dialogueLog.length).toBe(1);
    expect(engine.dialogueLog[0]).toContain("太郎");
  });

  it("複数の機能を組み合わせて使える", async () => {
    const script = `
score = 0

def calc_bonus(base) {
  return base * 2
}

sub add_score() {
  score += 10
}

*start
bg("title")

add_score()
bonus = calc_bonus(score)

if (score >= 10) {
  jump("success")
}

jump("end")

*success
result = "success"

*end
`;

    await interpreter.run(script);

    const state = interpreter.getState();
    expect(state.variables.score).toBe(10);
    expect(state.variables.bonus).toBe(20);
    expect(state.variables.result).toBe("success");
    expect(engine.commandLog).toContain("bg:title");
  });

  it("エラーを適切に報告する", async () => {
    const script = `
x = undefined_variable
`;

    await expect(interpreter.run(script)).rejects.toThrow("未定義の変数");
  });

  it("デバッグモードが動作する", async () => {
    const debugInterpreter = new Interpreter(engine, { debug: true });
    const dbg = debugInterpreter.getDebugger();

    dbg.watchVariable("health");

    const script = `
health = 100
health -= 30
`;

    await debugInterpreter.run(script);

    const history = dbg.getVariableHistory("health");
    expect(history.length).toBe(2);
    expect(history[0].newValue).toBe(100);
    expect(history[1].newValue).toBe(70);
  });
});
