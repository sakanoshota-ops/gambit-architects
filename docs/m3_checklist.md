# M3 完了チェックリスト v0.1
## ― Gambit Architects 個人開発：コンテンツ拡充フェーズ ―

| 項目 | 内容 |
| --- | --- |
| 文書種別 | マイルストーン完了基準 |
| 対象 | M3（開発 3 か月目：コンテンツ拡充フェーズ） |
| 文書バージョン | v0.1 |
| 作成日 | 2026年5月10日 |
| 関連文書 | `gambit_game_planning_doc.md`、`gambit_dsl_spec.md`、`m1_checklist.md`、`m2_checklist.md`、`CLAUDE.md` |

---

## 0. M3 の目的

> **「M4 で MVP 公開できる」品質に持っていく**

具体的には：
- **遊びの幅**：敵バリエーション、装備、行動の実効果
- **戦略の深さ**：センサー装備でガンビット条件が活きる、装備による個性化
- **バランス**：深度を進めると本当に難しくなる体感
- **MVP として人に見せられる**完成度

### 2026-05-10 確定の M3 スコープ条件

1. **ターン制継続**：ATB は M5 以降に延期（M3 では戦闘ロジックの再構築をしない）
2. **センサー：50% 成功制**：センサー無しだと該当条件は 50% で失敗。装備するとリスクなしで作動
3. **装備：シンプル設計**：武器（atk）/ 防具（def）/ センサー（条件精度）の 3 スロット、加算効果のみ
4. **既存 145 テストは無修正で PASS**：BattleState.rng のデフォルト値を「常に成功」にしておく

---

## 1. M3 完了の判定基準

### 1.1 残行動の実効果（DSL §4.2 の最後の 4 種）
- [x] `CHARGE`：自分に chargedUnitIds フラグ付与、次の ATTACK で 1.5x 消費（2026-05-10）
- [x] `CHAIN`：同ターン直前に攻撃された敵を狙う、+20% ダメージ（2026-05-10）
- [x] `PROVOKE`：3 ターン継続、敵 ATTACK が provoker にリダイレクト（2026-05-10）
- [x] `INTERPOSE`：単発、対象味方への ATTACK を守り手にリダイレクト（2026-05-10）
- [x] `ALLY_TARGETED` 条件が同ターン反応（predictTargetedAllies で実現）（2026-05-10）

### 1.2 残コンテンツ ID の実効果（M2 で 7 ID → M3 で全 31 ID）
- [x] **回復魔法**：CURA（mag x5）/ CURAGA（x8）/ CURE_ALL（x4 全体）（2026-05-10）
- [x] **攻撃魔法 全属性**：FIRA/BLIZZARA/THUNDARA（1.5x）、BLIZZARD/THUNDER/HOLY_BOLT/DARK_BOLT（1.0x）（2026-05-10）
- [x] **バフ**：SHELL（魔法被ダメ -25%）、REGEN（毎ターン HP +5%）、HASTE（flag のみ、M5 で ATB と連動）（2026-05-10）
- [x] **デバフ**：SILENCE（CAST_* 禁止）、BLIND（rng < 0.5 で miss）、SLOW（行動順末尾）（2026-05-10）
- [x] **アイテム**：HI_POTION (+80HP) / ETHER (+30MP) / ANTIDOTE / EYE_DROPS / ECHO_HERB / PHOENIX_DOWN（蘇生 25%）（2026-05-10）
- [x] **剣士スキル**：GUARD_BREAK（物理 1.3x）、WHIRLWIND（全体 0.8x）（2026-05-10）
- [x] BattleState.rng 注入機構（M3-E のセンサーでも使用）（2026-05-10）

### 1.3 装備データモデル
- [x] **武器テンプレ 9 種**：剣/ロッド/メイス x 3 段階、StatBonus を持つ（2026-05-10）
- [x] **防具テンプレ 9 種**：重装/軽装/中装 x 3 段階、StatBonus を持つ（2026-05-10）
- [x] **センサーテンプレ 4 種**：HP/STATUS/ELEMENT/BASIC、enables[] を持つ（M3-E で評価器が読む）（2026-05-10）
- [x] `Unit` に `equipment` フィールド追加（default `{}` で後方互換）（2026-05-10）
- [x] ダメージ計算が装備ボーナスを加味（getEffectiveAtk/Def/Mag）（2026-05-10）
- [x] CAST_HEAL も実効 mag で回復量計算（2026-05-10）

### 1.4 センサーシステム（B 案、50% 成功）
- [x] `BattleState.rng?: () => number` を追加（デフォルト未注入は「常に成功」＝既存テスト互換）（2026-06-08）
- [x] `RunBattleOptions.rng` で外部から注入可能、`BattleScreen` は `Math.random` を渡す（2026-06-08）
- [x] **HP_SCANNER**：`ENEMY_LOWEST_HP`、`ENEMY_HIGHEST_HP`、`ALLY_HP_LT/GTE` を 100%（2026-06-08）
- [x] **STATUS_DETECTOR**：`ENEMY_HAS_STATUS`、`ENEMY_NO_STATUS`、`ALLY_HAS_STATUS` を 100%（2026-06-08）
- [x] **ELEMENT_ANALYZER**：`ENEMY_WEAK_TO`、`ENEMY_TYPE` を 100%（2026-06-08）
- [x] **BASIC_SCANNER**：HP + STATUS の両方を 100%（初期装備候補）（2026-06-08）
- [x] **影響を受けない条件**（常に確定）：`SELF_*`、`ALLY_MP_*`、`ALLY_DEAD`、`ALLY_TARGETED`、`ENEMY_EXISTS`、`BOSS_PRESENT`（2026-06-08）

### 1.5 ジョブごとの装備制限
- [x] **剣士**：剣（BRONZE/IRON/STEEL_SWORD）と重装（LEATHER/CHAIN/PLATE_MAIL）（2026-05-10）
- [x] **魔導士**：ロッド（MAGE_ROD/FIRE_STAFF/CRYSTAL_STAFF）と軽装（MAGE_ROBE/WIZARD/ARCHWIZARD_ROBE）（2026-05-10）
- [x] **治癒士**：メイス（HEALER/BLESSED/ANCIENT_MACE）と中装（PRIEST/BISHOP/CARDINAL_GARB）（2026-05-10）
- [x] センサーは全ジョブ可能（2026-05-10）
- [x] UI でも `jobs` フィルタが効いている（EquipmentPicker、2026-05-10）

### 1.6 編成画面に装備セクション追加
- [x] 編成画面の各キャラカードに装備サマリ表示（武器/防具/センサー名）（2026-05-10）
- [x] 「装備」ボタン → EquipmentPicker モーダル（2026-05-10）
- [x] 武器・防具・センサーの 3 ドロップダウン（ジョブ制限済み）（2026-05-10）
- [x] 装備時に ATK/DEF/MAG の base → 装備後がプレビュー表示（2026-05-10）
- [x] localStorage 永続化＋既存セーブの equipment マイグレーション（2026-05-10）

### 1.7 敵テンプレ拡張
- [x] 通常敵：M2 の 5 種 + **+10 種** = 15 種（v1.0 上限内）（2026-06-10）
  - 採用：ORC（HUMANOID, 強物理）／IMP（MAGICAL, 火耐性）／LICH（UNDEAD, 死霊魔法・闇耐性）／TROLL（BEAST, 高HP）／DARK_KNIGHT（HUMANOID, 闇耐性）／TURTLE（BEAST, 物理半減）／SLIME（BEAST, 物理半減）／PHANTOM（UNDEAD, 物理＋闇耐性）／HARPY（BEAST, 飛行＝雷弱点）／DEMON_LORD_MINION（MAGICAL, 闇耐性）
- [x] ボス：M2 の 1 種 + **+3 種** = 4 種（2026-06-10）
  - 採用：DARK_DRAGON（深度 10）／NECROMANCER（深度 15）／DEMON_LORD（深度 20+ ループ）
- [x] **耐性システム**：`Unit.resistances: Element[]`、被ダメ 0.5x（物理は `NEUTRAL` 耐性で表現、完全無効は v1.1 送り）（2026-06-10）

### 1.8 procgen 改善
- [x] 深度ごとの tier 分けを再調整：weak(6-7) / medium(8-12) / strong(13-17) / strong-plus(18+)（2026-06-10）
- [x] ボス階のミニオン同行：深度 5=1 体／深度 10=1-2 体／深度 15+=2 体（2026-06-10）
- [x] 深度別ボスプール（5/10/15/20）、25 以降は DEMON_LORD ループ（2026-06-10）
- [ ] 「深度 N 戦闘で装備ドロップ」（M3-G で導入検討）

### 1.9 バランス調整
- [x] depth 1〜5：M2 と同等の体感を維持（balance.test.ts スモーク全勝）（2026-06-12）
- [x] depth 5 ボス戦：装備なしでも勝てる（初心者ボス想定）（2026-06-12）
- [x] depth 10 ボス戦：装備抜きでは負け、装備込みでクリア可能（2026-06-12）
- [x] depth 20 ボス戦：6 バリエーション中過半数勝利（標準ラスボス想定 50%+）（2026-06-12）
- [x] **手動デモ**：実機で depth 20（DEMON_LORD）クリア確認済み（2026-06-13、剣士1+魔導士2+治癒士1 構成）

### 1.10 統合・テスト
- [x] **既存 145 テストは無修正で PASS**（後方互換、M2-G 時点）（2026-06-12）
- [x] M3 追加テスト：145 → **272 件**（M3-G-19 時点）
  - [x] 新行動の効果テスト（CHARGE/CHAIN/PROVOKE/INTERPOSE）M3-A
  - [x] 状態異常追加テスト（HASTE/SLOW/SILENCE/BLIND/REGEN/SHELL）M3-B
  - [x] 装備データ・ダメージ計算テスト M3-C/D
  - [x] センサー判定テスト（rng injection あり）M3-E
  - [x] 装備 UI テスト（button 化リファクタ後）M3-D / M3-G-15
  - [x] 敵テンプレ・ボス追加テスト M3-F
  - [x] 耐性ダメージ計算テスト M3-F
  - [x] バランススモーク・勝率テスト M3-G-1〜3
  - [x] i18n 辞書完全性・LocaleSwitcher 動作テスト M3-G-8 / G-19
- [x] E2E 統合テストの拡張：装備変更 → 戦闘 → 結果確認（既存 integration.test.tsx）
- [x] `pnpm build` と `pnpm test` が両方クリーン（2026-06-13）

### 1.11 M3-G で追加した v1.0 スコープ内タスク（当初予定外で追加）
- [x] **ジョブ変更 UI**（PartyScreen、M3-G-13/14）：剣士・魔導士・治癒士の編成切替
- [x] **日本語/英語ローカライズ**（全画面、M3-G-8〜11/16/19）：UI + 表示名 + 戦闘ログ
- [x] **モーダル Portal 化**（EquipmentPicker/RulePicker、M3-G-12）：select クリップ問題回避
- [x] **select 全廃方針**（M3-G-14/15/18）：ジョブ・装備・EnumSelector を toggle button 群に統一
- [x] **勝利後の次の深度ボタン**（BattleScreen、M3-G-7）：戦闘継続性 UX 改善
- [x] **presetExploitWeakness / presetBeginner に HOLY_BOLT 追加**（M3-G-13/17）：ボス対策のデフォルト化

---

## 2. M3 で追加する型・データ

### 2.1 装備
```ts
type WeaponId = "BRONZE_SWORD" | "IRON_SWORD" | "STEEL_SWORD" | "MAGE_ROD" | "HEALER_MACE" | ...;
type ArmorId = "LEATHER_ARMOR" | "CHAIN_MAIL" | "MAGE_ROBE" | ...;
type SensorId = "HP_SCANNER" | "STATUS_DETECTOR" | "ELEMENT_ANALYZER" | "BASIC_SCANNER";

interface Equipment {
  weapon?: WeaponId;
  armor?: ArmorId;
  sensor?: SensorId;
}

interface Unit {
  // ... 既存
  equipment: Equipment;
}
```

### 2.2 状態異常追加
```ts
// 追加する Status:
| "HASTE"     // 行動速度上昇（M5 で ATB 実装時に活用、M3 は flag のみ）
| "SLOW"      // 行動速度低下
| "REGEN"     // 毎ターン HP 回復
| "SHELL"     // 魔法被ダメ -25%
```

### 2.3 RNG 注入
```ts
interface BattleState {
  // ... 既存
  /** 確率判定用 RNG（0〜1）。省略時は「常に 1.0」= 全部成功 */
  rng?: () => number;
}
```

---

## 3. M3 デモ：「これが動けば M3 完了」

`pnpm dev` で以下が確認できること：

1. 編成画面で 4 キャラそれぞれの装備が見える
2. 「装備」ボタン → モーダル → 武器・防具・センサーを変更できる
3. パーティ各キャラのアタッチメント効果が即時反映（atk/def 合計値表示）
4. ガンビット編集で `ENEMY_WEAK_TO(FIRE) → CAST_OFFENSE(FIRA)` のようなルールを組み、装備の `ELEMENT_ANALYZER` センサーで 100% 発火することを目視
5. 同センサーを外すと、同じルールが時々空振り（50%）して fallback ルールが発動する戦闘ログが見える
6. 深度 5 ボス戦に挑戦：`PROVOKE` が機能し、Sword4 がタンクとして殴られ続けても他キャラが攻撃できる
7. 深度 10 のボス戦：装備込みで通常クリア可能
8. ログ画面に直近 5 戦の戦績が並ぶ

---

## 4. M3 で**作らない**もの（v1.1+ に延期）

- ATB ゲージ表示（戦闘ロジックの再構築は M5 以降）
- 装備のレア度・ランダム性
- 装備のセット効果
- 装備のドロップ率・収集要素（M3-G で「全装備が初期から所持」想定、ドロップは M4 以降）
- ノードベース編集 UI
- ガンビット共有 QR コード
- ローカライズ（日本語固定継続）
- サウンド
- スマホ最適化（M5 以降）

---

## 5. M3 で発生しがちな罠と回避策

| 罠 | 対策 |
| --- | --- |
| **装備テンプレを増やしすぎる** | 武器・防具 各 8〜10 種で十分。M4 で増やせばよい |
| **センサーの効果を複雑にする** | 「該当条件が 100% / 50% で動く」だけ。他のステ効果は持たせない |
| **既存テストを壊す** | `BattleState.rng` のデフォルトを「1.0 = 全成功」にして M2 動作を維持 |
| **バランス調整に時間を溶かす** | depth 1, 5, 10, 20 の 4 ポイントだけ手で触る。間は procgen 任せ |
| **GUARD_BREAK/WHIRLWIND の派手さに引かれる** | テキスト戦闘ログでわかれば OK。SVG アニメは M5 |
| **HASTE 実装で ATB 誘惑** | HASTE は flag だけ持たせる、効果なし。M5 で初めて活きる |

---

## 6. M3 サブフェーズと進行順

| Phase | 内容 | 想定 | 実績 |
| --- | --- | --- | --- |
| M3-A | 残 4 行動（CHARGE/CHAIN/PROVOKE/INTERPOSE）の実効果 | 1〜2 日 | ✅ 2026-05-10 |
| M3-B | 魔法・アイテム残 24 ID の実効果（+Status 4 種追加） | 2〜3 日 | ✅ 2026-05-10 |
| M3-C | 装備データモデル + Unit 拡張 + ダメージ計算 | 2 日 | ✅ 2026-05-10 |
| M3-D | 編成画面に装備セクション + 装備変更モーダル | 2〜3 日 | ✅ 2026-05-10 |
| M3-E | センサーシステム（RNG 注入 + 評価器拡張 + sensor templates） | 2 日 | ✅ 2026-06-08 |
| M3-F | 敵テンプレ +10 種、ボス +3 種、procgen 改善、耐性導入 | 2〜3 日 | ✅ 2026-06-10 |
| M3-G | バランス調整 + 統合テスト + デモ手順書 | 3〜5 日 | ✅ 2026-06-12（手動デモ残） |

合計 14〜20 日。実績は約 5 週間（個人開発のペース、間に空きあり）。

各 Phase で **RED → GREEN → コミット** のリズムを守る。

---

## 7. M3 完了の宣言条件

§1 のチェックリストが全部 ✅、§3 のデモを手で 1 周できたら M3 完了。
このとき：

- `git tag m3-complete` を打つ
- `devlog/m3_retro.md` に振り返り
- `CLAUDE.md` を更新して「M3 完了」を明記
- README の現在マイルストーン表記を更新（「M4：MVP 公開準備」へ）

これで M4（MVP 公開）に進む。

---

## 8. 変更履歴

| 版 | 日付 | 内容 |
| --- | --- | --- |
| v0.1 | 2026-05-10 | 初版（ターン制継続／センサー 50%／装備シンプル／7 Phase で確定） |
| v0.2 | 2026-06-13 | **M3 完了マーク**（272 tests、深度 20 クリア、日英ローカライズ、M3-G で追加した v1.0 スコープ内タスクも反映） |
