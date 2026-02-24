import { describe, it, expect, beforeEach } from "vitest";
import { TestEngine } from "../src/engine/TestEngine.js";
import { Interpreter } from "../src/core/Interpreter.js";

describe("TestEngine", () => {
  let engine: TestEngine;

  beforeEach(() => {
    engine = new TestEngine();
  });

  // ========== 背景 ==========

  describe("setBg", () => {
    it("currentBg を更新する", async () => {
      expect(engine.currentBg).toBeNull();
      await engine.setBg("school");
      expect(engine.currentBg).toBe("school");
    });

    it("背景を切り替える", async () => {
      await engine.setBg("school");
      await engine.setBg("room");
      expect(engine.currentBg).toBe("room");
    });
  });

  // ========== キャラクター ==========

  describe("showChar / hideChar", () => {
    it("キャラクターを表示して状態を記録する", async () => {
      await engine.showChar("hero", "smile", "center");

      expect(engine.isCharVisible("hero")).toBe(true);
      expect(engine.getCharPose("hero")).toBe("smile");
      expect(engine.getCharPosition("hero")).toBe("center");
    });

    it("位置省略時は center になる", async () => {
      await engine.showChar("hero", "smile");
      expect(engine.getCharPosition("hero")).toBe("center");
    });

    it("ポーズを変更できる", async () => {
      await engine.showChar("hero", "smile", "left");
      await engine.showChar("hero", "angry", "left");
      expect(engine.getCharPose("hero")).toBe("angry");
    });

    it("hideChar でキャラクターを消す", async () => {
      await engine.showChar("hero", "smile");
      await engine.hideChar("hero");
      expect(engine.isCharVisible("hero")).toBe(false);
      expect(engine.getCharPose("hero")).toBeNull();
    });

    it("存在しないキャラの問い合わせは null/false", () => {
      expect(engine.isCharVisible("nobody")).toBe(false);
      expect(engine.getCharPose("nobody")).toBeNull();
      expect(engine.getCharPosition("nobody")).toBeNull();
    });
  });

  describe("showCharAnim", () => {
    it("anim フラグ付きで表示する", async () => {
      await engine.showCharAnim("hero", "idle", "center");
      expect(engine.isCharVisible("hero")).toBe(true);
      const state = engine.characters.get("hero");
      expect(state?.anim).toBe(true);
    });
  });

  describe("clearChars", () => {
    it("全キャラクターを消去する", async () => {
      await engine.showChar("hero", "smile", "left");
      await engine.showChar("heroine", "happy", "right");
      expect(engine.characters.size).toBe(2);

      await engine.clearChars();
      expect(engine.characters.size).toBe(0);
      expect(engine.isCharVisible("hero")).toBe(false);
    });
  });

  describe("moveChar", () => {
    it("キャラクターの位置を更新する", async () => {
      await engine.showChar("hero", "smile", "left");
      await engine.moveChar("hero", "right", 500);
      expect(engine.getCharPosition("hero")).toBe("right");
    });

    it("存在しないキャラの移動は無視する", async () => {
      await engine.moveChar("nobody", "right", 500);
      expect(engine.isCharVisible("nobody")).toBe(false);
    });
  });

  // ========== オーディオ ==========

  describe("playBgm / stopBgm / fadeBgm", () => {
    it("BGM を再生する", () => {
      engine.playBgm("daily");
      expect(engine.isBgmPlaying).toBe(true);
      expect(engine.currentBgm?.name).toBe("daily");
      expect(engine.currentBgm?.vol).toBe(100);
    });

    it("音量を指定して再生する", () => {
      engine.playBgm("battle", 80);
      expect(engine.currentBgm?.vol).toBe(80);
    });

    it("stopBgm で停止する", () => {
      engine.playBgm("daily");
      engine.stopBgm();
      expect(engine.isBgmPlaying).toBe(false);
      expect(engine.currentBgm).toBeNull();
    });

    it("fadeBgm で停止する", async () => {
      engine.playBgm("daily");
      await engine.fadeBgm(2000);
      expect(engine.isBgmPlaying).toBe(false);
    });
  });

  // ========== セリフ ==========

  describe("showDialogue", () => {
    it("セリフを記録する", async () => {
      await engine.showDialogue("hero", ["こんにちは", "元気？"]);
      expect(engine.dialogues).toHaveLength(1);
      expect(engine.dialogues[0]).toEqual({
        speaker: "hero",
        lines: ["こんにちは", "元気？"],
      });
    });

    it("lastDialogue で最後のセリフを取得する", async () => {
      await engine.showDialogue("hero", ["1"]);
      await engine.showDialogue("heroine", ["2"]);
      expect(engine.lastDialogue?.speaker).toBe("heroine");
    });

    it("セリフがない場合 lastDialogue は null", () => {
      expect(engine.lastDialogue).toBeNull();
    });
  });

  // ========== 選択肢 ==========

  describe("showChoice", () => {
    it("デフォルトで 0 を返す", async () => {
      const result = await engine.showChoice([
        { text: "はい" },
        { text: "いいえ" },
      ]);
      expect(result).toBe(0);
      expect(engine.choices[0]).toEqual({
        options: ["はい", "いいえ"],
        selected: 0,
      });
    });

    it("choiceQueue から順番に返す", async () => {
      engine.choiceQueue = [1, 0, 2];

      const r1 = await engine.showChoice([{ text: "A" }, { text: "B" }]);
      const r2 = await engine.showChoice([{ text: "X" }, { text: "Y" }]);
      const r3 = await engine.showChoice([
        { text: "P" },
        { text: "Q" },
        { text: "R" },
      ]);

      expect(r1).toBe(1);
      expect(r2).toBe(0);
      expect(r3).toBe(2);
      expect(engine.choices).toHaveLength(3);
    });

    it("choiceQueue が空になったらデフォルト 0", async () => {
      engine.choiceQueue = [1];
      await engine.showChoice([{ text: "A" }, { text: "B" }]);
      const r2 = await engine.showChoice([{ text: "X" }, { text: "Y" }]);
      expect(r2).toBe(0);
    });
  });

  // ========== バトル ==========

  describe("battleStart", () => {
    it("デフォルトで win を返す", async () => {
      const result = await engine.battleStart("goblin");
      expect(result).toBe("win");
      expect(engine.battles[0]).toEqual({ troopId: "goblin", result: "win" });
    });

    it("battleQueue から順番に返す", async () => {
      engine.battleQueue = ["lose", "win"];

      const r1 = await engine.battleStart("goblin");
      const r2 = await engine.battleStart("dragon");

      expect(r1).toBe("lose");
      expect(r2).toBe("win");
      expect(engine.battles).toHaveLength(2);
    });
  });

  // ========== リセット ==========

  describe("reset", () => {
    it("全状態をクリアする", async () => {
      await engine.setBg("school");
      await engine.showChar("hero", "smile");
      engine.playBgm("daily");
      await engine.showDialogue("hero", ["test"]);
      await engine.showChoice([{ text: "A" }]);
      engine.battleQueue = ["lose"];
      await engine.battleStart("goblin");

      engine.reset();

      expect(engine.currentBg).toBeNull();
      expect(engine.characters.size).toBe(0);
      expect(engine.currentBgm).toBeNull();
      expect(engine.dialogues).toHaveLength(0);
      expect(engine.choices).toHaveLength(0);
      expect(engine.battles).toHaveLength(0);
      expect(engine.choiceQueue).toHaveLength(0);
      expect(engine.battleQueue).toHaveLength(0);
    });
  });

  // ========== Interpreter 統合 ==========

  describe("Interpreter 統合", () => {
    it("スクリプト実行後の状態を検証できる", async () => {
      const interpreter = new Interpreter(engine);

      await interpreter.run(`
bg("school")
bgm("daily")
ch("hero", "smile", "center")

#hero
こんにちは
#

ch("hero", "sad", "left")
`);

      expect(engine.currentBg).toBe("school");
      expect(engine.isBgmPlaying).toBe(true);
      expect(engine.getCharPose("hero")).toBe("sad");
      expect(engine.getCharPosition("hero")).toBe("left");
      expect(engine.lastDialogue?.speaker).toBe("hero");
    });

    it("選択肢の分岐を検証できる", async () => {
      engine.choiceQueue = [1];
      const interpreter = new Interpreter(engine);

      await interpreter.run(`score = 0
choice {
  "勉強する" {
    score += 10
  }
  "遊ぶ" {
    score += 5
  }
}`);

      expect(engine.choices[0].selected).toBe(1);
      expect(interpreter.getState().variables.score).toBe(5);
    });

    it("バトル分岐を検証できる", async () => {
      engine.battleQueue = ["lose"];
      const interpreter = new Interpreter(engine);

      await interpreter.run(`
battle("boss", "win_route", "lose_route")
jump("end")

*win_route
result = "victory"
jump("end")

*lose_route
result = "defeat"

*end
`);

      expect(engine.battles[0]).toEqual({ troopId: "boss", result: "lose" });
      expect(interpreter.getState().variables.result).toBe("defeat");
    });

    it("キャラクターの表示・非表示を検証できる", async () => {
      const interpreter = new Interpreter(engine);

      await interpreter.run(`
ch("hero", "smile", "left")
ch("heroine", "happy", "right")
ch_hide("hero")
`);

      expect(engine.isCharVisible("hero")).toBe(false);
      expect(engine.isCharVisible("heroine")).toBe(true);
      expect(engine.getCharPosition("heroine")).toBe("right");
    });
  });
});
