# RPG対応 Runtime Engine 統合仕様書 v1.0

---

## 0. 目的

本エンジンは **ノベルゲーム＋簡易RPGを同一VMで実行可能にする** ことを目的とする。

フルゲームエンジン化は禁止。

---

## 1. 非目標（絶対実装禁止）

Claude Code は以下を追加してはいけない。

- 物理演算
- タイルエディタ
- NavMesh
- 3D
- スケルトンアニメ
- シェーダ編集
- シーンエディタ
- パーティクルエディタ
- GUIツール
- パスファインディング

理由 → エンジン肥大化防止

---

## 2. 全体構造（唯一の正式構造）

```
Script（ユーザー記述コード）
  ↓
JS風インタプリタ（VM本体）
  ↓
Host API（唯一の接続口）
  ↓
Game Systems（ロジック）
  ↓
SceneGraph Engine（状態管理）
  ↓
Renderer（描画）
```

### 依存方向ルール（絶対）

許可方向：

```
VM → Host → Systems → Engine → Renderer
```

禁止方向：

- Renderer → System
- System → VM
- Engine → VM

---

## 3. レイヤ責務（固定）

### Script

ユーザー記述コード。責務なし（ただの入力）。

### JS風インタプリタ（VM）

責務：

- 構文実行
- スコープ管理
- スタック
- 実行位置
- pause / resume

禁止：

- 描画
- 入力
- マップ
- 戦闘
- 状態管理

### Host API

唯一インタプリタから呼ばれる層。

- Script命令をゲーム処理へ変換
- 待機理由をVMへ返す

### Game Systems

純ロジック群。Renderer非依存。

- MapSystem
- EventSystem
- BattleSystem
- InventorySystem
- FlagSystem

### SceneGraph Engine

描画状態管理。

- Node階層
- transform
- 可視状態

### Renderer

責務は1つのみ：**状態を描画する**

禁止：

- ロジック
- 演出
- 判定

---

## 4. 実行モデル（固定）

VMは逐次実行方式のみ。

```
命令実行 → Host呼び出し → 待機なら停止 → resumeで再開
```

禁止：

- 並列命令
- マルチスレッドScript
- フレーム実行Script

理由 → セーブ簡単化

### Host関数戻り値

Host関数は必ず以下のいずれかを返す。

| 戻り値 | 意味 |
|--------|------|
| `CONTINUE` | 即座に次の命令へ |
| `WAIT_TIME` | 時間経過で再開 |
| `WAIT_INPUT` | 入力待ち |
| `WAIT_EVENT` | イベント完了待ち |
| `WAIT_BATTLE` | 戦闘終了待ち |

VMは `WAIT_*` を受けたら停止。

### VM状態定義

保存必須：

- PC（実行位置）
- call stack
- locals
- globals
- flags

---

## 5. Host API 仕様（正式）

すべてのScript命令はこのAPIだけを呼ぶ。

### 5.1 ノベル命令（既存）

| 命令 | 説明 |
|------|------|
| `say(char, text)` | 台詞表示 |
| `choice(list)` | 選択肢 |
| `jump(label)` | ジャンプ |
| `wait(sec)` | 待機 |

### 5.2 演出命令

| 命令 | 説明 |
|------|------|
| `bg(image)` | 背景設定 |
| `show(id, pos)` | キャラ表示 |
| `hide(id)` | キャラ非表示 |
| `move(id, x, y, duration)` | 移動 |
| `fade(id, alpha, duration)` | フェード |

### 5.3 マップ命令（追加）

| 命令 | 説明 |
|------|------|
| `loadMap(id)` | マップ読み込み |
| `spawnPlayer(id, x, y)` | プレイヤー配置 |
| `teleport(map, x, y)` | マップ間移動 |
| `setCollision(rects)` | 衝突範囲設定 |
| `cameraFollow(id)` | カメラ追従 |

### 5.4 イベント命令

| 命令 | 説明 |
|------|------|
| `onTrigger(name, label)` | トリガー登録 |
| `runEvent(label)` | イベント実行 |

### 5.5 RPG命令

| 命令 | 説明 |
|------|------|
| `startBattle(id)` | 戦闘開始 |
| `giveItem(id, n)` | アイテム付与 |
| `takeItem(id, n)` | アイテム削除 |
| `hasItem(id)` | アイテム所持判定 |

### 5.6 状態命令

| 命令 | 説明 |
|------|------|
| `setFlag(key, val)` | フラグ設定 |
| `getFlag(key)` | フラグ取得 |
| `ifFlag(key, label)` | フラグ条件分岐 |

---

## 6. Game Systems API

### MapSystem

```
load(id)
getColliders()
getTriggers()
```

Map定義形式：

```json
{
  "id": "village",
  "background": "village.png",
  "colliders": [
    { "x": 0, "y": 0, "w": 100, "h": 500 }
  ],
  "triggers": [
    { "x": 200, "y": 300, "w": 50, "h": 50, "event": "npc1" }
  ]
}
```

### CharacterController

責務：移動＋衝突判定

- 矩形衝突のみ
- 速度固定
- 斜め移動禁止

```
move(dx, dy)
setPosition(x, y)
getPosition()
```

### EventSystem

発火条件：接触 / 決定キー / 自動

```
run(name)
register(rect, event)
```

### BattleSystem

```
start(id)
finish(result)
```

Rendererは戦闘を知らない。

### InventorySystem

```
add(id, n)
remove(id, n)
has(id)
```

### FlagSystem

```
set(key, val)
get(key)
```

---

## 7. SceneGraph API

```
createNode()
addChild(parent, child)
setPosition(node, x, y)
setVisible(node, bool)
setAlpha(node, val)
```

---

## 8. Renderer Interface（抽象）

```
init(target)
render(rootNode)
createTexture(src)
resize(w, h)
```

実装例：

- PixiRenderer
- SDLRenderer

---

## 9. 入力仕様（抽象）

公開入力は固定：

| 入力 | 用途 |
|------|------|
| `UP` | 上移動 |
| `DOWN` | 下移動 |
| `LEFT` | 左移動 |
| `RIGHT` | 右移動 |
| `CONFIRM` | 決定 |
| `CANCEL` | キャンセル |

実デバイス依存禁止。

---

## 10. セーブ形式（固定JSON）

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

---

## 11. 実装順序（Claude必須遵守）

順番を変えてはいけない。

| Phase | 対象 |
|-------|------|
| Phase 1 | FlagSystem, InventorySystem |
| Phase 2 | MapSystem, CharacterController |
| Phase 3 | EventSystem |
| Phase 4 | BattleBridge |
| Phase 5 | Save / Load |

---

## 12. 完了条件

以下が動作したら完成：

- ScriptがVMで実行される
- waitで停止する
- resumeで再開する
- マップ移動可能
- 衝突動作
- トリガー発火
- 会話開始
- 戦闘突入
- セーブ → ロード復帰

---

## 13. 拡張可能領域（将来）

ここだけ後から追加可：

- AudioSystem
- EffectSystem
- AnimationSystem

それ以外は禁止。

---

## 最終定義

このソフトは **Script実行VM付きノベル＋RPGランタイム** であり、**汎用ゲームエンジンではない**。

Rendererは状態を描画するだけ。ゲームロジックはVMが持つ。
