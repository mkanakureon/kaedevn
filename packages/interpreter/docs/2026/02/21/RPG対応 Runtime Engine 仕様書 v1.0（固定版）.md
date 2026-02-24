# **RPG対応 Runtime Engine 仕様書 v1.0（固定版）**

---

## **0\. 目的**

本エンジンは

ノベルゲーム＋簡易RPGを同一VMで実行可能にする

ことを目的とする。

フルゲームエンジン化は禁止。

---

## **1\. 非目標（絶対実装禁止）**

Claude Code は以下を追加してはいけない。

* 物理演算

* タイルエディタ

* NavMesh

* 3D

* スケルトンアニメ

* シェーダ編集

* シーンエディタ

* パーティクルエディタ

* GUIツール

* パスファインディング

理由  
 → エンジン肥大化防止

---

## **2\. 全体構造**

Script DSL  
  ↓  
Runtime VM（逐次実行）  JS風インタプリタ（VM本体）  同じもの
  ↓  
Game Systems  
  ├ MapSystem  
  ├ EventSystem  
  ├ BattleBridge  
  ├ InventorySystem  
  └ FlagSystem  
  ↓  
SceneGraph Engine  
  ↓  
Renderer（Pixi / SDL）  
---

## **3\. 追加システム仕様**

---

## **3.1 MapSystem**

責務：背景・衝突・イベント座標管理

### **Map定義形式**

{  
 "id": "village",  
 "background": "village.png",  
 "colliders": \[  
   {"x":0,"y":0,"w":100,"h":500}  
 \],  
 "triggers":\[  
   {"x":200,"y":300,"w":50,"h":50,"event":"npc1"}  
 \]  
}  
---

### **必須API**

loadMap(id)  
getColliderList()  
getTriggerList()  
---

## **3.2 CharacterController**

責務：移動＋衝突判定

仕様

* 矩形衝突のみ

* 速度固定

* 斜め移動禁止

---

### **API**

move(dx,dy)  
setPosition(x,y)  
getPosition()  
---

## **3.3 EventSystem**

責務：トリガー発火 → Script実行

---

### **発火条件**

* 接触

* 決定キー

* 自動

---

### **API**

runEvent(name)  
registerTrigger(rect,eventName)  
---

## **3.4 BattleBridge**

責務：既存バトルシステム呼び出し

---

### **API**

startBattle(encounterId)  
endBattle(result)

Rendererは戦闘を知らない。

---

## **3.5 InventorySystem**

最小仕様：

addItem(id,count)  
removeItem(id,count)  
hasItem(id)  
---

## **3.6 FlagSystem**

setFlag(key,value)  
getFlag(key)  
---

## **4\. DSL命令仕様**

---

### **4.1 ノベル命令（既存）**

say  
choice  
jump  
wait  
move  
fade  
bg  
char  
---

### **4.2 マップ命令（追加）**

loadMap(id)  
spawnPlayer(id,x,y)  
teleport(map,x,y)  
setCollision(rects)  
cameraFollow(target)  
---

### **4.3 イベント命令**

onTrigger(name,label)  
runEvent(label)  
---

### **4.4 RPG命令**

startBattle(id)  
giveItem(id,n)  
takeItem(id,n)  
setFlag(key,val)  
ifFlag(key,label)  
---

## **5\. 実行VM仕様（最重要）**

VMは逐次命令方式のみ。

禁止：

* 並列命令

* マルチスレッドScript

* フレーム実行Script

理由  
 → セーブ簡単化

---

### **VM状態保存データ**

必須保存内容

script pointer  
variables  
flags  
player position  
map id  
inventory  
---

## **6\. セーブ形式**

JSON固定

{  
"map":"village",  
"player":{"x":100,"y":200},  
"flags":{},  
"items":{},  
"scriptPtr":102  
}  
---

## **7\. Renderer責務（固定）**

Rendererは以下のみ許可

描画  
テクスチャ生成  
画面更新

禁止

* ロジック

* 演出

* 判定

---

## **8\. 入力仕様**

抽象入力のみ公開

up  
down  
left  
right  
confirm  
cancel

実デバイス依存禁止。

---

## **9\. 実装順序（Claude必須遵守）**

順番を変えてはいけない。

### **Phase1**

* FlagSystem

* InventorySystem

### **Phase2**

* MapSystem

* CharacterController

### **Phase3**

* EventSystem

### **Phase4**

* BattleBridge

### **Phase5**

* Save/Load

---

## **10\. 完了条件**

以下が動作したら完成

* マップ移動可能

* 衝突動作

* トリガー発火

* 会話開始

* 戦闘突入

* セーブ→ロード復帰

---

## **11\. 拡張許可ポイント（将来）**

ここだけ後から追加可

* AnimationSystem

* EffectSystem

* AudioSystem

他は禁止。

---

## **最重要設計原則**

Claude Code は必ず守ること：

Rendererは状態を描画するだけ  
 ゲームロジックはVMが持つ

---

## **最終定義**

このエンジンは

ノベル＋RPG実行VM

であり

汎用ゲームエンジンではない

