/**
 * IEngineAPI のテスト用実装
 * ゲーム状態を実際に管理し、問い合わせ可能な TestEngine
 * テストやスクリプト検証に使用する
 */
import type { IEngineAPI, ChoiceOption } from "./IEngineAPI.js";

/** キャラクターの表示状態 */
export interface CharState {
  pose: string;
  position: string;
  anim: boolean;
}

export class TestEngine implements IEngineAPI {
  // ── 状態 ──
  currentBg: string | null = null;
  characters: Map<string, CharState> = new Map();
  currentBgm: { name: string; vol: number } | null = null;
  dialogues: Array<{ speaker: string; lines: string[] }> = [];
  choices: Array<{ options: string[]; selected: number }> = [];
  battles: Array<{ troopId: string; result: "win" | "lose" }> = [];

  // ── テスト制御 ──
  /** showChoice が順番に返すインデックス */
  choiceQueue: number[] = [];
  /** battleStart が順番に返す結果 */
  battleQueue: Array<"win" | "lose"> = [];

  // ── セリフ ──

  async showDialogue(speaker: string, lines: string[]): Promise<void> {
    this.dialogues.push({ speaker, lines });
  }

  /** 最後のセリフを取得 */
  get lastDialogue() {
    return this.dialogues[this.dialogues.length - 1] ?? null;
  }

  // ── 背景 ──

  async setBg(name: string, effect?: string): Promise<void> {
    this.currentBg = name;
  }

  // ── キャラクター ──

  async showChar(
    name: string,
    pose: string,
    position?: string,
    fadeMs?: number,
  ): Promise<void> {
    this.characters.set(name, {
      pose,
      position: position ?? "center",
      anim: false,
    });
  }

  async showCharAnim(
    name: string,
    pose: string,
    position: string,
  ): Promise<void> {
    this.characters.set(name, { pose, position, anim: true });
  }

  async hideChar(name: string, fadeMs?: number): Promise<void> {
    this.characters.delete(name);
  }

  async clearChars(fadeMs?: number): Promise<void> {
    this.characters.clear();
  }

  async moveChar(
    name: string,
    position: string,
    time: number,
  ): Promise<void> {
    const ch = this.characters.get(name);
    if (ch) ch.position = position;
  }

  /** キャラクターが表示中か */
  isCharVisible(name: string): boolean {
    return this.characters.has(name);
  }

  /** キャラクターの現在ポーズ */
  getCharPose(name: string): string | null {
    return this.characters.get(name)?.pose ?? null;
  }

  /** キャラクターの現在位置 */
  getCharPosition(name: string): string | null {
    return this.characters.get(name)?.position ?? null;
  }

  // ── オーディオ ──

  playBgm(name: string, vol?: number, fadeMs?: number): void {
    this.currentBgm = { name, vol: vol ?? 100 };
  }

  stopBgm(): void {
    this.currentBgm = null;
  }

  async fadeBgm(time: number): Promise<void> {
    this.currentBgm = null;
  }

  playSe(name: string, vol?: number): void {
    // fire-and-forget: SE は状態を持たない
  }

  playVoice(name: string): void {
    // fire-and-forget
  }

  /** BGM が再生中か */
  get isBgmPlaying(): boolean {
    return this.currentBgm !== null;
  }

  // ── タイムライン ──

  async playTimeline(name: string): Promise<void> {
    // no-op
  }

  // ── バトル ──

  async battleStart(troopId: string): Promise<"win" | "lose"> {
    const result = this.battleQueue.shift() ?? "win";
    this.battles.push({ troopId, result });
    return result;
  }

  // ── UI ──

  async showChoice(options: ChoiceOption[]): Promise<number> {
    const selected = this.choiceQueue.shift() ?? 0;
    this.choices.push({ options: options.map((o) => o.text), selected });
    return selected;
  }

  async waitForClick(): Promise<void> {}

  async wait(ms: number): Promise<void> {}

  // ── リセット ──

  reset(): void {
    this.currentBg = null;
    this.characters.clear();
    this.currentBgm = null;
    this.dialogues = [];
    this.choices = [];
    this.battles = [];
    this.choiceQueue = [];
    this.battleQueue = [];
  }
}
