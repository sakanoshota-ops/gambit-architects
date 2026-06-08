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
- [ ] `BattleState.rng?: () => number` を追加（デフォルト「常に 1.0」＝センサーなしでも成功）
- [ ] runner がデフォルト RNG（mulberry32 シード）を注入、テストでは固定値を渡せる
- [ ] **HP_SCANNER**：`ENEMY_LOWEST_HP`、`ENEMY_HIGHEST_HP`、`ALLY_HP_LT/GTE` を 100%
- [ ] **STATUS_DETECTOR**：`ENEMY_HAS_STATUS`、`ENEMY_NO_STATUS`、`ALLY_HAS_STATUS` を 100%
- [ ] **ELEMENT_ANALYZER**：`ENEMY_WEAK_TO`、`ENEMY_TYPE` を 100%
- [ ] **BASIC_SCANNER**：HP + STATUS の両方を 100%（初期装備候補）
- [ ] **影響を受けない条件**（常に確定）：`SELF_*`、`ALLY_MP_*`、`ALLY_DEAD`、`ALLY_TARGETED`、`ENEMY_EXISTS`、`BOSS_PRESENT`

### 1.5 ジョブごとの装備制限
- [ ] **剣士**：重装備可（HEAVY_*）、軽装備可、センサー可
- [ ] **魔導士**：軽装備のみ、ロッド系武器のみ、センサー可
- [ ] **治癒士**：中装備、メイス系武器、センサー可

### 1.6 編成画面に装備セクション追加
- [ ] 編成画面の各キャラカードに「装備」ボタン → 装備変更モーダル
- [ ] 武器・防具・センサーの 3 ドロップダウン（ジョブ制限済み）
- [ ] 装備時に HP/MP/atk/def の合計値が即時表示

### 1.7 敵テンプレ拡張
- [ ] 通常敵：M2 の 5 種 + **+9〜14 種** = 14〜19 種（v1.0 上限内）
  - 候補：ORC（HUMANOID, 強物理）／IMP（MAGICAL, 火/魔法）／LICH（UNDEAD, 死霊魔法）／TROLL（BEAST, 高HP）／DARK_KNIGHT（HUMANOID, 闇）／TURTLE（BEAST, 超防御）／SLIME（BEAST, 物理半減）／PHANTOM（UNDEAD, 物理無効）／SHARK（BEAST）／HARPY（BEAST, 飛行＝風弱点）／DEMON_LORD_MINION（DEMON）…
- [ ] ボス：M2 の 1 種 + **+3〜4 種** = 4〜5 種
  - 候補：DARK_DRAGON（深度 10）／NECROMANCER（深度 15）／DEMON_LORD（深度 20）／FINAL_BOSS（深度 25）

### 1.8 procgen 改善
- [ ] 深度ごとの tier 分けを再調整（depth 11〜：strong-plus tier）
- [ ] ボス階の編成にミニオン同行が選択肢に
- [ ] 「深度 N 戦闘で装備ドロップ」（M3-G で導入検討）

### 1.9 バランス調整
- [ ] depth 1〜5：M2 と同等の体感を維持
- [ ] depth 5 ボス戦：PROVOKE/INTERPOSE 実装後にクリアできるか検証
- [ ] depth 10 ボス戦：装備抜きでは厳しい、装備込みでクリア可能
- [ ] depth 20 ボス戦：v1.0 ラスボス想定、しっかり装備＋ガンビット調整が必要

### 1.10 統合・テスト
- [ ] **既存 145 テストは無修正で PASS**（後方互換）
- [ ] M3 追加テスト：100〜150 件程度
  - 新行動の効果テスト（CHARGE/CHAIN/PROVOKE/INTERPOSE）
  - 状態異常追加テスト（HASTE/SLOW/SILENCE/BLIND/REGEN/SHELL）
  - 装備データ・ダメージ計算テスト
  - センサー判定テスト（rng injection あり）
  - 装備 UI テスト
  - 敵テンプレ・ボス追加テスト
- [ ] E2E 統合テストの拡張：装備変更 → 戦闘 → 結果確認
- [ ] `pnpm build` と `pnpm test` が両方クリーン

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

| Phase | 内容 | 想定 |
| --- | --- | --- |
| M3-A | 残 4 行動（CHARGE/CHAIN/PROVOKE/INTERPOSE）の実効果 | 1〜2 日 |
| M3-B | 魔法・アイテム残 24 ID の実効果（+Status 4 種追加） | 2〜3 日 |
| M3-C | 装備データモデル + Unit 拡張 + ダメージ計算 | 2 日 |
| M3-D | 編成画面に装備セクション + 装備変更モーダル | 2〜3 日 |
| M3-E | センサーシステム（RNG 注入 + 評価器拡張 + sensor templates） | 2 日 |
| M3-F | 敵テンプレ +10 種、ボス +3 種、procgen 改善 | 2〜3 日 |
| M3-G | バランス調整 + 統合テスト | 3〜5 日 |

合計 14〜20 日。M1/M2 のペースなら 5〜7 日で完走できる想定。

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
