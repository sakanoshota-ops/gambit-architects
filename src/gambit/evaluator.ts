/**
 * ガンビット評価器（本実装）
 *
 * - 関連仕様: docs/gambit_dsl_spec.md §2.3 / §3 / §5 / §9
 * - 純粋関数。`battle` も `actor` も変更しない。
 * - 副作用ゼロ・乱数不使用なので、同じ入力で必ず同じ出力。
 *
 * 主な責務：
 * 1. ルール列を上から走査
 * 2. 各ルールの条件を評価
 * 3. 条件が真なら対象を解決
 * 4. 行動が実行可能か（MP / アイテム在庫）を確認
 * 5. 最初に通ったルールの決定を返す。何も通らなければ null
 */

import type { BattleState, Unit } from "../battle/types";
import { SENSORS } from "../data/equipment";
import type { Action, Condition, ConditionType, Target } from "./types";
import { getActionMpCost } from "./actionCost";

// ============================================================================
// M3-E：センサー判定
// ============================================================================

/** 全センサーで「100% にしてくれる」条件タイプの集合（事前計算） */
const SENSOR_GATED_CONDITIONS: Set<ConditionType> = new Set(
  Object.values(SENSORS).flatMap((s) => s.enables),
);

/** その条件タイプはセンサーで精度向上できるか */
function isSensorGated(conditionType: ConditionType): boolean {
  return SENSOR_GATED_CONDITIONS.has(conditionType);
}

/** actor が装備しているセンサーが、この条件タイプを 100% にするか */
function actorHasSensorFor(actor: Unit, conditionType: ConditionType): boolean {
  const sensorId = actor.equipment.sensor;
  if (!sensorId) return false;
  return SENSORS[sensorId].enables.includes(conditionType);
}

/**
 * センサーゲート判定：
 *   - ゲート対象外 → 常に true
 *   - ゲート対象 + actor がセンサーを装備 → 常に true
 *   - ゲート対象 + センサー無し + rng 未注入 → true（後方互換、既存テスト保護）
 *   - ゲート対象 + センサー無し + rng < 0.5 → false（フォールスルー）
 *   - ゲート対象 + センサー無し + rng >= 0.5 → true
 */
function senseCheck(
  conditionType: ConditionType,
  actor: Unit,
  battle: BattleState,
): boolean {
  if (!isSensorGated(conditionType)) return true;
  if (actorHasSensorFor(actor, conditionType)) return true;
  const rng = battle.rng;
  if (!rng) return true;
  return rng() >= 0.5;
}

// ============================================================================
// 公開 API
// ============================================================================

/** 評価結果の決定。null は「待機（何もしない）」を意味する */
export interface ActionDecision {
  /** 発火したルールの ID */
  ruleId: string;
  /** 実行する行動 */
  action: Action;
  /** 解決された対象ユニットの ID 列（範囲攻撃は複数、単体は 1 要素）*/
  targetIds: string[];
}

/**
 * `actor` の現在のガンビットセットを評価し、このターンの行動を決定する。
 */
export function decideAction(actor: Unit, battle: BattleState): ActionDecision | null {
  for (const rule of actor.gambitSet.rules) {
    if (!rule.enabled) continue;

    const ctx = evaluateCondition(rule.condition, actor, battle);
    if (!ctx.matched) continue;

    const targets = resolveTarget(rule.target, ctx, actor, battle);
    if (!targets || targets.length === 0) continue;

    if (!canPerform(rule.action, actor)) continue;

    return {
      ruleId: rule.id,
      action: rule.action,
      targetIds: targets.map((u) => u.id),
    };
  }
  return null;
}

// ============================================================================
// 内部：陣営の解釈
// ============================================================================

interface Sides {
  /** 自陣営（actor 自身も含む）*/
  allies: Unit[];
  /** 敵陣営 */
  enemies: Unit[];
}

/**
 * actor から見た陣営を返す。
 * - actor が味方なら allies=battle.allies / enemies=battle.enemies
 * - actor が敵なら反転する
 */
function getSides(actor: Unit, battle: BattleState): Sides {
  if (actor.isAlly) {
    return { allies: battle.allies, enemies: battle.enemies };
  }
  return { allies: battle.enemies, enemies: battle.allies };
}

// ============================================================================
// 内部：数値ヘルパ
// ============================================================================

function hpPercent(unit: Unit): number {
  return unit.hpMax === 0 ? 0 : (unit.hp / unit.hpMax) * 100;
}

function mpPercent(unit: Unit): number {
  return unit.mpMax === 0 ? 0 : (unit.mp / unit.mpMax) * 100;
}

/**
 * `metric` で評価した結果が最も大きい／小さい要素を 1 つ返す。
 * 同値の場合は配列内で先に現れた方を優先（決定的）。
 * 候補ゼロなら null。
 */
function pickBy<T>(items: T[], metric: (item: T) => number, preferHigher: boolean): T | null {
  if (items.length === 0) return null;
  let best = items[0];
  let bestMetric = metric(best);
  for (let i = 1; i < items.length; i++) {
    const m = metric(items[i]);
    if (preferHigher ? m > bestMetric : m < bestMetric) {
      best = items[i];
      bestMetric = m;
    }
  }
  return best;
}

// ============================================================================
// 内部：条件評価
// ============================================================================

interface ConditionContext {
  /** 条件が真か */
  matched: boolean;
  /** 条件が候補集合から特定した 1 体（`ALLY_MATCH` / `ENEMY_MATCH` で参照）*/
  matchedUnit?: Unit;
}

function evaluateCondition(
  condition: Condition,
  actor: Unit,
  battle: BattleState,
): ConditionContext {
  const { allies, enemies } = getSides(actor, battle);
  const aliveAllies = allies.filter((u) => u.isAlive);
  const aliveEnemies = enemies.filter((u) => u.isAlive);
  const deadAllies = allies.filter((u) => !u.isAlive);

  switch (condition.type) {
    // -- 自身（6）--
    case "SELF_HP_LT":
      return { matched: hpPercent(actor) < condition.value };
    case "SELF_HP_GTE":
      return { matched: hpPercent(actor) >= condition.value };
    case "SELF_MP_LT":
      return { matched: mpPercent(actor) < condition.value };
    case "SELF_MP_GTE":
      return { matched: mpPercent(actor) >= condition.value };
    case "SELF_HAS_STATUS":
      return { matched: actor.statuses.includes(condition.status) };
    case "SELF_NO_STATUS":
      return { matched: !actor.statuses.includes(condition.status) };

    // -- 味方（7）：ALLY_* は actor 自身も含む（DSL §3.1.1）--
    case "ALLY_HP_LT": {
      if (!senseCheck("ALLY_HP_LT", actor, battle)) return { matched: false };
      const candidates = aliveAllies.filter((u) => hpPercent(u) < condition.value);
      const picked = pickBy(candidates, hpPercent, /* preferHigher */ false);
      return picked ? { matched: true, matchedUnit: picked } : { matched: false };
    }
    case "ALLY_HP_GTE": {
      if (!senseCheck("ALLY_HP_GTE", actor, battle)) return { matched: false };
      const candidates = aliveAllies.filter((u) => hpPercent(u) >= condition.value);
      const picked = pickBy(candidates, hpPercent, /* preferHigher */ true);
      return picked ? { matched: true, matchedUnit: picked } : { matched: false };
    }
    case "ALLY_MP_LT": {
      const candidates = aliveAllies.filter((u) => mpPercent(u) < condition.value);
      const picked = pickBy(candidates, mpPercent, false);
      return picked ? { matched: true, matchedUnit: picked } : { matched: false };
    }
    case "ALLY_MP_GTE": {
      const candidates = aliveAllies.filter((u) => mpPercent(u) >= condition.value);
      const picked = pickBy(candidates, mpPercent, true);
      return picked ? { matched: true, matchedUnit: picked } : { matched: false };
    }
    case "ALLY_HAS_STATUS": {
      if (!senseCheck("ALLY_HAS_STATUS", actor, battle)) return { matched: false };
      const matched = aliveAllies.find((u) => u.statuses.includes(condition.status));
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }
    case "ALLY_DEAD": {
      const matched = deadAllies[0];
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }
    case "ALLY_TARGETED": {
      const matched = aliveAllies.find((u) => battle.targetedAllyIds.includes(u.id));
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }

    // -- 敵（7）--
    case "ENEMY_EXISTS": {
      // フォールバック用。MATCH は配列内最初の生存敵（決定的）
      const matched = aliveEnemies[0];
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }
    case "ENEMY_LOWEST_HP": {
      if (!senseCheck("ENEMY_LOWEST_HP", actor, battle)) return { matched: false };
      // HP 実数最低（DSL §3.2）
      const matched = pickBy(aliveEnemies, (u) => u.hp, false);
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }
    case "ENEMY_HIGHEST_HP": {
      if (!senseCheck("ENEMY_HIGHEST_HP", actor, battle)) return { matched: false };
      const matched = pickBy(aliveEnemies, (u) => u.hp, true);
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }
    case "ENEMY_HAS_STATUS": {
      if (!senseCheck("ENEMY_HAS_STATUS", actor, battle)) return { matched: false };
      const matched = aliveEnemies.find((u) => u.statuses.includes(condition.status));
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }
    case "ENEMY_NO_STATUS": {
      if (!senseCheck("ENEMY_NO_STATUS", actor, battle)) return { matched: false };
      const matched = aliveEnemies.find((u) => !u.statuses.includes(condition.status));
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }
    case "ENEMY_WEAK_TO": {
      if (!senseCheck("ENEMY_WEAK_TO", actor, battle)) return { matched: false };
      const matched = aliveEnemies.find((u) => u.weaknesses.includes(condition.element));
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }
    case "ENEMY_TYPE": {
      if (!senseCheck("ENEMY_TYPE", actor, battle)) return { matched: false };
      const matched = aliveEnemies.find((u) => u.enemyType === condition.enemyType);
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }

    // -- 戦況（1）--
    case "BOSS_PRESENT": {
      const matched = aliveEnemies.find((u) => u.isBoss);
      return matched ? { matched: true, matchedUnit: matched } : { matched: false };
    }
  }
}

// ============================================================================
// 内部：対象解決
// ============================================================================

function resolveTarget(
  target: Target,
  matchContext: ConditionContext,
  actor: Unit,
  battle: BattleState,
): Unit[] | null {
  const { allies, enemies } = getSides(actor, battle);
  const aliveAllies = allies.filter((u) => u.isAlive);
  const aliveEnemies = enemies.filter((u) => u.isAlive);

  switch (target.type) {
    case "SELF":
      return [actor];

    case "ALLY_MATCH": {
      const m = matchContext.matchedUnit;
      if (!m) return null;
      // 整合性: マッチしたユニットが自陣営になければ拒否（バリデータの最後の砦）
      if (!allies.some((u) => u.id === m.id)) return null;
      return [m];
    }

    case "ALLY_LOWEST_HP": {
      // 戦闘不能を除く生存味方のうち HP% 最低
      const picked = pickBy(aliveAllies, hpPercent, false);
      return picked ? [picked] : null;
    }

    case "ALLY_ALL":
      return aliveAllies.length > 0 ? aliveAllies : null;

    case "ENEMY_MATCH": {
      const m = matchContext.matchedUnit;
      if (!m) return null;
      if (!enemies.some((u) => u.id === m.id)) return null;
      return [m];
    }

    case "ENEMY_ALL":
      return aliveEnemies.length > 0 ? aliveEnemies : null;
  }
}

// ============================================================================
// 内部：実行可能性チェック
// ============================================================================

function canPerform(action: Action, actor: Unit): boolean {
  // MP コストチェック
  if (actor.mp < getActionMpCost(action)) return false;

  // アイテムは在庫が必要
  if (action.type === "USE_ITEM") {
    const stock = actor.inventory[action.itemId] ?? 0;
    return stock > 0;
  }

  // M3-B: SILENCE 状態は魔法（CAST_*）を撃てない（SKILL/ATTACK/アイテム等は使える）
  if (actor.statuses.includes("SILENCE") && action.type.startsWith("CAST_")) {
    return false;
  }

  return true;
}
