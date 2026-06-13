# itch.io 公開手順書

| 項目 | 内容 |
| --- | --- |
| 対象 | M4-E（MVP公開フェーズ／itch.io アップロード） |
| 文書バージョン | v0.1 |
| 作成日 | 2026-06-13 |

---

## 0. なぜ itch.io か

- インディーゲームのコミュニティが厚い → 最初のフィードバックが期待できる
- HTML5 ゲームを zip でアップロードすれば即公開可能
- 無料ゲームでも掲載できる、Pay-what-you-want も設定可
- レビュー・コメント・タグ検索のエコシステム

---

## 1. アカウント準備

1. https://itch.io/ でアカウント作成（無料）
2. Email 認証
3. プロフィールに最低限のアバター・自己紹介を設定（公開ゲームの信頼度に影響）

---

## 2. ビルドの準備

### 2.1 本番ビルド

```sh
cd C:\Users\sakan\dev\gambit-architects
pnpm install --frozen-lockfile
pnpm test --run      # 272 PASS 確認
pnpm build           # → dist/
```

### 2.2 dist/ を zip 化

`dist/` 配下の全ファイルを `gambit-architects-v0.1.0.zip` として圧縮。

**重要**：`dist` フォルダ自体ではなく、その**中身**を zip 化する。
zip 解凍時に `index.html` がトップに来る必要がある。

PowerShell の場合：

```powershell
cd C:\Users\sakan\dev\gambit-architects\dist
Compress-Archive -Path * -DestinationPath ..\gambit-architects-v0.1.0.zip
```

### 2.3 zip サイズの目安

- アイコン・JS・CSS 全部入れて **〜500 KB 程度**（PWA precache 含む）
- itch.io の上限：HTML5 ゲーム 1 GB なので余裕

---

## 3. itch.io 新規プロジェクト作成

`https://itch.io/game/new` で新規プロジェクト作成。

### 3.1 基本情報

| 項目 | 入力値 |
| --- | --- |
| **Title** | Gambit Architects |
| **Project URL** | `gambit-architects`（`sakanoshota-ops.itch.io/gambit-architects`） |
| **Short description** | FF12 ガンビット型のオートバトル × AI プログラミング・サンドボックス |
| **Classification** | Game |
| **Kind of project** | HTML |
| **Release status** | Released（v0.1 MVP） |

### 3.2 価格

- **Pay what you want**（任意ドネーション）
- **Suggested price**：$0
- **Minimum price**：$0
- → 無料でプレイ可能、寄付したい人だけ寄付

### 3.3 アップロード

1. 「Upload files」 → `gambit-architects-v0.1.0.zip` をドラッグ&ドロップ
2. 「This file will be played in the browser」にチェック
3. 「Embed options」設定：
   - **Viewport dimensions**：`640 × 800`（モバイル横向き想定）または `1280 × 720`
   - **Mobile friendly**：チェック
   - **Orientation**：`Default`
   - **Fullscreen button**：チェック
   - **Automatic fullscreen** はチェックしない

### 3.4 詳細説明（Description）

以下のテンプレを Markdown でコピペ：

````markdown
## ガンビット型 AI プログラミング × オートバトル

プレイヤーは「操作」しません。
AI アーキテクトとして **条件 → 対象 → 行動** のルールを組み、自動戦闘を見守ります。

```
出撃 → 自動戦闘 → ログ確認 → ガンビット編集 → 再挑戦
```

### 主な特徴

- 3 ジョブ × 4 体パーティ：剣士・魔導士・治癒士の自由編成
- 22 種の装備（武器 / 防具 / センサー）
- 15 ボス + 通常敵 15 種
- 21 条件 × 15 行動の細かい分岐
- **日本語 / 英語切替**
- **PWA 対応**：オフラインプレイ可能
- 完全無料・広告なし・サーバ不使用

### 操作方法

1. **ホーム** → 「出撃（深度 N）」で戦闘開始
2. **編成** → ジョブ・装備を変更
3. **ガンビット編集** → 各キャラのルールをカスタマイズ
4. **戦闘** → スキップ or 倍速で観戦
5. **ログ** → 直近 5 戦の戦績
6. **設定** → 言語切替・データ初期化・フィードバック

### v1.0 を目指して

これは MVP（最小公開版）です。
プレイされた感想・バグ・改善案を「設定 → フィードバック」 か
[GitHub Issues](https://github.com/sakanoshota-ops/gambit-architects/issues) で
教えてもらえると助かります。

### クレジット

- 制作：しょうた ([@sakanoshota-ops](https://github.com/sakanoshota-ops))
- AI 開発パートナー：Claude (Anthropic)
- ライセンス：MIT

### ソースコード

[GitHub: sakanoshota-ops/gambit-architects](https://github.com/sakanoshota-ops/gambit-architects)
````

### 3.5 タグ（最大 10 個）

- `auto-battler`
- `gambit`
- `strategy`
- `simulation`
- `programming`
- `sandbox`
- `pwa`
- `html5`
- `2d`
- `singleplayer`

### 3.6 ジャンル / カテゴリ

- **Genre**：Strategy
- **Tags**：上記
- **App store** （任意、表示用）：HTML5 / PWA

### 3.7 サムネイル・カバー

| 用途 | サイズ | 内容 |
| --- | --- | --- |
| **Cover image** | 630×500 推奨 | アイコン拡大版 or タイトル + キャッチコピーの画像 |
| **Banner** | 1500×500（任意） | 戦闘画面のクロップ + タイトル |
| **Screenshots** | 任意サイズ | 5 枚程度（party / gambit / battle / 戦闘ログ / 編成画面） |

→ M4-C で作るスクショを流用すれば OK。

### 3.8 Community

- **Comments**：Enable
- **Discussion board**：任意（フィードバック導線として有効、最初は Comments のみで OK）

---

## 4. 公開

1. 「Save & view page」で内容確認
2. 「Public」に変更（最初は Draft なので注意）
3. URL が `https://sakanoshota-ops.itch.io/gambit-architects` で公開

---

## 5. 公開後の確認

- スマホブラウザで開いて動作確認
- フルスクリーンボタンで実プレイ
- コメント欄に「v0.1 MVP リリースです、フィードバックお願いします」と固定ピン

---

## 6. 更新時の手順（v0.1.1 以降）

1. `pnpm build` で `dist/` 再生成
2. `Compress-Archive` で新しい zip 作成（ファイル名にバージョン入れる）
3. itch.io のプロジェクトページ → 「Edit game」 → 「Files」 → 古い zip を削除して新規アップロード
4. Devlog 投稿（任意）：何が変わったか書く

---

## 7. 変更履歴

| 版 | 日付 | 内容 |
| --- | --- | --- |
| v0.1 | 2026-06-13 | 初版（M4-E） |
