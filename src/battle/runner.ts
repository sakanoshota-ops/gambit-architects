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
import type { BattleEvent, BattleState, Unit } from "./types";
import { applyAction } from "./applyAction";

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
  };

  for (let turn = 1; turn <= maxTurns; turn++) {
    battle.turn = turn;
    battle.log.push({ kind: "TURN_START", turn });
    battle.defendingThisTurn.clear();

    // 行動順：味方 → 敵（M1 はこの単純順）
    const turnOrder: Unit[] = [...battle.allies, ...battle.enemies];
    const unitsById = makeUnitsById(battle);

    for (const actor of turnOrder) {
      if (!actor.isAlive) continue;

      const decision = decideAction(actor, battle);
      if (!decision) continue; // 何もできない → 待機相当

      // 対象を解決して、生存している対象のみに絞る
      const livingTargets = decision.targetIds
        .map((id) => unitsById.get(id))
        .filter((u): u is Unit => u !== undefined && u.isAlive);

      if (livingTargets.length === 0) {
        // 行動対象が全部死んでいた → スキップ
        continue;
      }

      applyAction(decision.action, {
        actor,
        targets: livingTargets,
        battle,
        ruleId: decision.ruleId,
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
