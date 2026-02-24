/**
 * IEngineAPI のコンソール実装
 * 標準出力にテキストを出力する OSS 公式リファレンス実装
 */
import type { IEngineAPI, ChoiceOption } from "./IEngineAPI.js";

export interface ConsoleEngineOptions {
  /** 選択肢の自動選択インデックス（デフォルト: 0） */
  defaultChoice?: number;
  /** バトルの自動結果（デフォルト: "win"） */
  defaultBattleResult?: "win" | "lose";
  /** wait() を実際に待つか（デフォルト: false） */
  realTime?: boolean;
  /** 出力先（デフォルト: console.log） */
  output?: (message: string) => void;
}

export class ConsoleEngine implements IEngineAPI {
  private out: (message: string) => void;
  private defaultChoice: number;
  private defaultBattleResult: "win" | "lose";
  private realTime: boolean;

  constructor(options?: ConsoleEngineOptions) {
    this.out = options?.output ?? console.log;
    this.defaultChoice = options?.defaultChoice ?? 0;
    this.defaultBattleResult = options?.defaultBattleResult ?? "win";
    this.realTime = options?.realTime ?? false;
  }

  // ========== セリフ ==========

  async showDialogue(speaker: string, lines: string[]): Promise<void> {
    const name = speaker || "ナレーション";
    const text = lines.map((l) => `  ${l}`).join("\n");
    this.out(`\n【${name}】\n${text}`);
  }

  // ========== 背景 ==========

  async setBg(name: string, effect?: string): Promise<void> {
    const suffix = effect ? ` (${effect})` : "";
    this.out(`[背景] ${name}${suffix}`);
  }

  // ========== キャラクター ==========

  async showChar(
    name: string,
    pose: string,
    position?: string,
    fadeMs?: number,
  ): Promise<void> {
    const parts = [name, pose];
    if (position) parts.push(position);
    if (fadeMs !== undefined) parts.push(`${fadeMs}ms`);
    this.out(`[キャラ表示] ${parts.join(" ")}`);
  }

  async showCharAnim(
    name: string,
    pose: string,
    position: string,
  ): Promise<void> {
    this.out(`[キャラアニメ] ${name} ${pose} ${position}`);
  }

  async hideChar(name: string, fadeMs?: number): Promise<void> {
    const suffix = fadeMs !== undefined ? ` ${fadeMs}ms` : "";
    this.out(`[キャラ非表示] ${name}${suffix}`);
  }

  async clearChars(fadeMs?: number): Promise<void> {
    const suffix = fadeMs !== undefined ? ` ${fadeMs}ms` : "";
    this.out(`[キャラ全消去]${suffix}`);
  }

  async moveChar(
    name: string,
    position: string,
    time: number,
  ): Promise<void> {
    this.out(`[キャラ移動] ${name} → ${position} (${time}ms)`);
  }

  // ========== オーディオ ==========

  playBgm(name: string, vol?: number, fadeMs?: number): void {
    const opts: string[] = [];
    if (vol !== undefined) opts.push(`vol=${vol}`);
    if (fadeMs !== undefined) opts.push(`fade=${fadeMs}ms`);
    const suffix = opts.length > 0 ? ` ${opts.join(" ")}` : "";
    this.out(`[BGM] ${name}${suffix}`);
  }

  stopBgm(): void {
    this.out("[BGM停止]");
  }

  async fadeBgm(time: number): Promise<void> {
    this.out(`[BGMフェード] ${time}ms`);
  }

  playSe(name: string, vol?: number): void {
    const suffix = vol !== undefined ? ` vol=${vol}` : "";
    this.out(`[SE] ${name}${suffix}`);
  }

  playVoice(name: string): void {
    this.out(`[ボイス] ${name}`);
  }

  // ========== タイムライン ==========

  async playTimeline(name: string): Promise<void> {
    this.out(`[タイムライン] ${name}`);
  }

  // ========== バトル ==========

  async battleStart(troopId: string): Promise<"win" | "lose"> {
    this.out(`[バトル] ${troopId} → ${this.defaultBattleResult}`);
    return this.defaultBattleResult;
  }

  // ========== UI ==========

  async showChoice(options: ChoiceOption[]): Promise<number> {
    const lines = options.map((opt, i) => `  ${i + 1}. ${opt.text}`);
    this.out(
      `=== 選択肢 ===\n${lines.join("\n")}\n→ 自動選択: ${this.defaultChoice + 1}`,
    );
    return this.defaultChoice;
  }

  async waitForClick(): Promise<void> {
    this.out("[クリック待ち]");
  }

  async wait(ms: number): Promise<void> {
    this.out(`[待機] ${ms}ms`);
    if (this.realTime) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }
}
