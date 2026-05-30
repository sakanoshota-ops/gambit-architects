# ガンビットDSL最小仕様書 v0.3
## ― Gambit Architects v1.0 向け ―

| 項目 | 内容 |
| --- | --- |
| 文書種別 | DSL（Domain Specific Language）仕様書 |
| 対象バージョン | ゲーム本体 v1.0 |
| 文書バージョン | v0.3（HP/MP 以上条件 追加版） |
| 作成日 | 2026年5月4日 |
| 関連文書 | `gambit_game_planning_doc.md`（企画書 v0.2）、`CLAUDE.md` |

---

## 0. 目的と非目的

### 0.1 目的（やること）
- v1.0 で実装する**条件21・行動15・対象6**の語彙とセマンティクスを確定する。
- ガンビットの**評価順序**と**衝突解決**を曖昧さなく定める。
- **JSON 保存形式**と**プレイヤー間共有用の文字列形式**を定義する。
- 実装者（しょうた、AI = Claude）の双方が**同じ理解**で動けるようにする。

### 0.2 非目的（やらないこと）
- v1.0 凍結ラインを越える機能（OR、ノードUI、4ジョブ目以降）はここでは扱わない。
- 具体的なバランス値（魔法の威力、HP の最大値）は本仕様の範囲外。
- 戦闘の細かい計算式（ダメージ、命中、ATB速度）は別ドキュメント。

---

## 1. 設計原則

1. **読めばわかる**：プログラマでなくても、寝起きでも条件と行動を読み取れる粒度を保つ。
2. **小さく強い**：少ない語彙で、組み合わせれば多様な戦術が作れること。
3. **決定的**：同じ盤面・同じガンビットなら、必ず同じ結果になる（テスト可能性）。
4. **拡張可能**：v1.1 以降に語彙を追加しても、v1.0 のセーブデータが壊れない構造。
5. **モバイルで打てる**：複雑な引数構造を避け、すべて「列挙＋数値1個」程度に収める。
6. **閾値より選択則**：「HP が N% 未満の敵」のような閾値条件は採らず、「HP最低の敵」のような選択則で対象を決める。判断のシンプルさを優先する。

---

## 2. ガンビットの構造

### 2.1 1ルールの形

```
[条件 (Condition)]  →  [対象 (Target)]  →  [行動 (Action)]
```

例（読み取り可能形式）：

```
ALLY_HP_LT(40)  →  ALLY_MATCH  →  CAST_HEAL(CURA)
```

意味：**「HP が 40% 未満の味方がいたら、その味方に 回復魔法 ケアル を唱える」**

### 2.2 1キャラのガンビットセット
- **最大 8 ルール**を**優先度順（上から下）**に並べる。
- 各ルールには ON/OFF トグル（プレイヤーが学習中に一時的に無効化できる）。

### 2.3 評価アルゴリズム（疑似コード）

```ts
function decideAction(self: Unit, battle: BattleState): ActionPlan | null {
  for (const rule of self.gambitSet.rules) {
    if (!rule.enabled) continue;
    const ctx = evaluateCondition(rule.condition, self, battle);
    if (!ctx.matched) continue;
    const target = resolveTarget(rule.target, ctx, self, battle);
    if (target === null) continue;          // 対象が解決できない → 次のルールへ
    if (!canPerform(rule.action, self, target)) continue; // MP不足等 → 次のルールへ
    return { action: rule.action, target };
  }
  return null; // 何もできない → 行動スキップ（実装上は「待機」と等価）
}
```

ポイント：
- **上から1つ目に成立したルールを実行**。複数同時成立しても上が勝つ。
- 条件が真でも、**対象解決失敗・実行不能**なら次のルールへフォールスルー。
- 全ルール不成立 = 待機。
- v1.0 では**「常に真」の専用条件は持たない**。デフォルト行動（攻撃など）のフォールバックには `ENEMY_EXISTS` を使う（戦闘中は実質常時 true）。

---

## 3. 条件（Condition）― 全21種

### 3.1 引数の表記
- `(N)` … 整数 0〜100（%表記の値）
- `[X]` … 列挙値（後述：状態異常／属性／敵種族）
- 引数なしのものは括弧を省略可。

### 3.1.1 「味方」「敵」の定義
- **`ALLY_*` 条件は actor 自身を含む**。例：`ALLY_HP_LT(30)` は自分の HP が 30% 未満でも真になり、その場合 MATCH に自分自身が選ばれうる。これにより「ピンチの自分を含めて回復対象にする」表現が自然になる。
- **`ENEMY_*` 条件は actor の敵陣営**。actor が敵側のときは「actor から見た敵」＝ プレイヤー陣営となる。
- これにより、味方・敵いずれが actor でも**同じ評価器で対称に動く**。

### 3.2 一覧表

| # | ID | 表示名 | 引数 | セマンティクス | MATCH |
| --- | --- | --- | --- | --- | --- |
| **自身（6種）** ||||||
| 1 | `SELF_HP_LT` | 自分のHPが N% 未満 | (N) | 自分の現HPが最大HPの N% 未満なら真 | ― |
| 2 | `SELF_HP_GTE` | 自分のHPが N% 以上 | (N) | 自分の現HPが最大HPの N% 以上なら真 | ― |
| 3 | `SELF_MP_LT` | 自分のMPが N% 未満 | (N) | 自分の現MPが最大MPの N% 未満なら真 | ― |
| 4 | `SELF_MP_GTE` | 自分のMPが N% 以上 | (N) | 自分の現MPが最大MPの N% 以上なら真 | ― |
| 5 | `SELF_HAS_STATUS` | 自分が状態 X | [Status] | 自分に状態異常 X が付与されていれば真 | ― |
| 6 | `SELF_NO_STATUS` | 自分が状態 X でない | [Status] | 自分に状態異常 X が付与されていなければ真 | ― |
| **味方（7種）** ||||||
| 7 | `ALLY_HP_LT` | 味方の誰かがHP N% 未満 | (N) | HP が N% 未満の味方が1人以上いれば真 | HP%最低の1人 |
| 8 | `ALLY_HP_GTE` | 味方の誰かがHP N% 以上 | (N) | HP が N% 以上の味方が1人以上いれば真 | HP%最高の1人 |
| 9 | `ALLY_MP_LT` | 味方の誰かがMP N% 未満 | (N) | MP が N% 未満の味方が1人以上いれば真 | MP%最低の1人 |
| 10 | `ALLY_MP_GTE` | 味方の誰かがMP N% 以上 | (N) | MP が N% 以上の味方が1人以上いれば真 | MP%最高の1人 |
| 11 | `ALLY_HAS_STATUS` | 味方の誰かが状態 X | [Status] | 状態 X の味方が1人以上いれば真 | 該当者の最初の1人 |
| 12 | `ALLY_DEAD` | 味方が戦闘不能 | なし | 戦闘不能の味方が1人以上いれば真 | 戦闘不能の最初の1人 |
| 13 | `ALLY_TARGETED` | 味方が敵に狙われている | なし | 直近の敵の行動対象になっている味方が1人以上いれば真 | 狙われている味方 |
| **敵（7種）** ||||||
| 14 | `ENEMY_EXISTS` | 敵が存在する | なし | 戦闘中で敵が1体以上残っていれば真（**フォールバック用**として最下段に置くのが定石） | 任意の1体 |
| 15 | `ENEMY_LOWEST_HP` | 最もHPが少ない敵 | なし | 敵が1体以上いれば真 | HP実数最低の1体 |
| 16 | `ENEMY_HIGHEST_HP` | 最もHPが多い敵 | なし | 敵が1体以上いれば真 | HP実数最高の1体 |
| 17 | `ENEMY_HAS_STATUS` | 敵が状態 X | [Status] | 状態 X の敵が1体以上 | 該当の1体 |
| 18 | `ENEMY_NO_STATUS` | 敵が状態 X でない | [Status] | 状態 X **でない**敵が1体以上 | 該当の1体 |
| 19 | `ENEMY_WEAK_TO` | 敵が属性 X に弱い | [Element] | 属性 X が弱点の敵が1体以上 | 該当の1体 |
| 20 | `ENEMY_TYPE` | 敵の種族が X | [EnemyType] | 種族 X の敵が1体以上 | 該当の1体 |
| **戦況（1種）** ||||||
| 21 | `BOSS_PRESENT` | ボスが存在する | なし | ボスフラグの敵が1体以上 | ボス本体 |

### 3.3 設計メモ：閾値条件を捨てたこと

v0.1 で持っていた `ENEMY_HP_LT(N)` / `ENEMY_HP_GT(N)` の閾値条件は廃止し、`ENEMY_LOWEST_HP` / `ENEMY_HIGHEST_HP` の**選択則条件**に置き換えた。狙いは：

- プレイヤーが**数値の調整に頭を取られない**（「N=20 が正解？25？」と悩まない）。
- 「止めを刺す」「タンクを優先する」など**意図そのもの**で書ける。
- UI も**スライダーが減って**作りが楽になる。

その代わり、「HP%が一定値を切ったら〜」という戦術は v1.0 では書けない。これは v1.1 以降のバックログ送りとする。

### 3.4 廃止された条件（v0.1 → v0.2）

参考のため、v0.1 で定義したが v0.2 で削除した条件を記録する。

| 旧 ID | 削除理由 |
| --- | --- |
| `ENEMY_HP_LT` / `ENEMY_HP_GT` | 閾値型を廃止し選択則に置換 |
| `TURN_LT` / `TURN_GT` / `ENEMY_COUNT_GTE` / `ALLY_COUNT_GTE` | 戦況系は `BOSS_PRESENT` のみに絞った（複雑度低減） |
| `ALWAYS` / `RANDOM` / `CAN_AFFORD` / `SELF_LAST_ACTION_FAILED` | メタ系をまるごと削除。フォールバックは `ENEMY_EXISTS` で代替 |

### 3.5 列挙値（v1.0 で扱う最小集合）

これらは**ID として固定**。実数値・効果は別バランス文書で定義する。

```
Status (状態異常):
  POISON, BLIND, SILENCE, SLEEP, STUN, BERSERK,
  BUFF_ATK, BUFF_DEF, BUFF_MAG, REGEN, SHELL, PROTECT
  ※ 12種で打ち止め

Element (属性):
  FIRE, ICE, THUNDER, HOLY, DARK, NEUTRAL
  ※ 6種で打ち止め

EnemyType (敵種族):
  HUMANOID, BEAST, UNDEAD, MACHINE, MAGICAL, BOSS
  ※ 6種で打ち止め
```

> 列挙値の追加は v1.1 以降。**v1.0 では絶対に増やさない**（増やすとバランス調整が指数的に膨らむ）。

---

## 4. 行動（Action）― 全15種

### 4.1 引数の表記
- `[X]` … スキル/魔法/アイテムの ID（後述：別データテーブルで定義）
- 引数のない行動は誰でもいつでも使える基本動作。

### 4.2 一覧表

| # | ID | 表示名 | 引数 | MP | 説明 | 使用可能ジョブ |
| --- | --- | --- | --- | --- | --- | --- |
| **戦闘基本（4種）** |||||||
| 1 | `ATTACK` | 通常攻撃 | なし | 0 | 装備武器による物理攻撃 | 全ジョブ |
| 2 | `SKILL` | ジョブスキル | [SkillID] | 個別 | ジョブ固有のアクティブスキル | 全ジョブ |
| 3 | `CHARGE` | 溜め | なし | 0 | 当ターンは攻撃せず、次の `ATTACK` 威力を 1.5x | 剣士 |
| 4 | `CHAIN` | 連携 | なし | 0 | 同ターン直前に味方が攻撃した敵と同じ敵を攻撃。命中時にダメ +20% | 剣士 |
| **魔法（5種）** |||||||
| 5 | `CAST_OFFENSE` | 攻撃魔法 | [SpellID] | 個別 | 属性付き攻撃魔法 | 魔導士 |
| 6 | `CAST_HEAL` | 回復魔法 | [SpellID] | 個別 | HP回復魔法 | 治癒士・魔導士(一部) |
| 7 | `CAST_REVIVE` | 蘇生魔法 | [SpellID] | 個別 | 戦闘不能から復活 | 治癒士 |
| 8 | `CAST_BUFF` | 補助魔法 | [BuffID] | 個別 | 味方に強化付与 | 治癒士 |
| 9 | `CAST_DEBUFF` | 妨害魔法 | [DebuffID] | 個別 | 敵に弱体付与 | 魔導士 |
| **状態管理（1種）** |||||||
| 10 | `CAST_CURE_STATUS` | 状態回復魔法 | [Status] | 個別 | 指定の状態異常を解除 | 治癒士 |
| **アイテム（1種）** |||||||
| 11 | `USE_ITEM` | アイテム使用 | [ItemID] | 0 | 所持アイテムを使用（HP/MP/状態など） | 全ジョブ |
| **戦術（4種）** |||||||
| 12 | `DEFEND` | 防御 | なし | 0 | 当ターン被ダメ -50%、行動順末尾 | 全ジョブ |
| 13 | `WAIT` | 待機 | なし | 0 | 何もしない。ATBゲージは保持 | 全ジョブ |
| 14 | `PROVOKE` | 挑発 | なし | 0 | 敵全体のヘイトが自分に集中（3ターン） | 剣士 |
| 15 | `INTERPOSE` | かばう | なし | 0 | 対象味方への単体物理を肩代わり（1回） | 剣士 |

### 4.3 行動の引数（v1.0 の固定 ID 集合）

> **v1.0 ではコンテンツ ID もここで上限を切る**。バランス調整可能な範囲に絞り込むため。

```
SkillID (剣士):
  POWER_SLASH, GUARD_BREAK, WHIRLWIND
SpellID (攻撃 / 魔導士):
  FIRE, FIRA, BLIZZARD, BLIZZARA, THUNDER, THUNDARA, HOLY_BOLT, DARK_BOLT
SpellID (回復 / 治癒士):
  CURE, CURA, CURAGA, CURE_ALL
SpellID (蘇生):
  RAISE
BuffID:
  PROTECT, SHELL, REGEN, HASTE
DebuffID:
  POISON, SILENCE, BLIND, SLOW
ItemID:
  POTION, HI_POTION, ETHER, ANTIDOTE, EYE_DROPS, ECHO_HERB, PHOENIX_DOWN
```

合計：スキル3＋攻撃魔法8＋回復魔法4＋蘇生1＋バフ4＋デバフ4＋アイテム7 = **31コンテンツID**。
v1.0 はこの31個で打ち止め。追加は v1.1 以降。

---

## 5. 対象（Target）― 全6種

| # | ID | 表示名 | セマンティクス |
| --- | --- | --- | --- |
| 1 | `SELF` | 自分 | 自分自身 |
| 2 | `ALLY_MATCH` | 条件にマッチした味方 | 直前の条件が `ALLY_*` 系のとき、その味方を対象に取る |
| 3 | `ALLY_LOWEST_HP` | HP最低の味方 | 戦闘不能を除く生存味方のうち、現HP%（現/最大）が最低の1人 |
| 4 | `ALLY_ALL` | 味方全員 | 戦闘不能を除く生存味方全員 |
| 5 | `ENEMY_MATCH` | 条件にマッチした敵 | 直前の条件が `ENEMY_*` 系または `BOSS_PRESENT` のとき、その敵を対象に取る |
| 6 | `ENEMY_ALL` | 敵全員 | 生存敵全員 |

### 5.1 MATCH 系の解決ルール

`ALLY_MATCH` / `ENEMY_MATCH` は、**対応する条件が候補集合（または特定の1体）を返す**ことを前提に動く。

| 対象 | 有効な条件 | MATCH の決まり方 |
| --- | --- | --- |
| `ALLY_MATCH` | `ALLY_HP_LT`, `ALLY_HP_GTE`, `ALLY_MP_LT`, `ALLY_MP_GTE`, `ALLY_HAS_STATUS`, `ALLY_DEAD`, `ALLY_TARGETED` | 各条件の MATCH 列に従う（§3.2） |
| `ENEMY_MATCH` | `ENEMY_EXISTS`, `ENEMY_LOWEST_HP`, `ENEMY_HIGHEST_HP`, `ENEMY_HAS_STATUS`, `ENEMY_NO_STATUS`, `ENEMY_WEAK_TO`, `ENEMY_TYPE`, `BOSS_PRESENT` | 各条件の MATCH 列に従う（§3.2） |

### 5.2 整合性ルール
- **MATCH 系の対象は、条件が同陣営に絡む場合のみ有効**。
  - 例：条件 `SELF_HP_LT(30)` ＋ 対象 `ALLY_MATCH` は**バリデーションエラー**（条件が「自分」、対象が「味方MATCH」で噛み合わない）。
  - エディタ側で**選択肢として出さない**ことで防ぐ（§10）。
- **範囲行動と対象の関係**：
  - 範囲魔法（例：`CAST_OFFENSE(FIRA)`）は、対象が `ENEMY_MATCH` でも**自動的に範囲化**して周囲の敵を巻き込む。
  - `ALLY_ALL` 対象に単体魔法を指定した場合は**バリデーションエラー**（編集時に弾く）。

---

## 6. JSON 保存形式

### 6.1 ガンビットセット（1キャラ分）

```json
{
  "schemaVersion": 2,
  "characterId": "char_01",
  "rules": [
    {
      "id": "r1",
      "enabled": true,
      "condition": { "type": "ALLY_DEAD" },
      "target":    { "type": "ALLY_MATCH" },
      "action":    { "type": "CAST_REVIVE", "spellId": "RAISE" }
    },
    {
      "id": "r2",
      "enabled": true,
      "condition": { "type": "ALLY_HP_LT", "value": 40 },
      "target":    { "type": "ALLY_MATCH" },
      "action":    { "type": "CAST_HEAL", "spellId": "CURA" }
    },
    {
      "id": "r3",
      "enabled": true,
      "condition": { "type": "ENEMY_WEAK_TO", "element": "FIRE" },
      "target":    { "type": "ENEMY_MATCH" },
      "action":    { "type": "CAST_OFFENSE", "spellId": "FIRA" }
    },
    {
      "id": "r4",
      "enabled": true,
      "condition": { "type": "ENEMY_EXISTS" },
      "target":    { "type": "ENEMY_MATCH" },
      "action":    { "type": "ATTACK" }
    }
  ]
}
```

### 6.2 制約
- `rules` は最大 **8 要素**。
- 各 rule は `condition` / `target` / `action` をすべて持つ（必須）。
- `enabled: false` のルールは評価時にスキップされるが、保存はされる。
- `schemaVersion` は将来の互換性確保のため必須。**v0.2 仕様は `2`**。

### 6.3 TypeScript 型（実装の出発点）

```ts
type Status = "POISON" | "BLIND" | "SILENCE" | "SLEEP" | "STUN" | "BERSERK"
            | "BUFF_ATK" | "BUFF_DEF" | "BUFF_MAG" | "REGEN" | "SHELL" | "PROTECT";

type Element = "FIRE" | "ICE" | "THUNDER" | "HOLY" | "DARK" | "NEUTRAL";

type EnemyType = "HUMANOID" | "BEAST" | "UNDEAD" | "MACHINE" | "MAGICAL" | "BOSS";

type Condition =
  // 自身（6）
  | { type: "SELF_HP_LT"; value: number }
  | { type: "SELF_HP_GTE"; value: number }
  | { type: "SELF_MP_LT"; value: number }
  | { type: "SELF_MP_GTE"; value: number }
  | { type: "SELF_HAS_STATUS"; status: Status }
  | { type: "SELF_NO_STATUS"; status: Status }
  // 味方（7）
  | { type: "ALLY_HP_LT"; value: number }
  | { type: "ALLY_HP_GTE"; value: number }
  | { type: "ALLY_MP_LT"; value: number }
  | { type: "ALLY_MP_GTE"; value: number }
  | { type: "ALLY_HAS_STATUS"; status: Status }
  | { type: "ALLY_DEAD" }
  | { type: "ALLY_TARGETED" }
  // 敵（7）
  | { type: "ENEMY_EXISTS" }
  | { type: "ENEMY_LOWEST_HP" }
  | { type: "ENEMY_HIGHEST_HP" }
  | { type: "ENEMY_HAS_STATUS"; status: Status }
  | { type: "ENEMY_NO_STATUS"; status: Status }
  | { type: "ENEMY_WEAK_TO"; element: Element }
  | { type: "ENEMY_TYPE"; enemyType: EnemyType }
  // 戦況（1）
  | { type: "BOSS_PRESENT" };

type Target =
  | { type: "SELF" }
  | { type: "ALLY_MATCH" }
  | { type: "ALLY_LOWEST_HP" }
  | { type: "ALLY_ALL" }
  | { type: "ENEMY_MATCH" }
  | { type: "ENEMY_ALL" };

type Action =
  | { type: "ATTACK" }
  | { type: "SKILL"; skillId: string }
  | { type: "CHARGE" }
  | { type: "CHAIN" }
  | { type: "CAST_OFFENSE"; spellId: string }
  | { type: "CAST_HEAL"; spellId: string }
  | { type: "CAST_REVIVE"; spellId: string }
  | { type: "CAST_BUFF"; buffId: string }
  | { type: "CAST_DEBUFF"; debuffId: string }
  | { type: "CAST_CURE_STATUS"; status: Status }
  | { type: "USE_ITEM"; itemId: string }
  | { type: "DEFEND" }
  | { type: "WAIT" }
  | { type: "PROVOKE" }
  | { type: "INTERPOSE" };

interface GambitRule {
  id: string;
  enabled: boolean;
  condition: Condition;
  target: Target;
  action: Action;
}

interface GambitSet {
  schemaVersion: 2;
  characterId: string;
  rules: GambitRule[];   // 最大8要素
}
```

> ガンビット評価器（中核ロジック）はこの型定義を入力に取り、**純粋関数**として `Action | null` を返す形にすること（テストしやすさのため必須）。

---

## 7. 共有用文字列形式（サーバ不使用）

### 7.1 設計
- JSON を **gzip → base64url** で圧縮した文字列。
- 先頭に `GA2:` プレフィックスでバージョン識別（v0.2 = schemaVersion:2）。
- 例：`GA2:eJyrVkpJLM7P05GqqlSyMjQyMqwFAB...`
- スマホで **コピペできる長さ**（200 文字程度に収まることを目標）に。

### 7.2 QR
- 上記文字列を QR コード化。スマホ間で読み取り共有可。

### 7.3 検証
- インポート時：プレフィックス確認 → base64url decode → gunzip → JSON.parse → スキーマ検証（型・配列長・列挙値）。
- 検証失敗時は**全拒否**（部分採用しない）。エラーメッセージは行番号付きで返す。
- 旧バージョン（`GA1:`）は**読まない**（v1.0 出荷前なので互換不要）。

---

## 8. 標準プリセット（同梱4種）

学習導線として、ゲーム内に最初から入れるプリセット。
**フォールバックは `ENEMY_EXISTS` を最下段に置く**のがイディオム。

### 8.1 「初心者向け：自動回復＋通常攻撃」
```
1. ALLY_HP_LT(40) → ALLY_MATCH  → CAST_HEAL(CURE)
2. ALLY_DEAD     → ALLY_MATCH  → CAST_REVIVE(RAISE)
3. ENEMY_EXISTS  → ENEMY_MATCH → ATTACK
```

### 8.2 「弱点突き優先」
```
1. ALLY_HP_LT(30)        → ALLY_MATCH  → CAST_HEAL(CURA)
2. ENEMY_WEAK_TO(FIRE)   → ENEMY_MATCH → CAST_OFFENSE(FIRA)
3. ENEMY_WEAK_TO(ICE)    → ENEMY_MATCH → CAST_OFFENSE(BLIZZARA)
4. ENEMY_WEAK_TO(THUNDER)→ ENEMY_MATCH → CAST_OFFENSE(THUNDARA)
5. ENEMY_EXISTS          → ENEMY_MATCH → ATTACK
```

### 8.3 「タンク：盾役」
```
1. ALLY_TARGETED   → ALLY_MATCH  → INTERPOSE
2. SELF_HP_LT(50)  → SELF        → DEFEND
3. BOSS_PRESENT    → SELF        → PROVOKE
4. ENEMY_EXISTS    → ENEMY_MATCH → ATTACK
```

### 8.4 「止め刺し優先」
```
1. ALLY_HP_LT(20)     → ALLY_MATCH  → CAST_HEAL(CURA)
2. ENEMY_LOWEST_HP    → ENEMY_MATCH → ATTACK     ← 瀕死を狙って撃破
3. ENEMY_WEAK_TO(FIRE)→ ENEMY_MATCH → CAST_OFFENSE(FIRA)
4. ENEMY_EXISTS       → ENEMY_MATCH → ATTACK
```

これらは**ガンビットの読み方を教えるチュートリアル**としても機能する。

---

## 9. バリデーションとエラー

### 9.1 編集時に弾くエラー（UI で選択肢を出さない／保存ボタンが押せない）
| エラー | 例 |
| --- | --- |
| 対象と条件のミスマッチ | `SELF_HP_LT(30)` + `ALLY_MATCH`（自分条件 vs 味方MATCH） |
| 範囲不一致 | 単体魔法 + `ALLY_ALL` |
| ジョブ不適合 | 治癒士に `CHARGE` |
| 数値範囲外 | `SELF_HP_LT(150)`（HP/MP%は 0〜100 のみ） |
| ルール数超過 | 9個目のルール追加 |

### 9.2 実行時の挙動（UI を通った後でも起こりうる）
| ケース | 挙動 |
| --- | --- |
| MP不足 | フォールスルー（次のルールへ） |
| 対象が消えた（戦闘不能・撃破） | フォールスルー |
| アイテム枯渇 | フォールスルー |
| 全ルール不成立 | 待機（実装上は `WAIT` と等価） |

### 9.3 致命エラー（ゲーム停止）
- スキーマ違反（型不一致、未知の ID）
- 無限ループ検出（同フレームで同キャラが100回以上評価された）
  - これは設計バグなので、ログに出して該当ルールを無効化し試合継続。

---

## 10. UI への要求（このDSLが UI に求めること）

実装担当（クライアント）に向けた要求事項。

1. **条件選択 → 対象選択 → 行動選択** の3ステップで1ルール作成。
2. 条件が決まると、**整合する対象のみ**を対象選択肢に出す。
3. ジョブが決まっていれば、**そのジョブが使える行動のみ**を出す。
4. 数値引数は**スライダー**（10刻み 0〜100、HP%/MP% 系のみ）で入力。
5. 列挙引数（属性・状態・敵種族・スキルID等）は**アイコン＋ラベルのチップ選択**。
6. 各ルールに**並べ替えハンドル**と**有効化トグル**。
7. ガンビットセット保存時に「§9.1」の検証を必ず通す。

---

## 11. テスト要件（このDSLの実装に対する）

`gambitEvaluator` 関数のユニットテストとして、**最低限カバーする観点**：

| 観点 | テストケース例 |
| --- | --- |
| 単純成立 | 戦闘中、ENEMY_EXISTS → ATTACK が選ばれる |
| 優先度順 | 上のルールが成立 → 下は評価されない |
| フォールスルー：MP不足 | CAST_HEAL が MP不足 → 次のルールへ |
| フォールスルー：対象不在 | ALLY_DEAD → 蘇生 だが死者ゼロ → スキップ |
| MATCH の解決（味方系・低い） | ALLY_HP_LT で複数該当 → HP%最低の1人が選ばれる |
| MATCH の解決（味方系・高い） | ALLY_HP_GTE で複数該当 → HP%最高の1人が選ばれる |
| MATCH の解決（敵系） | ENEMY_LOWEST_HP → HP実数最低の1体が選ばれる |
| MATCH の解決（最高HP） | ENEMY_HIGHEST_HP → HP実数最高の1体が選ばれる |
| MATCH 不可整合 | SELF_HP_LT + ENEMY_MATCH → バリデーションでブロック |
| 範囲魔法 | ENEMY_MATCH に範囲魔法 → 周囲も巻き込む |
| 全不成立 | 戦闘終了直後（敵ゼロ）でどのルールも成立しない → null（待機） |
| 無効化トグル | enabled:false のルールは評価されない |
| ボス検出 | BOSS_PRESENT は通常敵では真にならない、ボス出現で真 |

決定性は重要：**戦闘内で乱数を使う箇所**（ダメージ揺れなど）はあるが、ガンビット評価器自体は**乱数を使わない**（v0.2 で RANDOM 条件を削除したため）。

---

## 12. v1.0 で扱わないこと（v1.1+ バックログ）

- OR 結合、NOT 結合、条件の入れ子（`(A AND B) OR C`）
- HP/MP の閾値による敵条件（旧 `ENEMY_HP_LT/GT`）
- ターン経過・残数・生存数などの戦況条件（旧 `TURN_*` / `*_COUNT_GTE`）
- メタ条件全般（`ALWAYS` / `RANDOM` / `CAN_AFFORD` / `SELF_LAST_ACTION_FAILED`）
- 過去ターン参照（「3ターン前に〜した」）
- 位置・隊形・距離の概念
- ヘイト数値の直接参照
- 複数ターンにまたがるアクションシーケンス
- ノードベース編集UI
- ガンビット間の干渉（A の行動を見て B が選ぶ）の高度な表現
- カスタム条件のスクリプト化（ユーザー記述 JS など）

> 上記はすべて魅力的だが、**v1.0 凍結ライン**を超える。提案として上がっても v1.1 バックログ送り。

---

## 13. 用語集

| 用語 | 定義 |
| --- | --- |
| ガンビット | 1つの条件→対象→行動ルール |
| ガンビットセット | 1キャラ分のルール列（最大8） |
| MATCH | 条件が真にした候補集合のうち、規定の選択則で選ばれた1体 |
| フォールスルー | あるルールが実行不能で、次のルールに評価が進むこと |
| フォールバック | ガンビットセット最下段に置く、汎用な手番（v1.0 では `ENEMY_EXISTS → ENEMY_MATCH → ATTACK` がイディオム） |

---

## 14. 変更履歴

| 版 | 日付 | 内容 |
| --- | --- | --- |
| v0.1 | 2026-05-04 | 初版（条件25・行動15・対象6） |
| v0.2 | 2026-05-04 | 条件を 25→17 に絞り込み。`ENEMY_HP_LT/GT` を `ENEMY_LOWEST_HP/HIGHEST_HP` の選択則条件に置換。戦況系（ターン・残数）を削除し `BOSS_PRESENT` のみ残す。メタ系（ALWAYS/RANDOM/CAN_AFFORD/SELF_LAST_ACTION_FAILED）を全削除。フォールバックは `ENEMY_EXISTS` で代替。schemaVersion を 2 に。 |
| v0.3 | 2026-05-04 | HP/MP の「以上」条件 `SELF_HP_GTE`, `SELF_MP_GTE`, `ALLY_HP_GTE`, `ALLY_MP_GTE` の4種を追加。条件総数 17→21。バフ条件付与（健全な味方への先撃ち）や MP 余裕時の積極行動を表現可能に。schemaVersion は 2 のまま（型は union 拡張のみで後方互換）。 |
| v0.3.1 | 2026-05-10 | §3.1.1 を追加：`ALLY_*` 条件は actor 自身を含み、`ENEMY_*` は actor の敵陣営を指すと明文化。評価器実装時の解釈ブレを防ぐため。 |

---

*次の関連ドキュメント候補：*
- *`data_schema.md` … ジョブ・装備・敵・アイテムのデータテーブル定義*
- *`battle_system_spec.md` … ATB / ダメージ計算 / 命中等の戦闘ルール*
- *`m1_checklist.md` … M1 完了チェックリスト（このDSLの最小実装が含まれる）*
