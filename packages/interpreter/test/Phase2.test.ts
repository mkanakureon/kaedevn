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

describe("Phase 2: ラベルとジャンプ", () => {
  let engine: MockEngineAPI;
  let interpreter: Interpreter;

  beforeEach(() => {
    engine = new MockEngineAPI();
    interpreter = new Interpreter(engine);
  });

  describe("jump", () => {
    it("ラベルにジャンプできる", async () => {
      const script = `
bg("start")

*label1
bg("label1")

*label2
bg("label2")
`;

      await interpreter.run(script);

      // start → label1 → label2 の順に実行される
      expect(engine.calls).toHaveLength(3);
      expect(engine.calls[0].args[0]).toBe("start");
      expect(engine.calls[1].args[0]).toBe("label1");
      expect(engine.calls[2].args[0]).toBe("label2");
    });

    it("jump()で指定したラベルにジャンプできる", async () => {
      const script = `
bg("start")
jump("ending")

bg("middle")

*ending
bg("ending")
`;

      await interpreter.run(script);

      // start → ending (middleはスキップ)
      expect(engine.calls).toHaveLength(2);
      expect(engine.calls[0].args[0]).toBe("start");
      expect(engine.calls[1].args[0]).toBe("ending");
    });

    it("複数のjump()を実行できる", async () => {
      const script = `
bg("start")
jump("label2")

*label1
bg("label1")
jump("ending")

*label2
bg("label2")
jump("label1")

*ending
bg("ending")
`;

      await interpreter.run(script);

      // start → label2 → label1 → ending
      expect(engine.calls).toHaveLength(4);
      expect(engine.calls[0].args[0]).toBe("start");
      expect(engine.calls[1].args[0]).toBe("label2");
      expect(engine.calls[2].args[0]).toBe("label1");
      expect(engine.calls[3].args[0]).toBe("ending");
    });

    it("未定義のラベルへのジャンプはエラー", async () => {
      const script = `
jump("undefined_label")
`;

      await expect(interpreter.run(script)).rejects.toThrow(
        "未定義のラベル: undefined_label"
      );
    });
  });

  describe("call/ret", () => {
    it("call()でサブルーチンを呼び出してret()で戻れる", async () => {
      const script = `
bg("start")
call("subroutine")
bg("after_call")
jump("end")

*subroutine
bg("subroutine")
ret()

*end
`;

      await interpreter.run(script);

      // start → subroutine → after_call
      expect(engine.calls).toHaveLength(3);
      expect(engine.calls[0].args[0]).toBe("start");
      expect(engine.calls[1].args[0]).toBe("subroutine");
      expect(engine.calls[2].args[0]).toBe("after_call");
    });

    it("call()を複数回呼び出せる", async () => {
      const script = `
bg("start")
call("sub1")
call("sub2")
bg("end")
jump("finish")

*sub1
bg("sub1")
ret()

*sub2
bg("sub2")
ret()

*finish
`;

      await interpreter.run(script);

      // start → sub1 → sub2 → end
      expect(engine.calls).toHaveLength(4);
      expect(engine.calls[0].args[0]).toBe("start");
      expect(engine.calls[1].args[0]).toBe("sub1");
      expect(engine.calls[2].args[0]).toBe("sub2");
      expect(engine.calls[3].args[0]).toBe("end");
    });

    it("ネストしたcall()を処理できる", async () => {
      const script = `
bg("start")
call("outer")
bg("end")
jump("finish")

*outer
bg("outer")
call("inner")
bg("outer_after")
ret()

*inner
bg("inner")
ret()

*finish
`;

      await interpreter.run(script);

      // start → outer → inner → outer_after → end
      expect(engine.calls).toHaveLength(5);
      expect(engine.calls[0].args[0]).toBe("start");
      expect(engine.calls[1].args[0]).toBe("outer");
      expect(engine.calls[2].args[0]).toBe("inner");
      expect(engine.calls[3].args[0]).toBe("outer_after");
      expect(engine.calls[4].args[0]).toBe("end");
    });

    it("ret()が呼び出しスタックが空の時はエラー", async () => {
      const script = `
ret()
`;

      await expect(interpreter.run(script)).rejects.toThrow(
        "呼び出しスタックが空です"
      );
    });

    it("未定義のラベルへのcallはエラー", async () => {
      const script = `
call("undefined_label")
`;

      await expect(interpreter.run(script)).rejects.toThrow(
        "未定義のラベル: undefined_label"
      );
    });
  });

  describe("jumpとcallの組み合わせ", () => {
    it("callの中でjumpしても正常に動作する", async () => {
      const script = `
bg("start")
call("subroutine")
bg("after_call")
jump("end")

*subroutine
bg("subroutine")
jump("helper")
bg("never_reached")

*helper
bg("helper")
ret()

*end
`;

      await interpreter.run(script);

      // start → subroutine → helper → after_call
      // never_reached はスキップ
      expect(engine.calls).toHaveLength(4);
      expect(engine.calls[0].args[0]).toBe("start");
      expect(engine.calls[1].args[0]).toBe("subroutine");
      expect(engine.calls[2].args[0]).toBe("helper");
      expect(engine.calls[3].args[0]).toBe("after_call");
    });
  });
});
