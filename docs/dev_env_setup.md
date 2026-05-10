# 開発環境セットアップ手順 v0.1
## ― Gambit Architects 個人開発：ゼロから M1 着手までの準備 ―

| 項目 | 内容 |
| --- | --- |
| 対象 OS | Windows 10/11（macOS/Linux は要点のみ補足） |
| ゴール | `npm run dev` で React 画面が出て、`npm test` で評価器テストが走る状態 |
| 所要時間 | 約 1〜2 時間（ダウンロード時間込み） |
| 前提 | 管理者権限のある PC、安定したネット回線 |

---

## 0. インストールするものの全体像

| カテゴリ | ツール | 役割 |
| --- | --- | --- |
| ランタイム | **Node.js (LTS, 20.x or 22.x)** | TypeScript/React の実行・ビルド基盤 |
| パッケージ管理 | **pnpm** | npm より高速・省ディスク。推奨 |
| バージョン管理 | **Git** | コミット履歴管理 |
| GitHub 連携 | **GitHub アカウント** + （任意で **GitHub CLI**） | リモート保管・公開 |
| エディタ | **VS Code** + 拡張機能数本 | 開発の中心 |
| ブラウザ | **Chrome / Edge** + DevTools | 動作確認・PWA 検証 |
| （後回し可）| Cloudflare アカウント | M5 以降のデプロイで使う |

> M1 段階では **Cloudflare はまだ要らない**。Node.js / Git / VS Code が揃えば着手できる。

---

## 1. Node.js のインストール

### 1.1 推奨：**Volta** で入れる（後々のバージョン管理が楽）

PowerShell（管理者）で：

```powershell
# Volta のインストーラを取得して実行
winget install Volta.Volta
```

新しい PowerShell を開き直して、Node の LTS を入れる：

```powershell
volta install node@lts
volta install pnpm
```

**確認**：

```powershell
node --version    # v20.x.x or v22.x.x が出れば OK
pnpm --version    # 9.x.x or 10.x.x が出れば OK
```

> **winget が使えない／古い Windows の場合**：
> https://nodejs.org/ja から LTS の MSI インストーラを直接落として実行 → その後 `npm install -g pnpm`

### 1.2 macOS / Linux 補足
```bash
# macOS (Homebrew)
brew install volta
volta install node@lts pnpm

# Linux
curl https://get.volta.sh | bash
volta install node@lts pnpm
```

---

## 2. Git のインストール

### 2.1 Windows
```powershell
winget install Git.Git
```

インストーラの選択肢はすべて**デフォルトで OK**（Git Bash 同梱、改行コードは自動変換、VS Code を既定エディタにする等）。

### 2.2 初期設定（一度だけ）
```powershell
git config --global user.name "しょうた"
git config --global user.email "sakano.shota@gmail.com"
git config --global init.defaultBranch main
git config --global core.autocrlf input    # Windows でも改行を LF に統一
```

**確認**：
```powershell
git --version
git config --global --list
```

---

## 3. GitHub の準備

### 3.1 アカウント
- https://github.com にメール（sakano.shota@gmail.com）でサインアップ
- 2要素認証（2FA）を**必ず有効化**（後でやらない方がいい）

### 3.2 SSH 鍵の設定（推奨：HTTPS よりトラブル少ない）

```powershell
ssh-keygen -t ed25519 -C "sakano.shota@gmail.com"
```
- 保存先・パスフレーズは Enter でデフォルトでも OK

公開鍵をコピー：
```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```

GitHub → Settings → SSH and GPG keys → "New SSH key" に貼り付け。

**確認**：
```powershell
ssh -T git@github.com
# "Hi <username>! You've successfully authenticated..." が出れば OK
```

### 3.3 （任意）GitHub CLI
リポジトリ作成・PR 作成が CLI でできて楽。
```powershell
winget install GitHub.cli
gh auth login    # ブラウザ認証
```

---

## 4. VS Code のインストールと設定

### 4.1 本体
```powershell
winget install Microsoft.VisualStudioCode
```

### 4.2 拡張機能（必須）
VS Code を起動して、以下を入れる（拡張機能ビュー or `code --install-extension <id>`）：

| 拡張機能 | 役割 |
| --- | --- |
| `dbaeumer.vscode-eslint` | ESLint 連携 |
| `esbenp.prettier-vscode` | Prettier（自動フォーマット） |
| `bradlc.vscode-tailwindcss` | Tailwind 補完 |
| `vitest.explorer` | Vitest テストの GUI 実行 |
| `eamodio.gitlens` | Git 履歴・blame 強化 |
| `mhutchie.git-graph` | コミットツリーの可視化 |
| `usernamehw.errorlens` | エラー表示を行内にインライン化 |
| `streetsidesoftware.code-spell-checker` | スペルチェック |
| `christian-kohler.path-intellisense` | パス補完 |
| `formulahendry.auto-rename-tag` | JSX タグ同時編集 |

### 4.3 推奨設定（`settings.json`）
コマンドパレット → "Preferences: Open User Settings (JSON)" → 以下を追記：

```jsonc
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.eol": "\n",
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 5. プロジェクト用フォルダ準備

### 5.1 作業フォルダの場所
パスにスペース・日本語が含まれない場所に作る（後々のトラブル回避）。

例：
```
C:\Users\sakan\dev\gambit-architects
```

PowerShell で：
```powershell
mkdir C:\Users\sakan\dev
cd C:\Users\sakan\dev
```

### 5.2 GitHub 上にリポジトリ作成
GitHub Web で "New repository"：
- 名前：`gambit-architects`
- 公開設定：**Private**（v1.0 出荷時に Public へ）
- README/.gitignore/LICENSE は**チェックしない**（次の Vite 初期化と競合するため）

または gh CLI で：
```powershell
gh repo create gambit-architects --private --confirm
```

---

## 6. Vite + React + TS でプロジェクト生成

### 6.1 ひな形作成
```powershell
cd C:\Users\sakan\dev
pnpm create vite gambit-architects --template react-ts
cd gambit-architects
pnpm install
```

### 6.2 動作確認
```powershell
pnpm dev
```
→ ブラウザで `http://localhost:5173/` を開いて Vite + React のロゴが回っていれば OK。

`Ctrl+C` で停止。

---

## 7. 必要パッケージの追加

```powershell
# UI
pnpm add tailwindcss@3 postcss autoprefixer
pnpm dlx tailwindcss init -p

# テスト
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom

# リント・フォーマット
pnpm add -D eslint prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks

# PWA（M1 では未使用、設定だけ入れておいてもよい）
pnpm add -D vite-plugin-pwa
```

### 7.1 Tailwind 設定
`tailwind.config.js` の `content` を更新：
```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

`src/index.css` の先頭を以下に置き換え：
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 7.2 Vitest 設定
`vite.config.ts` を以下に：
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

`src/test/setup.ts` を作成：
```ts
import "@testing-library/jest-dom";
```

`package.json` の scripts に追記：
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "lint": "eslint . --ext ts,tsx"
}
```

### 7.3 動作確認
```powershell
pnpm dev      # 画面が表示される
pnpm test     # "No test files found" でも OK（まだ書いてないので）
pnpm build    # dist/ フォルダができる
```

---

## 8. CLAUDE.md と既存ドキュメントをリポジトリに移植

このセッションで作ったドキュメント群（`outputs/` 配下）をプロジェクトに取り込む：

```powershell
mkdir docs
# 以下4ファイルを docs/ にコピー（手動 or エクスプローラで）
#   gambit_game_planning_doc.md
#   gambit_dsl_spec.md
#   m1_checklist.md
#   engine_decision.md

# CLAUDE.md は "プロジェクトルート" に置く（AI が最初に読む慣例）
# C:\Users\sakan\dev\gambit-architects\CLAUDE.md
```

---

## 9. 初回コミット

```powershell
cd C:\Users\sakan\dev\gambit-architects

git init   # Vite が既に init している場合は不要
git add .
git commit -m "chore: initial scaffold (Vite + React + TS + Tailwind + Vitest)"
git branch -M main
git remote add origin git@github.com:<your-username>/gambit-architects.git
git push -u origin main
```

**確認**：GitHub 上で履歴が見えれば成功。

---

## 10. ここまで終わったら確認するチェック

セットアップが完了している＝以下すべて Yes：

- [ ] `node --version` / `pnpm --version` / `git --version` が動く
- [ ] VS Code が起動して、上記の拡張機能が入っている
- [ ] `pnpm dev` でブラウザに React の初期画面が出る
- [ ] `pnpm test` がエラーなく終わる（テストがゼロでも可）
- [ ] `pnpm build` が成功して `dist/` ができる
- [ ] GitHub に push 済みで、Web で見られる
- [ ] VS Code で TS ファイルを編集すると保存時に自動フォーマットがかかる
- [ ] `docs/` 配下に企画書・DSL 仕様書・M1 チェックリスト・エンジン選定資料がある
- [ ] プロジェクトルートに `CLAUDE.md` がある

これで **M1 の作業に入る準備が完了**。

---

## 11. よくあるトラブルと対処

| 症状 | 対処 |
| --- | --- |
| `pnpm` コマンドが見つからない | PowerShell を開き直す。Volta が PATH を通すには再起動が要ることがある |
| `pnpm install` が遅い／失敗する | 一度 `pnpm store prune` → 再 install。社内ネットならプロキシ設定が必要な場合あり |
| VS Code でフォーマットが効かない | 拡張 `Prettier - Code formatter` を有効化、`settings.json` の `defaultFormatter` 確認 |
| `git push` で permission denied | SSH 鍵が GitHub に登録されていない。§3.2 を再確認 |
| `pnpm dev` のホットリロードが効かない | Windows Defender の対象から `dev/` フォルダを除外すると改善することあり |
| Tailwind のクラスが効かない | `tailwind.config.js` の `content` パスが間違っていないか、`index.css` で `@tailwind` 3行が読まれているか確認 |

---

## 12. 次の一歩

セットアップが終わったら、次セッションで Claude に：

> 「環境構築できたので、ガンビット評価器の最小実装に入ろう。`docs/gambit_dsl_spec.md` と `docs/m1_checklist.md` に従って進めて」

と伝えれば、評価器の TypeScript 実装と単体テストの骨格を一緒に組み始められます。

---

## 13. 変更履歴

| 版 | 日付 | 内容 |
| --- | --- | --- |
| v0.1 | 2026-05-04 | 初版（Windows 想定／TS+React+Vite+Tailwind+Vitest） |
