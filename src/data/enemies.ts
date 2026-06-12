/**
 * 敵テンプレと敵ユニットの生成
 *
 * - M1: 3 種類（GOBLIN 弱／WOLF 普通／BANDIT 強）。ボスなし。
 * - M2-B: 追加 2 種（SKELETON / GOLEM）＋ボス 1 体（GOBLIN_KING）。
 * - M3-F: 通常敵 +10 種（合計 15）、ボス +3 種（合計 4）、`resistances` フィールド追加。
 *   バランス値は v0.3 仮置き。M3-G でラフな調整、battle_system_spec.md で正式化は M4。
 */

import type { Element, EnemyType, GambitSet } from "../gambit/types";
import type { Unit } from "../battle/types";

export interface EnemyTemplate {
  displayName: string;
  enemyType: EnemyType;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  mag: number;
  weaknesses: Element[];
  /**
   * 耐性属性（被ダメ 0.5x）。物理半減は `["NEUTRAL"]` で表す。
   * 省略時は `[]`（耐性なし）。
   */
  resistances?: Element[];
  /** ボス級フラグ。デフォルトは false（指定省略時に通常敵扱い） */
  isBoss?: boolean;
}

/** ゴブリン：弱い前衛。火が弱点 */
export const GOBLIN: EnemyTemplate = {
  displayName: "ゴブリン",
  enemyType: "HUMANOID",
  hp: 30,
  mp: 0,
  atk: 12,
  def: 3,
  mag: 0,
  weaknesses: ["FIRE"],
};

/** ウルフ：普通の獣。雷が弱点 */
export const WOLF: EnemyTemplate = {
  displayName: "ウルフ",
  enemyType: "BEAST",
  hp: 60,
  mp: 0,
  atk: 18,
  def: 8,
  mag: 0,
  weaknesses: ["THUNDER"],
};

/** バンディット：強めの人間。氷が弱点 */
export const BANDIT: EnemyTemplate = {
  displayName: "バンディット",
  enemyType: "HUMANOID",
  hp: 100,
  mp: 10,
  atk: 22,
  def: 12,
  mag: 5,
  weaknesses: ["ICE"],
};

/** スケルトン：不死系。聖が弱点 */
export const SKELETON: EnemyTemplate = {
  displayName: "スケルトン",
  enemyType: "UNDEAD",
  hp: 80,
  mp: 0,
  atk: 16,
  def: 6,
  mag: 0,
  weaknesses: ["HOLY"],
};

/** ゴーレム：硬い機械。雷が弱点 */
export const GOLEM: EnemyTemplate = {
  displayName: "ゴーレム",
  enemyType: "MACHINE",
  hp: 150,
  mp: 0,
  atk: 20,
  def: 18,
  mag: 0,
  weaknesses: ["THUNDER"],
};

/** ゴブリン王：ボス。火が弱点 */
export const GOBLIN_KING: EnemyTemplate = {
  displayName: "ゴブリン王",
  enemyType: "BOSS",
  hp: 400,
  mp: 0,
  atk: 30,
  def: 15,
  mag: 0,
  weaknesses: ["FIRE"],
  isBoss: true,
};

// ============================================================================
// M3-F: 通常敵 +10 種
// ============================================================================

/** オーク：強い人間前衛。氷が弱点 */
export const ORC: EnemyTemplate = {
  displayName: "オーク",
  enemyType: "HUMANOID",
  hp: 90,
  mp: 0,
  atk: 22,
  def: 8,
  mag: 0,
  weaknesses: ["ICE"],
};

/** インプ：火の小悪魔。聖が弱点、火属性に耐性 */
export const IMP: EnemyTemplate = {
  displayName: "インプ",
  enemyType: "MAGICAL",
  hp: 50,
  mp: 30,
  atk: 8,
  def: 5,
  mag: 18,
  weaknesses: ["HOLY"],
  resistances: ["FIRE"],
};

/** リッチ：死霊魔導。聖が弱点、闇に耐性 */
export const LICH: EnemyTemplate = {
  displayName: "リッチ",
  enemyType: "UNDEAD",
  hp: 110,
  mp: 50,
  atk: 10,
  def: 8,
  mag: 22,
  weaknesses: ["HOLY"],
  resistances: ["DARK"],
};

/** トロール：高 HP の獣。火が弱点 */
export const TROLL: EnemyTemplate = {
  displayName: "トロール",
  enemyType: "BEAST",
  hp: 200,
  mp: 0,
  atk: 24,
  def: 12,
  mag: 0,
  weaknesses: ["FIRE"],
};

/** ダークナイト：強い闇の戦士。聖が弱点、闇に耐性 */
export const DARK_KNIGHT: EnemyTemplate = {
  displayName: "ダークナイト",
  enemyType: "HUMANOID",
  hp: 140,
  mp: 10,
  atk: 26,
  def: 16,
  mag: 8,
  weaknesses: ["HOLY"],
  resistances: ["DARK"],
};

/** タートル：超防御。雷が弱点、物理半減（NEUTRAL 耐性）*/
export const TURTLE: EnemyTemplate = {
  displayName: "タートル",
  enemyType: "BEAST",
  hp: 180,
  mp: 0,
  atk: 14,
  def: 25,
  mag: 0,
  weaknesses: ["THUNDER"],
  resistances: ["NEUTRAL"],
};

/** スライム：弱小だが物理半減。火が弱点 */
export const SLIME: EnemyTemplate = {
  displayName: "スライム",
  enemyType: "BEAST",
  hp: 70,
  mp: 0,
  atk: 10,
  def: 4,
  mag: 0,
  weaknesses: ["FIRE"],
  resistances: ["NEUTRAL"],
};

/** ファントム：物理半減＋闇耐性の幽霊。聖が弱点 */
export const PHANTOM: EnemyTemplate = {
  displayName: "ファントム",
  enemyType: "UNDEAD",
  hp: 90,
  mp: 20,
  atk: 18,
  def: 6,
  mag: 10,
  weaknesses: ["HOLY"],
  resistances: ["NEUTRAL", "DARK"],
};

/** ハーピー：飛行獣。雷が弱点 */
export const HARPY: EnemyTemplate = {
  displayName: "ハーピー",
  enemyType: "BEAST",
  hp: 75,
  mp: 0,
  atk: 20,
  def: 6,
  mag: 0,
  weaknesses: ["THUNDER"],
};

/** 魔王の眷属：高位 MAGICAL。聖が弱点、闇に耐性 */
export const DEMON_LORD_MINION: EnemyTemplate = {
  displayName: "魔王の眷属",
  enemyType: "MAGICAL",
  hp: 130,
  mp: 40,
  atk: 22,
  def: 14,
  mag: 18,
  weaknesses: ["HOLY"],
  resistances: ["DARK"],
};

// ============================================================================
// M3-F: ボス +3 種
// ============================================================================

/**
 * 暗黒竜：深度 10 のボス。聖が弱点、闇に耐性。
 * M3-G で上方修正（装備フルなら勝利、装備なしは詰む難度に調整）。
 */
export const DARK_DRAGON: EnemyTemplate = {
  displayName: "暗黒竜",
  enemyType: "BOSS",
  hp: 1300,
  mp: 30,
  atk: 48,
  def: 30,
  mag: 24,
  weaknesses: ["HOLY"],
  resistances: ["DARK"],
  isBoss: true,
};

/**
 * ネクロマンサー：深度 15 のボス。聖が弱点、闇に耐性。
 * M3-G で上方修正（DARK_DRAGON より一段上の手応え）。
 */
export const NECROMANCER: EnemyTemplate = {
  displayName: "ネクロマンサー",
  enemyType: "BOSS",
  hp: 1700,
  mp: 80,
  atk: 38,
  def: 26,
  mag: 42,
  weaknesses: ["HOLY"],
  resistances: ["DARK"],
  isBoss: true,
};

/**
 * 魔王：深度 20 のラスボス。聖が弱点、闇と物理に耐性。
 * M3-G で大幅上方修正（標準ラスボス想定：装備フル＋最適ガンビットでも 15-25 ターン要する）。
 */
export const DEMON_LORD: EnemyTemplate = {
  displayName: "魔王",
  enemyType: "BOSS",
  hp: 2500,
  mp: 100,
  atk: 54,
  def: 35,
  mag: 40,
  weaknesses: ["HOLY"],
  resistances: ["DARK", "NEUTRAL"],
  isBoss: true,
};

/** 全敵テンプレを 1 つにまとめたエントリ */
export const ALL_ENEMIES = {
  // M1〜M2
  GOBLIN,
  WOLF,
  BANDIT,
  SKELETON,
  GOLEM,
  GOBLIN_KING,
  // M3-F 通常敵
  ORC,
  IMP,
  LICH,
  TROLL,
  DARK_KNIGHT,
  TURTLE,
  SLIME,
  PHANTOM,
  HARPY,
  DEMON_LORD_MINION,
  // M3-F ボス
  DARK_DRAGON,
  NECROMANCER,
  DEMON_LORD,
} as const satisfies Record<string, EnemyTemplate>;

/**
 * 敵 Unit を作る。
 * 各テンプレからパラメータを引き継ぎつつ、id とガンビットセットを差し込む。
 */
export function createEnemy(
  template: EnemyTemplate,
  id: string,
  gambitSet: GambitSet,
  overrides: Partial<Unit> = {},
): Unit {
  return {
    id,
    name: template.displayName,
    jobId: "SWORDSMAN", // 敵にもジョブ値を持たせる必要があるため、暫定で SWORDSMAN を借りる（M2 で見直し）
    hp: template.hp,
    hpMax: template.hp,
    mp: template.mp,
    mpMax: template.mp,
    atk: template.atk,
    def: template.def,
    mag: template.mag,
    statuses: [],
    statusDurations: {},
    isAlly: false,
    isAlive: true,
    weaknesses: [...template.weaknesses],
    resistances: [...(template.resistances ?? [])],
    enemyType: template.enemyType,
    isBoss: template.isBoss ?? false,
    gambitSet,
    inventory: {},
    equipment: {},
    ...overrides,
  };
}
