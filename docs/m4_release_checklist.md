# M4 リリースチェックリスト

| 項目 | 内容 |
| --- | --- |
| 対象 | M4-F（公開直前の最終確認、`v1.0-mvp` タグを打つまで） |
| 文書バージョン | v0.1 |
| 作成日 | 2026-06-13 |

---

## 0. 使い方

このチェックリストを **1 回まとめて 1〜2 時間で消化** することを想定。
全部チェックがついたら `git tag v1.0-mvp` を打って公開を宣言する。

---

## 1. コードの最終確認

- [ ] `pnpm test --run` が **全 PASS**（272 件）
- [ ] `pnpm build` がクリーンに成功（dist/ 生成）
- [ ] `dist/` の中に `index.html`、`assets/`、`sw.js`、`manifest.webmanifest`、`icon-*.png`、`_redirects` がある
- [ ] `package.json` の `version` が `0.1.0`
- [ ] `pnpm dev` でローカル起動して 1 周触る
- [ ] `pnpm preview` でビルド済みを起動して PWA install が動く

---

## 2. ブラウザ互換性

各ブラウザで `pnpm preview`（または Cloudflare Pages の URL）を開いて、以下を確認：

| ブラウザ | OS | 起動 | 戦闘 | 編成 | ガンビット | 日英切替 | PWA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chrome 最新 | Windows | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Edge 最新 | Windows | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Firefox 最新 | Windows | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | N/A |
| Safari 最新 | macOS（任意） | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Chrome | Android | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Safari | iOS | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

### スマホで特に見るところ

- [ ] 横画面でレイアウトが崩れない
- [ ] ボタンがタップしやすいサイズ（44px 以上目安）
- [ ] PWA install プロンプトが出る（Chrome / Edge）
- [ ] iOS Safari は「ホーム画面に追加」を手動でやって動く

---

## 3. PWA 動作

- [ ] DevTools → Application → Manifest が読める
- [ ] DevTools → Application → Service Workers で `sw.js` が `activated`
- [ ] Lighthouse スコア（Chrome）：PWA 90+、Performance 70+
- [ ] インストール → デスクトップアイコンから起動
- [ ] **オフラインで起動できる**（DevTools → Network → Offline で確認）
- [ ] アプリ更新時に新バージョンが反映される（ハードリロードで）

---

## 4. ゲーム内動作

### 4.1 主要フロー
- [ ] 編成画面でジョブを「魔導士」に変更 → 確認ダイアログ → 装備リセット
- [ ] 装備変更モーダル：ボタン群で武器/防具/センサーを瞬時切替
- [ ] ガンビット編集：プリセット「弱点突き」をロード → 保存
- [ ] ルール追加：3 ステップ進めて保存 → 一覧に追加される
- [ ] 戦闘：スキップで結果ダイアログ → 「深度 N+1 へ出撃」で連続戦闘

### 4.2 言語切替
- [ ] 右上の「JA / EN」トグルで全画面が英語/日本語に切替
- [ ] リロード後も最後の言語が維持される
- [ ] ガンビットルールの表示（条件・対象・行動）も切替対応

### 4.3 永続化
- [ ] ブラウザ閉じて開き直し → 装備・ガンビット・深度が残る
- [ ] 設定 → 「セーブデータを初期化」で確認ダイアログ → 初期化される

### 4.4 フィードバックリンク
- [ ] 設定 → 「GitHub Issues を開く」→ 新規 Issue ページが開く
- [ ] 設定 → 「メールで送る」→ メーラー or mailto ダイアログが開く
- [ ] 設定 → バージョン情報（v0.1.0）が表示される
- [ ] 「バージョン情報をコピー」→ クリップボードに `Gambit Architects v0.1.0 + UA` がコピーされる

---

## 5. デプロイ

### 5.1 Cloudflare Pages
- [ ] `docs/m4_cloudflare_deploy.md` の手順で接続済み
- [ ] `main` ブランチ push でビルド成功
- [ ] 本番 URL（`https://gambit-architects.pages.dev/` 等）でアクセス可能
- [ ] HTTPS 自動有効

### 5.2 itch.io
- [ ] `docs/m4_itch_io.md` の手順で公開済み
- [ ] zip アップロード → 「This file will be played in the browser」チェック済み
- [ ] Description / タグ / カバー画像が設定済み
- [ ] Public 状態で `https://sakanoshota-ops.itch.io/gambit-architects` 公開
- [ ] 自分のブラウザで itch.io 上から動くか確認

---

## 6. テスタープレイ（任意だが推奨）

知人 1〜2 名に試してもらう：

- [ ] テスター 1：30 分プレイしてもらい、感想を聞く
- [ ] テスター 2：別のブラウザ/OS でプレイしてもらう
- [ ] 報告されたバグ・分かりにくい UI を `devlog/m4_feedback.md` にメモ
- [ ] 公開停止せざるを得ない致命バグはこのタイミングで修正

---

## 7. ドキュメント最終化

- [ ] `README.md` の itch.io / Cloudflare Pages リンクを実 URL に差し替え
- [ ] `screenshots/` に実機スクショ 3 枚以上配置
- [ ] `CLAUDE.md` の現マイルストーン表記を「M4 完了」に更新
- [ ] `docs/m4_checklist.md` の §1 を全部チェック
- [ ] `devlog/m4_retro.md` に振り返り（任意）

---

## 8. 公開タグ

すべてチェックがついたら：

```sh
git add -A
git commit -m "Release v1.0-mvp"
git tag v1.0-mvp
git push origin main --tags
```

このコミットを Cloudflare Pages がデプロイし、itch.io 用 zip もこのビルドから作る。

---

## 9. 公開告知（任意）

- [ ] Twitter / Bluesky / Threads で告知（itch.io リンク添えて）
- [ ] r/incremental_games（reddit）に投稿（任意）
- [ ] 個人ブログがあれば紹介記事
- [ ] dev.to / Zenn / Qiita の技術ブログで「TypeScript + React で 5 ヶ月で MVP まで作った話」（任意）

---

## 10. 変更履歴

| 版 | 日付 | 内容 |
| --- | --- | --- |
| v0.1 | 2026-06-13 | 初版（M4-F） |
