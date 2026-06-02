# M1 振り返り：コア検証フェーズ完了

| 項目 | 内容 |
| --- | --- |
| 完了日 | 2026-05-10 |
| 開発期間 | 設計：4 日 + 実装：1 日（ハイペース） |
| 担当 | しょうた + Claude |
| 体調・モチベ | ◎（最後まで集中継続） |

---

## 達成事項

### コード
- **ガンビット評価器（`src/gambit/evaluator.ts`）**：純粋関数、21 条件・6 対象・15 行動を網羅、決定的、深いクローンで純粋性確保
- **戦闘ループ（`src/battle/runner.ts`）**：ターン制 4 vs N、ATTACK/DEFEND/WAIT/USE_ITEM(POTION) の実効果＋ NOT_IMPLEMENTED 空振り、ALLY/ENEMY/TIMEOUT の決着判定
- **データ（`src/data/`）**：剣士テンプレ、敵 3 種（GOBLIN/WOLF/BANDIT）
- **プリセット（`src/gambit/presets.ts`）**：DSL §8 の 4 種（初心者向け／弱点突き／タンク／止め刺し）
- **デモ（`src/demo/demo.ts`）**：`pnpm run demo` で 4 剣士 vs 3 敵の戦闘ログをコンソール出力

### テスト
- **61 件すべて GREEN**：smoke 2 + evaluator 33 + runner 10 + data 16
- TDD 風（RED → GREEN）で進めたため、実装後の手直しがほぼゼロ
- すべて `pnpm test` ワンコマンドで実行可

### ドキュメント
- DSL 仕様書 v0.3.1 に「ALLY_\* は actor 自身を含む」を明文化
- M1 チェックリスト v0.2 で進捗の可視化
- README にローカル起動手順 3 行

---

## 良かったこと

### 1. 設計を先にやりきった
着手前の 4 日間で企画書 → DSL 仕様 → M1 チェックリスト → エンジン選定 → 環境構築手順を全部固めた。
**実装中に「ここどうする？」と止まることが皆無**だった。仕様書を見れば答えが書いてあった。

### 2. TDD 風のリズムが効いた
- 型定義 → スタブ → RED テスト → 実装 → GREEN → コミット
- このサイクルを 4 回繰り返した（evaluator Phase 1 / Phase 2 / runner / data）
- AI 生成コードが「テストで縛られている」状態なので、誤実装が即検出される
- レビュー疲れがほぼ発生しなかった

### 3. 列挙値の `as const` 配列パターン
`STATUSES = [...] as const; type Status = (typeof STATUSES)[number];` で型と実行時値を**単一情報源**にできた。
バリデータ・UI・テストすべてが同じ配列を参照できるので、追加・変更が安全。

### 4. `getSides()` による陣営の対称化
actor が敵側でも同じ評価器が動く（陣営反転だけ）設計が功を奏した。デモで敵 actor も普通に評価器を回せていて、戦闘ループの実装が劇的に短くなった。

### 5. 仕様書の些細な矛盾を実装時に発見できた
- `Status` 列挙に `HASTE`/`SLOW` がない（`BuffId`/`DebuffId` には入っている）
- `ALLY_*` が自分を含むかは明文化されていなかった
- いずれも実装時に気づき、仕様書側を修正できた。**実装は最良のレビュアー**だと再確認した

---

## 詰まったこと（と解決方法）

| 詰まり | 解決 |
| --- | --- |
| Vite/Vitest の型定義で `test` プロパティが認識されない | `import { defineConfig } from "vitest/config"` に変更 |
| package.json の JSON 構文ミス（`}` の後のカンマ抜け） | VS Code の Problems パネルで検出、手動修正 |
| smoke.test.tsx の日本語が文字化け（VS Code が Shift-JIS 保存） | テスト名を英語に統一し、PowerShell 経由で UTF-8 (no BOM) 書き直し |
| outputs/ 配下に PowerShell から到達できない（Cowork の保護領域） | `request_cowork_directory` で `C:\Users\sakan\dev\gambit-architects` を Claude にマウント |
| Phase 2 テストの caster の HP 設定ミス | DSL §3.1.1 を明文化し、テストを修正 |

---

## M1 のテストカバレッジ

| ファイル | 件数 | 主な観点 |
| --- | --- | --- |
| `smoke.test.tsx` | 2 | Vitest + RTL + jsdom の起動確認 |
| `evaluator.test.ts` | 33 | 21 条件・6 対象の全網羅 / 優先度順 / フォールスルー / MATCH 解決 / 境界値 / 整合性違反 / 敵 actor 対称性 |
| `runner.test.ts` | 10 | ATTACK/DEFEND/WAIT/USE_ITEM の実効果 / NOT_IMPLEMENTED / 勝敗判定 / TIMEOUT / 純粋性 |
| `data.test.ts` | 16 | ジョブ/敵テンプレの構造 / プリセットの整合 / 統合戦闘の通し |
| **合計** | **61** | |

---

## M2 に持ち越す課題

- 装備・センサーシステム（M3 だが、UI で見せる準備は M2）
- `CAST_OFFENSE` 等の魔法の実効果（M2 でジョブ追加と同時に）
- `HASTE`/`SLOW` の Status 対応（DSL v0.4 で整理）
- DEFEND の "行動順末尾" 仕様（M2 で ATB を入れる時に見直し）
- procgen ダンジョン（M3）

これらは v1.0 凍結ラインの内側だが、M1 ではスコープ外。

---

## 何を改善できたか

- **コミット粒度がもっと細かい方が良かった**：Phase ごとに 1 コミットだったが、もっと小さく刻んで「型だけ追加 / RED テスト / GREEN 実装」のように 3 ステップで分けると、git blame の解像度が上がった
- **コンテンツ ID の `FIRE` 衝突**：`Element` と `OffenseSpellId` の両方に `"FIRE"` リテラルがある。TS の context 解決で問題ないが、エディタの補完時にやや迷う。M2 で `SPELL_FIRE` 等のプレフィックス化を検討
- **敵にも `jobId` を持たせている**：暫定で `"SWORDSMAN"` を借りているのが汚い。M2 で `EnemyJobId` を分離するか、`Unit` から `jobId` を外して別の Identifier にするか検討

---

## M2 のキックオフ準備

次セッション開始時に Claude へ：

> 「M1 完了済み。`docs/m1_checklist.md` と `devlog/m1_retro.md` 参照。M2（プレイアブル化）に入ろう。まず M2 の到達点を整理した `m2_checklist.md` を作って」

M2 の最低ラインは企画書通り：UI / 編集 UI / ジョブ 3 種 / 敵 5 体 / 深度 1〜5。
ただし「**M1 のコアロジックは触らない**」を原則にして、UI と新ジョブの追加に集中する。

---

*Last updated: 2026-05-10*
