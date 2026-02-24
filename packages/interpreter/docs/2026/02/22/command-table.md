# コマンド対応表 — KS / KSC

作成: 2026-02-22

KS はコンパイラ形式（`@kaedevn/compiler`）。
KSC はインタープリタ形式（`@kaedevn/interpreter`）。
両形式は共存し、作者が選択して使用する。

---

## 表示・演出

| 機能 | KS | KSC |
|------|-----|------|
| 背景設定 | `@bg id` | `bg("id")` |
| 背景（フェード） | `@bg id fade 500` | `bg("id", "fade")` |
| キャラ表示 | `@ch name pose center` | `ch("name", "pose", "center")` |
| キャラ表示（フェード） | `@ch name pose center fade 300` | `ch("name", "pose", "center", 300)` |
| キャラ非表示 | `@ch_hide name` | `ch_hide("name")` |
| キャラ非表示（フェード） | `@ch_hide name fade 200` | `ch_hide("name", 200)` |
| 全キャラ消去 | `@ch_clear` | `ch_clear()` |
| 全キャラ消去（フェード） | `@ch_clear fade 500` | `ch_clear(500)` |
| キャラアニメ表示 | — | `ch_anim("name", "pose", "center")` |
| キャラ移動 | — | ※未実装 |

---

## セリフ

| 機能 | KS | KSC |
|------|-----|------|
| ナレーター | `テキスト@l` | `#narrator` ～ `#` ブロック |
| キャラセリフ | `#名前` + テキスト + `@l` | `#キャラID` ～ `#` ブロック |
| 変数補間 | — | `{varName}` / `{式}` （ブロック内のみ） |

**KS:**
```ks
#さくら
おはよう！@l
```

**KSC:**
```ksc
#sakura
おはよう！
#
```

---

## テキスト制御

| 機能 | KS | KSC |
|------|-----|------|
| クリック待ち（改行） | `@l` | ダイアローグブロック終了で自動 |
| ページ送り（テキストクリア） | `@p` | 同上 |
| ソフト改行（待ちなし） | `@r` | ブロック内で改行して記述 |
| クリック待ち（単体） | `@l` | `waitclick()` |

---

## オーディオ

| 機能 | KS | KSC |
|------|-----|------|
| BGM 再生 | `@bgm id` | `bgm("id")` |
| BGM 音量指定 | `@bgm id vol 80` | `bgm("id", 80)` |
| BGM フェードイン | `@bgm id vol 80 fade 500` | `bgm("id", 80, 500)` |
| BGM 停止 | `@bgm_stop` | `bgm_stop()` |
| BGM フェードアウト停止 | `@bgm_stop fade 500` | `bgm_stop(500)` |
| SE 再生 | `@se id` | `se("id")` |
| SE 音量指定 | `@se id vol 90` | `se("id", 90)` |
| ボイス再生 | `@voice id` | `voice("id")` |

---

## 待機

| 機能 | KS | KSC | 注意 |
|------|-----|------|------|
| 時間待機 | `@wait 0.5` | `wait(500)` | **KS=秒、KSC=ミリ秒** |
| クリック待ち | `@l` | `waitclick()` | |

---

## フロー制御

| 機能 | KS | KSC |
|------|-----|------|
| ラベル定義 | `*label` | `*label` |
| ジャンプ | `@jump target=label` | `jump("label")` |
| サブルーチン呼び出し | — | `call("label")` |
| サブルーチン復帰 | — | `ret()` |
| 条件分岐 | `if (条件) { }` | `if (条件) { }` |
| else if | — | `} else if (条件) {` |
| else | `} else {` | `} else {` |
| 選択肢 | `choice { "text" { } }` | `choice { "text" { } }` |
| 条件付き選択肢 | — | `"text" if (条件) { }` |

---

## タイムライン / バトル

| 機能 | KS | KSC |
|------|-----|------|
| タイムライン実行 | — | `timeline("name")` |
| バトル開始 | — | `battle("troopId", "win_label", "lose_label")` |

---

## 変数

| 機能 | KS | KSC |
|------|-----|------|
| 代入（数値） | `flag = 0` | `flag = 0` |
| 代入（文字列） | — | `name = "太郎"` |
| 代入（真偽値） | — | `flag = false` |
| 加算 | `score += 5` | `score += 5` |
| 減算 | `health -= 10` | `health -= 10` |
| 乗算 | — | `damage *= 3` |
| 除算 | — | `score /= 2` |

---

## 関数定義（KSC のみ）

| 種類 | 構文 | 戻り値 |
|------|------|--------|
| 関数 | `def name(params) { return value }` | あり |
| サブルーチン | `sub name(params) { }` | なし |

---

## コメント

| KS | KSC |
|----|------|
| `; コメント` | `// コメント` |

---

## position パラメータ

| 値 | 短縮形 |
|----|--------|
| `"left"` | `"L"` |
| `"center"` | `"C"` |
| `"right"` | `"R"` |
