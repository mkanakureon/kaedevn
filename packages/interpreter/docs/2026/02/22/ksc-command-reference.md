# KSC コマンドリファレンス

バージョン: 2026-02-22
インタープリタ: `@kaedevn/interpreter`

---

## KS と KSC の対応表

KS はコンパイラ形式（TyranoScript/KAG スタイル）。
KSC はインタープリタ形式（Kaede Script、関数呼び出しスタイル）。
両形式は共存しており、作者が用途に応じて選択して使用する。

### 基本構文

| 機能 | KS | KSC |
|------|-----|------|
| コメント | `; コメント` | `// コメント` |
| ラベル定義 | `*label_name` | `*label_name` |
| 改行待ち（クリック） | `@l` | ダイアローグブロック終了時に自動 |
| ページ送り（テキストクリア） | `@p` | ダイアローグブロック終了時に自動 |
| ソフト改行 | `@r` | ダイアローグブロック内で改行して記述 |

### セリフ

| 機能 | KS | KSC |
|------|-----|------|
| ナレーター | `テキスト@l` | `#narrator` ～ `#` ブロック |
| キャラセリフ | `#キャラ名` → テキスト → `@l` | `#キャラID` ～ `#` ブロック |
| 変数補間 | — | `{varName}` / `{式}` |

**KS 例:**
```ks
#主人公
おはよう。@l
今日はいい天気だ。@p
```

**KSC 例:**
```ksc
#hero
おはよう。
今日はいい天気だ。
#
```

### 背景

| 機能 | KS | KSC |
|------|-----|------|
| 背景設定 | `@bg bg_id` | `bg("bg_id")` |
| 背景（フェード） | `@bg bg_id fade 500` | `bg("bg_id", "fade")` |

### キャラクター

| 機能 | KS | KSC |
|------|-----|------|
| キャラ表示 | `@ch name pose left/center/right` | `ch("name", "pose", "left/center/right")` |
| キャラ表示（フェード） | `@ch name pose center fade 300` | `ch("name", "pose", "center", 300)` |
| キャラ非表示 | `@ch_hide name` | `ch_hide("name")` |
| キャラ非表示（フェード） | `@ch_hide name fade 200` | `ch_hide("name", 200)` |
| 全キャラ消去 | `@ch_clear` | `ch_clear()` |
| 全キャラ消去（フェード） | `@ch_clear fade 500` | `ch_clear(500)` |
| キャラ移動 | — | `ch_move("name", "right", 300)` |
| アニメーション表示 | — | `ch_anim("name", "pose", "center")` |

### オーディオ

| 機能 | KS | KSC |
|------|-----|------|
| BGM 再生 | `@bgm bgm_id` | `bgm("bgm_id")` |
| BGM 音量指定 | `@bgm bgm_id vol 80` | `bgm("bgm_id", 80)` |
| BGM フェードイン | `@bgm bgm_id vol 80 fade 500` | `bgm("bgm_id", 80, 500)` |
| BGM 停止 | `@bgm_stop` | `bgm_stop()` |
| BGM フェードアウト停止 | `@bgm_stop fade 500` | `bgm_stop(500)` |
| SE 再生 | `@se se_id` | `se("se_id")` |
| SE 音量指定 | `@se se_id vol 90` | `se("se_id", 90)` |
| ボイス再生 | `@voice voice_id` | `voice("voice_id")` |

### 待機

| 機能 | KS | KSC |
|------|-----|------|
| 時間待機 | `@wait 0.5`（秒） | `wait(500)`（ミリ秒） |
| クリック待ち | `@l` | `waitclick()` |

> **注意:** KS の `@wait` は秒単位。KSC の `wait()` はミリ秒単位。

### フロー制御

| 機能 | KS | KSC |
|------|-----|------|
| ジャンプ | `@jump target=label` | `jump("label")` |
| サブルーチン呼び出し | （未サポート） | `call("label")` |
| サブルーチン戻り | （未サポート） | `ret()` |

### タイムライン / バトル

| 機能 | KS | KSC |
|------|-----|------|
| タイムライン実行 | — | `timeline("name")` / `timeline_play("name")` |
| バトル開始 | — | `battle("troopId", "win_label", "lose_label")` |

---

## KSC 固有機能（KS に対応なし）

### 変数

```ksc
// 代入
affection = 0
name = "太郎"
flag = false

// 複合代入
affection += 2
affection -= 1
score *= 3

// 変数補間（ダイアローグ内のみ）
#hero
好感度は{affection}です。
#
```

### 条件分岐

```ksc
if (affection >= 5) {
  #heroine
  嬉しい！
  #
} else if (affection >= 3) {
  #heroine
  まあまあかな。
  #
} else {
  #heroine
  うーん...
  #
}
```

### 選択肢

```ksc
choice {
  "一緒に帰ろう" {
    affection += 2
    jump("go_home")
  }
  "図書室に寄らない？" if (affection >= 3) {
    affection += 1
    jump("library")
  }
  "用事があるんだ" {
    affection -= 1
  }
}
```

### 関数定義（def）

戻り値あり。式の中で呼び出せる。

```ksc
def mood(aff) {
  if (aff >= 8) {
    return "happy"
  }
  return "normal"
}

// 使用例
ch("heroine", mood(affection), "center")
```

### サブルーチン定義（sub）

戻り値なし。処理のまとまりを再利用。

```ksc
sub show_status() {
  #narrator
  現在の好感度: {affection}
  #
}

// 使用例
show_status()
```

---

## KSC 全コマンド一覧

### 組み込みコマンド（現在実装済み）

| コマンド | シグネチャ | 説明 |
|---------|-----------|------|
| `bg` | `bg(id, effect?)` | 背景設定 |
| `ch` | `ch(name, pose, position?, fadeMs?)` | キャラ表示 |
| `ch_anim` | `ch_anim(name, pose, position)` | キャラアニメ表示 |
| `ch_hide` | `ch_hide(name, fadeMs?)` | キャラ非表示 |
| `ch_clear` | `ch_clear(fadeMs?)` | 全キャラ消去 |
| `bgm` | `bgm(id, vol?, fadeMs?)` | BGM 再生 |
| `bgm_stop` | `bgm_stop(fadeMs?)` | BGM 停止 |
| `se` | `se(id, vol?)` | SE 再生 |
| `voice` | `voice(id)` | ボイス再生 |
| `wait` | `wait(ms)` | 時間待機（ミリ秒） |
| `waitclick` | `waitclick()` | クリック待ち |
| `timeline` | `timeline(name)` | タイムライン実行 |
| `timeline_play` | `timeline_play(name)` | タイムライン実行（エイリアス） |
| `battle` | `battle(troopId, onWin?, onLose?)` | バトル開始 |
| `jump` | `jump(label)` | ラベルへジャンプ |
| `call` | `call(label)` | サブルーチン呼び出し |
| `ret` | `ret()` | `call()` 元に戻る |

### position パラメータの値

| 値 | 短縮形 | 説明 |
|----|--------|------|
| `"left"` | `"L"` | 左 |
| `"center"` | `"C"` | 中央 |
| `"right"` | `"R"` | 右 |

---

## ファイル構成

| 形式 | 拡張子 | 処理系 | 状態 |
|------|--------|--------|------|
| KS | `.ks` | `@kaedevn/compiler` → OpRunner | コンパイル型 |
| KSC | `.ksc` | `@kaedevn/interpreter` | インタープリタ型 |

両形式とも継続サポート。作者が用途に応じて選択する。

---

## サンプル：背景＋キャラクター

```ksc
*start
bg("room_day")
ch("hero", "smile", "center")

#hero
良い朝だ。
今日は何をしようか。
#

ch("heroine", "happy", "right", 300)

#heroine
おはよう！
#

ch("hero", "normal", "left")
ch("heroine", "normal", "right")

#narrator
二人は向かい合った。
#

ch_clear(400)
bg("library", "fade")

#hero
図書館に来てみた。
#
```
