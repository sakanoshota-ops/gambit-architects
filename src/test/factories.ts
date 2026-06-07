/**
 * テスト用ファクトリ
 *
 * - Unit / BattleState / GambitRule / GambitSet を最小手数で作るヘルパ集
 * - すべてオーバーライド可能：基本値を与えつつ、テストごとに必要なフィールドだけ差し替える
 */

import type { BattleState, Unit } from "../battle/types";
import type {
  Action,
  Condition,
  GambitRule,
  GambitSet,
  Target,
} from "../gambit/types";
import { GAMBIT_SCHEMA_VERSION } from "../gambit/types";

/** GambitRule をワンライナーで作る */
export function makeRule(
  id: string,
  condition: Condition,
  target: Target,
  action: Action,
  enabled = true,
): GambitRule {
  return { id, enabled, condition, target, action };
}

/** GambitSet をワンライナーで作る */
export function makeGambitSet(characterId: string, rules: GambitRule[]): GambitSet {
  return {
    schemaVersion: GAMBIT_SCHEMA_VERSION,
    characterId,
    rules,
  };
}

/** ルールなしの空ガンビットセット（全ルール不成立シナリオなどで使う）*/
export function emptyGambitSet(characterId: string): GambitSet {
  return makeGambitSet(characterId, []);
}

type UnitOverrides = Partial<Unit> & Pick<Unit, "id" | "isAlly" | "gambitSet">;

/**
 * Unit を作る。`id` / `isAlly` / `gambitSet` だけは必須、残りはデフォルトで埋める。
 * 個別テストで差し替えたい値だけオーバーライドする想定。
 */
export function makeUnit(overrides: UnitOverrides): Unit {
  const base: Unit = {
    id: overrides.id,
    name: overrides.id, // 表示名はデフォルトで id と同じ
    jobId: "SWORDSMAN",
    hp: 100,
    hpMax: 100,
    mp: 50,
    mpMax: 50,
    atk: 10,
    def: 5,
    mag: 5,
    statuses: [],
    statusDurations: {},
    isAlly: overrides.isAlly,
    isAlive: true,
    weaknesses: [],
    enemyType: overrides.isAlly ? "HUMANOID" : "BEAST",
    isBoss: false,
    gambitSet: overrides.gambitSet,
    inventory: {},
  };
  return { ...base, ...overrides };
}

/** 味方ユニットを作る（jobId/HP/MP はオーバーライド可能） */
export function makeAlly(
  id: string,
  gambitSet: GambitSet,
  overrides: Partial<Unit> = {},
): Unit {
  return makeUnit({ id, isAlly: true, gambitSet, ...overrides });
}

/** 敵ユニットを作る */
export function makeEnemy(
  id: string,
  gambitSet: GambitSet,
  overrides: Partial<Unit> = {},
): Unit {
  return makeUnit({ id, isAlly: false, gambitSet, ...overrides });
}

/** BattleState を作る */
export function makeBattle(
  allies: Unit[],
  enemies: Unit[],
  overrides: Partial<BattleState> = {},
): BattleState {
  return {
    turn: 1,
    allies,
    enemies,
    log: [],
    targetedAllyIds: [],
    defendingThisTurn: new Set<string>(),
    ...overrides,
  };
}
