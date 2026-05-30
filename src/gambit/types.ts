/**
 * ガンビット DSL v0.3 の型定義
 *
 * - 仕様書: docs/gambit_dsl_spec.md
 * - 条件: 21 種、対象: 6 種、行動: 15 種
 * - 列挙値は配列の `as const` から型を導出することで、
 *   ランタイム検証（バリデータ・UI）と型チェックの両方で使えるようにする。
 */

// ============================================================================
// 列挙値（v1.0 で固定。追加は v1.1 以降）
// ============================================================================

/** 状態異常・バフ／デバフの統合タグ（DSL §3.5）*/
export const STATUSES = [
  // 状態異常
  "POISON",
  "BLIND",
  "SILENCE",
  "SLEEP",
  "STUN",
  "BERSERK",
  // バフ
  "BUFF_ATK",
  "BUFF_DEF",
  "BUFF_MAG",
  "REGEN",
  "SHELL",
  "PROTECT",
] as const;
export type Status = (typeof STATUSES)[number];

/** 属性（DSL §3.5）*/
export const ELEMENTS = ["FIRE", "ICE", "THUNDER", "HOLY", "DARK", "NEUTRAL"] as const;
export type Element = (typeof ELEMENTS)[number];

/** 敵種族（DSL §3.5）*/
export const ENEMY_TYPES = [
  "HUMANOID",
  "BEAST",
  "UNDEAD",
  "MACHINE",
  "MAGICAL",
  "BOSS",
] as const;
export type EnemyType = (typeof ENEMY_TYPES)[number];

// ============================================================================
// コンテンツ ID（v1.0 で 31 種類。追加は v1.1 以降）
// ============================================================================

/** 剣士のジョブスキル（DSL §4.3）*/
export const SKILL_IDS = ["POWER_SLASH", "GUARD_BREAK", "WHIRLWIND"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

/** 攻撃魔法（魔導士、DSL §4.3）*/
export const OFFENSE_SPELL_IDS = [
  "FIRE",
  "FIRA",
  "BLIZZARD",
  "BLIZZARA",
  "THUNDER",
  "THUNDARA",
  "HOLY_BOLT",
  "DARK_BOLT",
] as const;
export type OffenseSpellId = (typeof OFFENSE_SPELL_IDS)[number];

/** 回復魔法（治癒士、DSL §4.3）*/
export const HEAL_SPELL_IDS = ["CURE", "CURA", "CURAGA", "CURE_ALL"] as const;
export type HealSpellId = (typeof HEAL_SPELL_IDS)[number];

/** 蘇生魔法（治癒士、DSL §4.3）*/
export const REVIVE_SPELL_IDS = ["RAISE"] as const;
export type ReviveSpellId = (typeof REVIVE_SPELL_IDS)[number];

/** 補助魔法（治癒士、DSL §4.3）
 *
 * 注：HASTE は Status 列挙には含まれない（DSL 仕様書のメモ参照）。
 * 実効果実装時に Status の拡張 or HASTE 用の別ステートを検討する。
 */
export const BUFF_IDS = ["PROTECT", "SHELL", "REGEN", "HASTE"] as const;
export type BuffId = (typeof BUFF_IDS)[number];

/** 妨害魔法（魔導士、DSL §4.3）
 *
 * 注：SLOW は Status 列挙には含まれない。BUFF_ID の HASTE と同じ扱い。
 */
export const DEBUFF_IDS = ["POISON", "SILENCE", "BLIND", "SLOW"] as const;
export type DebuffId = (typeof DEBUFF_IDS)[number];

/** アイテム（全ジョブ、DSL §4.3）*/
export const ITEM_IDS = [
  "POTION",
  "HI_POTION",
  "ETHER",
  "ANTIDOTE",
  "EYE_DROPS",
  "ECHO_HERB",
  "PHOENIX_DOWN",
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

// ============================================================================
// 条件（Condition） ― 全 21 種（DSL §3.2）
// ============================================================================

/** 自身に関する条件（6 種）*/
export type SelfCondition =
  | { type: "SELF_HP_LT"; value: number } //  1. 自分のHPが N% 未満
  | { type: "SELF_HP_GTE"; value: number } //  2. 自分のHPが N% 以上
  | { type: "SELF_MP_LT"; value: number } //  3. 自分のMPが N% 未満
  | { type: "SELF_MP_GTE"; value: number } //  4. 自分のMPが N% 以上
  | { type: "SELF_HAS_STATUS"; status: Status } //  5. 自分が状態 X
  | { type: "SELF_NO_STATUS"; status: Status }; //  6. 自分が状態 X でない

/** 味方に関する条件（7 種）*/
export type AllyCondition =
  | { type: "ALLY_HP_LT"; value: number } //  7. 味方の誰かが HP N% 未満
  | { type: "ALLY_HP_GTE"; value: number } //  8. 味方の誰かが HP N% 以上
  | { type: "ALLY_MP_LT"; value: number } //  9. 味方の誰かが MP N% 未満
  | { type: "ALLY_MP_GTE"; value: number } // 10. 味方の誰かが MP N% 以上
  | { type: "ALLY_HAS_STATUS"; status: Status } // 11. 味方の誰かが状態 X
  | { type: "ALLY_DEAD" } // 12. 味方が戦闘不能
  | { type: "ALLY_TARGETED" }; // 13. 味方が敵に狙われている

/** 敵に関する条件（7 種）*/
export type EnemyCondition =
  | { type: "ENEMY_EXISTS" } // 14. 敵が存在する（フォールバック用）
  | { type: "ENEMY_LOWEST_HP" } // 15. 最も HP が少ない敵
  | { type: "ENEMY_HIGHEST_HP" } // 16. 最も HP が多い敵
  | { type: "ENEMY_HAS_STATUS"; status: Status } // 17. 敵が状態 X
  | { type: "ENEMY_NO_STATUS"; status: Status } // 18. 敵が状態 X でない
  | { type: "ENEMY_WEAK_TO"; element: Element } // 19. 敵が属性 X に弱い
  | { type: "ENEMY_TYPE"; enemyType: EnemyType }; // 20. 敵の種族が X

/** 戦況条件（1 種）*/
export type BattleCondition = { type: "BOSS_PRESENT" }; // 21. ボスが存在する

/** 条件全体（合計 21 種）*/
export type Condition = SelfCondition | AllyCondition | EnemyCondition | BattleCondition;

/** Condition 識別子の集合（バリデーション用）*/
export const CONDITION_TYPES = [
  // self
  "SELF_HP_LT",
  "SELF_HP_GTE",
  "SELF_MP_LT",
  "SELF_MP_GTE",
  "SELF_HAS_STATUS",
  "SELF_NO_STATUS",
  // ally
  "ALLY_HP_LT",
  "ALLY_HP_GTE",
  "ALLY_MP_LT",
  "ALLY_MP_GTE",
  "ALLY_HAS_STATUS",
  "ALLY_DEAD",
  "ALLY_TARGETED",
  // enemy
  "ENEMY_EXISTS",
  "ENEMY_LOWEST_HP",
  "ENEMY_HIGHEST_HP",
  "ENEMY_HAS_STATUS",
  "ENEMY_NO_STATUS",
  "ENEMY_WEAK_TO",
  "ENEMY_TYPE",
  // battle
  "BOSS_PRESENT",
] as const;
export type ConditionType = (typeof CONDITION_TYPES)[number];

// ============================================================================
// 対象（Target） ― 全 6 種（DSL §5）
// ============================================================================

export type Target =
  | { type: "SELF" } //  1. 自分
  | { type: "ALLY_MATCH" } //  2. 条件にマッチした味方
  | { type: "ALLY_LOWEST_HP" } //  3. HP%最低の味方
  | { type: "ALLY_ALL" } //  4. 味方全員
  | { type: "ENEMY_MATCH" } //  5. 条件にマッチした敵
  | { type: "ENEMY_ALL" }; //  6. 敵全員

export const TARGET_TYPES = [
  "SELF",
  "ALLY_MATCH",
  "ALLY_LOWEST_HP",
  "ALLY_ALL",
  "ENEMY_MATCH",
  "ENEMY_ALL",
] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

// ============================================================================
// 行動（Action） ― 全 15 種（DSL §4.2）
// ============================================================================

/** 戦闘基本（4 種）*/
export type BasicAction =
  | { type: "ATTACK" } //  1. 通常攻撃
  | { type: "SKILL"; skillId: SkillId } //  2. ジョブスキル
  | { type: "CHARGE" } //  3. 溜め
  | { type: "CHAIN" }; //  4. 連携

/** 魔法（5 種）*/
export type MagicAction =
  | { type: "CAST_OFFENSE"; spellId: OffenseSpellId } //  5. 攻撃魔法
  | { type: "CAST_HEAL"; spellId: HealSpellId } //  6. 回復魔法
  | { type: "CAST_REVIVE"; spellId: ReviveSpellId } //  7. 蘇生魔法
  | { type: "CAST_BUFF"; buffId: BuffId } //  8. 補助魔法
  | { type: "CAST_DEBUFF"; debuffId: DebuffId }; //  9. 妨害魔法

/** 状態管理（1 種）*/
export type StatusAction = { type: "CAST_CURE_STATUS"; status: Status }; // 10. 状態回復魔法

/** アイテム（1 種）*/
export type ItemAction = { type: "USE_ITEM"; itemId: ItemId }; // 11. アイテム使用

/** 戦術（4 種）*/
export type TacticalAction =
  | { type: "DEFEND" } // 12. 防御
  | { type: "WAIT" } // 13. 待機
  | { type: "PROVOKE" } // 14. 挑発
  | { type: "INTERPOSE" }; // 15. かばう

/** 行動全体（合計 15 種）*/
export type Action = BasicAction | MagicAction | StatusAction | ItemAction | TacticalAction;

export const ACTION_TYPES = [
  // basic
  "ATTACK",
  "SKILL",
  "CHARGE",
  "CHAIN",
  // magic
  "CAST_OFFENSE",
  "CAST_HEAL",
  "CAST_REVIVE",
  "CAST_BUFF",
  "CAST_DEBUFF",
  // status
  "CAST_CURE_STATUS",
  // item
  "USE_ITEM",
  // tactical
  "DEFEND",
  "WAIT",
  "PROVOKE",
  "INTERPOSE",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

// ============================================================================
// ガンビットルール／ガンビットセット（DSL §2 / §6）
// ============================================================================

/** スキーマバージョン。
 *
 * - v0.2 仕様: 1
 * - v0.3 仕様: 2（型 union 拡張のみで後方互換）
 */
export const GAMBIT_SCHEMA_VERSION = 2 as const;

/** ガンビットの 1 ルール = 条件 → 対象 → 行動 */
export interface GambitRule {
  /** ルールの内部 ID（並べ替えや無効化トグルの参照用）*/
  id: string;
  /** 無効化トグル。false なら評価時にスキップされる */
  enabled: boolean;
  condition: Condition;
  target: Target;
  action: Action;
}

/** 1 キャラ分のガンビットセット */
export interface GambitSet {
  schemaVersion: typeof GAMBIT_SCHEMA_VERSION;
  characterId: string;
  /** 優先度順（上から下）。最大 8 要素 */
  rules: GambitRule[];
}

/** 1 ガンビットセットあたりの最大ルール数（DSL §2.2）*/
export const MAX_RULES_PER_SET = 8 as const;

// ============================================================================
// 関連定数（数値範囲などの制約値）
// ============================================================================

/** HP%/MP% 系条件の引数として許容する範囲（DSL §9.1）*/
export const PERCENT_MIN = 0;
export const PERCENT_MAX = 100;
