# KNFインタプリタ実装計画書 v1.0

**作成日:** 2026-02-09
**対象仕様:** 上級インタプリタ仕様書 v2 + 仕様差分パッチ v2.1
**スクリプト拡張子:** `.ksc` (Kaede Script) — KNF上級スクリプトの唯一の拡張子

---

## 1. 目的と概要

### 1.1 実装の目的

現在のkaedevnエンジンは `.ks` (DSL) → `Op[]` (JSON) → OpRunner というフローで動作していますが、以下の制約があります：

- **変数・条件分岐が未サポート:** Op[]は固定的な命令セットのみ
- **選択肢の実装が限定的:** JUMPのみで条件付き選択肢やフラグ管理が困難
- **再利用性の欠如:** 関数・サブルーチンがなく、同じシーンを繰り返し書く必要がある

KNFインタプリタは、JavaScriptライクな上級スクリプト形式（.ksc）を直接実行することで、これらの制約を解消します。

### 1.2 アーキテクチャ変更

**現在:**
```
.ks (DSL) → @kaedevn/compiler → Op[] (JSON) → OpRunner → IOpHandler
```

**新しいアーキテクチャ:**
```
.ks (DSL) → @kaedevn/compiler → .ksc (上級スクリプト)
                                       ↓
                           @kaedevn/interpreter → IEngineAPI
```

### 1.3 ファイル拡張子

**`.ksc` (Kaede Script)** — KNF上級スクリプトの唯一の拡張子

- JavaScriptライクな構文でセリフ・演出・ロジックを記述
- 変数、条件分岐、関数、選択肢をサポート
- `.ks` (DSL) からコンパイルして生成、または直接記述

### 1.4 共存戦略

Phase 1では両方のシステムを共存させ、段階的に移行します：

- **Op[]システム:** 既存の単純なシナリオ向けに維持
- **.kscインタプリタ:** 変数・条件分岐が必要な複雑なシナリオ向けに新規追加

---

## 2. パッケージ構成

### 2.1 新規パッケージ: `@kaedevn/interpreter`

```
packages/interpreter/
├── src/
│   ├── types/              # 型定義
│   │   ├── Token.ts        # トークン型
│   │   ├── AST.ts          # 抽象構文木
│   │   ├── LineType.ts     # 行種別
│   │   └── CallFrame.ts    # 呼び出しフレーム (v2.1)
│   │
│   ├── core/               # コアクラス
│   │   ├── Interpreter.ts  # メインインタプリタ
│   │   ├── GameState.ts    # 状態管理
│   │   ├── Parser.ts       # 構文解析
│   │   ├── Tokenizer.ts    # トークナイザ
│   │   └── Evaluator.ts    # 式評価器
│   │
│   ├── engine/             # エンジンインターフェース
│   │   └── IEngineAPI.ts   # プラットフォーム非依存API
│   │
│   ├── builtins/           # 組み込みコマンド
│   │   └── commands.ts     # bg, ch, bgm, jump, call等
│   │
│   ├── errors/             # エラーハンドリング
│   │   └── KNFError.ts     # エラークラス
│   │
│   └── index.ts            # 公開API
│
├── test/                   # テストスイート
│   ├── core/               # コアロジックテスト
│   ├── integration/        # 統合テスト
│   └── fixtures/           # テスト用.kscファイル
│
├── examples/               # サンプルスクリプト（.ksc形式）
│   ├── basic.ksc           # 基本的な使い方
│   ├── variables.ksc       # 変数操作
│   ├── functions.ksc       # 関数定義
│   └── complex.ksc         # 複雑なシナリオ
│
├── package.json
├── tsconfig.json
└── README.md
```

### 2.2 既存パッケージの変更

#### `@kaedevn/compiler`

- **変更点:** コンパイル出力を `Op[]` から `.ksc` (Kaede Script) に変更するオプションを追加
- **互換性:** デフォルトは `Op[]` 出力のまま（破壊的変更なし）

```typescript
// 新しいコンパイルオプション
compile(source, {
  scenarioId: 'my-scenario',
  outputFormat: 'ksc'  // 'ops' (default) | 'ksc' (Kaede Script)
});
```

#### `@kaedevn/web`

- **新規ファイル:** `src/engine/WebEngineAPI.ts` - IEngineAPIの実装
- **アダプタ:** 既存のWebOpHandlerをラップして再利用

---

## 3. 実装フェーズ

### Phase 1: 基礎構造（3-4日）

**目標:** セリフ表示と組み込みコマンドの動作確認

- [ ] 型定義（Token, LineType, CallFrame）
- [ ] Tokenizer実装（行分類のみ、式評価は未実装）
- [ ] Parser実装（セリフブロック検出、ラベルインデックス）
- [ ] IEngineAPI定義
- [ ] WebEngineAPI実装（bg, ch, showDialogue）
- [ ] Interpreter基本ループ
- [ ] 単純なセリフ表示のテスト

**成果物:**
```ksc
#hero
おはよう
#

bg("school")
ch("heroine", "smile", "right")
```

### Phase 2: ラベルとジャンプ（1-2日）

**目標:** シナリオ分岐の基礎

- [ ] ラベルマップ構築（`*ラベル名`）
- [ ] `jump(label)` 実装
- [ ] `call(label)` / `ret()` 実装
- [ ] CallFrameスタック管理
- [ ] ジャンプのテスト

**成果物:**
```ksc
*start
jump("chapter1")

*chapter1
#hero
第1章が始まる
#
```

### Phase 3: 変数と式評価（4-5日）

**目標:** 変数操作と算術・比較・論理演算

- [ ] GameState（変数ストレージ）
- [ ] Tokenizer（式のトークナイズ）
- [ ] Evaluator（再帰下降パーサー）
  - [ ] リテラル（number, string, boolean）
  - [ ] 変数参照
  - [ ] 算術演算（+, -, *, /, %）
  - [ ] 比較演算（==, !=, >, <, >=, <=）
  - [ ] 論理演算（&&, ||, !）
  - [ ] 括弧によるグループ化
- [ ] 代入処理（=, +=, -=, *=, /=）
- [ ] 未定義変数エラー（v2.1仕様）
- [ ] 式評価のテスト（50+ケース）

**成果物:**
```ksc
affection = 0
affection += 1

if (affection >= 5) {
  #heroine
  好感度が高いわね
  #
}
```

### Phase 4: if文とchoice（3-4日）

**目標:** 条件分岐と選択肢

- [ ] if/else if/else パース
- [ ] ブロック検出（`{` `}` のカウント、v2.1書式制約）
- [ ] 条件評価とブロック実行
- [ ] choice構文パース
- [ ] 条件付き選択肢（`if (cond)`）
- [ ] 選択結果のブロック実行
- [ ] IEngineAPI.showChoice実装
- [ ] 分岐のテスト

**成果物:**
```ksc
choice {
  "一緒に帰る" {
    affection += 2
    jump("go_home")
  }
  "断る" {
    affection -= 1
    jump("refuse")
  }
  "図書室に行く" if (affection >= 3) {
    jump("library")
  }
}
```

### Phase 5: 関数とサブルーチン（3-4日）

**目標:** コードの再利用

- [ ] 関数定義パース（`def name(params) { ... }`）
- [ ] サブルーチン定義（`sub name(params) { ... }`）
- [ ] 関数マップ構築
- [ ] ローカルスコープ管理
- [ ] 引数の束縛
- [ ] return文の処理
- [ ] ret()の区別（v2.1仕様）
- [ ] 関数呼び出しテスト

**成果物:**
```ksc
def mood(aff) {
  if (aff >= 8) return "happy"
  if (aff >= 4) return "normal"
  return "sad"
}

sub morning_greeting() {
  bg("school")
  #hero
  おはよう
  #
}

morning_greeting()
expression = mood(affection)
```

### Phase 6: 文字列補間（0.5日）

**目標:** セリフ内の変数展開

- [ ] セリフブロック内の `{式}` 検出
- [ ] 式評価と文字列化
- [ ] エラーハンドリング（v2.1仕様）
- [ ] 補間テスト

**成果物:**
```ksc
name = "太郎"
affection = 7

#hero
{name}さん、好感度は{affection}です
#
```

### Phase 7: エラーハンドリングとデバッグ（2-3日）

**目標:** 開発者体験の向上

- [ ] KNFErrorクラス
- [ ] 行番号付きエラーメッセージ
- [ ] 未定義変数の候補提示
- [ ] 構文エラーの明確化
- [ ] デバッグモード（変数ウォッチ）
- [ ] エラーケーステスト

**成果物:**
```
[KNF Error] line 42: 未定義の変数 'afection' — 'affection' ではありませんか？
[KNF Error] line 58: 未定義のラベル '告白シーン' — jump先が見つかりません
```

### Phase 8: @kaedevn/compiler統合（1-2日）

**目標:** .ks → .ksc (Kaede Script) 変換

- [ ] コンパイラに.ksc (Kaede Script) 出力モードを追加
- [ ] @コマンドから関数呼び出しへの変換
- [ ] @if/@endif → if { } への変換
- [ ] @choice → choice { } への変換
- [ ] 変換テスト

**成果物:**
```
// Input (.ks - DSL)
@bg school
@ch hero smile center

主人公：おはよう

// Output (.ksc - Kaede Script)
bg("school")
ch("hero", "smile", "center")

#主人公
おはよう
#
```

### Phase 9: Webエンジン統合（2-3日）

**目標:** 実際のゲーム画面で動作

- [ ] WebEngineAPI完全実装
- [ ] TimelinePlayer連携
- [ ] セーブ/ロードの実装
- [ ] main.tsでの切り替え
- [ ] E2Eテスト

---

## 4. IEngineAPIインターフェース

### 4.1 定義

```typescript
// packages/interpreter/src/engine/IEngineAPI.ts

export interface IEngineAPI {
  // セリフ
  showDialogue(speaker: string, lines: string[]): Promise<void>;

  // 背景
  setBg(name: string, effect?: string): Promise<void>;

  // キャラクター
  showChar(name: string, pose: string, position?: string): Promise<void>;
  hideChar(name: string): Promise<void>;
  moveChar(name: string, position: string, time: number): Promise<void>;

  // オーディオ
  playBgm(name: string): void;
  stopBgm(): void;
  fadeBgm(time: number): Promise<void>;
  playSe(name: string): void;

  // タイムライン
  playTimeline(name: string): Promise<void>;

  // UI
  showChoice(options: ChoiceOption[]): Promise<number>;
  waitForClick(): Promise<void>;
  wait(ms: number): Promise<void>;
}

export interface ChoiceOption {
  text: string;
  condition?: boolean;
}
```

### 4.2 WebEngineAPI実装

```typescript
// packages/web/src/engine/WebEngineAPI.ts

import type { IEngineAPI, ChoiceOption } from '@kaedevn/interpreter';

export class WebEngineAPI implements IEngineAPI {
  constructor(
    private layers: LayerManager,
    private textWindow: TextWindow,
    private audio: AudioManager,
    private choiceOverlay: ChoiceOverlay,
    private timelinePlayer: TimelinePlayer,
  ) {}

  async showDialogue(speaker: string, lines: string[]): Promise<void> {
    this.textWindow.clear();
    if (speaker) {
      this.textWindow.setSpeaker(speaker);
    }
    for (const line of lines) {
      this.textWindow.appendText(line);
    }
    await this.waitForClick();
  }

  async setBg(name: string, effect?: string): Promise<void> {
    if (effect === "fade") {
      await this.layers.setBgWithFade(name, 1000);
    } else {
      this.layers.setBg(name);
    }
  }

  // ... 他のメソッド実装
}
```

---

## 5. コンパイラの変更

### 5.1 出力フォーマット追加

```typescript
// packages/compiler/src/compiler.ts

export type OutputFormat = 'ops' | 'ksc';  // 'ksc' = Kaede Script

export interface CompileOptions {
  scenarioId: string;
  validate?: boolean;
  outputFormat?: OutputFormat;  // 新規追加: 'ops' (default) | 'ksc'
}

export function compile(
  source: string,
  options: CompileOptions
): CompiledScenario | string {
  const { outputFormat = 'ops' } = options;

  if (outputFormat === 'ksc') {
    // .ksc (Kaede Script) 形式で出力
    return compileToKsc(source, options);
  }

  // 既存のOp[]コンパイル
  return compileToOps(source, options);
}
```

### 5.2 変換ルール (.ks → .ksc)

| @コマンド | .ksc (Kaede Script) 形式 |
|----------|-------------------------|
| `@bg school` | `bg("school")` |
| `@bg school fade=1000` | `bg("school", "fade")` |
| `@ch hero smile center` | `ch("hero", "smile", "center")` |
| `@bgm daily` | `bgm("daily")` |
| `@jump 告白` | `jump("告白")` |
| `@set affection += 1` | `affection += 1` |
| `@if affection >= 5` | `if (affection >= 5) {` |
| `@endif` | `}` |

---

## 6. テスト戦略

### 6.1 ユニットテスト

- **Tokenizer:** 100+テストケース（全演算子、リテラル、キーワード）
- **Evaluator:** 50+テストケース（優先順位、括弧、エラー）
- **Parser:** 30+テストケース（ブロック検出、セリフ、choice）
- **GameState:** 20+テストケース（変数操作、スコープ）

### 6.2 統合テスト

- 仕様書セクション8の完全なスクリプト例を実行
- 変数、関数、選択肢、ジャンプを含む複雑なシナリオ
- エラーケース（未定義変数、未定義ラベル、構文エラー）

### 6.3 E2Eテスト

- Webブラウザで実際にプレイして動作確認
- セーブ/ロードの動作
- 選択肢の分岐
- タイムライン連携

---

## 7. スケジュール

| Phase | 内容 | 期間 | 累計 |
|-------|------|------|------|
| Phase 1 | 基礎構造 | 3-4日 | 3-4日 |
| Phase 2 | ラベルとジャンプ | 1-2日 | 4-6日 |
| Phase 3 | 変数と式評価 | 4-5日 | 8-11日 |
| Phase 4 | if文とchoice | 3-4日 | 11-15日 |
| Phase 5 | 関数とサブルーチン | 3-4日 | 14-19日 |
| Phase 6 | 文字列補間 | 0.5日 | 14.5-19.5日 |
| Phase 7 | エラーハンドリング | 2-3日 | 16.5-22.5日 |
| Phase 8 | コンパイラ統合 | 1-2日 | 17.5-24.5日 |
| Phase 9 | Webエンジン統合 | 2-3日 | 19.5-27.5日 |
| **合計** | | **20-28日** | |

---

## 8. リスク管理

### 8.1 技術的リスク

| リスク | 影響 | 対策 |
|-------|------|------|
| 式評価器の複雑化 | 高 | 再帰下降パーサーの早期実装とテスト |
| CallFrameスタックの不整合 | 高 | v2.1仕様に従った厳格な実装とテスト |
| await混在時の復帰位置ずれ | 中 | Phase 2で call/ret を完全にテスト |
| 既存Op[]システムとの競合 | 中 | 共存戦略、段階的移行 |

### 8.2 スコープ外

- **Unity/C#版:** TypeScript版完成後の別プロジェクト
- **while文:** v2.1で無効化（将来拡張）
- **配列・辞書型:** v2.1で禁止（将来拡張）
- **タイムラインエディタ:** 別パッケージで実装

---

## 9. 成功基準

### 9.1 機能要件

- [ ] 仕様書セクション8の完全なスクリプトが動作する
- [ ] 全テストケースがパスする（200+ケース）
- [ ] エラーメッセージが行番号付きで明確に表示される

### 9.2 非機能要件

- [ ] 1000行の.ksc (Kaede Script) ファイルが1秒以内にロードできる
- [ ] セーブ/ロードが正常に動作する
- [ ] 既存のOp[]システムと共存できる

### 9.3 ドキュメント

- [ ] `@kaedevn/interpreter` のREADME
- [ ] .ksc (Kaede Script) 構文ガイド
- [ ] IEngineAPI実装ガイド
- [ ] サンプル.kscスクリプト（5+個）

---

## 10. 次のステップ

1. **Phase 1開始前:** この計画書のレビューと承認
2. **Phase 1開始:** `packages/interpreter/` ディレクトリ作成とボイラープレート
3. **毎Phase終了時:** 動作デモとテスト結果の確認
4. **全Phase完了後:** ドキュメント整備と本番投入

---

## 付録A: v2.1仕様への準拠

本実装は「仕様差分パッチ v2.1」に完全準拠します：

- ✅ **CallFrame導入:** `call()` と `def/sub` の呼び出し機構を統一
- ✅ **未定義変数エラー:** 参照時に即エラー（複合代入は例外）
- ✅ **文字列補間の制限:** セリフブロック内のみ
- ✅ **ブロック書式制約:** `{` は必ず行末、単独行禁止
- ✅ **while無効化:** 予約語だが構文エラー
- ✅ **組み込み関数の予約:** 変数名として使用禁止
- ✅ **変数型制限:** number/boolean/string/null のみ

---

## 付録B: 参考資料

- [上級インタプリタ仕様書 v2](../01_in_specs/0209/上級インタプリタ仕様書 v2.md)
- [仕様差分パッチ v2.1](../01_in_specs/0209/KNF Visual Novel Script — 仕様差分パッチ v2.1（追記・修正）.md)
- [コンパイラ実装状況](../01_in_specs/0208_コンパイラ実装状況（Phase 5まで完了）.md)
- [CLAUDE.md](../../CLAUDE.md)
- [既存Op型定義](../../packages/core/src/types/Op.ts)
