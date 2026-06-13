# M4 完了チェックリスト v0.1
## ― Gambit Architects 個人開発：MVP 公開フェーズ ―

| 項目 | 内容 |
| --- | --- |
| 文書種別 | マイルストーン完了基準 |
| 対象 | M4（開発 4 か月目：MVP 公開フェーズ） |
| 文書バージョン | v0.1 |
| 作成日 | 2026-06-13 |
| 関連文書 | `gambit_game_planning_doc.md`、`m3_checklist.md`、`devlog/m3_retro.md`、`CLAUDE.md` |

---

## 0. M4 の目的

> **「自分が作ったゲームを世の中に出して、第 1 のフィードバックを得る」**

具体的には：
- itch.io と Cloudflare Pages に公開
- PWA 化してオフラインプレイ可能に
- ゲーム内にフィードバック導線（GitHub Issues / mailto）
- 知人 1〜2 名に最低限テストプレイしてもらう
- 公開後 1 週間程度フィードバックを受けて、即座修正できる範囲はその場で

### 2026-06-13 確定の M4 スコープ条件

1. **デプロイ先：itch.io + Cloudflare Pages の両方**（議論を集めやすくするため）
2. **フィードバック収集：ゲーム内にリンク**（外部フォーム or mailto、サーバ不使用方針を維持）
3. **オンライン記録・ランキングは作らない**（v1.1 以降）
4. **追加コンテンツは原則作らない**（M3 で凍結した v1.0 スコープを守る）
5. **広告・課金は入れない**（CLAUDE.md「完全無料 + 任意ドネーション」方針）

---

## 1. M4 完了の判定基準

### 1.1 PWA 化（M4-A）
- [ ] `vite-plugin-pwa` を有効化（既存依存）
- [ ] `manifest.webmanifest`（name、short_name、theme_color、display: standalone）
- [ ] アイコン（192x192、512x512、maskable 版）
- [ ] service worker でキャッシュ（オフラインプレイ）
- [ ] PWA install プロンプトの動作確認
- [ ] iOS Safari でも「ホーム画面に追加」可能（Apple touch icon）

### 1.2 ゲーム内フィードバックリンク（M4-B）
- [ ] 設定画面に「フィードバック」セクション追加
- [ ] GitHub Issues リンク（公開リポジトリ前提なら）
- [ ] mailto リンク（バックアップ）
- [ ] アプリバージョン番号を画面に表示（バグレポート添付用）
- [ ] バージョンは `package.json` の `version` から自動取得

### 1.3 README とプロモ素材（M4-C）
- [ ] `README.md`（日英）：ゲーム概要、起動方法、技術スタック、ライセンス
- [ ] スクリーンショット 3〜5 枚（ホーム / 編成 / ガンビット編集 / 戦闘）を `screenshots/` に
- [ ] キャッチコピー：「条件→対象→行動のルールを組んで、AI 同士に戦わせる FF12 ガンビット型オートバトル」
- [ ] ライセンス：MIT or 個人作品扱い（判断保留可）

### 1.4 Cloudflare Pages デプロイ（M4-D）
- [ ] Build command: `pnpm build`
- [ ] Output directory: `dist`
- [ ] Node version: 24 LTS
- [ ] SPA fallback：`_redirects` で 404 → index.html
- [ ] HTTPS 自動有効（Cloudflare デフォルト）
- [ ] PR プレビュー有効化

### 1.5 itch.io アップロード（M4-E）
- [ ] HTML5 ビルドを zip 化（`dist/` 配下を zip）
- [ ] itch.io ページ作成（タイトル、説明、タグ、サムネイル、スクショ）
- [ ] 価格：無料 + 任意ドネーション（Pay what you want, suggested $0）
- [ ] ジャンル：Strategy / Simulation
- [ ] タグ：Auto-battler, Programming, Gambit, Final Fantasy, Sandbox

### 1.6 最終公開チェックリスト（M4-F）
- [ ] Chrome / Edge / Firefox / Safari で動作確認
- [ ] スマホブラウザ（iOS Safari、Android Chrome）で動作確認
- [ ] PWA インストール → オフラインで起動
- [ ] フィードバックリンク 2 つが実際に動く
- [ ] 知人 1〜2 名にテストプレイしてもらう
- [ ] 重大バグなければ `v1.0-mvp` タグを打つ
- [ ] Twitter / Bluesky / その他 SNS で告知文章を準備（任意）

---

## 2. M4 で**作らない**もの（v1.1+ に延期）

- ランキング・リーダーボード
- フレンド機能・マルチプレイ
- 課金・広告
- 追加ジョブ・追加敵テンプレ
- ノードベース編集 UI
- BGM / SFX（M5 で扱う）
- ローカライズ追加（日英のみ、M3-G で完了済）
- スマホ最適化の細部調整（M5 で扱う）

---

## 3. M4 で発生しがちな罠と回避策

| 罠 | 対策 |
| --- | --- |
| **完璧主義で永遠に出せない** | スクショ 3 枚だけで OK、後から差し替え可。出すこと優先 |
| **PWA の細部ハマる** | manifest と一番大きいアイコンだけまず動かす。maskable は後追い可 |
| **スクショ撮影に時間溶かす** | 1 回 30 分でまとめて撮る。GIMP/Photoshop なし、OS のスクリーンショット標準で十分 |
| **フィードバック導線を凝りすぎる** | 最初は GitHub Issues + mailto の 2 リンクで十分 |
| **公開直前にデザイン変えたくなる** | 出す → フィードバック → 変える。順番を守る |
| **コンテンツ追加したくなる** | v1.1 バックログに書いて忘れる。v1.0 凍結ライン死守 |

---

## 4. M4 サブフェーズと進行順

| Phase | 内容 | 想定 |
| --- | --- | --- |
| M4-A | PWA 化（manifest、service worker、アイコン） | 2〜3 日 |
| M4-B | ゲーム内フィードバックリンク + バージョン表示 | 1 日 |
| M4-C | README とプロモ素材（スクショ含む） | 1〜2 日 |
| M4-D | Cloudflare Pages デプロイ設定 + 接続 | 1 日 |
| M4-E | itch.io アップロード + ページ整備 | 1 日 |
| M4-F | 最終確認 + 知人テスター + 公開 | 2〜3 日 |

合計 8〜11 日。**約 3 週間**でバッファ込み。

---

## 5. M4 完了の宣言条件

§1 のチェックリストが全部 ✅ になったら M4 完了。
このとき：

- `git tag v1.0-mvp` を打つ
- `devlog/m4_retro.md` に振り返り
- `CLAUDE.md` を更新して「M4 完了」を明記
- itch.io ページの URL と Cloudflare Pages の URL を README に追記
- 任意：1 件目のフィードバック収集を待つ（公開 1 週間）

これで M5（磨き込み）に進む。

---

## 6. 変更履歴

| 版 | 日付 | 内容 |
| --- | --- | --- |
| v0.1 | 2026-06-13 | 初版（itch.io + Cloudflare 両方、ゲーム内リンクで確定） |
