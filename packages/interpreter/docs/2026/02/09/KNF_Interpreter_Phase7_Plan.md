# KNF Interpreter Phase 7 実装計画書

## フェーズ概要

**Phase 7: エラーハンドリング・デバッグモード・統合テスト**

コア機能の実装が完了したため、以下を実装してプロダクション品質に引き上げる：
1. 詳細なエラーメッセージとスタックトレース
2. デバッグモード（変数ウォッチ、ステップ実行）
3. 統合テスト・デモスクリプト
4. パフォーマンス最適化

---

## 実装済みフェーズの確認

### ✅ Phase 1-6 完了状況

| Phase | 機能 | 状態 | テスト |
|-------|------|------|--------|
| Phase 1 | 基本構造（セリフ、ラベル、組み込みコマンド） | ✅ | - |
| Phase 2 | ジャンプとコール（jump/call/ret） | ✅ | 10 tests |
| Phase 3 | 変数と式評価 | ✅ | 32 tests |
| Phase 4 | if文とchoice | ✅ | 11 tests |
| Phase 5 | 関数とサブルーチン（式内呼び出し対応） | ✅ | 手動確認 |
| Phase 6 | 文字列補間 | ✅ | 10 tests |

**合計**: 63 自動テスト + Phase 5 手動テスト

---

## Phase 7-1: エラーハンドリングの強化

### 目標
実行時エラーの詳細情報を提供し、デバッグを容易にする

### 実装項目

#### 1. スタックトレースの実装

**現状の問題**:
```
[KNF Error] Line 42: 未定義の変数: afection
```

**改善後**:
```
[KNF Error] Line 42: 未定義の変数: afection
  at mood (script.ksc:42:10)
  at <main> (script.ksc:58:15)

ヒント: 'affection' ではありませんか？
```

**実装内容**:
- `CallFrame`に行番号と関数名を保存（既存）
- エラー発生時にコールスタックをフォーマット
- 類似変数名のサジェスト機能（Levenshtein距離）

**ファイル**:
- `src/core/ErrorHandler.ts` (新規)
- `src/core/Interpreter.ts` (修正)

#### 2. エラー種別の分類

```typescript
export enum ErrorType {
  SyntaxError = "SyntaxError",           // 構文エラー
  ReferenceError = "ReferenceError",     // 未定義参照
  TypeError = "TypeError",               // 型エラー
  RuntimeError = "RuntimeError",         // 実行時エラー
  StackOverflow = "StackOverflow",       // スタックオーバーフロー
  FileNotFound = "FileNotFound",         // ファイル未検出
}

export interface KNFError {
  type: ErrorType;
  message: string;
  line: number;
  column?: number;
  stack: CallFrame[];
  suggestions?: string[];
}
```

#### 3. ユーザーフレンドリーなエラーメッセージ

**パターン別メッセージ**:

| エラーパターン | メッセージ例 |
|--------------|-------------|
| 未定義変数 | `変数 'afection' は定義されていません。'affection' ではありませんか？` |
| 未定義関数 | `関数 'factrial' は定義されていません。'factorial' ではありませんか？` |
| 引数不一致 | `関数 'add' は2個の引数を期待していますが、1個が渡されました` |
| 型エラー | `文字列 "hello" に対して乗算 (*) は使用できません` |
| 0除算 | `0で割ることはできません (line 42: score / bonus)` |

**実装**:
- エラーコンテキスト（該当行の前後）を表示
- エラー発生箇所の視覚的表示

```
Line 42: result = score / bonus
                          ~~~~~ ← ここでエラー
```

---

## Phase 7-2: デバッグモードの実装

### 目標
スクリプト実行中の内部状態を可視化し、ステップ実行を可能にする

### 実装項目

#### 1. デバッグモードの有効化

```typescript
const interpreter = new Interpreter(engine, {
  debug: true,
  breakpoints: [10, 25, 42],
  watchVariables: ["affection", "score"],
});
```

#### 2. 変数ウォッチ機能

**機能**:
- 指定した変数の値をリアルタイム監視
- 変数が変更されたタイミングでログ出力

**実装**:
```typescript
class Debugger {
  private watchedVars: Set<string>;
  private varHistory: Map<string, unknown[]>;

  watchVariable(name: string): void;
  getVarHistory(name: string): unknown[];
  onVariableChange(name: string, oldValue: unknown, newValue: unknown): void;
}
```

**出力例**:
```
[Debug] Line 25: affection changed: 5 → 6
[Debug] Line 30: affection changed: 6 → 8
```

#### 3. ブレークポイント機能

**機能**:
- 指定行で実行を一時停止
- 現在の変数状態を確認
- ステップ実行（次の行へ進む）

**実装**:
```typescript
interface BreakpointInfo {
  line: number;
  condition?: string; // 条件付きブレークポイント
}

class Debugger {
  private breakpoints: Map<number, BreakpointInfo>;
  private paused: boolean;

  addBreakpoint(line: number, condition?: string): void;
  removeBreakpoint(line: number): void;
  shouldBreak(line: number, state: GameState): boolean;

  // ステップ実行制御
  stepOver(): void;  // 次の行へ
  stepInto(): void;  // 関数内に入る
  stepOut(): void;   // 関数から抜ける
  continue(): void;  // 次のブレークポイントまで実行
}
```

#### 4. 実行トレースログ

**機能**:
- 全ての実行ステップをログ出力
- 関数呼び出し・戻り値・変数変更を記録

**出力例**:
```
[Trace] Line 10: call mood(affection=8)
[Trace] Line 15:   if (aff >= 8) → true
[Trace] Line 16:   return "happy"
[Trace] Line 10: mood() returned "happy"
[Trace] Line 11: show_expression = "happy"
```

---

## Phase 7-3: 統合テスト・デモスクリプト

### 目標
実際のノベルゲームシナリオでインタプリタを検証

### 実装項目

#### 1. 総合デモスクリプト作成

**デモシナリオ**: 選択肢によって変わるエンディング

```ksc
// ===== デモスクリプト: 学園恋愛ノベル =====

// 変数初期化
affection = 0
name = "太郎"
flag_library = false
flag_confession = false

// 関数定義
def mood(aff) {
  if (aff >= 8) {
    return "happy"
  } else if (aff >= 4) {
    return "normal"
  } else {
    return "sad"
  }
}

sub show_affection() {
  #narrator
  現在の好感度: {affection}
  #
}

// ===== メインストーリー =====

*start
bg("school_gate")
bgm("daily_life")

#hero
今日も学校に来たな
{name}はどうしてるかな
#

call("morning_event")

// 選択肢による分岐
choice {
  "一緒に帰ろう" {
    affection += 2
    jump("go_home_together")
  }
  "図書室に寄らない？" if (affection >= 3) {
    flag_library = true
    affection += 1
    jump("library_event")
  }
  "用事があるんだ" {
    affection -= 1
    jump("decline")
  }
}

*morning_event
#heroine
おはよう、{name}くん！
#

#hero
おはよう
#

affection += 1
show_affection()
ret()

*go_home_together
bg("street_evening")
timeline("walk_home")

#heroine
今日は楽しかったね
#

if (affection >= 5 && flag_library) {
  #heroine
  話したいことがあるの...
  #
  jump("confession")
} else if (affection >= 3) {
  jump("normal_ending")
} else {
  jump("bad_ending")
}

*library_event
bg("library")

#heroine
この本、面白そうだね
#

affection += 1
jump("go_home_together")

*decline
bg("street_evening")

#heroine
そっか...
また明日ね
#

jump("bad_ending")

*confession
bg("school_rooftop_sunset")
bgm("emotional_theme")
ch("heroine", mood(affection), "center")

#heroine
{name}くん、私...
ずっと好きでした！
#

flag_confession = true
jump("true_ending")

*true_ending
timeline("ending_true")

#narrator
トゥルーエンド
好感度: {affection}
#

*normal_ending
timeline("ending_normal")

#narrator
ノーマルエンド
好感度: {affection}
#

*bad_ending
timeline("ending_bad")

#narrator
バッドエンド
好感度: {affection}
#
```

**実装**:
- `examples/demo_scenario.ksc` として保存
- 実行スクリプト `scripts/run_demo.ts` を作成
- 全機能の動作確認

#### 2. 統合テストスイート

**テストカテゴリ**:

1. **長編スクリプト実行** - 100行以上のスクリプト
2. **全機能統合** - 全Phase機能を使用するシナリオ
3. **エラーリカバリ** - エラー発生後の状態確認
4. **パフォーマンス** - 大量の変数・関数での実行速度

**実装**:
```typescript
// test/Integration.test.ts
describe("統合テスト", () => {
  it("デモシナリオが正常に実行される", async () => {
    const script = await fs.readFile("examples/demo_scenario.ksc", "utf-8");
    await interpreter.run(script);
    // エラーなく完了することを確認
  });

  it("1000行のスクリプトを実行できる", async () => {
    // 大規模スクリプト生成
    const largeScript = generateLargeScript(1000);
    const start = Date.now();
    await interpreter.run(largeScript);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000); // 1秒以内
  });

  it("再帰深度16まで正常動作", async () => {
    const script = `
def fib(n) {
  if (n <= 1) return n
  return fib(n - 1) + fib(n - 2)
}
result = fib(10)
`;
    await interpreter.run(script);
    const state = interpreter.getState();
    expect(state.variables.result).toBe(55);
  });
});
```

---

## Phase 7-4: パフォーマンス最適化

### 目標
大規模スクリプトでも快適に動作するよう最適化

### 実装項目

#### 1. プロファイリング

**測定項目**:
- スクリプトロード時間
- ラベル/関数インデックス構築時間
- 式評価の平均時間
- メモリ使用量

**実装**:
```typescript
class Profiler {
  private timings: Map<string, number[]>;

  startTimer(label: string): void;
  endTimer(label: string): void;
  getAverageTime(label: string): number;
  printReport(): void;
}
```

#### 2. 最適化候補

**キャッシュ戦略**:
- トークナイズ結果のキャッシュ（同じ式は再利用）
- ラベル/関数マップの事前構築（済）
- 文字列補間パターンのキャッシュ

**メモリ最適化**:
- 未使用変数の自動削除（関数スコープ終了時）
- コールスタックの上限設定
- 大きな文字列の遅延評価

---

## 実装スケジュール

### Week 1: エラーハンドリング強化
- Day 1-2: ErrorHandler実装、スタックトレース
- Day 3-4: エラー種別分類、メッセージ改善
- Day 5: テスト作成

### Week 2: デバッグモード
- Day 1-2: Debuggerクラス実装
- Day 3: 変数ウォッチ機能
- Day 4: ブレークポイント機能
- Day 5: トレースログ

### Week 3: 統合テスト・最適化
- Day 1-2: デモスクリプト作成
- Day 3: 統合テストスイート
- Day 4: パフォーマンスプロファイリング
- Day 5: 最適化実装

---

## 成果物

### Phase 7 完了時の状態

#### 新規ファイル
```
packages/interpreter/
├── src/
│   ├── debug/
│   │   ├── Debugger.ts          # デバッグ機能
│   │   ├── Profiler.ts          # パフォーマンス測定
│   │   └── ErrorHandler.ts      # エラー処理
│   └── types/
│       └── Error.ts              # エラー型定義
├── test/
│   ├── Integration.test.ts       # 統合テスト
│   ├── Performance.test.ts       # パフォーマンステスト
│   └── ErrorHandling.test.ts     # エラーハンドリングテスト
├── examples/
│   ├── demo_scenario.ksc         # デモシナリオ
│   ├── error_examples.ksc        # エラーケース集
│   └── performance_test.ksc      # パフォーマンステスト用
└── scripts/
    ├── run_demo.ts               # デモ実行スクリプト
    └── benchmark.ts              # ベンチマークツール
```

#### テスト目標
- **自動テスト**: 80+ tests (現在63)
- **統合テスト**: 5+ scenarios
- **カバレッジ**: 85%以上
- **パフォーマンス**: 1000行/秒以上

#### ドキュメント
- エラーメッセージ一覧
- デバッグ機能ガイド
- パフォーマンスベストプラクティス

---

## Phase 8-9 への展望

### Phase 8: コンパイラ統合
- 初級スクリプト (.ks) → 上級スクリプト (.ksc) 変換
- TyranoScript互換構文のサポート
- コンパイラCLI実装

### Phase 9: Web エンジン統合
- @kaedevn/web パッケージとの連携
- PixiJS エンジンAPI実装
- ブラウザでの実行デモ

---

## 優先度判断

### 必須 (Phase 7-1)
- スタックトレース
- 基本的なエラーメッセージ改善
- デモスクリプト作成

### 推奨 (Phase 7-2, 7-3)
- デバッグモード
- 統合テスト
- パフォーマンス測定

### オプション (Phase 7-4)
- 高度なデバッグ機能（条件付きブレークポイント等）
- パフォーマンス最適化
- ビジュアルデバッガー

---

## 次のアクション

Phase 7のどの部分から始めますか？

1. **7-1: エラーハンドリング強化** (推奨) - ユーザー体験の大幅改善
2. **7-2: デバッグモード実装** - 開発効率の向上
3. **7-3: デモスクリプト作成** - 実用性の検証
4. **Phase 8: コンパイラ統合** - .ks → .ksc 変換機能

ご希望をお聞かせください！
