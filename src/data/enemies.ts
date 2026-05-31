/**
 * 敵テンプレと敵ユニットの生成（M1）
 *
 * - M1 では 3 種類（弱／普通／強）。ボスなし。
 * - バランス値は仮置き。M3 で 15〜20 種に拡張予定。
 */

import type { GambitSet } from "../gambit/types";
import type { Element, EnemyType, Unit } from "../battle/types";

export interface EnemyTemplate {
  displayName: string;
  enemyType: EnemyType;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  mag: number;
  weaknesses: Element[];
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
    isAlly: false,
    isAlive: true,
    weaknesses: [...template.weaknesses],
    enemyType: template.enemyType,
    isBoss: false,
    gambitSet,
    inventory: {},
    ...overrides,
  };
}
