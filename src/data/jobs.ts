/**
 * ジョブテンプレと味方ユニットの生成
 *
 * - M1: 剣士（SWORDSMAN）
 * - M2-B: 魔導士（MAGE）／治癒士（HEALER）を追加
 * - バランス値は M2 仮置き。M3 以降に data_schema.md で正式化
 */

import type { GambitSet } from "../gambit/types";
import type { JobId, Unit } from "../battle/types";

export interface JobTemplate {
  jobId: JobId;
  displayName: string;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  mag: number;
}

/** 剣士：物理前衛。HP 高め・MP 控えめ・atk 中程度・def 高め */
export const SWORDSMAN: JobTemplate = {
  jobId: "SWORDSMAN",
  displayName: "剣士",
  hp: 200,
  mp: 30,
  atk: 25,
  def: 15,
  mag: 5,
};

/** 魔導士：火力役。HP 低め・MP 高・atk 低・mag 高・def 低 */
export const MAGE: JobTemplate = {
  jobId: "MAGE",
  displayName: "魔導士",
  hp: 120,
  mp: 80,
  atk: 8,
  def: 8,
  mag: 25,
};

/** 治癒士：回復役。HP 中・MP 高・atk 低・mag 中・def 中 */
export const HEALER: JobTemplate = {
  jobId: "HEALER",
  displayName: "治癒士",
  hp: 150,
  mp: 80,
  atk: 8,
  def: 12,
  mag: 18,
};

/** v1.0 で実装する全ジョブテンプレを 1 つにまとめたエントリ */
export const ALL_JOBS = {
  SWORDSMAN,
  MAGE,
  HEALER,
} as const satisfies Record<JobId, JobTemplate>;

/**
 * 任意のジョブテンプレから味方 Unit を作る共通ヘルパ。
 *
 * - `inventory` のデフォルトは POTION 3 個（M2 までの想定）
 * - 個別調整は `overrides` で
 */
export function createPartyMember(
  template: JobTemplate,
  id: string,
  name: string,
  gambitSet: GambitSet,
  overrides: Partial<Unit> = {},
): Unit {
  return {
    id,
    name,
    jobId: template.jobId,
    hp: template.hp,
    hpMax: template.hp,
    mp: template.mp,
    mpMax: template.mp,
    atk: template.atk,
    def: template.def,
    mag: template.mag,
    statuses: [],
    statusDurations: {},
    isAlly: true,
    isAlive: true,
    weaknesses: [],
    enemyType: "HUMANOID",
    isBoss: false,
    gambitSet,
    inventory: { POTION: 3 },
    equipment: {},
    ...overrides,
  };
}

/** 剣士 Unit を作る */
export function createSwordsman(
  id: string,
  name: string,
  gambitSet: GambitSet,
  overrides: Partial<Unit> = {},
): Unit {
  return createPartyMember(SWORDSMAN, id, name, gambitSet, overrides);
}

/** 魔導士 Unit を作る */
export function createMage(
  id: string,
  name: string,
  gambitSet: GambitSet,
  overrides: Partial<Unit> = {},
): Unit {
  return createPartyMember(MAGE, id, name, gambitSet, overrides);
}

/** 治癒士 Unit を作る */
export function createHealer(
  id: string,
  name: string,
  gambitSet: GambitSet,
  overrides: Partial<Unit> = {},
): Unit {
  return createPartyMember(HEALER, id, name, gambitSet, overrides);
}
