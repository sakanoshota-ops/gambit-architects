# Gambit Architects

ガンビット型 AI プログラミング × オートバトル × サンドボックス。
FINAL FANTASY XII のガンビットを"主役"に据えた、Web ベースの個人開発タイトル。

## ローカル起動

```sh
pnpm install        # 依存関係のインストール（初回のみ）
pnpm test           # 全テスト実行（M1 時点で 61 件）
pnpm run demo       # コンソールで戦闘デモを実行
```

開発サーバ（M2 以降の UI 開発で使用）：

```sh
pnpm dev            # → http://localhost:5173/
```

## ドキュメント

- [企画書](docs/gambit_game_planning_doc.md) … プロジェクト全体像と v1.0 凍結ライン
- [ガンビット DSL 仕様 v0.3](docs/gambit_dsl_spec.md) … 条件 21・行動 15・対象 6
- [M1 完了チェックリスト](docs/m1_checklist.md) … マイルストーン進捗
- [エンジン選定資料](docs/engine_decision.md) … なぜ TypeScript + React + Vite なのか
- [開発環境セットアップ手順](docs/dev_env_setup.md) … ゼロから手元を整える
- [`CLAUDE.md`](CLAUDE.md) … AI 開発パートナー（Claude）への前提情報

## 現在のマイルストーン

**M1（コア検証フェーズ）完了**：ガンビット評価器・最小戦闘ループ・剣士ジョブ・敵 3 種・標準プリセット 4 種・コンソールデモまで実装済み。

次は **M2（プレイアブル化）**：UI / ガンビット編集 UI / ジョブ 3 種 / 敵 5 体 / 深度 1〜5。

## 技術スタック

TypeScript 6 / React 19 / Vite 8 / Tailwind v4 / Vitest 4 / ESLint 10 / Prettier 3 / pnpm（Volta 管理 Node 24）。
配信：Web → PWA。サーバ不使用。Cloudflare Pages 配備予定（M5 以降）。

## ライセンス

未定（v1.0 公開時に決定予定）。
