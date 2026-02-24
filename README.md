# kaedevn

.ksc (Kaede Script) で動くビジュアルノベルエンジン。
プラットフォーム抽象化（IEngineAPI）により Web / Console / Switch に対応。

Visual novel engine powered by .ksc (Kaede Script) with platform abstraction (IEngineAPI).

## パッケージ

| パッケージ | バージョン | 説明 |
|---|---|---|
| [`@kaedevn/interpreter`](./packages/interpreter) | 0.1.0 | .ksc スクリプトインタプリタ |

## クイックスタート

```bash
npm install
npm run build
npm run demo          # コンソールでサンプル実行
```

## .ksc スクリプト例

```ksc
bg("school_day")
ch("hero", "smile", "center")

#hero
おはよう！今日もいい天気だね。
#

choice {
  "一緒に帰ろう" {
    affection += 2
    jump("go_home")
  }
  "図書室に行こう" if (affection >= 3) {
    jump("library")
  }
}
```

## ドキュメント

| カテゴリ | リンク |
|---|---|
| はじめに | [guide-getting-started.md](./packages/interpreter/docs/guide-getting-started.md) |
| スクリプトの書き方 | [guide-scripting.md](./packages/interpreter/docs/guide-scripting.md) |
| IEngineAPI 実装ガイド | [guide-engine-implementation.md](./packages/interpreter/docs/guide-engine-implementation.md) |
| ConsoleEngine ガイド | [guide-console-engine.md](./packages/interpreter/docs/guide-console-engine.md) |
| KSC 言語仕様 | [spec-ksc-language.md](./packages/interpreter/docs/spec-ksc-language.md) |
| 組み込みコマンド仕様 | [spec-builtin-commands.md](./packages/interpreter/docs/spec-builtin-commands.md) |
| API リファレンス | [api-reference.md](./packages/interpreter/docs/api-reference.md) |
| FAQ | [faq-troubleshooting.md](./packages/interpreter/docs/faq-troubleshooting.md) |
| 全ドキュメント索引 | [docs/README.md](./packages/interpreter/docs/README.md) |

## サンプルスクリプト

`packages/interpreter/examples/` に 8 つのサンプルを用意しています。

| ファイル | 内容 |
|---|---|
| [01-hello.ksc](./packages/interpreter/examples/01-hello.ksc) | 基本コマンド（bg, ch, bgm, セリフ） |
| [02-labels.ksc](./packages/interpreter/examples/02-labels.ksc) | ラベル・ジャンプ・サブルーチン |
| [03-variables.ksc](./packages/interpreter/examples/03-variables.ksc) | 変数・式評価・算術演算 |
| [05-conditionals.ksc](./packages/interpreter/examples/05-conditionals.ksc) | if / else if / else |
| [06-choices.ksc](./packages/interpreter/examples/06-choices.ksc) | 選択肢・条件付き選択肢 |
| [07-functions.ksc](./packages/interpreter/examples/07-functions.ksc) | def / sub / return |
| [08-commands.ksc](./packages/interpreter/examples/08-commands.ksc) | 全 17 コマンド一覧 |
| [04-full-scenario.ksc](./packages/interpreter/examples/04-full-scenario.ksc) | 全機能統合シナリオ |

## 利用方法

リファレンス実装として公開しています。Fork して自分のプロジェクトに合わせてお使いください。

開発環境の構築は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照。

## ライセンス

MIT
