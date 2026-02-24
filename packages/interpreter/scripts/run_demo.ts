#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { Interpreter } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Engine - デモ実行用
class DemoEngine {
  private log: string[] = [];

  async showDialogue(params: {
    character?: string;
    text: string;
    voiceId?: string;
  }) {
    const prefix = params.character ? `#${params.character}` : "#narrator";
    console.log(`${prefix}\n${params.text}\n`);
    this.log.push(`[DIALOGUE] ${prefix}: ${params.text}`);
  }

  async setBg(id: string) {
    console.log(`[BG] ${id}`);
    this.log.push(`[BG] ${id}`);
  }

  async showChar(params: { id: string; expression: string; position: string }) {
    console.log(
      `[CHAR SHOW] ${params.id} - ${params.expression} at ${params.position}`
    );
    this.log.push(
      `[CHAR SHOW] ${params.id} - ${params.expression} at ${params.position}`
    );
  }

  async hideChar(id: string) {
    console.log(`[CHAR HIDE] ${id}`);
    this.log.push(`[CHAR HIDE] ${id}`);
  }

  async moveChar(params: { id: string; x: number; y: number }) {
    console.log(`[CHAR MOVE] ${params.id} to (${params.x}, ${params.y})`);
    this.log.push(`[CHAR MOVE] ${params.id} to (${params.x}, ${params.y})`);
  }

  playBgm(id: string) {
    console.log(`[BGM] ${id}`);
    this.log.push(`[BGM] ${id}`);
  }

  stopBgm() {
    console.log(`[BGM STOP]`);
    this.log.push(`[BGM STOP]`);
  }

  async fadeBgm(duration: number) {
    console.log(`[BGM FADE] ${duration}ms`);
    this.log.push(`[BGM FADE] ${duration}ms`);
  }

  playSe(id: string) {
    console.log(`[SE] ${id}`);
    this.log.push(`[SE] ${id}`);
  }

  async playTimeline(id: string) {
    console.log(`[TIMELINE] ${id}`);
    this.log.push(`[TIMELINE] ${id}`);
  }

  async showChoice(options: Array<{ text: string }>) {
    console.log(`[CHOICE]`);
    options.forEach((opt, idx) => {
      console.log(`  ${idx + 1}. ${opt.text}`);
    });
    this.log.push(
      `[CHOICE] ${options.map((o, i) => `${i + 1}. ${o.text}`).join(", ")}`
    );

    // デモでは自動的に最初の選択肢を選ぶ
    const choice = 0;
    console.log(`\n→ 選択: ${options[choice].text}\n`);
    return choice;
  }

  async waitForClick() {
    console.log(`[WAIT CLICK]`);
    this.log.push(`[WAIT CLICK]`);
  }

  async wait(duration: number) {
    console.log(`[WAIT] ${duration}ms`);
    this.log.push(`[WAIT] ${duration}ms`);
  }

  getLog(): string[] {
    return [...this.log];
  }

  clearLog(): void {
    this.log = [];
  }
}

// メイン実行
async function main() {
  console.log("=".repeat(60));
  console.log("KNF Interpreter Demo - 学園恋愛ノベル");
  console.log("=".repeat(60));
  console.log();

  // スクリプトを読み込む
  const scriptPath = path.join(__dirname, "../examples/04-full-scenario.ksc");
  const script = fs.readFileSync(scriptPath, "utf-8");

  console.log(`スクリプト読み込み: ${scriptPath}`);
  console.log(`スクリプトサイズ: ${script.split("\n").length} 行\n`);

  // デバッグモードを有効にしてインタプリタを作成
  const engine = new DemoEngine();
  const interpreter = new Interpreter(engine, { debug: true });
  const debugger = interpreter.getDebugger();

  // デバッグ設定
  debugger.watchVariable("affection");
  debugger.watchVariable("flag_library");
  debugger.watchVariable("flag_rooftop");
  debugger.enableTrace();

  console.log("デバッグモード: 有効");
  console.log("監視変数: affection, flag_library, flag_rooftop");
  console.log();
  console.log("=".repeat(60));
  console.log("スクリプト実行開始");
  console.log("=".repeat(60));
  console.log();

  try {
    const startTime = Date.now();
    await interpreter.run(script);
    const endTime = Date.now();

    console.log();
    console.log("=".repeat(60));
    console.log("スクリプト実行完了");
    console.log("=".repeat(60));
    console.log();

    // 実行統計
    console.log("【実行統計】");
    console.log(`実行時間: ${endTime - startTime}ms`);
    console.log(`実行コマンド数: ${engine.getLog().length}`);
    console.log();

    // 変数の最終状態
    const state = interpreter.getState();
    console.log("【変数の最終状態】");
    console.log(`  affection: ${state.variables.affection}`);
    console.log(`  flag_library: ${state.variables.flag_library}`);
    console.log(`  flag_rooftop: ${state.variables.flag_rooftop}`);
    console.log(`  flag_confession: ${state.variables.flag_confession}`);
    console.log();

    // 好感度の変更履歴
    const affectionHistory = debugger.getVariableHistory("affection");
    console.log("【好感度の変更履歴】");
    affectionHistory.forEach((change, idx) => {
      console.log(
        `  ${idx + 1}. Line ${change.line}: ${change.oldValue} → ${change.newValue}`
      );
    });
    console.log();

    // トレースログ（最初と最後の10件）
    const traceLog = debugger.getTraceLog();
    console.log(`【トレースログ】（全${traceLog.length}件）`);
    console.log("\n最初の10件:");
    traceLog.slice(0, 10).forEach((log) => console.log(`  ${log}`));
    if (traceLog.length > 20) {
      console.log("\n...");
      console.log("\n最後の10件:");
      traceLog.slice(-10).forEach((log) => console.log(`  ${log}`));
    }
    console.log();

    console.log("✅ デモ実行成功!");
  } catch (error) {
    console.error();
    console.error("=".repeat(60));
    console.error("❌ エラー発生");
    console.error("=".repeat(60));
    console.error();
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
