/**
 * Phase 2 デバッグスクリプト
 */
import { Interpreter } from "../src/core/Interpreter.js";
import type { IEngineAPI, ChoiceOption } from "../src/engine/IEngineAPI.js";

class DebugEngineAPI implements IEngineAPI {
  async showDialogue(speaker: string, lines: string[]): Promise<void> {
    console.log(`  [Engine] showDialogue: ${speaker}`);
  }

  async setBg(name: string, effect?: string): Promise<void> {
    console.log(`  [Engine] setBg: ${name}`);
  }

  async showChar(name: string, pose: string, position?: string): Promise<void> {}
  async hideChar(name: string): Promise<void> {}
  async moveChar(name: string, position: string, time: number): Promise<void> {}
  playBgm(name: string): void {}
  stopBgm(): void {}
  async fadeBgm(time: number): Promise<void> {}
  playSe(name: string): void {}
  async playTimeline(name: string): Promise<void> {}
  async showChoice(options: ChoiceOption[]): Promise<number> { return 0; }
  async waitForClick(): Promise<void> {}
  async wait(ms: number): Promise<void> {}
}

async function debug() {
  console.log("=== Phase 2 デバッグ ===\n");

  const engine = new DebugEngineAPI();
  const interpreter = new Interpreter(engine);

  const script = `
bg("start")
call("subroutine")
bg("after_call")

*subroutine
bg("subroutine")
ret()
`;

  console.log("スクリプト:");
  console.log(script);
  console.log("\n実行開始...\n");

  try {
    // インタプリタの内部状態を監視するため、プロトタイプを拡張
    const originalExecuteCall = (interpreter as any).executeCall.bind(interpreter);
    const originalExecuteRet = (interpreter as any).executeRet.bind(interpreter);

    (interpreter as any).executeCall = function(label: string) {
      console.log(`[DEBUG] executeCall("${label}") - PC=${this.pc}, stack depth=${this.state.callStack.length}`);
      originalExecuteCall(label);
      console.log(`[DEBUG] after call - PC=${this.pc}, stack depth=${this.state.callStack.length}`);
    };

    (interpreter as any).executeRet = function() {
      console.log(`[DEBUG] executeRet() - PC=${this.pc}, stack depth=${this.state.callStack.length}`);
      if (this.state.callStack.length > 0) {
        console.log(`[DEBUG] frame to pop:`, this.state.callStack[this.state.callStack.length - 1]);
      }
      originalExecuteRet();
      console.log(`[DEBUG] after ret - PC=${this.pc}, stack depth=${this.state.callStack.length}`);
    };

    await interpreter.run(script);
    console.log("\n✅ 実行完了");
  } catch (error) {
    console.error("\n❌ エラー:", error);
  }
}

debug().catch(console.error);
