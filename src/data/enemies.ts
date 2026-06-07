/**
 * 敵テンプレと敵ユニットの生成
 *
 * - M1: 3 種類（GOBLIN 弱／WOLF 普通／BANDIT 強）。ボスなし。
 * - M2-B: 追加 2 種（SKELETON / GOLEM）＋ボス 1 体（GOBLIN_KING）。
 * - バランス値は仮置き。M3 で 15〜20 種に拡張予定。
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

/** 全敵テンプレを 1 つにまとめたエントリ */
export const ALL_ENEMIES = {
  GOBLIN,
  WOLF,
  BANDIT,
  SKELETON,
  GOLEM,
  GOBLIN_KING,
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
    enemyType: template.enemyType,
    isBoss: template.isBoss ?? false,
    gambitSet,
    inventory: {},
    ...overrides,
  };
}
