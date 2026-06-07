/**
 * ジョブテンプレと味方ユニットの生成（M1）
 *
 * - M1 で実装するのは剣士（SWORDSMAN）のみ
 * - M2 で魔導士 / 治癒士を追加予定
 * - バランス値は M1 仮置き。M2 以降に data_schema.md で正式化
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

/**
 * 剣士の Unit を作る。
 * 個別調整したい値（POTION の所持数など）は overrides で指定。
 */
export function createSwordsman(
  id: string,
  name: string,
  gambitSet: GambitSet,
  overrides: Partial<Unit> = {},
): Unit {
  return {
    id,
    name,
    jobId: SWORDSMAN.jobId,
    hp: SWORDSMAN.hp,
    hpMax: SWORDSMAN.hp,
    mp: SWORDSMAN.mp,
    mpMax: SWORDSMAN.mp,
    atk: SWORDSMAN.atk,
    def: SWORDSMAN.def,
    mag: SWORDSMAN.mag,
    statuses: [],
    statusDurations: {},
    isAlly: true,
    isAlive: true,
    weaknesses: [],
    enemyType: "HUMANOID",
    isBoss: false,
    gambitSet,
    inventory: { POTION: 3 },
    ...overrides,
  };
}
