/**
 * 戦闘ループのテスト（Phase 3a：RED → GREEN）
 *
 * - 関連仕様: docs/m1_checklist.md §1.3 / §1.4
 * - 観点：
 *   - 行動の実効果（ATTACK / DEFEND / WAIT / USE_ITEM(POTION)）
 *   - 未実装行動の安全な空振り
 *   - 戦闘終了判定（ALLY 勝利 / ENEMY 勝利 / TIMEOUT）
 *   - 入力の不変性（純粋関数として振る舞う）
 */

import { describe, expect, it } from "vitest";

import { runBattle } from "../runner";
import {
  emptyGambitSet,
  makeAlly,
  makeEnemy,
  makeGambitSet,
  makeRule,
} from "../../test/factories";

describe("runBattle - 行動の実効果", () => {
  it("ATTACK は対象の HP を減らし DAMAGE イベントを記録する", () => {
    const allySet = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const attacker = makeAlly("a", allySet, { atk: 20 });
    const target = makeEnemy("e", emptyGambitSet("e"), { hp: 100, hpMax: 100, def: 0 });

    const result = runBattle([attacker], [target], { maxTurns: 1 });

    const finalEnemy = result.finalEnemies.find((u) => u.id === "e");
    expect(finalEnemy!.hp).toBeLessThan(100);
    expect(finalEnemy!.hp).toBe(80); // atk 20 - def 0 = 20 ダメージ
    expect(result.events.some((e) => e.kind === "DAMAGE" && e.targetId === "e")).toBe(true);
  });

  it("DEFEND は当ターンの被ダメージを半減する", () => {
    const allySet = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "DEFEND" }),
    ]);
    const enemySet = makeGambitSet("e", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const defender = makeAlly("a", allySet, { hp: 100, hpMax: 100, def: 0 });
    const attacker = makeEnemy("e", enemySet, { atk: 20 });

    const result = runBattle([defender], [attacker], { maxTurns: 1 });

    const finalDefender = result.finalAllies.find((u) => u.id === "a");
    // 通常 20 ダメージ → DEFEND で半減 → 10
    expect(finalDefender!.hp).toBe(90);
  });

  it("WAIT は何もしない（HP/MP が変わらない）", () => {
    const set = makeGambitSet("x", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "WAIT" }),
    ]);
    const ally = makeAlly("a", set, { hp: 100, mp: 50 });
    const enemy = makeEnemy("e", set, { hp: 100, mp: 50 });

    const result = runBattle([ally], [enemy], { maxTurns: 3 });

    expect(result.finalAllies[0].hp).toBe(100);
    expect(result.finalAllies[0].mp).toBe(50);
    expect(result.finalEnemies[0].hp).toBe(100);
    expect(result.finalEnemies[0].mp).toBe(50);
  });

  it("USE_ITEM(POTION) は対象を回復し、actor の inventory.POTION を 1 減らす", () => {
    const allySet = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_HP_LT", value: 50 },
        { type: "ALLY_MATCH" },
        { type: "USE_ITEM", itemId: "POTION" },
      ),
    ]);
    const healer = makeAlly("a", allySet, {
      hp: 100,
      inventory: { POTION: 3 },
    });
    const wounded = makeAlly("w", emptyGambitSet("w"), { hp: 20, hpMax: 100 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([healer, wounded], [enemy], { maxTurns: 1 });

    const finalWounded = result.finalAllies.find((u) => u.id === "w")!;
    expect(finalWounded.hp).toBeGreaterThan(20);

    const finalHealer = result.finalAllies.find((u) => u.id === "a")!;
    expect(finalHealer.inventory.POTION).toBe(2);

    expect(result.events.some((e) => e.kind === "HEAL" && e.targetId === "w")).toBe(true);
  });

  it("M1 未実装の行動（例：CAST_OFFENSE）は NOT_IMPLEMENTED イベントを残して空振り", () => {
    const allySet = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRA" },
      ),
    ]);
    const ally = makeAlly("a", allySet, { mp: 100 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 100 });

    const result = runBattle([ally], [enemy], { maxTurns: 1 });

    // 敵 HP は変わらない（実効果ゼロ）
    expect(result.finalEnemies[0].hp).toBe(100);
    // NOT_IMPLEMENTED イベントが記録されている
    expect(
      result.events.some(
        (e) => e.kind === "NOT_IMPLEMENTED" && e.actionType === "CAST_OFFENSE",
      ),
    ).toBe(true);
  });
});

describe("runBattle - 戦闘終了判定", () => {
  it("HP が 0 になったユニットは isAlive=false になり DOWN イベントが残る", () => {
    const allySet = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const killer = makeAlly("a", allySet, { atk: 200 });
    const frail = makeEnemy("e", emptyGambitSet("e"), { hp: 10, hpMax: 10, def: 0 });

    const result = runBattle([killer], [frail], { maxTurns: 1 });

    const finalEnemy = result.finalEnemies.find((u) => u.id === "e")!;
    expect(finalEnemy.hp).toBe(0);
    expect(finalEnemy.isAlive).toBe(false);
    expect(result.events.some((e) => e.kind === "DOWN" && e.unitId === "e")).toBe(true);
  });

  it("敵を全滅させると ALLY 勝利で終わる", () => {
    const allySet = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("a", allySet, { atk: 200 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 10, hpMax: 10, def: 0 });

    const result = runBattle([ally], [enemy]);

    expect(result.winner).toBe("ALLY");
    expect(result.events[result.events.length - 1]).toEqual(
      expect.objectContaining({ kind: "BATTLE_END", winner: "ALLY" }),
    );
  });

  it("味方を全滅させられると ENEMY 勝利で終わる", () => {
    const enemySet = makeGambitSet("e", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const weakAlly = makeAlly("a", emptyGambitSet("a"), { hp: 10, hpMax: 10, def: 0 });
    const enemy = makeEnemy("e", enemySet, { atk: 200 });

    const result = runBattle([weakAlly], [enemy]);

    expect(result.winner).toBe("ENEMY");
  });

  it("両陣営とも WAIT し続けて maxTurns に達したら TIMEOUT", () => {
    const set = makeGambitSet("x", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "WAIT" }),
    ]);
    const ally = makeAlly("a", set);
    const enemy = makeEnemy("e", set);

    const result = runBattle([ally], [enemy], { maxTurns: 5 });

    expect(result.winner).toBe("TIMEOUT");
    expect(result.turns).toBe(5);
  });
});

describe("runBattle - 純粋性", () => {
  it("入力 Unit の hp/mp を変更しない（深いクローンで隔離）", () => {
    const allySet = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("a", allySet, { atk: 50, hp: 100, mp: 50 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 100, hpMax: 100, def: 0 });

    runBattle([ally], [enemy], { maxTurns: 3 });

    // 入力は不変
    expect(ally.hp).toBe(100);
    expect(ally.mp).toBe(50);
    expect(enemy.hp).toBe(100);
    expect(enemy.isAlive).toBe(true);
  });
});
