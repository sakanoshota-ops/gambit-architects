# M2 振り返り：プレイアブル化フェーズ完了

| 項目 | 内容 |
| --- | --- |
| 完了日 | 2026-05-10 |
| 開発期間 | M1 から続けて 1 日（実装ハイペース） |
| 担当 | しょうた + Claude |
| 体調・モチベ | ◎（M1 の勢いで M2 も完走） |

---

## M2 の成果

### コア拡張（M2-A）
- **7 行動の実効果**：CAST_OFFENSE(FIRE系)、CAST_HEAL(CURE系)、CAST_REVIVE(RAISE)、CAST_BUFF(PROTECT)、CAST_DEBUFF(POISON)、CAST_CURE_STATUS、SKILL(POWER_SLASH)
- **状態異常**：POISON（毎ターン -8% maxHP、5 ターン継続）と PROTECT（物理被ダメ x0.75、4 ターン継続）の duration 管理
- **ターン処理の見直し**：「付与したターンには tick せず、次のターン開始時から減る」セマンティクスに

### データ拡張（M2-B）
- **ジョブ 3 種**：剣士（M1）、魔導士、治癒士、共通の `createPartyMember` ヘルパに集約
- **敵 6 種**：M1 の 3 種 + SKELETON / GOLEM / GOBLIN_KING（ボス）
- **ALL_JOBS / ALL_ENEMIES** レジストリで一覧アクセス可能に

### UI 雛形（M2-C）
- React Router v7 で 6 画面構成
- Tailwind v4 でクリーンな配色（scaffold の CSS を全部捨ててやり直し）
- PlayerContext + useReducer + localStorage 永続化
- ヘッダー（深度表示）＋フッタータブの共通レイアウト

### ナビゲーション（M2-D）
- ホームの「出撃」→ /battle
- 編成の「編集」→ /edit/:charId
- 各画面が URL ベースで切り替わる

### ガンビット編集（M2-F）
- **M2-F1**：下書きモード、並べ替え、削除、有効化、プリセットロード、保存/取消
- **M2-F2**：3 ステップ Picker（条件 → 対象 → 行動）
  - 21 条件をカテゴリ分け、引数 UI（スライダ／セレクタ）
  - 対象の互換性フィルタ（DSL §5.2）
  - ジョブで使える行動だけ表示
  - 既存ルールクリックで編集モード（同じ Picker、id 引き継ぎ）
  - 保存時バリデーション（DSL §9.1）

### 戦闘画面（M2-G）
- マウント時に runBattle 実行、setTimeout で 1 イベントずつ reveal
- HP バー（イベント replay でリアルタイム更新）
- 倍速 1x/2x/4x、スキップボタン
- 勝利で深度 +1、敗北/TIMEOUT は深度維持
- 結果ダイアログ → ホームへ戻る

### ログ画面（M2-H）
- recentBattles[] 配列化、上限 5
- localStorage v1 → v1 マイグレーション（lastBattle → recentBattles[0]）
- 直近 5 戦のサマリ表示（勝敗の色分け、深度、ターン数）

### 設定（M2-I）
- ガンビット共有 GA2 フォーマット（`GA2:` + gzip + base64url）
- キャラ選択ドロップダウン、コピー／適用ボタン、エラーメッセージ
- characterId を選択キャラに上書き（共有の流用が直感的に）

### procgen + 統合（M2-J）
- 深度 6+ の tier ベース procgen（weak / medium / strong）
- 5 の倍数の深度でボス
- 深度をシードとした決定的乱数（同じ深度なら同じ編成）
- E2E 統合テスト 3 件（戦闘 / 編集 / ログのフロー）

---

## テスト総覧

| ファイル | 件数 | 主な観点 |
| --- | --- | --- |
| smoke | 2 | 環境確認 |
| evaluator | 33 | 条件 21・対象 6・優先度・フォールスルー・MATCH・敵 actor 対称性 |
| runner | 23 | 行動効果・状態異常・勝敗判定・純粋性 |
| data | 28 | ジョブ・敵テンプレ・プリセット・統合戦闘 |
| Layout / navigation | 5 | ナビゲーション動作 |
| GambitEditorScreen | 12 | 下書きモード・並べ替え・削除・プリセット |
| RulePicker | 12 | 3 ステップ遷移・互換性・編集モード |
| BattleScreen | 4 | 戦闘実行・スキップ・state 更新 |
| LogScreen | 2 | 一覧表示・空状態 |
| storage | 3 | localStorage マイグレーション |
| sharing | 8 | エンコード・デコード・バリデーション |
| dungeon | 10 | 固定テーブル・procgen・ボス判定 |
| integration | 3 | E2E フロー |
| **合計** | **145** | M1 比 +84 件 |

---

## 良かったこと

### 1. M1 のコアを 1 行も触らずに済んだ
ガンビット評価器・runner・既存型は M2 で**完全に無修正**。新機能は applyAction の case 追加と新規ファイルだけで実装できた。**M1 で TDD 風にコアを固めたおかげで、M2 中の不安が皆無**。

### 2. Phase 分割が機能した
M2-A 〜 M2-J の 10 サブフェーズに分けたことで、毎回「次にやること」が明確だった。`m2_checklist.md` のチェックを 1 個ずつ埋めていく形式が、進捗の見える化として極めて優秀。

### 3. 「コア → データ → UI」の順番が正解
ロジック（M2-A/B）→ UI 雛形（M2-C）→ 個別画面（M2-D 以降）の順で進めたので、UI の都合でロジックを変更するような事態が起きなかった。

### 4. 下書きモードの導入
編集画面で「保存」を押すまで dispatch しない設計が、誤操作リカバリと未保存マーク表示の両立で良い体験を生んだ。M2-F1 段階で決めたのが効いた。

### 5. CompressionStream の代わりに ReadableStream 直接構築
jsdom が `Blob.stream()` 未対応で詰まったが、`Uint8Array` から直接 ReadableStream を作るパターンに切り替えてサクッと解決。**標準 API を直接使うと jsdom 依存が減って良い**。

### 6. 結局 ATB なしで M2 が成立した
ATB を後回しにしたおかげで、UI 実装に集中できた。turn-based でも見ていて楽しい戦闘ログが書けることを確認できた。ATB は本当に M3 以降でいい。

---

## 詰まったこと（と解決）

| 詰まり | 解決 |
| --- | --- |
| Vite scaffold の `index.css` が Tailwind を上書きしてた | Tailwind 1 行だけにリセット |
| `pnpm test` の expected/got で PROTECT/POISON duration が 1 つ少ない | tick の位置をターン末 → ターン開始に変更（付与ターンは tick しない） |
| Picker の onSave で `useState` の値が古い | step ナビゲーションで状態を正しく伝播 |
| 「次は深度 2」の文言が無いことを `getByText` で確認しようとしてエラー | 該当アサーションを削除、別の確認に置換 |
| jsdom の `Blob.stream()` が無い | `ReadableStream` の手動構築に切り替え |
| 共有データの characterId 不一致 | インポート時に **選択キャラの id で上書き**する UX 判断（A 案） |

### 学び
- **bleeding edge ライブラリ ≠ jsdom 対応**：React 19 / Tailwind v4 / Vite 8 は jsdom 上で意外と差異がある。標準 Web API も例外じゃない。
- **TDD のリズム × Phase 化**：M1 で確立したパターンを M2 でも踏襲。1 Phase = 1 ファクト → コミット。
- **小さい UI の塊で十分**：M2 の UI はすべて素朴な div + Tailwind クラス。コンポーネントライブラリは不要だった。

---

## バランス上の気付き

### M2-G の depth 5 で TIMEOUT になる問題
- `presetTank` の rule 3 が `BOSS_PRESENT → PROVOKE`、PROVOKE は M2 では NotImplemented
- 結果：Sword4 だけ生き残ったとき、毎ターン PROVOKE で空振り → ボスに殴られ続けて削れ続ける
- **設計通りの挙動**（M2 で 11 行動は NotImplemented）
- 回避策：プリセットを「止め刺し」に変更すれば突破可能

→ M3 で PROVOKE/INTERPOSE/CHARGE/CHAIN を実装すればボス戦が機能する

---

## M3 に持ち越す課題（M2 から得た知見ベース）

- **PROVOKE/INTERPOSE/CHARGE/CHAIN の実効果**（M2 でボス戦が成立しなかった主因）
- 装備・センサーシステム（M3 の本命）
- 残り 24 コンテンツ ID の実効果（CAST_HEAL の CURA/CURAGA、CAST_OFFENSE の他属性、各種アイテム）
- ATB（turn-based でも遊べたが、FF12 らしさのために導入）
- 敵テンプレ 15〜20 体（現在 6 体）
- ボステンプレ 2〜4 種追加（現在 1 体）
- バランス調整（depth 5+ の手応えを継続的に）
- アニメ・派手な演出（CSS フェード → SVG キャラ位置、攻撃時 flash）← しょうたの希望

### v1.0 凍結ラインを越える要望（v1.1+ バックログ）
- 戦闘リプレイの保存／再生
- ガンビット共有の QR コード
- ノードベース編集 UI
- ジョブのドラッグ変更
- 装備のドラッグ装着

---

## M3 のキックオフ準備

次セッション開始時に Claude へ：

> 「M2 完了済み。`docs/m2_checklist.md` と `devlog/m2_retro.md` 参照。M3（コンテンツ拡充）に入ろう。まず M3 の到達点を整理した `m3_checklist.md` を作って」

M3 の主な内容は装備・センサーシステム + 残行動の実効果 + 敵・ボス追加 + バランス調整。M2 で動いた UI の上に、コンテンツを乗せていくフェーズ。

---

*Last updated: 2026-05-10*
