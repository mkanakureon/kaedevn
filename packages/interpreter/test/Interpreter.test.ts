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
    this.calls.push({ method: "setBg", args: [name, effect] });
  }

  async showChar(name: string, pose: string, position?: string, fadeMs?: number): Promise<void> {
    this.calls.push({ method: "showChar", args: [name, pose, position, fadeMs] });
  }

  async showCharAnim(name: string, pose: string, position: string): Promise<void> {
    this.calls.push({ method: "showCharAnim", args: [name, pose, position] });
  }

  async hideChar(name: string, fadeMs?: number): Promise<void> {
    this.calls.push({ method: "hideChar", args: [name, fadeMs] });
  }

  async clearChars(fadeMs?: number): Promise<void> {
    this.calls.push({ method: "clearChars", args: [fadeMs] });
  }

  async moveChar(name: string, position: string, time: number): Promise<void> {
    this.calls.push({ method: "moveChar", args: [name, position, time] });
  }

  playBgm(name: string, vol?: number, fadeMs?: number): void {
    this.calls.push({ method: "playBgm", args: [name, vol, fadeMs] });
  }

  stopBgm(): void {
    this.calls.push({ method: "stopBgm", args: [] });
  }

  async fadeBgm(time: number): Promise<void> {
    this.calls.push({ method: "fadeBgm", args: [time] });
  }

  playSe(name: string, vol?: number): void {
    this.calls.push({ method: "playSe", args: [name, vol] });
  }

  playVoice(name: string): void {
    this.calls.push({ method: "playVoice", args: [name] });
  }

  async playTimeline(name: string): Promise<void> {
    this.calls.push({ method: "playTimeline", args: [name] });
  }

  async battleStart(troopId: string): Promise<'win' | 'lose'> {
    this.calls.push({ method: "battleStart", args: [troopId] });
    return 'win';
  }

  async showChoice(options: ChoiceOption[]): Promise<number> {
    this.calls.push({ method: "showChoice", args: [options] });
    return 0; // 常に最初の選択肢を選ぶ
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

describe("Interpreter", () => {
  let engine: MockEngineAPI;
  let interpreter: Interpreter;

  beforeEach(() => {
    engine = new MockEngineAPI();
    interpreter = new Interpreter(engine);
  });

  it("セリフブロックを実行できる", async () => {
    const script = `
#hero
こんにちは
良い天気ですね
#
`;

    await interpreter.run(script);

    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0]).toEqual({
      method: "showDialogue",
      args: ["hero", ["こんにちは", "良い天気ですね"]],
    });
  });

  it("複数のセリフブロックを実行できる", async () => {
    const script = `
#hero
こんにちは
#

#heroine
はい、こんにちは
#
`;

    await interpreter.run(script);

    expect(engine.calls).toHaveLength(2);
    expect(engine.calls[0]).toEqual({
      method: "showDialogue",
      args: ["hero", ["こんにちは"]],
    });
    expect(engine.calls[1]).toEqual({
      method: "showDialogue",
      args: ["heroine", ["はい、こんにちは"]],
    });
  });

  it("組み込みコマンドを実行できる", async () => {
    const script = `
bg("school")
ch("hero", "smile", "center")
bgm("daily")
`;

    await interpreter.run(script);

    expect(engine.calls).toHaveLength(3);
    expect(engine.calls[0]).toEqual({
      method: "setBg",
      args: ["school", undefined],
    });
    expect(engine.calls[1]).toEqual({
      method: "showChar",
      args: ["hero", "smile", "center", undefined],
    });
    expect(engine.calls[2]).toEqual({
      method: "playBgm",
      args: ["daily", undefined, undefined],
    });
  });

  it("エフェクト付き背景コマンドを実行できる", async () => {
    const script = `
bg("room", "fade")
`;

    await interpreter.run(script);

    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0]).toEqual({
      method: "setBg",
      args: ["room", "fade"],
    });
  });

  it("waitコマンドを実行できる", async () => {
    const script = `
wait(1000)
`;

    await interpreter.run(script);

    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0]).toEqual({
      method: "wait",
      args: [1000],
    });
  });

  it("コメントと空行をスキップできる", async () => {
    const script = `
// これはコメント
bg("school")

// もう1つのコメント
ch("hero", "smile", "center")
`;

    await interpreter.run(script);

    expect(engine.calls).toHaveLength(2);
    expect(engine.calls[0].method).toBe("setBg");
    expect(engine.calls[1].method).toBe("showChar");
  });

  it("セリフとコマンドを混在できる", async () => {
    const script = `
bg("school")

#hero
おはよう
#

ch("heroine", "smile", "right")

#heroine
おはようございます
#
`;

    await interpreter.run(script);

    expect(engine.calls).toHaveLength(4);
    expect(engine.calls[0].method).toBe("setBg");
    expect(engine.calls[1].method).toBe("showDialogue");
    expect(engine.calls[2].method).toBe("showChar");
    expect(engine.calls[3].method).toBe("showDialogue");
  });
});
