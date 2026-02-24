# KSCインタプリタ変更仕様 統合版

TS風スクリプト言語「KSC」による新インタプリタの仕様。
ノベルゲーム＋簡易RPGを同一VMで実行可能にする。

> 統合元：KNE設計書v2、RPG対応Runtime Engine仕様書、Script VM Runtime抽象構成、KSC Language Spec v0.1

---

## 1. 背景と目的

### 1.1 なぜ独自エンジンか

- ノベルゲームに必要な機能は限定的（2Dスプライト、テキスト、音声のみ）
- 自前インタプリタが既に完成済み（TS版、テスト済み）
- Unity経由だとPro必須（年$2,040）、C++で書いても2,000〜3,000行で済む
- Switch直結のパイプラインが最短距離で構築できる

### 1.2 スクリプト言語の進化

```
v1:  KS（JSサブセット + #セリフブロック）→ AST直接実行
v2:  KSC（TS風型付き言語）→ IR → VM実行
```

v1のKSは「AIが書きやすいJS関数呼び出し + 人間が読みやすいセリフブロック」のハイブリッド。
v2のKSCはこれをTS風に進化させ、型安全性とSwitch移植性を両立する。

### 1.3 KSCの目的

- TS風の記法で安全にロジックを書ける
- 同一ソースから Web / PC / Switch（JSエンジン非依存）で動く
- PF固有API（battle/audio/ui等）を型付きで呼べる
- 永続化（プロジェクト保存/セーブ）に耐える

### 1.4 非目標

**v0.1ではやらない：**

- TypeScript互換（推論/ジェネリクス/高度型演算）
- async/await
- 例外機構（throw/catch）
- クラス継承（class自体は v0.2+）

**絶対実装禁止：**

- 物理演算、タイルエディタ、NavMesh、3D
- スケルトンアニメ、シェーダ編集、シーンエディタ
- パーティクルエディタ、GUIツール、パスファインディング

理由 → エンジン肥大化防止。汎用ゲームエンジンではない。

---

## 2. アーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────────┐
│  KSCソース（*.ksc）/ KSスクリプト              │
│  → AI生成 or シナリオライターが記述              │
├─────────────────────────────────────────────┤
│  コンパイラ → IR（中間表現）                     │
├─────────────────────────────────────────────┤
│  VM（仮想機械）— 逐次実行                       │
├─────────────────────────────────────────────┤
│  Host API（唯一の接続口）                        │
├─────────────────────────────────────────────┤
│  Game Systems（ロジック）                        │
│  MapSystem / EventSystem / BattleSystem         │
│  InventorySystem / FlagSystem                   │
├──────────────────┬──────────────────────────┤
│ ブラウザ版         │ ネイティブ版               │
│ (エディタ/プレビュー)│ (本番実行)                │
│ TS製VM + PixiJS   │ C++製VM + SDL2            │
│ Web Audio API     │ SDL_mixer                │
└──────────────────┴──────────────────────────┘
```

### 2.2 依存方向ルール（絶対）

```
VM → Host → Systems → Engine → Renderer
```

逆方向は禁止（Renderer→System、System→VM、Engine→VM）。

### 2.3 マルチプラットフォーム戦略

| Phase | 内容 | 技術 |
|-------|------|------|
| Phase 1 | ブラウザ / PC（即座に着手） | TS版VM + PixiJS + Web Audio API |
| Phase 2 | ネイティブ対応 | C++版VM + SDL2（2,000〜3,000行） |
| Phase 3 | Nintendo Switch | C++エンジン + Nintendo SDK（3%の追加作業） |

- DSLスクリプトは全Phaseで変更なし
- TS版とC++版で同一テストケースを実行し動作一致を保証
- Phase 1で量産しながらPhase 2を並行開発可能

### 2.4 C++エンジン構成（推定2,000〜3,000行）

```
├── renderer.cpp     (500〜1,000行)  SDL_Renderer で2D描画
├── audio.cpp        (300〜500行)    SDL_mixer でBGM/SE/Voice
├── input.cpp        (200〜300行)    SDL_Event → VMコールバック
├── filesystem.cpp   (200〜300行)    セーブ/ロード、アセット
├── interpreter.cpp  (500〜800行)    TS版VMからC++に移植
└── main.cpp         (200〜300行)    初期化、ゲームループ
```

### 2.5 レンダリングスコープ

| 機能 | 実装方法 | シェーダー |
|------|---------|-----------|
| 背景・立ち絵表示 | 2Dスプライト + アルファブレンド | 不要 |
| フェード/クロスフェード | α値を毎フレーム変化 | 不要 |
| 画面揺れ | 座標をsin波でオフセット | 不要 |
| フラッシュ（白/赤） | 全画面テクスチャをα重ね | 不要 |
| 雨・雪パーティクル | PNGスプライト数十〜百枚 | 不要 |
| ぼかし/モノクロ | 事前加工済みPNG | 不要 |

描画順：背景 → 立ち絵 → エフェクト → テキストウィンドウ → UI

**Vulkanもシェーダーも不要。** SDL_Rendererで全て賄える。

### 2.6 設計原則

1. **エンジンはC++** — 一回作ったら終わり。TSで書く理由がない
2. **外部依存最小化** — SDL2 + 自前インタプリタのみ（QuickJS廃止）
3. **DSLでコンテンツ記述** — AIにもライターにも書きやすい
4. **エディタはブラウザ** — TS + PixiJS。配布不要、即プレビュー
5. **Switch最短距離** — C++ + SDL2で中間レイヤーなし

---

## 3. KSC言語仕様 v0.1

### 3.1 ファイルとモジュール

- 拡張子：`*.ksc`
- 1ファイル = 1モジュール
- モジュールIDはPF側の登録名（例：`"battle/ai"`）

```typescript
import { pickSkill } from "battle/ai";
import * as Battle from "battle/api";
```

- 相対パス（`./` `../`）は禁止
- 解決できない場合はコンパイルエラー（E2001）

### 3.2 値と型

**プリミティブ型（v0.1固定）：**

| 型 | 備考 |
|----|------|
| `number` | float64相当。intは作らない |
| `string` | |
| `boolean` | |
| `null` | |
| `undefined` | |

**コンテナ型：**

- `T[]` — 配列
- `{ key: T, ... }` — 構造型（readonly/optionalは v0.2+）

**その他：**

- リテラル型：`"win" | "lose" | "escape" | "error"` など
- union型：`A | B` のみ（intersection `&` は v0.2+）
- type alias：

```typescript
type BattleResult = "win" | "lose";
type Drop = { id: string; qty: number };
```

### 3.3 変数宣言

```typescript
let gold: number = 100;
const name: string = "hiro";
```

- 型注釈は必須（v0.1では推論しない）
- 例外：リテラルのみの `const` は推論可（`const x = 1` は number扱い）

### 3.4 式と文

**制御：** `if/else`、`for`（C風のみ）、`while`、`switch`

```typescript
switch (result) {
  case "win":  return 1;
  case "lose": return 0;
  default:     return -1;
}
```

**演算：**

- 数値：`+ - * / %`
- 比較：`== != < <= > >=`
- 論理：`&& || !`

**ルール：**

- `==` はJSの緩い比較禁止（内部的に `===` 相当）
- `+` の string/number 混在は禁止（E1203）
- 文字列連結はテンプレート文字列で行う

```typescript
const msg: string = `EXP +${exp}`;
```

### 3.5 関数

```typescript
function calcDamage(atk: number, def: number): number {
  return Math.max(1, atk - def);
}
```

- 引数・戻り値の型注釈は必須
- `void` 型は v0.1で導入

### 3.6 first-class function

関数値を2種類に分類する。

**KscFn（KSC関数参照）：** 通常の `function` は KscFn として扱える

**LabelRef（KSラベル参照：保存可能）：**

```typescript
type LabelRef = { __kind: "LabelRef"; name: string };

function label(name: string): LabelRef {
  return { __kind: "LabelRef", name };
}
```

KSCは LabelRef を返すだけ。KS側が `@call` で制御フローを握る。

### 3.7 永続化ポリシー

**保存可能（シリアライズ可能）：**

- number / string / boolean / null
- 配列・オブジェクト（循環参照なし）
- LabelRef
- FnRef（関数名参照）

```typescript
type FnRef = { __kind: "FnRef"; name: string };

function fn(name: string): FnRef {
  return { __kind: "FnRef", name };
}
```

**保存不可：**

- クロージャ（キャプチャを持つ無名関数）
- 循環参照オブジェクト
- ホストオブジェクト（DOM等）

### 3.8 エラーコード

| 範囲 | 分類 |
|------|------|
| E1xxx | 型エラー |
| E2xxx | モジュール/解決 |
| E3xxx | 実行モデル制約 |
| Wxxxx | 警告 |

主なエラー：

- E1201：型不一致
- E1203：string/number 混在 `+` 禁止
- E2001：import解決失敗
- E3001：保存不可の値を永続領域へ格納

---

## 4. KS ↔ KSC 接続

### 4.1 KSからKSC呼び出し（2種類のみ・固定）

| コマンド | 用途 |
|---------|------|
| `@ksc call="module.func" args="..."` | 値を返す |
| `@ksc exec="module.func" args="..."` | 副作用のみ |

### 4.2 エントリポイント

```typescript
export function main(ctx: Context): Result;
```

推奨だが v0.1は自由（PF側が `module.func` を解決できればよい）。

---

## 5. VM / IR 設計

### 5.1 実行モデル（固定）

VMは逐次実行方式のみ。

```
命令実行 → Host呼び出し → 待機なら停止 → resumeで再開
```

禁止：並列命令、マルチスレッドScript、フレーム実行Script

理由 → セーブ簡単化

### 5.2 コンパイルパイプライン

```
KSCソース → パーサ → AST → 型チェック → IR → VM実行
```

- パーサ：TSの全機能は不要。上記サブセットのASTで十分
- 型チェッカ：型注釈必須にすれば推論が最小で済む
- 永続化検査：LabelRef/FnRef 以外の関数値を保存しようとしたらE3001

### 5.3 IR命令セット

**スタック型VM（推奨）。** Java VM / Lua / Python と同方式。

| 分類 | 命令 |
|------|------|
| スタック操作 | `LOAD_CONST`, `LOAD_VAR`, `STORE_VAR` |
| 演算 | `ADD`, `SUB`, `MUL`, `DIV`, `CMP_EQ` |
| 制御 | `JMP`, `JMP_IF_FALSE`, `CALL`, `RET` |
| switch | `SWITCH`（caseテーブル） |

型付きIRにすると最適化可能（`ADD_i32`, `ADD_f64`, `ADD_str`）。

### 5.4 VM内部構成

```
struct VM {
  stack            // 演算スタック
  callStack        // 呼び出しスタック
  instructionPointer  // 実行位置
  globalVars       // グローバル変数
}
```

### 5.5 Host関数戻り値

Host関数は必ず以下のいずれかを返す。VMは `WAIT_*` を受けたら停止。

| 戻り値 | 意味 |
|--------|------|
| `CONTINUE` | 即座に次の命令へ |
| `WAIT_TIME` | 時間経過で再開 |
| `WAIT_INPUT` | 入力待ち |
| `WAIT_EVENT` | イベント完了待ち |
| `WAIT_BATTLE` | 戦闘終了待ち |

### 5.6 VM状態保存

```json
{
  "pc": 102,
  "stack": [],
  "locals": {},
  "globals": {},
  "flags": {},
  "map": "village",
  "player": { "x": 100, "y": 200 },
  "inventory": {}
}
```

### 5.7 Switch移植が効く理由

```
KSC → IR → VM → 実行
```

- WebではJS製VMで実行
- SwitchではC++製VMで実行
- IRは同じ → VMを書き直せば移植完了

---

## 6. Host API 仕様

すべてのScript命令はこのAPIだけを呼ぶ。

### 6.1 ノベル命令（既存）

| 命令 | 説明 |
|------|------|
| `say(char, text)` | 台詞表示 |
| `choice(list)` | 選択肢 |
| `jump(label)` | ジャンプ |
| `wait(sec)` | 待機 |

### 6.2 演出命令

| 命令 | 説明 |
|------|------|
| `bg(image)` | 背景設定 |
| `show(id, pos)` | キャラ表示 |
| `hide(id)` | キャラ非表示 |
| `move(id, x, y, duration)` | 移動 |
| `fade(id, alpha, duration)` | フェード |

### 6.3 マップ命令（追加）

| 命令 | 説明 |
|------|------|
| `loadMap(id)` | マップ読み込み |
| `spawnPlayer(id, x, y)` | プレイヤー配置 |
| `teleport(map, x, y)` | マップ間移動 |
| `setCollision(rects)` | 衝突範囲設定 |
| `cameraFollow(id)` | カメラ追従 |

### 6.4 イベント命令

| 命令 | 説明 |
|------|------|
| `onTrigger(name, label)` | トリガー登録 |
| `runEvent(label)` | イベント実行 |

### 6.5 RPG命令

| 命令 | 説明 |
|------|------|
| `startBattle(id)` | 戦闘開始 |
| `giveItem(id, n)` | アイテム付与 |
| `takeItem(id, n)` | アイテム削除 |
| `hasItem(id)` | アイテム所持判定 |

### 6.6 状態命令

| 命令 | 説明 |
|------|------|
| `setFlag(key, val)` | フラグ設定 |
| `getFlag(key)` | フラグ取得 |
| `ifFlag(key, label)` | フラグ条件分岐 |

---

## 7. Game Systems

### 7.1 MapSystem

```
load(id)
getColliders()
getTriggers()
```

Map定義：

```json
{
  "id": "village",
  "background": "village.png",
  "colliders": [{ "x": 0, "y": 0, "w": 100, "h": 500 }],
  "triggers": [{ "x": 200, "y": 300, "w": 50, "h": 50, "event": "npc1" }]
}
```

### 7.2 CharacterController

- 矩形衝突のみ、速度固定、斜め移動禁止

```
move(dx, dy)
setPosition(x, y)
getPosition()
```

### 7.3 EventSystem

発火条件：接触 / 決定キー / 自動

```
run(name)
register(rect, event)
```

### 7.4 BattleSystem

```
start(id)
finish(result)
```

Rendererは戦闘を知らない。

### 7.5 InventorySystem

```
add(id, n)
remove(id, n)
has(id)
```

### 7.6 FlagSystem

```
set(key, val)
get(key)
```

---

## 8. 標準ライブラリ（最小）

### Math

- `Math.min / max / floor / ceil / abs`
- `Math.random()` は禁止（再現性のため）→ PF提供 `Random.next()` を使う

### Random（PF提供、seed管理可能）

```typescript
namespace Random {
  function next(): number;                        // [0,1)
  function int(min: number, max: number): number;
}
```

### Console（デバッグ用）

```typescript
namespace Console {
  function log(msg: string): void;
  function warn(msg: string): void;
}
```

### Battle（PF専用API）

```typescript
namespace Battle {
  type Result = "win" | "lose" | "escape" | "error";
  type State = {
    battleId: string;
    turn: number;
    playerHp: number;
    enemyHp: number;
  };

  function getState(): State;
  function setAi(fn: FnRef | LabelRef): void;
  function end(result: Result): void;
}
```

---

## 9. SceneGraph / Renderer / 入力

### SceneGraph API

```
createNode()
addChild(parent, child)
setPosition(node, x, y)
setVisible(node, bool)
setAlpha(node, val)
```

### Renderer Interface（抽象）

```
init(target)
render(rootNode)
createTexture(src)
resize(w, h)
```

実装例：PixiRenderer / SDLRenderer

責務は描画のみ。ロジック・演出・判定は禁止。

### 入力仕様（抽象）

| 入力 | 用途 |
|------|------|
| `UP / DOWN / LEFT / RIGHT` | 移動 |
| `CONFIRM` | 決定 |
| `CANCEL` | キャンセル |

実デバイス依存禁止。

---

## 10. 実装順序（Claude必須遵守）

順番を変えてはいけない。

| Phase | 対象 |
|-------|------|
| Phase 1 | FlagSystem, InventorySystem |
| Phase 2 | MapSystem, CharacterController |
| Phase 3 | EventSystem |
| Phase 4 | BattleBridge |
| Phase 5 | Save / Load |

---

## 11. 完了条件

- ScriptがVMで実行される
- waitで停止、resumeで再開
- マップ移動可能、衝突動作
- トリガー発火、会話開始
- 戦闘突入
- セーブ → ロード復帰

---

## 12. 拡張ロードマップ

### 将来追加可

- AudioSystem、EffectSystem、AnimationSystem

### v0.2候補

- optional property `a?: T`
- interface（type aliasで代替可能なので後回し）
- class（継承なしで開始）
- `&` intersection
- エラー回復付きパーサ（エディタ体験向上）

それ以外は禁止。

---

## サンプルコード（10本）

```typescript
// S1: バトル結果で分岐値を返す
export function battleResultValue(): number {
  const st: Battle.State = Battle.getState();
  const r: Battle.Result = (st.enemyHp <= 0) ? "win" : "lose";
  switch (r) {
    case "win":  return 1;
    case "lose": return 0;
    default:     return -1;
  }
}

// S2: LabelRefを返してKSに判断させる
export function decideAfterBattle(result: Battle.Result): LabelRef {
  switch (result) {
    case "win":  return label("win_scene");
    case "lose": return label("lose_scene");
    default:     return label("error_scene");
  }
}

// S3: FnRefでAIを登録（保存可能）
export function setupAi(): void {
  Battle.setAi(fn("ai.basic"));
}

// S4: ドロップテーブル
type Drop = { id: string; qty: number };
export function rollDrop(): Drop[] {
  const r: number = Random.int(0, 100);
  if (r < 20) return [{ id: "potion", qty: 1 }];
  return [];
}

// S5: テンプレ文字列
export function expMessage(exp: number): string {
  return `EXP +${exp}`;
}

// S6: 乱数の再現性（Random強制）
export function pick(n: number): number {
  return Random.int(0, n);
}

// S7: 文字列連結は禁止（テンプレート文字列を使う）
export function showGold(gold: number): string {
  // return "gold:" + gold; // E1203
  return `gold:${gold}`;
}

// S8: unionで状態を絞る
type Phase = "idle" | "battle" | "result";
export function next(p: Phase): Phase {
  switch (p) {
    case "idle":   return "battle";
    case "battle": return "result";
    default:       return "idle";
  }
}

// S9: 配列の型
export function sum(xs: number[]): number {
  let s: number = 0;
  for (let i: number = 0; i < xs.length; i = i + 1) {
    s = s + xs[i];
  }
  return s;
}

// S10: 永続化禁止例（クロージャ）
export function closureNotSerializable(): void {
  // const f = () => 1; // 保存領域に入れたら E3001
}
```

---

## 13. KS構文リファレンス（v1互換・既存実装）

KSCの前身であるKSスクリプトの構文。TS版インタプリタで実装・テスト済み。

### 13.1 コマンド（JS関数呼び出し）

```javascript
bg("背景名")                          // 即時切り替え
bg("背景名", "トランジション名")         // エフェクト付き
ch("キャラID", "表情", "位置")          // キャラ表示
ch_hide("キャラID")                    // キャラ非表示
bgm("BGM名")                         // BGM再生
wait(ミリ秒)                           // 待機
```

### 13.2 セリフブロック（独自構文）

```
#キャラ名
セリフ1行目
セリフ2行目（複数行可）
#
```

### 13.3 パーサーのロジック

```
行の解釈ルール:
  1. 行頭が "//" → コメント、スキップ
  2. 行頭が "#" + 文字列 → セリフブロック開始、キャラ名取得
  3. 行が "#" 単独（セリフブロック中）→ セリフブロック終了
  4. セリフブロック内 → テキスト行として蓄積
  5. それ以外 → JS式として評価（関数呼び出し）
```

### 13.4 サンプル（テスト済み）

```javascript
bg("school_day")
ch("hero", "smile", "center")

#hero
おはよう。
今日もいい天気だな。
#

ch("heroine", "smile", "right")

#heroine
うん、そうだね。
太郎くん、今日も早いんだね。
#

bgm("daily")
wait(500)
bg("school_corridor", "fade")
ch_hide("hero")

#heroine
またね...
#
```

### 13.5 AI生成時に渡す情報

```
コマンド一覧:
  bg(name, transition?)       背景設定
  ch(id, expression, pos)     キャラ表示
  ch_hide(id)                 キャラ非表示
  bgm(name)                   BGM再生
  wait(ms)                    待機

セリフ構文:
  #キャラ名
  セリフ（複数行可）
  #

利用可能なアセット:
  背景: school_day, school_corridor, ...
  キャラ: hero(smile/angry/sad), heroine(smile/shy), ...
  BGM: daily, tense, romantic, ...
```

---

## 14. Switch展開の詳細

### 14.1 C++エンジンのSwitch対応範囲

```
全体のC++コード
├── SDL2部分（90%）         ← Switch上でそのまま動作（公式対応済み）
├── 自前インタプリタ（7%）   ← 純C++なのでそのまま動作
└── Nintendo SDK固有（3%）   ← 手動で実装が必要
    ├── プラットフォーム初期化
    ├── Joy-Conマッピング
    ├── eShop / セーブデータ管理API
    └── 認証周り
```

### 14.2 Claude Codeの対応度

| 層 | Claude Code | 備考 |
|----|-------------|------|
| DSLシナリオ/演出 | ◎ 最強 | 量産の主力 |
| エディタ（TS） | ◎ 最強 | 継続改善 |
| C++エンジン（SDL2） | ○ 十分 | 一回作れば終わり |
| インタプリタ移植（TS→C++） | ○ 十分 | 既存コードの変換 |
| Nintendo SDK固有 | ✗ ほぼ不可 | NDA下。手動 or 外部委託 |

### 14.3 Unity経由を採用しない理由

| 項目 | Unity経由 | C++ + SDL2 |
|------|-----------|-----------|
| ライセンス | Pro必須（年$2,040） | SDL2: zlib License、無料 |
| 既存資産 | 全部書き直し | インタプリタ移植のみ |
| 外部依存 | Unity本体 | SDL2のみ |
| エンジンサイズ | 巨大 | 2,000〜3,000行 |
| デバッグ | ブラックボックス | 全コード把握 |

---

## 15. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Nintendo開発者登録の不承認 | 中 | Phase 1-2で実績を積んでから申請 |
| インタプリタC++移植の品質 | 中 | TS版と同一テストケースで継続検証 |
| SDL2のSwitch対応状況変化 | 低 | Nintendo公式がメンテ |
| ノベルゲーム市場の変化 | 中 | 日中同時リリースで市場リスク分散 |
| フォント描画の日中対応 | 中 | 事前にフォントサブセット化 |
| C++エンジンのバグ | 低 | 規模が小さい（2,000〜3,000行） |

---

## 最終定義

このソフトは **Script実行VM付きノベル＋RPGランタイム** であり、**汎用ゲームエンジンではない**。

Rendererは状態を描画するだけ。ゲームロジックはVMが持つ。
