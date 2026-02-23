/**
 * kaedevn Console Demo
 *
 * Node.js コンソール上で OpRunner + IOpHandler パイプラインを体験するデモ。
 * Op 命令列を直接構築し、コンパイラなしでインタプリタの動作を確認できる。
 *
 * 実行: npm run demo
 */
import * as readline from "node:readline";
import { OpRunner } from "@kaedevn/core";
import type { Op, CompiledScenario, IOpHandler, ChAnimParams } from "@kaedevn/core";

// ─── readline helpers ───

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let rlClosed = false;
rl.once("close", () => {
  rlClosed = true;
});

function waitEnter(prompt = "--- Enter で続行 ---"): Promise<void> {
  if (rlClosed) return Promise.resolve();
  return new Promise((resolve) => {
    rl.question(prompt, () => resolve());
    rl.once("close", () => resolve());
  });
}

function askNumber(prompt: string, max: number): Promise<number> {
  if (rlClosed) return Promise.resolve(1);
  return new Promise((resolve) => {
    const ask = () => {
      rl.question(prompt, (answer) => {
        const n = parseInt(answer, 10);
        if (n >= 1 && n <= max) {
          resolve(n);
        } else {
          console.log(`  1〜${max} の数字を入力してください`);
          ask();
        }
      });
    };
    ask();
    rl.once("close", () => resolve(1));
  });
}

// ─── ConsoleHandler (IOpHandler 実装) ───

class ConsoleHandler implements IOpHandler {
  async textAppend(who: string | undefined, text: string): Promise<void> {
    if (who) {
      process.stdout.write(`[${who}] ${text}`);
    } else {
      process.stdout.write(text);
    }
  }

  async textNl(): Promise<void> {
    process.stdout.write("\n");
  }

  async waitClick(): Promise<void> {
    console.log();
    await waitEnter();
  }

  async page(): Promise<void> {
    console.log();
    console.log("────────────────────────────────");
    await waitEnter();
  }

  async waitMs(ms: number): Promise<void> {
    console.log(`  ⏳ ${ms}ms 待機...`);
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  async bgSet(id: string, fadeMs?: number): Promise<void> {
    const fade = fadeMs ? ` (fade ${fadeMs}ms)` : "";
    console.log(`  🖼  背景: ${id}${fade}`);
  }

  async chSet(
    name: string,
    pose: string,
    pos: "left" | "center" | "right",
    fadeMs?: number,
  ): Promise<void> {
    const fade = fadeMs ? ` fade ${fadeMs}ms` : "";
    console.log(`  👤 キャラクター: ${name} (${pose}) [${pos}]${fade}`);
  }

  async chHide(name: string, fadeMs?: number): Promise<void> {
    const fade = fadeMs ? ` (fade ${fadeMs}ms)` : "";
    console.log(`  👤 キャラクター非表示: ${name}${fade}`);
  }

  async chClear(fadeMs?: number): Promise<void> {
    const fade = fadeMs ? ` (fade ${fadeMs}ms)` : "";
    console.log(`  👤 全キャラクター非表示${fade}`);
  }

  async chAnim(params: ChAnimParams): Promise<void> {
    console.log(
      `  🎞  アニメーション: ${params.name} (${params.frames}f @${params.fps}fps) [${params.pos}]`,
    );
  }

  bgmPlay(id: string, vol?: number, fadeMs?: number): void {
    const v = vol !== undefined ? ` vol=${vol}` : "";
    const f = fadeMs ? ` fade=${fadeMs}ms` : "";
    console.log(`  🎵 BGM: ${id}${v}${f}`);
  }

  bgmStop(fadeMs?: number): void {
    const f = fadeMs ? ` (fade ${fadeMs}ms)` : "";
    console.log(`  🎵 BGM停止${f}`);
  }

  sePlay(id: string, vol?: number): void {
    const v = vol !== undefined ? ` vol=${vol}` : "";
    console.log(`  🔊 SE: ${id}${v}`);
  }

  voicePlay(id: string): void {
    console.log(`  🎤 Voice: ${id}`);
  }

  async waitVoiceEnd(): Promise<void> {
    console.log("  🎤 音声終了待機（スキップ）");
  }

  async choice(options: Array<{ label: string; jump: number }>): Promise<number> {
    console.log();
    console.log("┌─ 選択肢 ─────────────────────┐");
    options.forEach((opt, i) => {
      console.log(`│  ${i + 1}. ${opt.label}`);
    });
    console.log("└──────────────────────────────┘");
    const selected = await askNumber("  番号を入力: ", options.length);
    return options[selected - 1].jump;
  }
}

// ─── デモシナリオ定義 ───

/**
 * シナリオ1: 基本テキスト表示
 * テキスト、背景、キャラクター、BGM/SE の基本コマンドを体験
 */
function basicScenario(): CompiledScenario {
  const ops: Op[] = [
    { op: "BG_SET", id: "room_day" },
    { op: "CH_SET", name: "hero", pose: "smile", pos: "center" },
    { op: "BGM_PLAY", id: "calm", vol: 70 },
    { op: "TEXT_APPEND", who: "主人公", text: "良い朝だ。" },
    { op: "TEXT_APPEND", text: "今日は何をしようか。" },
    { op: "WAIT_CLICK" },
    { op: "WAIT_MS", ms: 500 },
    { op: "SE_PLAY", id: "door" },
    { op: "TEXT_APPEND", text: "扉をノックする音が聞こえた。" },
    { op: "WAIT_CLICK" },
    { op: "CH_SET", name: "heroine", pose: "happy", pos: "right", fadeMs: 300 },
    { op: "TEXT_APPEND", who: "ヒロイン", text: "おはよう！" },
    { op: "WAIT_CLICK" },
    { op: "TEXT_APPEND", who: "主人公", text: "やあ、おはよう。" },
    { op: "PAGE" },
    { op: "CH_HIDE", name: "hero", fadeMs: 200 },
    { op: "CH_HIDE", name: "heroine", fadeMs: 200 },
    { op: "BGM_STOP", fadeMs: 500 },
    { op: "TEXT_APPEND", text: "おわり。" },
    { op: "PAGE" },
  ];
  return { id: "basic", ops };
}

/**
 * シナリオ2: 3回ループ（変数 + if + ジャンプ）
 *
 * 擬似コード:
 *   counter = 0
 *   *loop:                          ← pc=1
 *     counter += 1
 *     TEXT "○回目のループです"
 *     WAIT_CLICK
 *     JUMP_IF counter >= 3 → done   ← pc=5, true → pc=7
 *     JUMP → loop                   ← pc=6 → pc=1
 *   *done:                          ← pc=7
 *     TEXT "3回ループしました。終了！"
 *     PAGE
 */
function loopScenario(): CompiledScenario {
  const ops: Op[] = [
    // pc=0: counter = 0
    { op: "VAR_SET", name: "counter", value: 0 },
    // pc=1: *loop — counter += 1
    { op: "VAR_ADD", name: "counter", value: 1 },
    // pc=2: テキスト表示
    { op: "TEXT_APPEND", who: "ナレーター", text: "ループを実行中..." },
    { op: "WAIT_CLICK" },                           // pc=3
    // pc=4: SE で繰り返しを演出
    { op: "SE_PLAY", id: "tick" },
    // pc=5: counter >= 3 なら done(pc=7) へ
    { op: "JUMP_IF", condition: "counter >= 3", pc: 7 },
    // pc=6: まだ 3 回に達していない → loop(pc=1) に戻る
    { op: "JUMP", pc: 1 },
    // pc=7: *done — ループ終了
    { op: "TEXT_APPEND", who: "ナレーター", text: "3回ループしました。終了！" },
    { op: "PAGE" },                                  // pc=8
  ];
  return { id: "loop", ops };
}

/**
 * シナリオ3: 選択肢 + 変数分岐
 *
 * 好感度を選択肢で増減し、最後に分岐する。
 */
function choiceScenario(): CompiledScenario {
  const ops: Op[] = [
    // pc=0: 初期化
    { op: "VAR_SET", name: "affection", value: 0 },
    { op: "BG_SET", id: "park" },                    // pc=1
    { op: "CH_SET", name: "heroine", pose: "smile", pos: "center" }, // pc=2
    { op: "TEXT_APPEND", who: "ヒロイン", text: "今日は何をしましょうか？" },
    { op: "WAIT_CLICK" },                             // pc=4

    // pc=5: 選択肢
    //   "一緒に散歩する" → pc=6  (affection +2)
    //   "ここで待つ"     → pc=10 (affection +0)
    { op: "CHOICE", options: [
      { label: "一緒に散歩する", jump: 6 },
      { label: "ここで待つ",     jump: 10 },
    ]},

    // ── 選択肢A: 散歩 (pc=6〜9) ──
    { op: "VAR_ADD", name: "affection", value: 2 },   // pc=6
    { op: "TEXT_APPEND", who: "ヒロイン", text: "やった！行きましょう！" },
    { op: "WAIT_CLICK" },                              // pc=8
    { op: "JUMP", pc: 13 },                            // pc=9 → 合流

    // ── 選択肢B: 待つ (pc=10〜12) ──
    { op: "TEXT_APPEND", who: "ヒロイン", text: "そう…わかった。" },  // pc=10
    { op: "WAIT_CLICK" },                              // pc=11
    { op: "JUMP", pc: 13 },                            // pc=12 → 合流

    // ── 合流 (pc=13) ──
    // affection >= 2 なら good(pc=15)、そうでなければ normal(pc=14)
    { op: "JUMP_IF", condition: "affection >= 2", pc: 17 }, // pc=13

    // ── normal エンド (pc=14〜16) ──
    { op: "TEXT_APPEND", who: "ナレーター", text: "普通の一日が過ぎた。" }, // pc=14
    { op: "PAGE" },                                    // pc=15
    { op: "JUMP", pc: 19 },                            // pc=16 → end

    // ── good エンド (pc=17〜18) ──
    { op: "TEXT_APPEND", who: "ナレーター", text: "二人の距離が縮まった。" }, // pc=17
    { op: "PAGE" },                                    // pc=18

    // ── end (pc=19) ──
    { op: "CH_CLEAR" },                                // pc=19
    { op: "TEXT_APPEND", text: "おわり。" },            // pc=20
    { op: "PAGE" },                                    // pc=21
  ];
  return { id: "choice", ops };
}

// ─── suppress OpRunner debug logs ───

const originalLog = console.log;
console.log = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].startsWith("[OpRunner]")) return;
  originalLog(...args);
};

// ─── main ───

const scenarios = [
  { name: "基本テキスト表示",        build: basicScenario },
  { name: "3回ループ (変数+if+jump)", build: loopScenario },
  { name: "選択肢 + 変数分岐",       build: choiceScenario },
];

async function main() {
  console.log("╔══════════════════════════════════╗");
  console.log("║   kaedevn Console Demo           ║");
  console.log("╚══════════════════════════════════╝");
  console.log();
  console.log("シナリオを選んでください:");
  scenarios.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}`);
  });
  console.log();

  const selected = await askNumber("番号を入力: ", scenarios.length);
  const entry = scenarios[selected - 1];
  const scenario = entry.build();

  console.log();
  console.log(`▶ ${entry.name} (${scenario.ops.length} ops)`);
  console.log();

  const runner = new OpRunner();
  const handler = new ConsoleHandler();
  await runner.start(scenario, handler);

  console.log();
  console.log("🏁 シナリオ終了");
  rl.close();
}

main().catch((err) => {
  console.error("Error:", err);
  rl.close();
  process.exit(1);
});
