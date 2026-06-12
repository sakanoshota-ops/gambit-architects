/**
 * 戦闘ループ（M1 本実装）
 *
 * - 4 vs N の戦闘をターン制で進行
 * - 各ユニットが自分のガンビットセットに従って毎ターン行動を選択
 * - **純粋関数**：入力 `Unit[]` は変更しない（内部で deep clone）
 * - 副作用なし／乱数なし（決定的）
 *
 * 関連仕様: docs/m1_checklist.md §1.3 / §1.4 / §3
 *
 * 設計メモ：
 * - 1 ターン内では全ユニットが配列順（味方 → 敵）に decide & apply を行う sequential model。
 *   よって Sword1 が ATTACK して敵を弱らせると、Sword2 の判断はその更新後の状態を見る。
 * - DEFEND は actor の手番ですぐ flag を立てるため、その後の被ダメージは半減される。
 *   ただし enemy 側の DEFEND は全 ally action のあとに評価されるため、当ターンは効きにくい。
 *   M2 で ATB を入れる際にここを見直す。
 */

import { decideAction } from "../gambit/evaluator";
import type { Action, Status } from "../gambit/types";
import type { BattleEvent, BattleState, Unit } from "./types";
import { applyAction } from "./applyAction";

// -- M2-A バランス値 --
const POISON_DAMAGE_RATIO = 0.08;

export type Winner = "ALLY" | "ENEMY" | "TIMEOUT";

export interface BattleResult {
  winner: Winner;
  turns: number;
  events: BattleEvent[];
  finalAllies: Unit[];
  finalEnemies: Unit[];
}

export interface RunBattleOptions {
  /** 最大ターン数。デフォルト 50。これを超えると TIMEOUT */
  maxTurns?: number;
  /**
   * 確率判定 RNG（BLIND 命中・センサーゲート判定で使用）。
   * 省略時は battle.rng が undefined のままで「常に成功」扱い（既存テスト互換）。
   * 本番では BattleScreen 側で Math.random を注入。
   */
  rng?: () => number;
}

const DEFAULT_MAX_TURNS = 50;

export function runBattle(
  initialAllies: Unit[],
  initialEnemies: Unit[],
  options: RunBattleOptions = {},
): BattleResult {
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;

  // 入力を変更しないよう深いコピー
  const battle: BattleState = {
    turn: 0,
    allies: initialAllies.map(cloneUnit),
    enemies: initialEnemies.map(cloneUnit),
    log: [],
    targetedAllyIds: [],
    defendingThisTurn: new Set<string>(),
    chargedUnitIds: new Set<string>(),
    lastUnitAttackedThisTurn: null,
    provokeDurations: new Map<string, number>(),
    interposingFor: new Map<string, string>(),
    rng: options.rng,
  };

  for (let turn = 1; turn <= maxTurns; turn++) {
    battle.turn = turn;
    battle.log.push({ kind: "TURN_START", turn });
    battle.defendingThisTurn.clear();
    battle.lastUnitAttackedThisTurn = null;
    battle.interposingFor.clear(); // INTERPOSE は単発（当ターンのみ）

    // ターン開始時の処理：
    //   ① DOT（POISON など）を適用
    //   ② REGEN tick（毎ターン HP 5% 回復）
    //   ③ 状態異常の残ターン数を 1 減らし、0 で除去
    //   ④ PROVOKE の残ターン tick
    applyTurnStartDot(battle);
    applyTurnStartRegen(battle);
    tickStatusDurations(battle);
    tickProvokeDurations(battle);

    // DOT で決着がついていないか確認
    const dotStatus = checkBattleEnd(battle);
    if (dotStatus !== null) {
      battle.log.push({ kind: "BATTLE_END", winner: dotStatus });
      return finalize(battle, dotStatus, turn);
    }

    // ターン開始時の予測：敵の決定をシミュレートして targetedAllyIds に反映
    // → INTERPOSE/ALLY_TARGETED 系のガンビットが正しく機能するため
    battle.targetedAllyIds = predictTargetedAllies(battle);

    // 行動順：味方 → 敵。各陣営内で SLOW 持ちは最後（stable sort）
    const turnOrder: Unit[] = [...orderBySlow(battle.allies), ...orderBySlow(battle.enemies)];
    const unitsById = makeUnitsById(battle);

    for (const actor of turnOrder) {
      if (!actor.isAlive) continue;

      const decision = decideAction(actor, battle);
      if (!decision) continue; // 何もできない → 待機相当

      // M3-A：ATTACK の場合は PROVOKE / INTERPOSE のリダイレクトを順に適用
      const redirected = applyRedirects(decision, actor, battle, unitsById);

      // 対象を解決して、生存している対象のみに絞る
      // ただし蘇生系（CAST_REVIVE）は死者を対象にする必要があるので例外
      const allowsDeadTargets = actionAllowsDeadTargets(redirected.action);
      const validTargets = redirected.targetIds
        .map((id) => unitsById.get(id))
        .filter((u): u is Unit => u !== undefined && (allowsDeadTargets || u.isAlive));

      if (validTargets.length === 0) {
        // 行動対象が全部不適格 → スキップ
        continue;
      }

      applyAction(redirected.action, {
        actor,
        targets: validTargets,
        battle,
        ruleId: redirected.ruleId,
      });

      // 行動の途中でも勝敗判定
      const status = checkBattleEnd(battle);
      if (status !== null) {
        battle.log.push({ kind: "BATTLE_END", winner: status });
        return finalize(battle, status, turn);
      }
    }
  }

  // maxTurns に達した → TIMEOUT
  battle.log.push({ kind: "BATTLE_END", winner: "TIMEOUT" });
  return finalize(battle, "TIMEOUT", maxTurns);
}

// ============================================================================
// 内部ヘルパ
// ============================================================================

/** Unit を deep clone する。statuses / weaknesses / inventory / gambitSet すべて新規参照 */
function cloneUnit(unit: Unit): Unit {
  return JSON.parse(JSON.stringify(unit));
}

/** 全ユニットを id でルックアップできる Map を作る */
function makeUnitsById(battle: BattleState): Map<string, Unit> {
  const map = new Map<string, Unit>();
  for (const u of battle.allies) map.set(u.id, u);
  for (const u of battle.enemies) map.set(u.id, u);
  return map;
}

/** 戦闘終了判定。決着がついていれば勝者、まだなら null */
function checkBattleEnd(battle: BattleState): Exclude<Winner, "TIMEOUT"> | null {
  const anyAllyAlive = battle.allies.some((u) => u.isAlive);
  const anyEnemyAlive = battle.enemies.some((u) => u.isAlive);
  if (!anyEnemyAlive) return "ALLY";
  if (!anyAllyAlive) return "ENEMY";
  return null;
}

/** BattleResult を組み立てる */
function finalize(battle: BattleState, winner: Winner, turns: number): BattleResult {
  return {
    winner,
    turns,
    events: battle.log,
    finalAllies: battle.allies,
    finalEnemies: battle.enemies,
  };
}

/** ターン開始時の REGEN による HP 回復（M3-B） */
function applyTurnStartRegen(battle: BattleState): void {
  for (const unit of [...battle.allies, ...battle.enemies]) {
    if (!unit.isAlive) continue;
    if (!unit.statuses.includes("REGEN")) continue;
    const heal = Math.max(1, Math.floor(unit.hpMax * 0.05));
    const restored = Math.min(unit.hpMax - unit.hp, heal);
    if (restored > 0) {
      unit.hp += restored;
      battle.log.push({ kind: "HEAL", targetId: unit.id, amount: restored });
    }
  }
}

/** SLOW 持ちユニットを後ろに回す stable sort（M3-B） */
function orderBySlow(units: Unit[]): Unit[] {
  return [...units].sort((a, b) => {
    const aSlow = a.statuses.includes("SLOW") ? 1 : 0;
    const bSlow = b.statuses.includes("SLOW") ? 1 : 0;
    return aSlow - bSlow;
  });
}

/** ターン開始時の DOT（POISON 等）を処理 */
function applyTurnStartDot(battle: BattleState): void {
  for (const unit of [...battle.allies, ...battle.enemies]) {
    if (!unit.isAlive) continue;
    if (unit.statuses.includes("POISON")) {
      const dmg = Math.max(1, Math.floor(unit.hpMax * POISON_DAMAGE_RATIO));
      const actualDmg = Math.min(dmg, unit.hp);
      unit.hp -= actualDmg;
      battle.log.push({ kind: "DAMAGE", targetId: unit.id, amount: actualDmg });
      if (unit.hp === 0 && unit.isAlive) {
        unit.isAlive = false;
        battle.log.push({ kind: "DOWN", unitId: unit.id });
      }
    }
  }
}

/** ターン終了時に全状態異常の残ターンを 1 減らし、0 で除去 */
function tickStatusDurations(battle: BattleState): void {
  for (const unit of [...battle.allies, ...battle.enemies]) {
    if (!unit.isAlive) continue;
    const keys = Object.keys(unit.statusDurations) as Status[];
    for (const status of keys) {
      const remaining = (unit.statusDurations[status] ?? 0) - 1;
      if (remaining <= 0) {
        unit.statuses = unit.statuses.filter((s) => s !== status);
        delete unit.statusDurations[status];
      } else {
        unit.statusDurations[status] = remaining;
      }
    }
  }
}

/** 蘇生系など、死んだ対象を許容する行動か */
function actionAllowsDeadTargets(action: Action): boolean {
  if (action.type === "CAST_REVIVE") return true;
  if (action.type === "USE_ITEM" && action.itemId === "PHOENIX_DOWN") return true;
  return false;
}

// ============================================================================
// M3-A：PROVOKE / INTERPOSE / 予測
// ============================================================================

/** PROVOKE 残ターンを 1 減らし、0 で除去 */
function tickProvokeDurations(battle: BattleState): void {
  const ids = Array.from(battle.provokeDurations.keys());
  for (const id of ids) {
    const remaining = (battle.provokeDurations.get(id) ?? 0) - 1;
    if (remaining <= 0) battle.provokeDurations.delete(id);
    else battle.provokeDurations.set(id, remaining);
  }
}

/**
 * 敵の決定を事前にシミュレートして、ATTACK 対象になりそうな味方の ID を返す。
 * 副作用なし（state を変えない）。INTERPOSE / ALLY_TARGETED 条件の事前情報源。
 */
function predictTargetedAllies(battle: BattleState): string[] {
  const targeted = new Set<string>();
  // 味方陣営から狙われる候補のみを対象（敵 → 味方）
  for (const enemy of battle.enemies) {
    if (!enemy.isAlive) continue;
    const decision = decideAction(enemy, battle);
    if (!decision) continue;
    if (decision.action.type !== "ATTACK") continue;
    for (const tid of decision.targetIds) {
      const target = battle.allies.find((u) => u.id === tid);
      if (target?.isAlive) targeted.add(tid);
    }
  }
  return Array.from(targeted);
}

/**
 * ATTACK のリダイレクト：
 *   1. PROVOKE：actor の敵陣営に PROVOKE 中の味方がいたら、その味方を狙う
 *   2. INTERPOSE：その後の対象が誰かに守られていたら、守り手にリダイレクト（単発）
 */
function applyRedirects(
  decision: import("../gambit/evaluator").ActionDecision,
  actor: Unit,
  battle: BattleState,
  unitsById: Map<string, Unit>,
): import("../gambit/evaluator").ActionDecision {
  if (decision.action.type !== "ATTACK") return decision;

  let targetIds = [...decision.targetIds];

  // 1. PROVOKE：actor から見た「敵」のうち、PROVOKE 中で生存している者がいれば、そこに統一
  const opposing = actor.isAlly ? battle.enemies : battle.allies;
  const provoker = opposing.find(
    (u) => battle.provokeDurations.has(u.id) && u.isAlive,
  );
  if (provoker) {
    targetIds = [provoker.id];
  }

  // 2. INTERPOSE：対象が守られていたら守り手にリダイレクトし、interposingFor から削除（単発）
  targetIds = targetIds.map((tid) => {
    const protectorId = battle.interposingFor.get(tid);
    if (!protectorId) return tid;
    const protector = unitsById.get(protectorId);
    if (!protector?.isAlive) return tid;
    battle.interposingFor.delete(tid);
    return protectorId;
  });

  return { ...decision, targetIds };
}
