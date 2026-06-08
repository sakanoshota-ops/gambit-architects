/**
 * 装備テンプレ（M3-C）
 *
 * - 武器：剣／ロッド／メイスの 3 系統 x 3 段階 = 9 種
 * - 防具：重装／軽装／中装の 3 系統 x 3 段階 = 9 種
 * - センサー：4 種（条件可視化、効果は M3-E で評価器に組み込み）
 *
 * - ジョブ制限は `jobs` フィールドに記載（UI で参照、M3-D 実装）
 * - センサーの `enables` は M3-E で評価器が読む
 */

import type { JobId } from "../battle/types";
import type { ConditionType } from "../gambit/types";

// ============================================================================
// 共通型
// ============================================================================

/** 装備によるステータスボーナス */
export interface StatBonus {
  atk?: number;
  def?: number;
  mag?: number;
}

// ============================================================================
// 武器
// ============================================================================

export const WEAPON_IDS = [
  // 剣（剣士）
  "BRONZE_SWORD",
  "IRON_SWORD",
  "STEEL_SWORD",
  // ロッド（魔導士）
  "MAGE_ROD",
  "FIRE_STAFF",
  "CRYSTAL_STAFF",
  // メイス（治癒士）
  "HEALER_MACE",
  "BLESSED_MACE",
  "ANCIENT_MACE",
] as const;
export type WeaponId = (typeof WEAPON_IDS)[number];

export interface WeaponTemplate {
  id: WeaponId;
  displayName: string;
  bonus: StatBonus;
  /** 装備可能ジョブ（未指定なら全ジョブ可）*/
  jobs?: JobId[];
}

export const WEAPONS: Record<WeaponId, WeaponTemplate> = {
  // 剣士向け
  BRONZE_SWORD: {
    id: "BRONZE_SWORD",
    displayName: "ブロンズソード",
    bonus: { atk: 5 },
    jobs: ["SWORDSMAN"],
  },
  IRON_SWORD: {
    id: "IRON_SWORD",
    displayName: "アイアンソード",
    bonus: { atk: 10 },
    jobs: ["SWORDSMAN"],
  },
  STEEL_SWORD: {
    id: "STEEL_SWORD",
    displayName: "スティールソード",
    bonus: { atk: 15 },
    jobs: ["SWORDSMAN"],
  },
  // 魔導士向け
  MAGE_ROD: {
    id: "MAGE_ROD",
    displayName: "魔導士のロッド",
    bonus: { atk: 3, mag: 5 },
    jobs: ["MAGE"],
  },
  FIRE_STAFF: {
    id: "FIRE_STAFF",
    displayName: "火炎の杖",
    bonus: { atk: 5, mag: 8 },
    jobs: ["MAGE"],
  },
  CRYSTAL_STAFF: {
    id: "CRYSTAL_STAFF",
    displayName: "クリスタルスタッフ",
    bonus: { atk: 7, mag: 12 },
    jobs: ["MAGE"],
  },
  // 治癒士向け
  HEALER_MACE: {
    id: "HEALER_MACE",
    displayName: "治癒のメイス",
    bonus: { atk: 5, mag: 5 },
    jobs: ["HEALER"],
  },
  BLESSED_MACE: {
    id: "BLESSED_MACE",
    displayName: "祝福のメイス",
    bonus: { atk: 8, mag: 8 },
    jobs: ["HEALER"],
  },
  ANCIENT_MACE: {
    id: "ANCIENT_MACE",
    displayName: "古代のメイス",
    bonus: { atk: 10, mag: 12 },
    jobs: ["HEALER"],
  },
};

// ============================================================================
// 防具
// ============================================================================

export const ARMOR_IDS = [
  // 重装（剣士）
  "LEATHER_ARMOR",
  "CHAIN_MAIL",
  "PLATE_MAIL",
  // 軽装（魔導士）
  "MAGE_ROBE",
  "WIZARD_CLOAK",
  "ARCHWIZARD_ROBE",
  // 中装（治癒士）
  "PRIEST_VEST",
  "BISHOP_ROBE",
  "CARDINAL_GARB",
] as const;
export type ArmorId = (typeof ARMOR_IDS)[number];

export interface ArmorTemplate {
  id: ArmorId;
  displayName: string;
  bonus: StatBonus;
  jobs?: JobId[];
}

export const ARMORS: Record<ArmorId, ArmorTemplate> = {
  LEATHER_ARMOR: {
    id: "LEATHER_ARMOR",
    displayName: "レザーアーマー",
    bonus: { def: 5 },
    jobs: ["SWORDSMAN"],
  },
  CHAIN_MAIL: {
    id: "CHAIN_MAIL",
    displayName: "チェインメイル",
    bonus: { def: 10 },
    jobs: ["SWORDSMAN"],
  },
  PLATE_MAIL: {
    id: "PLATE_MAIL",
    displayName: "プレートメイル",
    bonus: { def: 15 },
    jobs: ["SWORDSMAN"],
  },
  MAGE_ROBE: {
    id: "MAGE_ROBE",
    displayName: "魔導士のローブ",
    bonus: { def: 3, mag: 3 },
    jobs: ["MAGE"],
  },
  WIZARD_CLOAK: {
    id: "WIZARD_CLOAK",
    displayName: "ウィザードクローク",
    bonus: { def: 6, mag: 5 },
    jobs: ["MAGE"],
  },
  ARCHWIZARD_ROBE: {
    id: "ARCHWIZARD_ROBE",
    displayName: "大魔導士のローブ",
    bonus: { def: 8, mag: 8 },
    jobs: ["MAGE"],
  },
  PRIEST_VEST: {
    id: "PRIEST_VEST",
    displayName: "司祭の祭服",
    bonus: { def: 5, mag: 3 },
    jobs: ["HEALER"],
  },
  BISHOP_ROBE: {
    id: "BISHOP_ROBE",
    displayName: "司教のローブ",
    bonus: { def: 8, mag: 5 },
    jobs: ["HEALER"],
  },
  CARDINAL_GARB: {
    id: "CARDINAL_GARB",
    displayName: "枢機卿の法衣",
    bonus: { def: 12, mag: 8 },
    jobs: ["HEALER"],
  },
};

// ============================================================================
// センサー（M3-E で評価器が読む）
// ============================================================================

export const SENSOR_IDS = [
  "HP_SCANNER",
  "STATUS_DETECTOR",
  "ELEMENT_ANALYZER",
  "BASIC_SCANNER",
] as const;
export type SensorId = (typeof SENSOR_IDS)[number];

export interface SensorTemplate {
  id: SensorId;
  displayName: string;
  /** このセンサーが「100% 成功にする」条件タイプ */
  enables: ConditionType[];
}

export const SENSORS: Record<SensorId, SensorTemplate> = {
  HP_SCANNER: {
    id: "HP_SCANNER",
    displayName: "HP スキャナー",
    enables: [
      "ENEMY_LOWEST_HP",
      "ENEMY_HIGHEST_HP",
      "ALLY_HP_LT",
      "ALLY_HP_GTE",
    ],
  },
  STATUS_DETECTOR: {
    id: "STATUS_DETECTOR",
    displayName: "状態検知センサー",
    enables: [
      "ENEMY_HAS_STATUS",
      "ENEMY_NO_STATUS",
      "ALLY_HAS_STATUS",
    ],
  },
  ELEMENT_ANALYZER: {
    id: "ELEMENT_ANALYZER",
    displayName: "属性アナライザー",
    enables: ["ENEMY_WEAK_TO", "ENEMY_TYPE"],
  },
  BASIC_SCANNER: {
    id: "BASIC_SCANNER",
    displayName: "基礎スキャナー",
    enables: [
      // HP と状態の両方を簡易にカバー（初期装備候補）
      "ENEMY_LOWEST_HP",
      "ENEMY_HIGHEST_HP",
      "ENEMY_HAS_STATUS",
      "ENEMY_NO_STATUS",
    ],
  },
};

// ============================================================================
// Equipment（Unit に持たせる）
// ============================================================================

export interface Equipment {
  weapon?: WeaponId;
  armor?: ArmorId;
  sensor?: SensorId;
}

// ============================================================================
// 実効ステータス計算（applyAction から使う）
// ============================================================================

import type { Unit } from "../battle/types";

/** 装備込みの実効 atk を返す */
export function getEffectiveAtk(unit: Unit): number {
  return unit.atk + bonusOf(unit, "atk");
}

/** 装備込みの実効 def を返す */
export function getEffectiveDef(unit: Unit): number {
  return unit.def + bonusOf(unit, "def");
}

/** 装備込みの実効 mag を返す */
export function getEffectiveMag(unit: Unit): number {
  return unit.mag + bonusOf(unit, "mag");
}

function bonusOf(unit: Unit, stat: keyof StatBonus): number {
  let total = 0;
  if (unit.equipment.weapon) {
    total += WEAPONS[unit.equipment.weapon].bonus[stat] ?? 0;
  }
  if (unit.equipment.armor) {
    total += ARMORS[unit.equipment.armor].bonus[stat] ?? 0;
  }
  return total;
}
