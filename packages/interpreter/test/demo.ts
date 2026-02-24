/**
 * Phase 1 動作確認デモ
 * 実際の.kscスクリプトを実行して動作を確認
 */
import { Interpreter } from "../src/core/Interpreter.js";
import type { IEngineAPI, ChoiceOption } from "../src/engine/IEngineAPI.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// デモ用のエンジンAPI実装
class DemoEngineAPI implements IEngineAPI {
  private callCount = 0;

  private log(method: string, ...args: unknown[]) {
    this.callCount++;
    console.log(`\n[${this.callCount}] ${method}`);
    if (args.length > 0) {
      console.log("  ", JSON.stringify(args, null, 2));
    }
  }

  async showDialogue(speaker: string, lines: string[]): Promise<void> {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    if (speaker) {
      console.log(`👤 ${speaker}`);
    }
    for (const line of lines) {
      console.log(`💬 ${line}`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.log("showDialogue", { speaker, lines });
  }

  async setBg(name: string, effect?: string): Promise<void> {
    const effectStr = effect ? ` (${effect})` : "";
    console.log(`\n🖼️  背景: ${name}${effectStr}`);
    this.log("setBg", { name, effect });
  }

  async showChar(name: string, pose: string, position?: string): Promise<void> {
    console.log(`\n🧍 キャラ表示: ${name} (${pose}) - ${position || "default"}`);
    this.log("showChar", { name, pose, position });
  }

  async hideChar(name: string): Promise<void> {
    console.log(`\n👻 キャラ非表示: ${name}`);
    this.log("hideChar", { name });
  }

  async moveChar(name: string, position: string, time: number): Promise<void> {
    console.log(`\n🚶 キャラ移動: ${name} → ${position} (${time}ms)`);
    this.log("moveChar", { name, position, time });
  }

  playBgm(name: string): void {
    console.log(`\n🎵 BGM: ${name}`);
    this.log("playBgm", { name });
  }

  stopBgm(): void {
    console.log(`\n🔇 BGM停止`);
    this.log("stopBgm");
  }

  async fadeBgm(time: number): Promise<void> {
    console.log(`\n🔉 BGMフェード: ${time}ms`);
    this.log("fadeBgm", { time });
  }

  playSe(name: string): void {
    console.log(`\n🔔 SE: ${name}`);
    this.log("playSe", { name });
  }

  async playTimeline(name: string): Promise<void> {
    console.log(`\n⏱️  タイムライン: ${name}`);
    this.log("playTimeline", { name });
  }

  async showChoice(options: ChoiceOption[]): Promise<number> {
    console.log(`\n🎯 選択肢:`);
    options.forEach((opt, idx) => {
      console.log(`  ${idx + 1}. ${opt.text}`);
    });
    this.log("showChoice", { options });
    return 0;
  }

  async waitForClick(): Promise<void> {
    console.log(`\n⏸️  クリック待ち`);
    this.log("waitForClick");
  }

  async wait(ms: number): Promise<void> {
    console.log(`\n⏱️  待機: ${ms}ms`);
    this.log("wait", { ms });
  }
}

async function runDemo() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║     KNF Interpreter Phase 1 動作確認デモ                 ║");
  console.log("║     .ksc (Kaede Script) 実行テスト                       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  const engine = new DemoEngineAPI();
  const interpreter = new Interpreter(engine);

  // 01-hello.kscを読み込んで実行
  const scriptPath = join(__dirname, "../examples/01-hello.ksc");
  console.log(`\n📄 読み込み: ${scriptPath}\n`);

  const script = readFileSync(scriptPath, "utf-8");

  console.log("─────────────────────────────────────────────────────────");
  console.log("スクリプト内容:");
  console.log("─────────────────────────────────────────────────────────");
  console.log(script);
  console.log("─────────────────────────────────────────────────────────");

  console.log("\n\n🚀 実行開始...\n");

  try {
    await interpreter.run(script);
    console.log("\n\n✅ 実行完了！");

    // 状態を確認
    const state = interpreter.getState();
    console.log("\n📊 インタプリタ状態:");
    console.log(`  PC: ${state.pc}`);
    console.log(`  変数: ${JSON.stringify(state.variables, null, 2)}`);
  } catch (error) {
    console.error("\n❌ エラーが発生しました:");
    console.error(error);
  }
}

// 実行
runDemo().catch(console.error);
