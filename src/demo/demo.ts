/**
 * M1 デモエントリ
 *
 * - 関連仕様: docs/m1_checklist.md §3
 * - 4 剣士（タンク x2 + 止め刺し x2）vs ゴブリン x2 + ウルフ x1 の戦闘をコンソールに出力する
 * - 実行：`pnpm run demo`
 */

import { runBattle, type BattleResult } from "../battle/runner";
import type { BattleEvent, Unit } from "../battle/types";
import { createEnemy, GOBLIN, WOLF } from "../data/enemies";
import { createSwordsman } from "../data/jobs";
import { presetFinisher, presetTank } from "../gambit/presets";
import type { GambitSet } from "../gambit/types";

// ============================================================================
// メイン
// ============================================================================

function main(): void {
  const allies: Unit[] = [
    createSwordsman("ally_1", "Sword1", presetTank("ally_1")),
    createSwordsman("ally_2", "Sword2", presetTank("ally_2")),
    createSwordsman("ally_3", "Sword3", presetFinisher("ally_3")),
    createSwordsman("ally_4", "Sword4", presetFinisher("ally_4")),
  ];

  const enemies: Unit[] = [
    createEnemy(GOBLIN, "goblin_1", presetEnemySimple("goblin_1")),
    createEnemy(GOBLIN, "goblin_2", presetEnemySimple("goblin_2")),
    createEnemy(WOLF, "wolf_1", presetEnemySimple("wolf_1")),
  ];

  printHeader(allies, enemies);

  const result = runBattle(allies, enemies, { maxTurns: 30 });

  // 入力のユニットも、最終状態のユニットも、両方を名前辞書に入れる（ID 衝突しない前提）
  const nameById = buildNameById([
    ...allies,
    ...enemies,
    ...result.finalAllies,
    ...result.finalEnemies,
  ]);
  for (const line of formatEvents(result.events, nameById)) {
    console.log(line);
  }

  printSummary(result);
}

// ============================================================================
// 補助：敵用のシンプルなプリセット
// ============================================================================

/** 常に「敵を1体狙って通常攻撃」だけ。M1 デモ用 */
function presetEnemySimple(characterId: string): GambitSet {
  return {
    schemaVersion: 2,
    characterId,
    rules: [
      {
        id: "atk",
        enabled: true,
        condition: { type: "ENEMY_EXISTS" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "ATTACK" },
      },
    ],
  };
}

// ============================================================================
// 表示ヘルパ
// ============================================================================

function printHeader(allies: Unit[], enemies: Unit[]): void {
  const bar = "=".repeat(60);
  console.log(bar);
  console.log("=== Gambit Architects M1 Demo: BATTLE START ===");
  console.log(bar);
  console.log();

  console.log(`Party (${allies.length}):`);
  for (const u of allies) {
    console.log(
      `  ${u.id.padEnd(8)} ${u.name.padEnd(8)} HP ${u.hp}/${u.hpMax}  ATK ${u.atk} DEF ${u.def}  preset=${u.gambitSet.characterId}`,
    );
  }
  console.log();

  console.log(`Enemies (${enemies.length}):`);
  for (const u of enemies) {
    const weak = u.weaknesses.length > 0 ? u.weaknesses.join(",") : "(none)";
    console.log(`  ${u.id.padEnd(10)} ${u.name.padEnd(8)} HP ${u.hp}/${u.hpMax}  ATK ${u.atk} DEF ${u.def}  weak=${weak}`);
  }
  console.log();
}

function buildNameById(units: Unit[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const u of units) {
    if (!m.has(u.id)) m.set(u.id, u.name);
  }
  return m;
}

function formatEvents(events: BattleEvent[], nameById: Map<string, string>): string[] {
  const lines: string[] = [];
  const nameOf = (id: string): string => nameById.get(id) ?? id;

  for (const event of events) {
    switch (event.kind) {
      case "TURN_START":
        lines.push("");
        lines.push(`[Turn ${event.turn}]`);
        break;
      case "ACTION": {
        const targets =
          event.targetIds.length > 0 ? event.targetIds.map(nameOf).join(", ") : "(none)";
        lines.push(
          `  ${nameOf(event.actorId).padEnd(8)} -> ${event.actionType.padEnd(18)} (rule=${event.ruleId}, targets=${targets})`,
        );
        break;
      }
      case "DAMAGE":
        lines.push(`      - ${nameOf(event.targetId)} takes ${event.amount} damage`);
        break;
      case "HEAL":
        lines.push(`      + ${nameOf(event.targetId)} heals ${event.amount} HP`);
        break;
      case "DOWN":
        lines.push(`      x ${nameOf(event.unitId)} is DOWN`);
        break;
      case "NOT_IMPLEMENTED":
        lines.push(`      ? [NotImplemented] ${event.actionType}`);
        break;
      case "BATTLE_END":
        lines.push("");
        lines.push("=".repeat(60));
        lines.push(`=== BATTLE END: ${event.winner} ===`);
        lines.push("=".repeat(60));
        break;
    }
  }
  return lines;
}

function printSummary(result: BattleResult): void {
  console.log();
  console.log("Final state:");
  console.log("  Party:");
  for (const u of result.finalAllies) {
    const status = u.isAlive ? `${u.hp}/${u.hpMax} HP` : "DOWN";
    console.log(`    ${u.id.padEnd(8)} ${u.name.padEnd(8)} ${status}`);
  }
  console.log("  Enemies:");
  for (const u of result.finalEnemies) {
    const status = u.isAlive ? `${u.hp}/${u.hpMax} HP` : "DOWN";
    console.log(`    ${u.id.padEnd(10)} ${u.name.padEnd(8)} ${status}`);
  }
  console.log();
  console.log(`Winner: ${result.winner}`);
  console.log(`Turns elapsed: ${result.turns}`);
  console.log();
}

// ============================================================================
// 実行
// ============================================================================

main();
