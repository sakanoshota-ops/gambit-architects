# Cloudflare Pages デプロイ手順書

| 項目 | 内容 |
| --- | --- |
| 対象 | M4-D（MVP公開フェーズ／Cloudflare Pages 接続） |
| 文書バージョン | v0.1 |
| 作成日 | 2026-06-13 |

---

## 0. 前提

- GitHub リポジトリ `sakanoshota-ops/gambit-architects` が Public か Private で存在
- Cloudflare アカウントを持っている（無料プランで OK）
- リポジトリに `public/_redirects`（SPA fallback）と `public/_headers`（キャッシュ制御）が含まれている

---

## 1. Cloudflare Pages 接続

### 1.1 プロジェクト作成

1. Cloudflare ダッシュボード → 「Workers & Pages」 → 「Create application」
2. 「Pages」タブ → 「Connect to Git」
3. GitHub アカウントを連携 → リポジトリ `gambit-architects` を選択

### 1.2 ビルド設定

| 項目 | 値 |
| --- | --- |
| **Production branch** | `main` |
| **Framework preset** | None（手動指定する） |
| **Build command** | `pnpm install --frozen-lockfile && pnpm build` |
| **Build output directory** | `dist` |
| **Root directory** | `/`（デフォルト） |
| **Node version** | 環境変数 `NODE_VERSION=24` で指定 |

### 1.3 環境変数

| 名前 | 値 | 説明 |
| --- | --- | --- |
| `NODE_VERSION` | `24` | Node.js 24 LTS を使用（CLAUDE.md と整合） |
| `NPM_FLAGS` | `--version`（ダミー、pnpm を使うため） | npm を呼ばないためのトリック |

### 1.4 PR プレビュー

- 「Preview deployments」を有効化
- PR を作るたびに `https://<commit-sha>.gambit-architects.pages.dev` が自動生成される

---

## 2. 初回デプロイ

設定保存 → 「Save and Deploy」 → 数分で初回ビルドが走る。

### よくある失敗

| エラー | 対処 |
| --- | --- |
| `pnpm: command not found` | Build command を `npm install -g pnpm && pnpm install && pnpm build` に変更 |
| `tsc: command not found` | devDependencies が入っていない。`NPM_FLAGS=--production` 指定を外す |
| `Out of memory` | ビルド時 OOM。`NODE_OPTIONS=--max-old-space-size=4096` 環境変数を追加 |

### 成功した場合の URL

- 本番：`https://gambit-architects.pages.dev/`（Cloudflare Pages デフォルト）
- プレビュー：`https://<branch>.<hash>.gambit-architects.pages.dev/`

---

## 3. カスタムドメイン（任意）

ドメイン持っていれば「Custom domains」から接続。
持っていなければ `pages.dev` のサブドメインで十分。

---

## 4. デプロイ後の確認

1. `https://gambit-architects.pages.dev/` を開く
2. PWA install プロンプトが出る（Chrome デスクトップ・モバイル）
3. インストール → オフラインで起動できることを確認
4. `https://gambit-architects.pages.dev/manifest.webmanifest` で manifest が見える
5. DevTools → Application → Service Workers で sw.js が registered
6. Lighthouse で PWA スコア 90+ を目指す

---

## 5. トラブルシューティング

### Service Worker が更新されない

- Cloudflare のキャッシュが残っている可能性。`Settings → Caching → Purge cache` で全消し
- ユーザー側はリロード（Ctrl+Shift+R）で sw.js 取り直し

### React Router の遷移で 404

- `public/_redirects` の `/*    /index.html   200` が正しく置かれているか確認
- Cloudflare Pages のビルド出力に `_redirects` が含まれているか（dist/_redirects があるか）

### 日本語フォントの崩れ

- システムフォント依存。WebFont 入れていない方針なので、ユーザー環境次第
- 必要なら `index.html` に `<link rel="preconnect" href="https://fonts.googleapis.com">` 追加検討（M5 で）

---

## 6. 変更履歴

| 版 | 日付 | 内容 |
| --- | --- | --- |
| v0.1 | 2026-06-13 | 初版（M4-D） |
