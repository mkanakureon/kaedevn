/**
 * エンジンAPIインターフェース
 * プラットフォーム非依存の抽象化層
 * Web (PixiJS) と Switch の両方で実装される
 */
export interface IEngineAPI {
  // ========== セリフ ==========
  /**
   * セリフを表示してクリック待ち
   * @param speaker キャラクター名（空文字列の場合は地の文）
   * @param lines テキスト行の配列
   */
  showDialogue(speaker: string, lines: string[]): Promise<void>;

  // ========== 背景 ==========
  /**
   * 背景を設定
   * @param name 背景ID
   * @param effect エフェクト名（"fade"など）
   */
  setBg(name: string, effect?: string): Promise<void>;

  // ========== キャラクター ==========
  /**
   * キャラクターを表示
   * @param name キャラクター名
   * @param pose ポーズ名
   * @param position 位置（"left" | "center" | "right"）
   * @param fadeMs フェード時間（ミリ秒）
   */
  showChar(name: string, pose: string, position?: string, fadeMs?: number): Promise<void>;

  /**
   * キャラクターをアニメーション表示（ループアニメーション）
   * @param name キャラクター名
   * @param pose ポーズ名（アニメーションスラッグ）
   * @param position 位置（"left" | "center" | "right"）
   */
  showCharAnim(name: string, pose: string, position: string): Promise<void>;

  /**
   * キャラクターを非表示
   * @param name キャラクター名
   * @param fadeMs フェード時間（ミリ秒）
   */
  hideChar(name: string, fadeMs?: number): Promise<void>;

  /**
   * 全キャラクターを消去
   * @param fadeMs フェード時間（ミリ秒）
   */
  clearChars(fadeMs?: number): Promise<void>;

  /**
   * キャラクターを移動
   * @param name キャラクター名
   * @param position 移動先位置
   * @param time 移動時間（ミリ秒）
   */
  moveChar(name: string, position: string, time: number): Promise<void>;

  // ========== オーディオ ==========
  /**
   * BGMを再生
   * @param name BGM ID
   * @param vol 音量（0–100）
   * @param fadeMs フェードイン時間（ミリ秒）
   */
  playBgm(name: string, vol?: number, fadeMs?: number): void;

  /**
   * BGMを停止
   */
  stopBgm(): void;

  /**
   * BGMをフェードアウト
   * @param time フェード時間（ミリ秒）
   */
  fadeBgm(time: number): Promise<void>;

  /**
   * 効果音を再生
   * @param name SE ID
   * @param vol 音量（0–100）
   */
  playSe(name: string, vol?: number): void;

  /**
   * ボイスを再生
   * @param name ボイスファイル ID
   */
  playVoice(name: string): void;

  // ========== タイムライン ==========
  /**
   * タイムラインJSONを実行
   * @param name タイムライン名
   */
  playTimeline(name: string): Promise<void>;

  // ========== バトル ==========
  /**
   * バトルを開始し、勝敗結果を返す
   * @param troopId 敵グループID
   * @returns 'win' | 'lose'
   */
  battleStart(troopId: string): Promise<'win' | 'lose'>;

  // ========== UI ==========
  /**
   * 選択肢を表示してプレイヤーの選択を待つ
   * @param options 選択肢の配列
   * @returns 選択されたインデックス（0始まり）
   */
  showChoice(options: ChoiceOption[]): Promise<number>;

  /**
   * クリック待ち
   */
  waitForClick(): Promise<void>;

  /**
   * 指定時間待機
   * @param ms 待機時間（ミリ秒）
   */
  wait(ms: number): Promise<void>;
}

/**
 * 選択肢オプション
 */
export interface ChoiceOption {
  /** 選択肢のテキスト */
  text: string;

  /** 表示条件（falseの場合は非表示） */
  condition?: boolean;
}
