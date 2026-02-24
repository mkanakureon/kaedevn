# KNF Interpreter ブラウザ統合計画

**作成日**: 2026-02-09
**目標**: KNF Interpreterをブラウザで実行可能にし、PixiJSで描画する

## 現状分析

### 既存の構造

#### @kaedevn/web パッケージ
- ✅ PixiJS ベースの描画エンジン
- ✅ LayerManager: 背景/キャラクター/UIレイヤー管理
- ✅ TextWindow: セリフ表示ウィンドウ
- ✅ ChoiceOverlay: 選択肢UI
- ✅ AudioManager: BGM/SE再生
- ✅ InputManager: キーボード/マウス入力
- ✅ StorageManager: IndexedDBによるセーブ/ロード
- ✅ GameUI: メニュー/設定/セーブロード画面

**現在の動作**: Op[] 配列（コンパイル済みタイムラインJSON）を OpRunner で実行

#### @kaedevn/interpreter パッケージ
- ✅ KNF Script (.ksc) パーサー
- ✅ Interpreter: スクリプト実行エンジン
- ✅ IEngineAPI: プラットフォーム非依存のインターフェース
- ✅ デバッグ機能（Phase 7-2）
- ✅ エラーハンドリング（Phase 7-1）

**必要なもの**: IEngineAPI を実装した WebEngine クラス

---

## 統合計画

### Phase 1: WebEngine 実装（基本）

#### 目標
既存の Web パッケージの機能を使って IEngineAPI を実装

#### 実装内容

**1.1 WebEngine クラス作成**

```typescript
// packages/web/src/engine/WebEngine.ts
import { IEngineAPI, ChoiceOption } from "@kaedevn/interpreter";
import { LayerManager } from "../renderer/LayerManager";
import { TextWindow } from "../renderer/TextWindow";
import { ChoiceOverlay } from "../renderer/ChoiceOverlay";
import { AudioManager } from "../audio/AudioManager";

export class WebEngine implements IEngineAPI {
  constructor(
    private layers: LayerManager,
    private textWindow: TextWindow,
    private choiceOverlay: ChoiceOverlay,
    private audio: AudioManager
  ) {}

  // IEngineAPI の全メソッドを実装
  async showDialogue(params: {
    character?: string;
    text: string;
    voiceId?: string;
  }): Promise<void> {
    // TextWindow を使用
  }

  async setBg(id: string): Promise<void> {
    // LayerManager.bgLayer を使用
  }

  async showChar(params: {
    id: string;
    expression: string;
    position: string;
  }): Promise<void> {
    // LayerManager.charLayer を使用
  }

  // ... 他のメソッド
}
```

**1.2 シグネチャの調整**

現在の Interpreter の IEngineAPI インターフェースを確認し、必要に応じて調整：

```typescript
// 現在の呼び出し形式
showDialogue(params: { character?: string; text: string })

// IEngineAPI の期待形式
showDialogue(speaker: string, lines: string[])
```

→ Interpreter または WebEngine のどちらかを調整

**1.3 マッピングの実装**

| IEngineAPI メソッド | Web実装 | 優先度 |
|-------------------|--------|--------|
| showDialogue | TextWindow | 🔴 必須 |
| setBg | LayerManager.bgLayer | 🔴 必須 |
| showChar | LayerManager.charLayer | 🔴 必須 |
| hideChar | LayerManager.charLayer | 🔴 必須 |
| moveChar | LayerManager.charLayer | 🟡 推奨 |
| playBgm | AudioManager | 🔴 必須 |
| stopBgm | AudioManager | 🔴 必須 |
| fadeBgm | AudioManager | 🟡 推奨 |
| playSe | AudioManager | 🟡 推奨 |
| playTimeline | WebOpHandler | 🟢 任意 |
| showChoice | ChoiceOverlay | 🔴 必須 |
| waitForClick | TextWindow | 🔴 必須 |
| wait | Promise delay | 🔴 必須 |

---

### Phase 2: デモページ作成

#### 目標
.ksc スクリプトをブラウザで実行するデモページ

#### 実装内容

**2.1 新しいエントリーポイント**

```typescript
// packages/web/src/ksc-demo.ts
import { Interpreter } from "@kaedevn/interpreter";
import { WebEngine } from "./engine/WebEngine";

async function init() {
  // PixiJS アプリケーション初期化
  const app = new Application();
  await app.init({ width: 1280, height: 720 });

  // レイヤー、UI などを初期化
  const layers = new LayerManager();
  const textWindow = new TextWindow(app.ticker, input);
  const choiceOverlay = new ChoiceOverlay();
  const audio = new AudioManager();

  // WebEngine を作成
  const engine = new WebEngine(layers, textWindow, choiceOverlay, audio);

  // Interpreter を作成
  const interpreter = new Interpreter(engine, { debug: true });

  // .ksc スクリプトをロード
  const response = await fetch("./scenarios/demo.ksc");
  const script = await response.text();

  // 実行
  await interpreter.run(script);
}
```

**2.2 デモHTML**

```html
<!-- packages/web/ksc-demo.html -->
<!DOCTYPE html>
<html>
<head>
  <title>KNF Interpreter Demo</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #1a1a2e;
      overflow: hidden;
    }
    canvas {
      display: block;
    }
  </style>
</head>
<body>
  <script type="module" src="/src/ksc-demo.ts"></script>
</body>
</html>
```

**2.3 デモスクリプト配置**

```
packages/web/public/scenarios/
├── demo.ksc              # Phase 7-3 で作成したデモシナリオ
├── simple_test.ksc       # シンプルなテストスクリプト
└── assets/
    ├── bg/               # 背景画像
    ├── char/             # キャラクター画像
    └── audio/            # BGM/SE
```

---

### Phase 3: アセット管理

#### 目標
.ksc スクリプトで使用する画像/音声アセットの管理

#### 実装内容

**3.1 アセットマッピング**

```typescript
// packages/web/src/engine/AssetMapper.ts
export class AssetMapper {
  private bgMap = new Map<string, string>();
  private charMap = new Map<string, string>();
  private audioMap = new Map<string, string>();

  constructor() {
    // デモ用のマッピング
    this.bgMap.set("school_gate", "/assets/bg/school_gate.jpg");
    this.bgMap.set("library", "/assets/bg/library.jpg");
    this.bgMap.set("street_evening", "/assets/bg/street.jpg");

    this.charMap.set("heroine", "/assets/char/heroine.png");

    this.audioMap.set("daily_life", "/assets/audio/bgm_daily.mp3");
  }

  getBgPath(id: string): string {
    return this.bgMap.get(id) || `/assets/bg/${id}.jpg`;
  }

  getCharPath(id: string): string {
    return this.charMap.get(id) || `/assets/char/${id}.png`;
  }

  getAudioPath(id: string): string {
    return this.audioMap.get(id) || `/assets/audio/${id}.mp3`;
  }
}
```

**3.2 プレースホルダーアセット**

実際の画像がない場合の代替：

```typescript
// 背景: 単色のキャンバス
// キャラクター: シルエット画像
// 音声: サイレント
```

---

### Phase 4: デバッグUI統合

#### 目標
Phase 7-2 のデバッグ機能をブラウザUIで表示

#### 実装内容

**4.1 DebugPanel コンポーネント**

```typescript
// packages/web/src/ui/DebugPanel.ts
import { Debugger } from "@kaedevn/interpreter";

export class DebugPanel extends Container {
  constructor(private debugger: Debugger) {
    super();
    this.createUI();
  }

  private createUI() {
    // 変数ウォッチ表示
    // トレースログ表示
    // ブレークポイント設定UI
  }
}
```

**4.2 ホットキー**

```
D: デバッグパネル表示/非表示
F5: クイックセーブ
F9: クイックロード
Ctrl+R: スクリプトリロード
```

---

### Phase 5: セーブ/ロード統合

#### 目標
Interpreter の状態をセーブ/ロードできるようにする

#### 実装内容

**5.1 状態の保存**

```typescript
interface KNFSaveData {
  save_schema_version: 1;
  engine_version: string;
  scenario_id: string;

  // Interpreter 状態
  pc: number;
  variables: Record<string, unknown>;
  callStack: unknown[];

  // エンジン状態
  currentBg: string;
  characters: Array<{ id: string; position: string }>;

  timestamp: number;
}
```

**5.2 StorageManager 統合**

```typescript
// セーブ
const state = interpreter.getState();
const saveData = {
  ...state,
  currentBg: engine.getCurrentBg(),
  characters: engine.getCharacters(),
};
await storage.save(slotId, saveData);

// ロード
const saveData = await storage.load(slotId);
interpreter.setState(saveData);
engine.restoreState(saveData);
```

---

## 実装スケジュール

### Week 1: WebEngine 基本実装
- Day 1: IEngineAPI インターフェース調整
- Day 2: WebEngine クラス実装（showDialogue, setBg）
- Day 3: WebEngine クラス実装（キャラクター表示）
- Day 4: WebEngine クラス実装（選択肢、オーディオ）
- Day 5: 統合テスト

### Week 2: デモページ作成
- Day 1: ksc-demo.ts エントリーポイント作成
- Day 2: デモHTML、Vite設定
- Day 3: プレースホルダーアセット準備
- Day 4: Phase 7-3 デモシナリオ統合
- Day 5: 動作確認、バグ修正

### Week 3: 機能拡張
- Day 1: AssetMapper 実装
- Day 2: DebugPanel UI 実装
- Day 3: セーブ/ロード統合
- Day 4: パフォーマンス最適化
- Day 5: ドキュメント作成

---

## 成果物

### コードファイル
```
packages/web/
├── src/
│   ├── engine/
│   │   ├── WebEngine.ts           # IEngineAPI 実装
│   │   └── AssetMapper.ts         # アセットパス管理
│   ├── ui/
│   │   └── DebugPanel.ts          # デバッグUI
│   ├── ksc-demo.ts                # デモエントリーポイント
│   └── utils/
│       └── InterpreterState.ts    # セーブ/ロード用
├── ksc-demo.html                  # デモページ
└── public/
    └── scenarios/
        ├── demo.ksc               # デモシナリオ
        └── assets/                # アセット

packages/interpreter/
└── src/
    └── engine/
        └── IEngineAPI.ts          # インターフェース調整（必要に応じて）
```

### ドキュメント
- Browser Integration Guide
- WebEngine API Reference
- Demo Scenario Tutorial

---

## 技術的な課題と解決策

### 課題1: IEngineAPI のシグネチャ不一致

**問題**:
- Interpreter: `showDialogue(params: {character, text})`
- IEngineAPI定義: `showDialogue(speaker, lines)`

**解決策**:
1. **Option A**: Interpreter を修正して IEngineAPI に合わせる
2. **Option B**: Adapter パターンで変換層を挟む
3. **Option C**: IEngineAPI を Interpreter の実装に合わせる

→ **推奨**: Option C（IEngineAPI を調整）
  - Interpreter の実装は安定している
  - パラメータオブジェクトの方が拡張性が高い

### 課題2: 非同期処理の制御

**問題**: ブラウザ環境では全てが非同期

**解決策**:
- TextWindow のクリック待ちを Promise 化
- ChoiceOverlay の選択待ちを Promise 化
- Audio のフェード処理を Promise 化

### 課題3: アセットの遅延ロード

**問題**: 画像/音声の読み込み時間

**解決策**:
- AssetLoader でプリロード
- ローディング画面の表示
- プレースホルダー画像の使用

### 課題4: デバッグUIのパフォーマンス

**問題**: トレースログが大量になる

**解決策**:
- 仮想スクロール（最新100件のみ表示）
- ログレベルフィルター
- オンデマンド更新

---

## テスト計画

### ユニットテスト
- WebEngine の各メソッド
- AssetMapper のパス解決
- 状態のシリアライズ/デシリアライズ

### 統合テスト
- デモシナリオの完全実行
- セーブ/ロードの往復
- エラーハンドリング

### ブラウザテスト
- Chrome/Firefox/Safari での動作確認
- モバイルブラウザでの動作確認
- パフォーマンス測定

---

## 次のアクション

Phase 1 から順に実装を開始できます。最初のステップ：

1. **IEngineAPI インターフェース調整**
   - 現在の Interpreter の呼び出し形式を確認
   - IEngineAPI を Interpreter に合わせる

2. **WebEngine 基本実装**
   - showDialogue, setBg, showChar の実装
   - TextWindow, LayerManager との統合

3. **シンプルなテストスクリプト実行**
   - 5行程度の簡単なスクリプトで動作確認
   - 問題があれば早期に発見・修正

どのフェーズから始めますか？

1. **Phase 1: WebEngine 実装** - 最も重要な基礎部分
2. **Phase 2: デモページ** - 早く動くものを見たい
3. **計画の詳細化** - より詳細な設計を先に決める
