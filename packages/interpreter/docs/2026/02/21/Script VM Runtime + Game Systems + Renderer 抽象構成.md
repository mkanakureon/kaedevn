# **統合仕様書**

## **Script VM Runtime \+ Game Systems \+ Renderer 抽象構成**

---

## **1\. システム全体構造（唯一の正式構造）**

Script  
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
---

## **2\. レイヤ責務（固定）**

### **Script**

ユーザー記述コード  
 責務なし（ただの入力）

---

### **JS風インタプリタ（VM）**

責務：

* 構文実行

* スコープ管理

* スタック

* 実行位置

* pause/resume

禁止：

* 描画

* 入力

* マップ

* 戦闘

* 状態管理

---

### **Host API**

唯一インタプリタから呼ばれる層。

役割：

* Script命令をゲーム処理へ変換

* 待機理由をVMへ返す

---

### **Game Systems**

純ロジック群

構成：

* MapSystem

* EventSystem

* BattleSystem

* InventorySystem

* FlagSystem

Renderer非依存。

---

### **SceneGraph Engine**

描画状態管理

保持するもの：

* Node階層

* transform

* 可視状態

---

### **Renderer**

責務は1つのみ：

状態を描画する

禁止：

* ロジック

* 演出

* 判定

---

---

# **3\. 実行モデル（固定）**

VMは逐次実行方式。

命令実行  
↓  
Host呼び出し  
↓  
待機なら停止  
↓  
resumeで再開  
---

## **VM状態定義**

保存必須：

PC（実行位置）  
call stack  
locals  
globals  
flags  
---

---

# **4\. Host API 仕様（正式）**

すべてのScript命令はこのAPIだけを呼ぶ。

---

## **4.1 ノベル命令**

say(char,text)  
wait(sec)  
choice(list)  
jump(label)  
---

## **4.2 演出命令**

move(id,x,y,duration)  
fade(id,alpha,duration)  
bg(image)  
show(id,pos)  
hide(id)  
---

## **4.3 マップ命令**

loadMap(id)  
spawnPlayer(id,x,y)  
teleport(map,x,y)  
cameraFollow(id)  
---

## **4.4 RPG命令**

startBattle(id)  
giveItem(id,n)  
takeItem(id,n)  
hasItem(id)  
---

## **4.5 状態命令**

setFlag(key,val)  
getFlag(key)  
---

---

# **5\. Host関数戻り値仕様**

Host関数は必ず以下のいずれかを返す。

CONTINUE  
WAIT\_TIME  
WAIT\_INPUT  
WAIT\_EVENT  
WAIT\_BATTLE

VMは WAIT を受けたら停止。

---

---

# **6\. Game Systems API**

---

## **MapSystem**

load(id)  
getColliders()  
getTriggers()  
---

## **EventSystem**

run(name)  
register(rect,event)  
---

## **BattleSystem**

start(id)  
finish(result)  
---

## **InventorySystem**

add(id,n)  
remove(id,n)  
has(id)  
---

## **FlagSystem**

set(key,val)  
get(key)  
---

---

# **7\. SceneGraph API**

createNode()  
addChild(parent,child)  
setPosition(node,x,y)  
setVisible(node,bool)  
setAlpha(node,val)  
---

---

# **8\. Renderer Interface（抽象）**

init(target)  
render(rootNode)  
createTexture(src)  
resize(w,h)

Renderer実装例：

* PixiRenderer

* SDLRenderer

---

---

# **9\. 入力仕様（抽象）**

公開入力は固定：

UP  
DOWN  
LEFT  
RIGHT  
CONFIRM  
CANCEL  
---

---

# **10\. セーブ形式（固定JSON）**

{  
pc,  
stack,  
locals,  
globals,  
flags,  
map,  
player,  
inventory  
}  
---

---

# **11\. 依存方向ルール（絶対）**

許可方向：

VM → Host → Systems → Engine → Renderer

禁止方向：

* Renderer → System

* System → VM

* Engine → VM

---

---

# **12\. 拡張可能領域**

将来追加可：

* AudioSystem

* EffectSystem

* AnimationSystem

それ以外は禁止。

---

---

# **13\. 完了定義**

次が成立した時点で仕様完成：

* ScriptがVMで実行される

* waitで停止する

* resumeで再開する

* map移動可能

* battle開始可能

* save→load復帰可能

---

---

# **最終定義（このシステムの正体）**

このソフトは

Script実行VM付きゲームランタイム

であり

ゲームエンジンではない

