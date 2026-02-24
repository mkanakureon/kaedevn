/**
 * Phase A テスト: 不足コマンドの追加・オプション引数対応
 * - ch_anim, ch_clear, voice, battle, timeline_play
 * - ch/ch_hide の fadeMs, bgm の vol/fadeMs, bgm_stop の fadeMs, se の vol
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Interpreter } from "../src/core/Interpreter.js";
import type { IEngineAPI, ChoiceOption } from "../src/engine/IEngineAPI.js";

class MockEngineA implements IEngineAPI {
  calls: Array<{ method: string; args: unknown[] }> = [];
  battleResult: 'win' | 'lose' = 'win';

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
    return this.battleResult;
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
}

describe("Phase A: 不足コマンド追加", () => {
  let engine: MockEngineA;
  let interpreter: Interpreter;

  beforeEach(() => {
    engine = new MockEngineA();
    interpreter = new Interpreter(engine);
  });

  // ---- ch_anim ----
  describe("ch_anim コマンド", () => {
    it("ch_anim が showCharAnim を呼ぶ", async () => {
      await interpreter.run(`ch_anim("hero", "run", "left")`);

      expect(engine.calls).toHaveLength(1);
      expect(engine.calls[0]).toEqual({
        method: "showCharAnim",
        args: ["hero", "run", "left"],
      });
    });

    it("ch_anim は中央位置でも動作する", async () => {
      await interpreter.run(`ch_anim("npc", "wave", "center")`);

      expect(engine.calls[0].method).toBe("showCharAnim");
      expect(engine.calls[0].args).toEqual(["npc", "wave", "center"]);
    });
  });

  // ---- ch_clear ----
  describe("ch_clear コマンド", () => {
    it("ch_clear() が clearChars を引数なしで呼ぶ", async () => {
      await interpreter.run(`ch_clear()`);

      expect(engine.calls).toHaveLength(1);
      expect(engine.calls[0]).toEqual({ method: "clearChars", args: [undefined] });
    });

    it("ch_clear(500) が clearChars に fadeMs を渡す", async () => {
      await interpreter.run(`ch_clear(500)`);

      expect(engine.calls[0]).toEqual({ method: "clearChars", args: [500] });
    });
  });

  // ---- voice ----
  describe("voice コマンド", () => {
    it("voice が playVoice を呼ぶ", async () => {
      await interpreter.run(`voice("vo_hero_001")`);

      expect(engine.calls).toHaveLength(1);
      expect(engine.calls[0]).toEqual({ method: "playVoice", args: ["vo_hero_001"] });
    });
  });

  // ---- timeline_play ----
  describe("timeline_play コマンド", () => {
    it("timeline_play が playTimeline を呼ぶ", async () => {
      await interpreter.run(`timeline_play("tl_001")`);

      expect(engine.calls).toHaveLength(1);
      expect(engine.calls[0]).toEqual({ method: "playTimeline", args: ["tl_001"] });
    });

    it("timeline（旧名）も引き続き動作する", async () => {
      await interpreter.run(`timeline("tl_002")`);

      expect(engine.calls[0]).toEqual({ method: "playTimeline", args: ["tl_002"] });
    });
  });

  // ---- battle ----
  describe("battle コマンド", () => {
    it("battle が battleStart を呼ぶ", async () => {
      await interpreter.run(`battle("troop001")`);

      expect(engine.calls).toHaveLength(1);
      expect(engine.calls[0].method).toBe("battleStart");
      expect(engine.calls[0].args[0]).toBe("troop001");
    });

    it("battle 勝利時に win ラベルへジャンプする", async () => {
      engine.battleResult = 'win';
      const script = `
result = "none"
battle("troop001", "win_label", "lose_label")
result = "no_jump"
jump("end")

*win_label
result = "win"
jump("end")

*lose_label
result = "lose"

*end
`;

      await interpreter.run(script);

      expect(interpreter.getState().variables.result).toBe("win");
    });

    it("battle 敗北時に lose ラベルへジャンプする", async () => {
      engine.battleResult = 'lose';
      const script = `
result = "none"
battle("troop001", "win_label", "lose_label")
result = "no_jump"
jump("end")

*win_label
result = "win"
jump("end")

*lose_label
result = "lose"

*end
`;

      await interpreter.run(script);

      expect(interpreter.getState().variables.result).toBe("lose");
    });

    it("battle でラベルなしの場合はジャンプしない", async () => {
      engine.battleResult = 'win';
      const script = `
result = "before"
battle("troop001")
result = "after"
`;

      await interpreter.run(script);

      expect(interpreter.getState().variables.result).toBe("after");
    });
  });

  // ---- optional params ----
  describe("既存コマンドのオプション引数", () => {
    it("ch に fadeMs を渡せる", async () => {
      await interpreter.run(`ch("hero", "smile", "left", 500)`);

      expect(engine.calls[0]).toEqual({
        method: "showChar",
        args: ["hero", "smile", "left", 500],
      });
    });

    it("ch に fadeMs なしでも動作する", async () => {
      await interpreter.run(`ch("hero", "smile", "left")`);

      expect(engine.calls[0]).toEqual({
        method: "showChar",
        args: ["hero", "smile", "left", undefined],
      });
    });

    it("ch_hide に fadeMs を渡せる", async () => {
      await interpreter.run(`ch_hide("hero", 300)`);

      expect(engine.calls[0]).toEqual({ method: "hideChar", args: ["hero", 300] });
    });

    it("ch_hide に fadeMs なしでも動作する", async () => {
      await interpreter.run(`ch_hide("hero")`);

      expect(engine.calls[0]).toEqual({ method: "hideChar", args: ["hero", undefined] });
    });

    it("bgm に vol を渡せる", async () => {
      await interpreter.run(`bgm("bgm_main", 80)`);

      expect(engine.calls[0]).toEqual({
        method: "playBgm",
        args: ["bgm_main", 80, undefined],
      });
    });

    it("bgm に vol + fadeMs を渡せる", async () => {
      await interpreter.run(`bgm("bgm_main", 80, 1000)`);

      expect(engine.calls[0]).toEqual({
        method: "playBgm",
        args: ["bgm_main", 80, 1000],
      });
    });

    it("bgm_stop() は stopBgm を呼ぶ", async () => {
      await interpreter.run(`bgm_stop()`);

      expect(engine.calls[0]).toEqual({ method: "stopBgm", args: [] });
    });

    it("bgm_stop(500) は fadeBgm を呼ぶ", async () => {
      await interpreter.run(`bgm_stop(500)`);

      expect(engine.calls[0]).toEqual({ method: "fadeBgm", args: [500] });
    });

    it("se に vol を渡せる", async () => {
      await interpreter.run(`se("se_click", 80)`);

      expect(engine.calls[0]).toEqual({ method: "playSe", args: ["se_click", 80] });
    });

    it("se に vol なしでも動作する", async () => {
      await interpreter.run(`se("se_click")`);

      expect(engine.calls[0]).toEqual({ method: "playSe", args: ["se_click", undefined] });
    });
  });

  // ---- isBuiltinFunction 予約語チェック ----
  describe("新コマンドは予約語として扱われる", () => {
    it("ch_anim という名前のユーザー関数は定義できない", async () => {
      const script = `
def ch_anim(a) {
  return a
}
`;
      await expect(interpreter.run(script)).rejects.toThrow("組み込み関数名");
    });

    it("voice という名前のユーザー関数は定義できない", async () => {
      const script = `
def voice(a) {
  return a
}
`;
      await expect(interpreter.run(script)).rejects.toThrow("組み込み関数名");
    });

    it("battle という名前のユーザー関数は定義できない", async () => {
      const script = `
def battle(a) {
  return a
}
`;
      await expect(interpreter.run(script)).rejects.toThrow("組み込み関数名");
    });
  });
});
