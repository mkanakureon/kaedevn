KSC Language Spec v0.1
0. 目的と非目的
目的

TS風の記法で 安全にロジックを書ける

同一ソースから Web/PC/Switch（=JSエンジン非依存）で動く

PF固有API（battle/audio/ui等）を 型付きで呼べる

永続化（プロジェクト保存/セーブ）に耐える

非目的（v0.1ではやらない）

TypeScript互換（推論/ジェネリクス/高度型演算）

async/await

例外機構（throw/catch）

クラス継承（class自体は後述の通り v0.2+）

1. ファイルとモジュール
ファイル拡張子

*.ksc（KSCソース）

モジュール単位

1ファイル = 1モジュール

モジュールIDは PF側の登録名（例："battle/ai"）

import（TS風の見た目、解決はPFレジストリ）
import { pickSkill } from "battle/ai";
import * as Battle from "battle/api";
解決ルール（決め打ち）

"battle/ai" は PFプロジェクト内の moduleRegistry を参照して解決

相対パス（./ や ../）は 禁止（PFでの移植・配布を単純化）

解決できない場合は コンパイルエラー（E2001）

2. 文字セット・コメント

UTF-8

// 行コメント、/* ... */ ブロックコメント

3. 値と型
プリミティブ型（v0.1固定）

number（float64相当。intは作らない）

string

boolean

null

undefined

コンテナ型

T[]

{ key: T, ... }（構造型、readonly/optionalは v0.2+）

リテラル型（超重要）

"win" | "lose" | "escape" | "error" など

union型

A | B のみ（intersection & は v0.2+）

type alias
type BattleResult = "win" | "lose";
type Drop = { id: string; qty: number };
4. 変数宣言
let/const
let gold: number = 100;
const name: string = "hiro";
ルール

型注釈は 必須（v0.1では推論しない）

例外：リテラルのみの const は推論可（const x = 1 は 1 型ではなく number 扱い）

5. 式と文
制御

if / else

for（C風のみ）

while

switch

switch (result) {
  case "win":  return 1;
  case "lose": return 0;
  default:     return -1;
}
演算

数値：+ - * / %

比較：== != < <= > >=

論理：&& || !

ルール（決め打ち）

== は JSの緩い比較は禁止にする（v0.1から == を「厳密比較」として扱う）

つまり == は内部的に === 相当

+ の string/number 混在は 禁止（E1203）

文字列連結はテンプレート文字列で行う

テンプレート文字列（許可）
const msg: string = `EXP +${exp}`;
6. 関数
関数宣言（必須）
function calcDamage(atk: number, def: number): number {
  return Math.max(1, atk - def);
}
ルール

引数・戻り値の型注釈は必須

void 型は v0.1で導入（戻り値なし）

function log(msg: string): void { ... }
7. first-class function（関数を変数に入れる）

KSCはTS風なので関数値は扱える。ただし PFとして壊れないために 関数値を2種類に分類する。

7.1 KscFn（KSC関数参照）

通常の function は KscFn として扱える

7.2 LabelRef（KSラベル参照：保存可能）

KSCからKSを直接jumpさせず、参照として扱う。

type LabelRef = { __kind: "LabelRef"; name: string };

function label(name: string): LabelRef {
  return { __kind: "LabelRef", name };
}
PFでの使い方（推奨）

KSCは LabelRef を返すだけ

KS側が @call で制御フローを握る

8. 永続化ポリシー（PFで重要）
保存可能（シリアライズ可能）

number/string/boolean/null

配列・オブジェクト（循環参照なし）

LabelRef

FnRef（関数名参照） ※後述

保存不可（v0.1）

クロージャ（キャプチャを持つ無名関数）

循環参照オブジェクト

ホストオブジェクト（DOM等）

方針

v0.1では「保存したい関数」は FnRef（名前参照） を使う

type FnRef = { __kind: "FnRef"; name: string };

function fn(name: string): FnRef {
  return { __kind: "FnRef", name };
}
9. KS ↔ KSC 接続（PFに合わせた決め打ち）
9.1 KSからKSC呼び出しは2種類だけ（固定）

@ksc call="module.func" args="..."：値を返す

@ksc exec="module.func" args="..."：副作用のみ

9.2 KSCの標準エントリポイント（推奨）

export function main(ctx: Context): Result; を推奨

ただし v0.1は自由（PF側が module.func を解決できればよい）

10. 標準ライブラリ（最小）
Math

Math.min/max/floor/ceil/abs

Math.random() は 禁止（再現性のため）

代わりに PF提供 Random.next() を使う

Random（PF提供、seed管理可能）
namespace Random {
  function next(): number;          // [0,1)
  function int(min: number, max: number): number; // inclusive/exclusiveはPF仕様で固定
}
Console（デバッグ用）
namespace Console {
  function log(msg: string): void;
  function warn(msg: string): void;
}
11. PF専用API（例：battle）
namespace Battle {
  type Result = "win" | "lose" | "escape" | "error";
  type State = {
    battleId: string;
    turn: number;
    playerHp: number;
    enemyHp: number;
  };

  function getState(): State;
  function setAi(fn: FnRef | LabelRef): void; // 参照を登録するだけ
  function end(result: Result): void;         // 結果を確定（KSへ戻る）
}

※ここはあなたの内部実装に合わせて増やせるが、v0.1では「最小」を維持。

12. エラー仕様（コンパイルエラーコード）

E1xxx：型

E2xxx：モジュール/解決

E3xxx：実行モデル制約

Wxxxx：警告

例

E1201：型不一致

E1203：string/number 混在 + 禁止

E2001：import解決失敗

E3001：保存不可の値（クロージャ等）を永続領域へ格納しようとした

サンプル（10本：コピペ用）
S1: バトル結果で分岐値を返す
export function battleResultValue(): number {
  const st: Battle.State = Battle.getState();
  const r: Battle.Result = (st.enemyHp <= 0) ? "win" : "lose";
  switch (r) {
    case "win":  return 1;
    case "lose": return 0;
    default:     return -1;
  }
}
S2: LabelRefを返してKSに判断させる
export function decideAfterBattle(result: Battle.Result): LabelRef {
  switch (result) {
    case "win":  return label("win_scene");
    case "lose": return label("lose_scene");
    default:     return label("error_scene");
  }
}
S3: FnRefでAIを登録（保存可能）
export function setupAi(): void {
  Battle.setAi(fn("ai.basic")); // 実体は関数名参照
}
S4: ドロップテーブル
type Drop = { id: string; qty: number };

export function rollDrop(): Drop[] {
  const r: number = Random.int(0, 100);
  if (r < 20) return [{ id: "potion", qty: 1 }];
  return [];
}
S5: テンプレ文字列
export function expMessage(exp: number): string {
  return `EXP +${exp}`;
}
S6: 乱数の再現性（Random強制）
export function pick(n: number): number {
  return Random.int(0, n);
}
S7: 文字列連結は禁止（例：エラーになる）
export function bad(gold: number): string {
  // return "gold:" + gold; // E1203
  return `gold:${gold}`;
}
S8: unionで状態を絞る
type Phase = "idle" | "battle" | "result";

export function next(p: Phase): Phase {
  switch (p) {
    case "idle":   return "battle";
    case "battle": return "result";
    default:       return "idle";
  }
}
S9: 配列の型
export function sum(xs: number[]): number {
  let s: number = 0;
  for (let i: number = 0; i < xs.length; i = i + 1) {
    s = s + xs[i];
  }
  return s;
}
S10: 永続化禁止例（クロージャ）
export function closureNotSerializable(): void {
  // const f = () => 1; // 保存領域に入れたら E3001
}
実装メモ（あなた向けの“最短コア”）

KSCをTS風にするための最短実装はこれで足ります。

パーサ：TSの全機能は要らない。上記サブセットのASTで十分

型チェッカ：型注釈必須にすれば推論が最小で済む

IR：

LOAD_CONST, LOAD_VAR, STORE_VAR

CALL, RET

JMP, JMP_IF_FALSE

SWITCH（caseテーブル）

バインディング：PF API（Battle/Random/Console）をホスト関数として登録

永続化検査：LabelRef/FnRef 以外の関数値を保存しようとしたらE3001

v0.2に回す候補（到達点に向けた拡張順）

optional property a?: T

interface（type aliasで代替できるので後回しでもOK）

class（入れるなら継承なしで開始）

& intersection

エラー回復付きパーサ（エディタ体験が上がる）

必要なら次に出すべきは 「KSCコンパイラのテストケースセット（文法×型×エラー）」 と 「エディタ補完に必要なシンボル情報（LSP相当の最小仕様）」。

TS風の文法＋静的型チェック＋あなたのVM/IR、ここの構造、理解不足
VM/IRについて教えて
Claude codeに聞いて現状を整理したい

了解。VM / IR の構造を“設計者視点”で体系化します。
目的は

Claude Code に現状を説明できる粒度まで理解すること

です。
（※実装方法ではなく「構造モデル」を説明します）

まず結論（最短理解）

KSC → VM実行までの流れはこの3層です。

KSCソース
   ↓
IR（中間表現）
   ↓
VM（仮想機械）
   ↓
実行結果

この3つは役割が完全に違います。

① IRとは何か（本質）

IR = 言語を機械が理解できる形に翻訳したもの

KSC（TS風）は人間用言語
IRはVM用言語

例

KSC

let x: number = 1 + 2;

IR（例）

LOAD_CONST 1
LOAD_CONST 2
ADD
STORE_VAR x

👉 IRは
CPUに近いけどCPUではない言語

IRの役割

IRがあると何が良いか

IRなし	IRあり
直接実行	VM共通化
移植不可	全環境動作
最適化不可	最適化可能
デバッグ困難	トレース可能

つまり

IR = 移植性 + 安定性 + 最適化の核

② VMとは何か

VM = IRを実行するエンジン

現実CPUで言うと

現実	あなたのPF
CPU	VM
機械語	IR
C言語	KSC
VMがやること

VMは基本的にこのループだけ

while(true){
  命令読む
  実行する
}

例

LOAD_CONST 1
LOAD_CONST 2
ADD

VM内部

stack.push(1)
stack.push(2)
a=pop()
b=pop()
push(a+b)
③ なぜSwitch対応にVMが効くのか

SwitchはJS実行環境ではありません。

もしKSCを直接JSとして書いた場合

KSC → JS → 実行

Switchでは

❌ JSが動かない
❌ eval禁止
❌ sandbox制限

しかしVMなら

KSC → IR → VM → 実行

Switchでは

VMはC++で書く

IRは同じ

つまり

VMを書き直せば移植完了

これが最大の利点。

④ IR設計の核心（ここが最重要）

IR設計がエンジン性能を決めます。

基本構造は3種類しかない。

命令タイプ
① スタック操作
LOAD_CONST
LOAD_VAR
STORE_VAR
② 演算
ADD
SUB
MUL
DIV
CMP_EQ
③ 制御
JMP
JMP_IF_FALSE
CALL
RET

👉 この3種類があれば言語は作れる。

⑤ IRの設計方式（2択）

ここは設計思想レベルの分岐です。

A. スタック型VM（推奨）

例：Java VM / Lua / Python

PUSH 1
PUSH 2
ADD

メリット

実装簡単

IR短い

バグ少ない

デメリット

最適化しづらい

👉 個人エンジンは基本これ

B. レジスタ型VM

例：LuaJIT / V8

R1 = 1
R2 = 2
R3 = R1 + R2

メリット

高速

最適化可能

デメリット

実装難しい

👉 最初は不要

⑥ あなたの構成に最適なVM設計（断定）

あなたのPF構成から判断すると最適は

スタックVM + 型付きIR

理由

TS風言語

型チェック済

Switch移植予定

型付きIRにすると

ADD_i32
ADD_f64
ADD_str

みたいに最適化可能。

⑦ VM内部の最低構成

VMはこれだけで動きます。

struct VM {
  stack
  callStack
  instructionPointer
  globalVars
}

以上。

⑧ デバッガが作れる理由

IRがあると

現在命令番号
現在スタック状態
変数一覧

が全部見える。

つまり

VM = デバッグ可能なCPU

⑨ Claude Code に聞く時の質問テンプレ（そのまま使える）

これを投げれば現状分析してくれます。

質問文

私はKSC言語 → IR → VM構成のスクリプトエンジンを作っています。
現在のコードベースが
・IRが存在するか
・VMがあるか
・直接AST実行になっていないか
を判定してください。

また現在の構造を以下分類で説明してください
① ASTインタプリタ
② バイトコードVM
③ トランスパイル実行

可能なら構造図を書いてください。

最重要まとめ（核心だけ）

覚えるのはこれだけでいい。

IR = 中間言語
VM = 実行機械

そして

IR設計がエンジンの性能と寿命を決める

もし次に進むなら
「あなたのPFに最適なIR命令セット設計（完全版）」 を出します。

今迄の情報で現状の実装を整理してみるわ

了解。いままで出ている情報だけで、あなたの現状を「推定として」整理します（断定できない部分は明示）。

現状の実装（推定整理）
1) すでに成立している機能

PF上のエディタがあり、昨日タイムラインが完成（実制作可能レベル）

薄味コマンドバトルが実装済み

戦闘起動は KSの @battle で、分岐は onWin/onLose を使う

@jump はあるが、今後は @call/@return 中心（goto回避） に寄せたい

“イベント”という一般概念（trigger/condition/action）は 明示的には未導入

2) ランタイム構造（かなり確度高い推定）

あなたの記述（Script DSL → Runtime VM（逐次実行） → Game Systems）から、少なくとも 逐次実行のVM は存在している可能性が高い。

ただし「VM」と言っても2系統ある：

A. KSのVM（ほぼ確実に存在）

@コマンド を逐次解釈して実行する実行機構

@battle、onWin/onLose により「外部システム（BattleSystem）」を呼び、結果で制御を戻す

→ これは スクリプトインタプリタ（AST/命令列の逐次実行） の形で成立しているはず。

B. タイムラインの実行機構（存在する）

タイムラインがある＝「時間に沿って命令が走る」実行機構がある

たぶん「タイムラインノード列をスケジュールして逐次評価」している

→ ここも広義のVM（スケジューラ）です。

3) いま「IR/バイトコードVM」かどうか（不確実）

現時点の会話情報だけだと、

KSC（TS風）は これから仕様確定

Switch対応のために VM/IR化したい

ただし「既にIRがある」とは言っていない

なので最も妥当な推定は：

現在：KSはAST/命令列インタプリタ（直接実行）
タイムラインも独自データを直接駆動（直接実行）
IR/バイトコード化はこれから

という状態。

分類で言うと、いまはおそらく：

① ASTインタプリタ（KS）

①〜②の中間（タイムライン：データ駆動実行＝命令列に近いがバイトコードではない）

整理すると「今どこが足りないか」

あなたが求めている到達点（KSCをTS風でVM/IRへ）に対して、欠けているのはこの3点。

KSCコンパイラ（TS風文法→AST→型チェック）

IR定義（命令セット / バイトコード形式）

KSC用VM（IRを実行する実行機械）
※KSのVMと統合するか、別VMにするかは設計次第

Claude Codeに現状整理させるための“最短質問テンプレ”

あなたが「現状を整理したい」用途に合わせて、聞くべき順序を固定します。

KSの実行は何方式か？

KSの実行部は AST をそのまま評価してますか？ それとも命令列（中間命令）にして実行してますか？ 該当コードの入口（run/execute）から教えて。

タイムラインの内部表現は何か？

タイムラインのデータ構造（ノード、トラック、クリップ等）と、再生ループ（tick/update）がどこにあるか特定して。タイムラインを「命令列」に落としてるかも判定して。

IR/バイトコードは既にあるか？

“opcode”“bytecode”“instruction”“emit”等が出てくる実装があるか全文検索して、存在すれば概要をまとめて。

Switch移植で再利用できる境界はどこか？

Web依存（DOM/Canvas）と、純粋ロジック（VM/バトル/スクリプト）を分けて、移植可能範囲を図にして。