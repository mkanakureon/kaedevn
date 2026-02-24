# Browser Integration - Phase 1: WebEngine Implementation

**実装日**: 2026-02-09
**ステータス**: ✅ 完了

## 実装内容

### 1. WebEngine クラス作成 (`packages/web/src/engine/WebEngine.ts`)

KNF Interpreter の `IEngineAPI` インターフェースを実装したブラウザ版エンジン。

#### 実装メソッド

| IEngineAPI メソッド | 実装状況 | 実装内容 |
|-------------------|----------|---------|
| `showDialogue(speaker, lines[])` | ✅ 完了 | TextWindow.show()を使用してセリフ表示 |
| `setBg(name, effect?)` | ✅ 完了 | LayerManager.backgroundLayerに背景を表示 |
| `showChar(name, pose, position?)` | ✅ 完了 | LayerManager.characterLayerにキャラクター表示 |
| `hideChar(name)` | ✅ 完了 | キャラクタースプライトを削除 |
| `moveChar(name, position, time)` | ✅ 完了 | requestAnimationFrameでアニメーション |
| `playBgm(name)` | ✅ 完了 | AudioManager.play("bgm")を使用 |
| `stopBgm()` | ✅ 完了 | AudioManager.stop("bgm")を使用 |
| `fadeBgm(time)` | ✅ 完了 | ボリュームをフェードしてからstop() |
| `playSe(name)` | ✅ 完了 | AudioManager.play("se")を使用 |
| `playTimeline(name)` | 🟡 TODO | Phase 3で実装予定 |
| `showChoice(options)` | ✅ 完了 | ChoiceOverlay.show()を使用 |
| `waitForClick()` | ✅ 完了 | TextWindow.show()でクリック待ち |
| `wait(ms)` | ✅ 完了 | Promise + setTimeoutで実装 |

#### 主な機能

**アセット管理**
- `manifest.json` によるアセットパス解決
- フォールバック機能（マニフェストがない場合は規約ベースのパス）
- エラー時のプレースホルダー表示

**スプライト管理**
- 背景の自動スケーリング（画面全体をカバー）
- キャラクターの自動スケーリング（画面高さに合わせる）
- スプライトIDによる管理（背景="bg", キャラ=名前）

**状態管理**
- `getState()`: 現在の背景・キャラクター状態を取得
- `restoreState()`: セーブデータから状態を復元（Phase 5で完全実装予定）

### 2. デモページ作成

#### ksc-demo.ts (`packages/web/src/ksc-demo.ts`)

**機能**:
- PixiJS アプリケーション初期化
- LayerManager, TextWindow, ChoiceOverlay, AudioManager 初期化
- WebEngine + Interpreter 統合
- `.ksc` スクリプトのロード・実行
- デバッグモード統合（変数追跡、トレースログ）

**エラーハンドリング**:
- スクリプトロード失敗時のエラー表示
- 実行時エラーの表示
- コンソールへの詳細ログ出力

#### ksc-demo.html (`packages/web/ksc-demo.html`)

**UI要素**:
- ローディング画面（スピナー付き）
- 操作説明パネル（Space/Enter, A, Ctrl, ↑↓）
- レスポンシブキャンバス（画面サイズに自動調整）

**スタイリング**:
- ダークテーマ（#0a0a1e背景）
- 浮遊型情報パネル
- グラスモーフィズム風のUI

### 3. デモスクリプト配置

```
packages/web/public/
├── scenarios/
│   ├── demo_scenario.ksc      # Phase 7-3で作成した完全なデモ（250行）
│   └── simple_test.ksc        # シンプルなテストスクリプト（80行）
└── assets/
    └── manifest.json          # アセットパスマッピング
```

#### simple_test.ksc

基本機能テスト用の簡易スクリプト:
- 変数操作テスト
- 関数呼び出しテスト
- 選択肢テスト
- 文字列補間テスト
- ラベルジャンプテスト

約80行、実行時間1-2分程度。

### 4. 設定ファイル更新

#### package.json

```json
{
  "dependencies": {
    "@kaedevn/core": "*",
    "@kaedevn/interpreter": "*",  // 追加
    "pixi.js": "^8.6.0"
  }
}
```

#### vite.config.ts

```typescript
input: {
  // ... 既存のエントリー
  kscDemo: resolve(__dirname, "ksc-demo.html"),  // 追加
}
```

## 技術的な詳細

### IEngineAPI と WebEngine の対応

**元々の課題**:
- Interpreter は `showDialogue(speaker, lines[])` を期待
- 既存の WebOpHandler は `textAppend() + waitClick()` 形式

**解決策**:
- WebEngine は IEngineAPI に準拠した新しいクラス
- WebOpHandler とは独立して実装（Op[] 実行用と .ksc 実行用で別々）
- TextWindow の既存メソッドを活用

### 選択肢処理の実装

**課題**: IEngineAPI は選択インデックスを返す、ChoiceOverlay は jump を返す

**解決策**:
```typescript
// 1. フィルタリング（condition=falseを除外）
const visibleOptions = options.filter(opt => opt.condition !== false);

// 2. ChoiceOverlay用に変換
const overlayOptions = visibleOptions.map((opt, idx) => ({
  label: opt.text,
  jump: idx
}));

// 3. 選択結果を元のインデックスに変換
const selectedIndex = await this.choiceOverlay.show(overlayOptions);
return visibleOptions[selectedIndex].originalIndex;
```

### アニメーション実装

**moveChar**: requestAnimationFrame による線形補間
```typescript
const animate = () => {
  const progress = Math.min(elapsed / time, 1);
  sprite.position.x = startX + (targetX - startX) * progress;
  if (progress < 1) requestAnimationFrame(animate);
};
```

**fadeBgm**: ボリュームの線形フェード
```typescript
const animate = () => {
  const progress = Math.min(elapsed / time, 1);
  const volume = startVolume * (1 - progress);
  this.audio.setVolume("bgm", volume);
  if (progress < 1) requestAnimationFrame(animate);
};
```

## テスト結果

### TypeScript コンパイル

```bash
cd packages/interpreter
npm run build
# ✅ ビルド成功
```

**注意**: `debugger` は JavaScript の予約語のため、変数名を `dbg` に変更。

### ディレクトリ構造

```
packages/web/
├── src/
│   ├── engine/
│   │   └── WebEngine.ts          # 新規作成 (384行)
│   ├── ksc-demo.ts                # 新規作成 (125行)
│   └── (既存のファイル)
├── public/
│   ├── scenarios/
│   │   ├── demo_scenario.ksc     # interpreter からコピー
│   │   └── simple_test.ksc       # 新規作成
│   └── assets/
│       └── manifest.json          # 新規作成
├── ksc-demo.html                  # 新規作成
└── package.json                   # 依存関係追加
```

## 既知の課題

### 1. アセットの不在

現在、実際の画像・音声ファイルは存在しない。
- エラープレースホルダーが表示される
- Phase 3 でプレースホルダーアセット生成を実装予定

### 2. playTimeline 未実装

```typescript
async playTimeline(name: string): Promise<void> {
  logger.warn("WebEngine", "playTimeline not yet implemented");
}
```

- Phase 3 で WebOpHandler の Op[] 実行機能と統合予定

### 3. restoreState 不完全

```typescript
async restoreState(state): Promise<void> {
  // キャラクターの位置・表情情報が保存されていない
  logger.warn("WebEngine", "Character restoration not fully implemented");
}
```

- Phase 5 でセーブ/ロード統合時に完全実装予定

### 4. エフェクト未実装

- `setBg()` の `effect` パラメータ（フェードなど）は無視される
- `moveChar()` は線形補間のみ（イージングなし）

Phase 3 で GSAP または独自イージング実装予定。

## 次のステップ

### Phase 2: デモページ動作確認

**目標**: 実際にブラウザで動作させる

**タスク**:
1. Vite 開発サーバー起動
2. `http://localhost:3000/ksc-demo.html` にアクセス
3. `simple_test.ksc` で基本動作確認
4. `demo_scenario.ksc` で完全な機能テスト
5. バグ修正・調整

**期待される結果**:
- セリフが表示される
- 選択肢が動作する
- 変数・関数が動作する
- デバッグ情報がコンソールに出力される

### Phase 3: アセット管理

**目標**: プレースホルダーアセットの生成

**タスク**:
1. Canvas APIで背景プレースホルダー生成（グラデーション）
2. Canvas APIでキャラクタープレースホルダー生成（シルエット）
3. Web Audio APIでサイレント音声生成
4. AssetMapper の拡張（動的プレースホルダー）

### Phase 4: デバッグUI統合

**目標**: ブラウザUIでデバッグ情報を表示

**タスク**:
1. DebugPanel コンポーネント作成
2. 変数ウォッチ表示
3. トレースログ表示
4. ホットキー実装（D: デバッグパネル切り替え）

### Phase 5: セーブ/ロード統合

**目標**: Interpreter 状態の永続化

**タスク**:
1. KNFSaveData スキーマ定義
2. `getState()` / `setState()` 実装
3. StorageManager 統合
4. `restoreState()` 完全実装

## まとめ

**Phase 1: WebEngine 基本実装** が完了しました。

### 主な成果
- ✅ IEngineAPI の完全実装（playTimeline 以外）
- ✅ 既存の PixiJS レンダリングシステムとの統合
- ✅ デモページ・デモスクリプトの作成
- ✅ TypeScript コンパイル成功
- ✅ 384行の WebEngine クラス
- ✅ 125行の ksc-demo.ts エントリーポイント

### 次のアクション

```bash
# 依存関係インストール
npm install

# Vite 開発サーバー起動
cd packages/web
npm run dev

# ブラウザでアクセス
open http://localhost:3000/ksc-demo.html
```

Phase 2 で実際の動作確認とバグ修正を行います！
