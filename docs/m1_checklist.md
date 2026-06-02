# M1 完了チェックリスト v0.2
## ― Gambit Architects 個人開発：1か月目の到達点 ―

| 項目 | 内容 |
| --- | --- |
| 文書種別 | マイルストーン完了基準 |
| 対象 | M1（開発1か月目：コア検証フェーズ） |
| 文書バージョン | v0.2 |
| 作成日 | 2026年5月4日（v0.2 更新：2026年5月10日） |
| 関連文書 | `gambit_game_planning_doc.md`、`gambit_dsl_spec.md`、`CLAUDE.md` |

---

## 0. M1 の目的（再掲）

> **「ガンビットの評価器が動く」「最小戦闘ループが回る」**ことを、UI なしでもいいから証明する。

逆に言えば、M1 では **UI も絵も音も世界観もまだ作らない**。
コンソール出力で "戦闘の様子" がテキスト表示されれば合格。

---

## 1. M1 完了の判定基準（このチェックリストに全部 ✅ が付けば完了）

### 1.1 ガンビット評価器（最重要）
- [x] DSL v0.3 の **条件21種すべて**が予測可能に評価される（テスト通過、2026-05-10）
- [x] DSL v0.3 の **対象6種すべて**が正しく解決される（テスト通過、2026-05-10）
- [x] **行動15種すべて**が `Action` 型として定義され、識別される（実効果は §1.4 のみで OK）
- [x] 評価器が**純粋関数**として実装されている（同じ入力で同じ出力）
- [x] ルールはトップ優先、フォールスルー（対象不在・MP不足）が仕様通り動く

### 1.2 ユニットテスト
- [x] 評価器のユニットテストが書かれている（DSL仕様書 §11 の観点を最低カバー、33 tests）
- [x] テストは**1コマンド**で実行できる（`pnpm test`）
- [x] テストが**全 PASS**（35/35 ― evaluator 33 + smoke 2、2026-05-10）

### 1.3 最小戦闘ループ
- [x] 4 vs N の戦闘を**ターン制で進行**できる（ATB は M2 でよい）（2026-05-10）
- [x] 各ユニットが自分のガンビットセットに従って毎ターン行動を選択（2026-05-10）
- [x] HP 0 で戦闘不能、敵全滅で勝利、味方全滅で敗北を判定（2026-05-10）
- [x] 戦闘の各ターンが**コンソールにテキスト出力**される（`pnpm run demo`、2026-05-10）

### 1.4 実効果が動いている行動（M1 では4つだけで OK）
| 行動 | 実装状態 |
| --- | --- |
| `ATTACK` | ✅ ダメージが入る（2026-05-10） |
| `DEFEND` | ✅ 当ターン被ダメ -50%（2026-05-10） |
| `WAIT` | ✅ 何もしない（2026-05-10） |
| `USE_ITEM(POTION)` | ✅ HP 30 回復＋インベントリ -1（2026-05-10） |
| その他11種 | ✅ `NOT_IMPLEMENTED` イベント記録して空振り（2026-05-10） |

### 1.5 最小データ（剣士1ジョブ・敵3〜5種）
- [x] ジョブ「剣士」のテンプレ（HP/MP/物理/防御）が定義されている（2026-05-10）
- [x] 味方ユニット 4 体を剣士テンプレでインスタンス化できる（2026-05-10）
- [x] 敵テンプレが **3 種**（GOBLIN 弱／WOLF 普通／BANDIT 強、ボスなし）定義されている（2026-05-10）
- [x] 戦闘開始関数 `runBattle()` が「味方4体 + 敵 N 体」を受け取って戦闘を実行できる（2026-05-10）

### 1.6 サンプルガンビット
- [x] 標準プリセット 4種（DSL §8）が**読み込み可能**な形でデータとして存在する（2026-05-10）
- [x] 4体の味方それぞれに別のプリセットを当てて、戦闘をしたとき**手書きと違わない動き**をする（presetTank x2 + presetFinisher x2 のデモで目視確認、2026-05-10）

### 1.7 開発環境・運用
- [x] エンジン選定確定（**TypeScript + React + Vite + PWA**／2026-05-04 確定）
- [x] Vite で React+TS プロジェクト初期化が完了している（2026-05-10）
- [x] Vitest でテスト実行が `pnpm test` で動く（smoke test 2/2 PASS、2026-05-10）
- [x] リポジトリが Git 管理されており、コミット履歴が残っている（GitHub にも push 済、2026-05-10）
- [x] README に「ローカル起動手順」が3行以内で書かれている（`pnpm install` / `pnpm test` / `pnpm run demo`、2026-05-10）
- [x] 1コマンドで戦闘デモが動く（`pnpm run demo`：コンソールに戦闘ログ出力、ALLY 勝利、2026-05-10）

---

## 2. M1 で実装する最小データ型（暫定）

DSL 仕様書では `Unit` / `BattleState` を疑似コードでしか触れていないので、M1 はこの最小定義で進む。
**正式な `data_schema.md` は M2 以降で作る**（M1 では必要分しか書かない）。

```ts
type JobId = "SWORDSMAN" | "MAGE" | "HEALER";   // M1 は SWORDSMAN のみ実装

interface Unit {
  id: string;                  // "ally_1" など
  name: string;                // 表示用
  jobId: JobId;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  atk: number;                 // 物理攻撃
  def: number;                 // 物理防御
  mag: number;                 // 魔力（M1 未使用）
  statuses: Status[];          // 付与中の状態異常
  isAlly: boolean;
  isAlive: boolean;
  gambitSet: GambitSet;
  inventory: Record<ItemId, number>;  // M1 は POTION 数個のみ
}

interface Enemy extends Unit {
  weaknesses: Element[];       // M1 ではダミーでもよい
  enemyType: EnemyType;
  isBoss: boolean;             // M1 は false 固定
}

interface BattleState {
  turn: number;
  allies: Unit[];
  enemies: Enemy[];
  log: BattleEvent[];          // ターンごとの出来事
}

type BattleEvent =
  | { kind: "ACTION"; actorId: string; action: Action; targetIds: string[]; result: string }
  | { kind: "DAMAGE"; targetId: string; amount: number }
  | { kind: "HEAL"; targetId: string; amount: number }
  | { kind: "DOWN"; unitId: string }
  | { kind: "TURN_START"; turn: number }
  | { kind: "BATTLE_END"; winner: "ALLY" | "ENEMY" };
```

---

## 3. M1 デモ：「これが動けば M1 完了」のサンプル出力

`pnpm run demo` を叩くと、こういうログが出ること：

```
=== BATTLE START ===
Allies: [Sword1 / Sword2 / Sword3 / Sword4]
Enemies: [Goblin / Goblin / Wolf]

[Turn 1]
  Sword1 evaluated: ENEMY_EXISTS → ENEMY_MATCH → ATTACK
    -> Sword1 attacks Goblin for 12 damage. (Goblin HP: 18/30)
  Sword2 evaluated: SELF_HP_GTE(80) → SELF → DEFEND
    -> Sword2 defends. (Defense up this turn)
  Sword3 evaluated: ALLY_HP_LT(40) → fallthrough (no match)
                   ENEMY_EXISTS    → ENEMY_MATCH → ATTACK
    -> Sword3 attacks Wolf for 14 damage. (Wolf HP: 16/30)
  Sword4 evaluated: ENEMY_EXISTS → ENEMY_MATCH → ATTACK
    -> Sword4 attacks Goblin for 13 damage. (Goblin DOWN)
  Goblin evaluated: ENEMY_EXISTS → ENEMY_MATCH → ATTACK
    -> Goblin attacks Sword1 for 8 damage. (Sword1 HP: 22/30)
  ...

[Turn 5]
  ...
  -> Wolf DOWN
  -> All enemies defeated.

=== BATTLE END: ALLY VICTORY ===
Turns: 5
Damage dealt: 187 / Damage taken: 84
Item used: POTION x1 (Sword2)
```

このログが**期待通りに**出れば M1 はクリア。
見栄えは関係ない。**ガンビットが意図通りに動いている**ことが分かれば OK。

---

## 4. ユニットテストの最低ライン

`gambitEvaluator.test.ts`（または相当）に、以下のシナリオが**全部 PASS** すること。

### 4.1 条件評価
- [ ] `SELF_HP_LT(50)`：HP 30/100 → 真、HP 60/100 → 偽
- [ ] `SELF_HP_GTE(80)`：HP 90/100 → 真、HP 50/100 → 偽
- [ ] `SELF_MP_LT(20)`：境界値 19% / 20% / 21% を確認
- [ ] `SELF_MP_GTE(50)`：境界値 49% / 50% / 51% を確認
- [ ] `ALLY_HP_LT(40)`：複数該当時、HP%最低が MATCH に来ること
- [ ] `ALLY_HP_GTE(80)`：複数該当時、HP%最高が MATCH に来ること
- [ ] `ALLY_MP_LT/GTE`：HP 版と同じパターン
- [ ] `ALLY_DEAD`：戦闘不能の最初の1人が MATCH に来る
- [ ] `ENEMY_LOWEST_HP` / `ENEMY_HIGHEST_HP`：HP実数で正しく選ばれる
- [ ] `ENEMY_HAS_STATUS(POISON)` / `ENEMY_NO_STATUS(POISON)`
- [ ] `ENEMY_WEAK_TO(FIRE)` / `ENEMY_TYPE(BEAST)`
- [ ] `BOSS_PRESENT`：通常敵だけだと偽、ボス含むと真

### 4.2 評価ループ
- [ ] 上のルールが成立 → 下は評価されない
- [ ] 全ルール不成立 → null（待機）が返る
- [ ] `enabled: false` のルールはスキップされる
- [ ] 対象解決失敗（例：ALLY_DEAD だが死者ゼロ）→ フォールスルー
- [ ] MP 不足 → フォールスルー

### 4.3 整合性
- [ ] `SELF_HP_LT` + `ALLY_MATCH` のような不整合は**バリデータが弾く**（評価まで届かない）
- [ ] 条件→対象→行動の組み合わせが整合していれば必ず評価が動く

---

## 5. M1 で**作らない**もの（M2 以降）

これに手を出したら M1 が終わらない。誘惑に屈しない。

- ❌ UI / グラフィック / アニメーション（M2）
- ❌ ATB（リアルタイム）バトル（M2 で導入検討）
- ❌ 魔法・スキルの**実効果**（DEFEND / ATTACK / WAIT / POTION 以外は空振りでよい）
- ❌ 装備・センサーシステム（M3）
- ❌ procgen ダンジョン（M3）
- ❌ ボス・ボス特殊条件（M3）
- ❌ 共有用 QR・文字列フォーマット（M5 以降）
- ❌ ガンビット編集 UI（M2）
- ❌ ローカライズ（M5 以降）
- ❌ サウンド（M5 以降）

---

## 6. M1 で発生しがちな罠と回避策

| 罠 | 対策 |
| --- | --- |
| **「ついでに UI も…」と手を広げる** | M1 は完全にコンソール出力で固定。視覚化は M2 で |
| **AI 生成コードを盲信する** | 評価器は「型 + 単体テスト」を必ず先に書き、AI が出したコードはテストで縛る |
| **完璧な型定義を求めて止まる** | M1 の型は §2 の定義で**確定**。M2 以降の都合は M2 で考える |
| **戦闘バランスにこだわり始める** | M1 ではバランス無視で OK。「動く」が目標、「面白い」は後 |
| **テストを後回しにする** | 評価器の各条件のテストは**1日目から書く**。実装と同時に |
| **デモシナリオが地味で萎える** | M1 終了時に Twitter/Bluesky に**デモ動画を出す**ことを目標に置くと、適度に華やかにしたくなって良い |

---

## 7. 週次の自分用ふり返り（推奨）

毎週末に以下を 5分で書いてリポジトリに残す（`devlog/wkN.md` 等）：

1. 今週やったこと（コミット 3件まで列挙）
2. 詰まったこと
3. 来週やること
4. 体調・モチベ：◎ / ○ / △ / ×

これがあるだけで「あれ、何を考えてたっけ？」が減り、AI とのセッションも復元しやすい。

---

## 8. M1 完了の宣言条件

**§1 のチェックリストが全部 ✅** になり、**§3 のデモ出力が手元で再現できる** 状態になったら M1 完了。
このとき：

- 自分（しょうた）の手で `git tag m1-complete` を打つ
- `devlog/m1_retro.md` に「振り返り：何が良かった／改善点」を書く
- `CLAUDE.md` を更新して「M1 完了」を明記する

これで M2（プレイアブル化）に進む準備が整う。

---

## 9. 変更履歴

| 版 | 日付 | 内容 |
| --- | --- | --- |
| v0.1 | 2026-05-04 | 初版（DSL v0.3 を前提とした M1 完了基準） |
| v0.2 | 2026-05-10 | §1.7 の開発環境項目を進捗反映（scaffold/Vitest/Git/GitHub push 済）。`npm` 表記を `pnpm` に統一。 |
