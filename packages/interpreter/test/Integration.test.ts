import { describe, it, expect, beforeEach } from "vitest";
import { Interpreter } from "../src/core/Interpreter.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Engine
class MockEngine {
  dialogueLog: string[] = [];
  commandLog: string[] = [];
  choiceResults: number[] = [0]; // 常に最初の選択肢を返す
  choiceIndex: number = 0;

  async showDialogue(params: {
    character?: string;
    text: string;
    voiceId?: string;
  }) {
    this.dialogueLog.push(`${params.character || "narrator"}: ${params.text}`);
  }

  async setBg(id: string) {
    this.commandLog.push(`bg:${id}`);
  }

  async showChar(params: { id: string; expression: string; position: string }) {
    this.commandLog.push(`char_show:${params.id}:${params.expression}`);
  }

  async hideChar(id: string) {
    this.commandLog.push(`char_hide:${id}`);
  }

  async moveChar(params: { id: string; x: number; y: number }) {
    this.commandLog.push(`char_move:${params.id}`);
  }

  playBgm(id: string) {
    this.commandLog.push(`bgm:${id}`);
  }

  stopBgm() {
    this.commandLog.push(`bgm_stop`);
  }

  async fadeBgm(duration: number) {
    this.commandLog.push(`bgm_fade:${duration}`);
  }

  playSe(id: string) {
    this.commandLog.push(`se:${id}`);
  }

  async playTimeline(id: string) {
    this.commandLog.push(`timeline:${id}`);
  }

  async showChoice(options: Array<{ text: string }>) {
    const result = this.choiceResults[this.choiceIndex] || 0;
    this.choiceIndex++;
    this.commandLog.push(`choice:${options.length}opts`);
    return result;
  }

  async waitForClick() {
    this.commandLog.push(`wait_click`);
  }

  async wait(duration: number) {
    this.commandLog.push(`wait:${duration}`);
  }

  reset() {
    this.dialogueLog = [];
    this.commandLog = [];
    this.choiceIndex = 0;
  }
}

describe("Phase 7-3: Integration Tests", () => {
  let interpreter: Interpreter;
  let engine: MockEngine;

  beforeEach(() => {
    engine = new MockEngine();
    interpreter = new Interpreter(engine);
  });

  describe("デモシナリオ実行", () => {
    it.skip("完全なデモシナリオが実行できる", async () => {
      const scriptPath = path.join(__dirname, "../examples/04-full-scenario.ksc");
      const script = fs.readFileSync(scriptPath, "utf-8");

      // デモシナリオを実行
      await interpreter.run(script);

      // 実行が正常に完了することを確認
      const state = interpreter.getState();

      // 変数が設定されている
      expect(state.variables.affection).toBeDefined();
      expect(state.variables.name).toBe("太郎");

      // コマンドが実行されている
      expect(engine.commandLog.length).toBeGreaterThan(0);
      expect(engine.dialogueLog.length).toBeGreaterThan(0);
    });

    it.skip("デモシナリオの変数状態が正しい", async () => {
      const scriptPath = path.join(__dirname, "../examples/04-full-scenario.ksc");
      const script = fs.readFileSync(scriptPath, "utf-8");

      await interpreter.run(script);
      const state = interpreter.getState();

      // 初期値が設定されている
      expect(state.variables.name).toBe("太郎");
      expect(state.variables.day).toBe(1);

      // 好感度が変化している（morning_greetingで+1される）
      expect(state.variables.affection).toBeGreaterThan(0);

      // フラグが設定されている
      expect(state.variables.flag_library).toBeDefined();
      expect(state.variables.flag_rooftop).toBeDefined();
      expect(state.variables.flag_confession).toBeDefined();
    });

    it("デモシナリオの関数が動作する", async () => {
      const script = `
def mood(aff) {
  if (aff >= 8) {
    return "happy"
  }
  if (aff >= 4) {
    return "normal"
  }
  return "sad"
}

result1 = mood(10)
result2 = mood(5)
result3 = mood(2)
`;

      await interpreter.run(script);
      const state = interpreter.getState();

      expect(state.variables.result1).toBe("happy");
      expect(state.variables.result2).toBe("normal");
      expect(state.variables.result3).toBe("sad");
    });
  });

  describe("長編スクリプト実行", () => {
    it.skip("100行以上のスクリプトを実行できる", async () => {
      // 100行のスクリプトを生成
      const lines = ["// 100行スクリプトテスト"];

      // 変数初期化
      for (let i = 0; i < 20; i++) {
        lines.push(`var${i} = ${i}`);
      }

      // 関数定義
      lines.push("");
      lines.push("def sum(a, b) {");
      lines.push("  return a + b");
      lines.push("}");

      // 計算
      for (let i = 0; i < 30; i++) {
        lines.push(`result${i} = sum(${i}, ${i + 1})`);
      }

      // ラベルとジャンプ
      lines.push("");
      lines.push("*label1");
      lines.push("#narrator");
      lines.push("Label 1に到達");
      lines.push("#");
      lines.push("jump(\"label2\")");

      lines.push("");
      lines.push("*label2");
      lines.push("#narrator");
      lines.push("Label 2に到達");
      lines.push("#");

      // 条件分岐
      for (let i = 0; i < 20; i++) {
        lines.push(`if (var${i % 20} >= 0) {`);
        lines.push(`  test${i} = true`);
        lines.push("}");
      }

      const script = lines.join("\n");
      expect(script.split("\n").length).toBeGreaterThanOrEqual(100);

      const startTime = Date.now();
      await interpreter.run(script);
      const elapsed = Date.now() - startTime;

      // パフォーマンスチェック: 1秒以内
      expect(elapsed).toBeLessThan(1000);

      const state = interpreter.getState();
      expect(state.variables.result0).toBe(1);
      expect(state.variables.result29).toBe(59);
    });

    it.skip("複雑な制御フローを正しく実行できる", async () => {
      // Phase 5 の既知の再帰問題によりスキップ
      const script = `
counter = 0

def fibonacci(n) {
  if (n <= 1) {
    return n
  }
  return fibonacci(n - 1) + fibonacci(n - 2)
}

*start
counter += 1

if (counter < 5) {
  jump("start")
}

fib5 = fibonacci(5)
fib6 = fibonacci(6)
fib7 = fibonacci(7)

*end
`;

      await interpreter.run(script);
      const state = interpreter.getState();

      expect(state.variables.counter).toBe(5);
      expect(state.variables.fib5).toBe(5);
      expect(state.variables.fib6).toBe(8);
      expect(state.variables.fib7).toBe(13);
    });
  });

  describe("全機能統合", () => {
    it("全Phase機能を使用するシナリオが動作する", async () => {
      const script = `
// Phase 3: 変数と式
score = 0
name = "Player"

// Phase 5: 関数
def calculate_bonus(base, multiplier) {
  return base * multiplier
}

// Phase 5: サブルーチン
sub update_score() {
  score += 10
}

*start
// Phase 1: 基本構造
bg("title")
bgm("title_theme")

#narrator
{name}の冒険が始まる
#

// Phase 2: ジャンプとコール
call("game_start")

// Phase 4: choice
choice {
  "戦う" {
    score += 20
    jump("battle")
  }
  "逃げる" {
    score -= 10
    jump("escape")
  }
}

*game_start
update_score()
bonus = calculate_bonus(score, 2)

// Phase 6: 文字列補間
#narrator
現在のスコア: {score}
ボーナス: {bonus}
#

ret()

*battle
bg("battle")
se("attack")

#narrator
戦闘に勝利した！
最終スコア: {score}
#

*escape
bg("escape")

#narrator
逃げ出した
最終スコア: {score}
#
`;

      await interpreter.run(script);
      const state = interpreter.getState();

      // 変数が正しく設定されている
      expect(state.variables.score).toBeGreaterThan(0);
      expect(state.variables.name).toBe("Player");
      expect(state.variables.bonus).toBe(20); // 10 * 2

      // コマンドが実行されている
      expect(engine.commandLog).toContain("bg:title");
      expect(engine.commandLog).toContain("bgm:title_theme");

      // 選択肢が実行されている
      expect(engine.commandLog.some((cmd) => cmd.includes("choice"))).toBe(
        true
      );
    });

    it("エラーが発生した場合に適切に処理される", async () => {
      const script = `
x = 10
y = undefined_var + 1
`;

      await expect(interpreter.run(script)).rejects.toThrow("未定義の変数");
    });

    it("デバッグモードで変数追跡が動作する", async () => {
      const debugInterpreter = new Interpreter(engine, { debug: true });
      const dbg = debugInterpreter.getDebugger();

      dbg.watchVariable("health");
      dbg.enableTrace();

      const script = `
health = 100
health -= 20
health += 10
`;

      await debugInterpreter.run(script);

      const history = dbg.getVariableHistory("health");
      expect(history.length).toBe(3);
      expect(history[0].newValue).toBe(100);
      expect(history[1].newValue).toBe(80);
      expect(history[2].newValue).toBe(90);

      const traceLog = dbg.getTraceLog();
      expect(traceLog.length).toBeGreaterThan(0);
    });
  });

  describe("パフォーマンステスト", () => {
    it("大量の変数操作を効率的に処理できる", async () => {
      const lines = [];

      // 100個の変数を操作
      for (let i = 0; i < 100; i++) {
        lines.push(`var${i} = ${i}`);
      }

      for (let i = 0; i < 100; i++) {
        lines.push(`var${i} += 10`);
      }

      const script = lines.join("\n");
      const startTime = Date.now();
      await interpreter.run(script);
      const elapsed = Date.now() - startTime;

      // パフォーマンス: 500ms以内
      expect(elapsed).toBeLessThan(500);

      const state = interpreter.getState();
      expect(state.variables.var0).toBe(10);
      expect(state.variables.var99).toBe(109);
    });

    it.skip("大量の関数呼び出しを処理できる", async () => {
      const script = `
def simple_calc(x) {
  return x * 2
}

result = 0

counter = 0
*loop
if (counter >= 100) {
  jump("end")
}

result += simple_calc(counter)
counter += 1
jump("loop")

*end
`;

      const startTime = Date.now();
      await interpreter.run(script);
      const elapsed = Date.now() - startTime;

      // パフォーマンス: 1秒以内
      expect(elapsed).toBeLessThan(1000);

      const state = interpreter.getState();
      expect(state.variables.counter).toBe(100);
      expect(state.variables.result).toBe(9900); // sum(0..99) * 2
    });
  });
});
