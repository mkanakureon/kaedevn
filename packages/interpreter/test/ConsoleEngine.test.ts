import { describe, it, expect, beforeEach } from "vitest";
import { ConsoleEngine } from "../src/engine/ConsoleEngine.js";
import { Interpreter } from "../src/core/Interpreter.js";

describe("ConsoleEngine", () => {
  let logs: string[];
  let engine: ConsoleEngine;

  beforeEach(() => {
    logs = [];
    engine = new ConsoleEngine({ output: (msg) => logs.push(msg) });
  });

  // ========== セリフ ==========

  describe("showDialogue", () => {
    it("話者名付きセリフを出力する", async () => {
      await engine.showDialogue("hero", ["こんにちは", "元気？"]);
      expect(logs[0]).toBe("\n【hero】\n  こんにちは\n  元気？");
    });

    it("話者名が空の場合はナレーションと表示する", async () => {
      await engine.showDialogue("", ["地の文です"]);
      expect(logs[0]).toBe("\n【ナレーション】\n  地の文です");
    });
  });

  // ========== 背景 ==========

  describe("setBg", () => {
    it("背景名を出力する", async () => {
      await engine.setBg("school");
      expect(logs[0]).toBe("[背景] school");
    });

    it("エフェクト付きで出力する", async () => {
      await engine.setBg("room", "fade");
      expect(logs[0]).toBe("[背景] room (fade)");
    });
  });

  // ========== キャラクター ==========

  describe("showChar", () => {
    it("名前とポーズを出力する", async () => {
      await engine.showChar("hero", "smile");
      expect(logs[0]).toBe("[キャラ表示] hero smile");
    });

    it("位置付きで出力する", async () => {
      await engine.showChar("hero", "smile", "center");
      expect(logs[0]).toBe("[キャラ表示] hero smile center");
    });

    it("フェード時間付きで出力する", async () => {
      await engine.showChar("hero", "smile", "left", 500);
      expect(logs[0]).toBe("[キャラ表示] hero smile left 500ms");
    });
  });

  describe("showCharAnim", () => {
    it("アニメーション表示を出力する", async () => {
      await engine.showCharAnim("hero", "idle", "center");
      expect(logs[0]).toBe("[キャラアニメ] hero idle center");
    });
  });

  describe("hideChar", () => {
    it("キャラ非表示を出力する", async () => {
      await engine.hideChar("hero");
      expect(logs[0]).toBe("[キャラ非表示] hero");
    });

    it("フェード時間付きで出力する", async () => {
      await engine.hideChar("hero", 300);
      expect(logs[0]).toBe("[キャラ非表示] hero 300ms");
    });
  });

  describe("clearChars", () => {
    it("全消去を出力する", async () => {
      await engine.clearChars();
      expect(logs[0]).toBe("[キャラ全消去]");
    });

    it("フェード時間付きで出力する", async () => {
      await engine.clearChars(500);
      expect(logs[0]).toBe("[キャラ全消去] 500ms");
    });
  });

  describe("moveChar", () => {
    it("移動を出力する", async () => {
      await engine.moveChar("hero", "right", 800);
      expect(logs[0]).toBe("[キャラ移動] hero → right (800ms)");
    });
  });

  // ========== オーディオ ==========

  describe("playBgm", () => {
    it("BGM名を出力する", async () => {
      engine.playBgm("daily");
      expect(logs[0]).toBe("[BGM] daily");
    });

    it("音量付きで出力する", async () => {
      engine.playBgm("battle", 80);
      expect(logs[0]).toBe("[BGM] battle vol=80");
    });

    it("音量とフェード付きで出力する", async () => {
      engine.playBgm("ending", 60, 2000);
      expect(logs[0]).toBe("[BGM] ending vol=60 fade=2000ms");
    });
  });

  describe("stopBgm", () => {
    it("BGM停止を出力する", async () => {
      engine.stopBgm();
      expect(logs[0]).toBe("[BGM停止]");
    });
  });

  describe("fadeBgm", () => {
    it("フェードアウトを出力する", async () => {
      await engine.fadeBgm(2000);
      expect(logs[0]).toBe("[BGMフェード] 2000ms");
    });
  });

  describe("playSe", () => {
    it("SE名を出力する", async () => {
      engine.playSe("click");
      expect(logs[0]).toBe("[SE] click");
    });

    it("音量付きで出力する", async () => {
      engine.playSe("explosion", 90);
      expect(logs[0]).toBe("[SE] explosion vol=90");
    });
  });

  describe("playVoice", () => {
    it("ボイスIDを出力する", async () => {
      engine.playVoice("hero_001");
      expect(logs[0]).toBe("[ボイス] hero_001");
    });
  });

  // ========== タイムライン ==========

  describe("playTimeline", () => {
    it("タイムライン名を出力する", async () => {
      await engine.playTimeline("opening");
      expect(logs[0]).toBe("[タイムライン] opening");
    });
  });

  // ========== バトル ==========

  describe("battleStart", () => {
    it("デフォルトで win を返す", async () => {
      const result = await engine.battleStart("troop_001");
      expect(result).toBe("win");
      expect(logs[0]).toBe("[バトル] troop_001 → win");
    });

    it("defaultBattleResult で結果を変更できる", async () => {
      const loseEngine = new ConsoleEngine({
        output: (msg) => logs.push(msg),
        defaultBattleResult: "lose",
      });
      const result = await loseEngine.battleStart("boss");
      expect(result).toBe("lose");
      expect(logs[0]).toBe("[バトル] boss → lose");
    });
  });

  // ========== UI ==========

  describe("showChoice", () => {
    it("選択肢を出力してデフォルトで 0 を返す", async () => {
      const result = await engine.showChoice([
        { text: "はい" },
        { text: "いいえ" },
      ]);
      expect(result).toBe(0);
      expect(logs[0]).toBe(
        "=== 選択肢 ===\n  1. はい\n  2. いいえ\n→ 自動選択: 1",
      );
    });

    it("defaultChoice で選択を変更できる", async () => {
      const engine2 = new ConsoleEngine({
        output: (msg) => logs.push(msg),
        defaultChoice: 1,
      });
      const result = await engine2.showChoice([
        { text: "A" },
        { text: "B" },
        { text: "C" },
      ]);
      expect(result).toBe(1);
      expect(logs[0]).toContain("→ 自動選択: 2");
    });
  });

  describe("waitForClick", () => {
    it("クリック待ちを出力する", async () => {
      await engine.waitForClick();
      expect(logs[0]).toBe("[クリック待ち]");
    });
  });

  describe("wait", () => {
    it("待機を出力する（realTime: false）", async () => {
      await engine.wait(1000);
      expect(logs[0]).toBe("[待機] 1000ms");
    });

    it("realTime: true で実際に待機する", async () => {
      const rtEngine = new ConsoleEngine({
        output: (msg) => logs.push(msg),
        realTime: true,
      });
      const start = Date.now();
      await rtEngine.wait(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
      expect(logs[0]).toBe("[待機] 50ms");
    });
  });

  // ========== 統合テスト ==========

  describe("Interpreter 統合", () => {
    it(".ksc スクリプトを実行して出力を検証する", async () => {
      const interpreter = new Interpreter(engine);
      const script = `
bg("school")
ch("hero", "smile", "center")
bgm("daily")

#hero
こんにちは
良い天気ですね
#
`;
      await interpreter.run(script);

      expect(logs).toEqual([
        "[背景] school",
        "[キャラ表示] hero smile center",
        "[BGM] daily",
        "\n【hero】\n  こんにちは\n  良い天気ですね",
      ]);
    });

    it("選択肢付きスクリプトを実行できる", async () => {
      const interpreter = new Interpreter(engine);
      const script = `
score = 0

choice {
  "勉強する" {
    score += 10
  }
  "遊ぶ" {
    score += 5
  }
}
`;
      await interpreter.run(script);

      // defaultChoice=0 なので「勉強する」が選択される
      expect(logs[0]).toContain("勉強する");
      expect(logs[0]).toContain("遊ぶ");

      const state = interpreter.getState();
      expect(state.variables.score).toBe(10);
    });
  });
});
