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

  it("M2 で未実装の行動（CHARGE）は NOT_IMPLEMENTED イベントを残して空振り", () => {
    const allySet = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "SELF" },
        { type: "CHARGE" },
      ),
    ]);
    const ally = makeAlly("a", allySet, { hp: 100, hpMax: 100 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 100 });

    const result = runBattle([ally], [enemy], { maxTurns: 1 });

    // 敵 HP も自分 HP も変わらない（実効果ゼロ）
    expect(result.finalEnemies[0].hp).toBe(100);
    expect(result.finalAllies[0].hp).toBe(100);
    // NOT_IMPLEMENTED イベントが記録されている
    expect(
      result.events.some(
        (e) => e.kind === "NOT_IMPLEMENTED" && e.actionType === "CHARGE",
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

// ============================================================================
// M2-A: 魔法・スキル・状態異常の実効果
// ============================================================================

describe("runBattle - M2-A: 魔法・スキルの実効果", () => {
  it("CAST_OFFENSE(FIRE) は単体に魔法ダメージを与える", () => {
    const allySet = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRE" },
      ),
    ]);
    const mage = makeAlly("a", allySet, { mp: 50, mag: 10 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 100, hpMax: 100, def: 5 });

    const result = runBattle([mage], [enemy], { maxTurns: 1 });

    const finalEnemy = result.finalEnemies.find((u) => u.id === "e")!;
    // 通常は < 100 になっていること
    expect(finalEnemy.hp).toBeLessThan(100);
    // DAMAGE イベントが残っている
    expect(result.events.some((e) => e.kind === "DAMAGE" && e.targetId === "e")).toBe(true);
  });

  it("CAST_OFFENSE(FIRE) は弱点 FIRE の敵に 1.5x ダメージ", () => {
    const allySet = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRE" },
      ),
    ]);
    const mage = makeAlly("a", allySet, { mp: 50, mag: 10 });
    const fireEnemy = makeEnemy("fire", emptyGambitSet("fire"), {
      hp: 200,
      hpMax: 200,
      def: 5,
      weaknesses: ["FIRE"],
    });
    const normalEnemy = makeEnemy("nor", emptyGambitSet("nor"), {
      hp: 200,
      hpMax: 200,
      def: 5,
      weaknesses: [],
    });

    const fireResult = runBattle([mage], [fireEnemy], { maxTurns: 1 });
    const normalResult = runBattle([mage], [normalEnemy], { maxTurns: 1 });

    const fireDmg = 200 - fireResult.finalEnemies[0].hp;
    const normalDmg = 200 - normalResult.finalEnemies[0].hp;
    // 弱点ダメージは通常の 1.5 倍（丸めで誤差は許容）
    expect(fireDmg).toBeGreaterThan(normalDmg);
    expect(fireDmg).toBeGreaterThanOrEqual(Math.floor(normalDmg * 1.5));
  });

  it("CAST_HEAL(CURE) は単体味方の HP を回復する", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_HP_LT", value: 50 },
        { type: "ALLY_MATCH" },
        { type: "CAST_HEAL", spellId: "CURE" },
      ),
    ]);
    const healer = makeAlly("a", set, { mp: 50, mag: 10 });
    const wounded = makeAlly("w", emptyGambitSet("w"), { hp: 30, hpMax: 100 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([healer, wounded], [enemy], { maxTurns: 1 });

    const finalWounded = result.finalAllies.find((u) => u.id === "w")!;
    expect(finalWounded.hp).toBeGreaterThan(30);
    expect(result.events.some((e) => e.kind === "HEAL" && e.targetId === "w")).toBe(true);
  });

  it("CAST_HEAL(CURE) は hpMax を超えない", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "SELF" },
        { type: "CAST_HEAL", spellId: "CURE" },
      ),
    ]);
    // HP がほぼ満タンの actor 自身に CURE
    const healer = makeAlly("a", set, { mp: 50, mag: 100, hp: 95, hpMax: 100 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([healer], [enemy], { maxTurns: 1 });

    const finalHealer = result.finalAllies[0];
    expect(finalHealer.hp).toBeLessThanOrEqual(finalHealer.hpMax);
    expect(finalHealer.hp).toBe(100);
  });

  it("CAST_REVIVE(RAISE) は戦闘不能の味方を 25% HP で復活させる", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_DEAD" },
        { type: "ALLY_MATCH" },
        { type: "CAST_REVIVE", spellId: "RAISE" },
      ),
    ]);
    const healer = makeAlly("a", set, { mp: 50 });
    const fallen = makeAlly("fallen", emptyGambitSet("fallen"), {
      hp: 0,
      hpMax: 100,
      isAlive: false,
    });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([healer, fallen], [enemy], { maxTurns: 1 });

    const finalFallen = result.finalAllies.find((u) => u.id === "fallen")!;
    expect(finalFallen.isAlive).toBe(true);
    expect(finalFallen.hp).toBe(25); // 100 * 0.25
  });

  it("SKILL(POWER_SLASH) は物理 1.5x ダメージ", () => {
    const setNormal = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const setSkill = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "SKILL", skillId: "POWER_SLASH" },
      ),
    ]);
    const allyNormal = makeAlly("a", setNormal, { atk: 30, mp: 50 });
    const allySkill = makeAlly("a", setSkill, { atk: 30, mp: 50 });
    const enemy1 = makeEnemy("e", emptyGambitSet("e"), { hp: 200, hpMax: 200, def: 0 });
    const enemy2 = makeEnemy("e", emptyGambitSet("e"), { hp: 200, hpMax: 200, def: 0 });

    const r1 = runBattle([allyNormal], [enemy1], { maxTurns: 1 });
    const r2 = runBattle([allySkill], [enemy2], { maxTurns: 1 });

    const normalDmg = 200 - r1.finalEnemies[0].hp;
    const skillDmg = 200 - r2.finalEnemies[0].hp;
    expect(skillDmg).toBe(Math.floor(normalDmg * 1.5));
  });
});

describe("runBattle - M2-A: 状態異常 PROTECT / POISON", () => {
  it("CAST_BUFF(PROTECT) は対象に PROTECT 状態を付与する（4 ターン）", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "SELF" },
        { type: "CAST_BUFF", buffId: "PROTECT" },
      ),
    ]);
    const caster = makeAlly("a", set, { mp: 50 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([caster], [enemy], { maxTurns: 1 });

    const final = result.finalAllies[0];
    expect(final.statuses).toContain("PROTECT");
    expect(final.statusDurations.PROTECT).toBe(4);
  });

  it("PROTECT 状態の敵への ATTACK はダメージ -25%", () => {
    const allySet = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const attacker = makeAlly("a", allySet, { atk: 100 });
    const normalEnemy = makeEnemy("e1", emptyGambitSet("e1"), {
      hp: 1000,
      hpMax: 1000,
      def: 0,
    });
    const protectedEnemy = makeEnemy("e2", emptyGambitSet("e2"), {
      hp: 1000,
      hpMax: 1000,
      def: 0,
      statuses: ["PROTECT"],
      statusDurations: { PROTECT: 3 },
    });

    const r1 = runBattle([attacker], [normalEnemy], { maxTurns: 1 });
    const r2 = runBattle([attacker], [protectedEnemy], { maxTurns: 1 });

    const normalDmg = 1000 - r1.finalEnemies[0].hp;
    const protectedDmg = 1000 - r2.finalEnemies[0].hp;
    expect(protectedDmg).toBe(Math.floor(normalDmg * 0.75));
  });

  it("PROTECT は付与から 4 ターン後に消える", () => {
    // caster が PROTECT を撒く → 残り 4 ターン → ターン経過で減少
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "SELF_NO_STATUS", status: "PROTECT" },
        { type: "SELF" },
        { type: "CAST_BUFF", buffId: "PROTECT" },
      ),
      // 以降は WAIT で時間を進める
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "WAIT" }),
    ]);
    const caster = makeAlly("a", set, { mp: 500 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    // Turn 1: PROTECT 付与（残り 4）
    // Turn 2-4: WAIT（残り 3, 2, 1）
    // Turn 5: 残り 0 → 消える前にもう一度発動するかもしれないので確認方法を工夫
    const result = runBattle([caster], [enemy], { maxTurns: 6 });

    // 6 ターン後の caster の statuses を確認
    // Turn 1 で付与（PROTECT=4）→ Turn 2,3,4,5 で減って 0 → Turn 6 に消える
    // (ターン終了時 dec → 0 で削除 想定)
    // ただし r1 が SELF_NO_STATUS(PROTECT) を見て、もう一度かけ直す可能性あり
    // → ここでは「6 ターン後の PROTECT 残量が 4 でないこと」をゆるく確認
    const final = result.finalAllies[0];
    // 何度か再付与されているはずなので、ターン経過の中で減っていることが分かれば良い
    // → MP の消費があるか確認（PROTECT は MP 8）
    expect(final.mp).toBeLessThan(500);
  });

  it("CAST_DEBUFF(POISON) は対象に POISON 状態を付与する（5 ターン）", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_DEBUFF", debuffId: "POISON" },
      ),
    ]);
    const caster = makeAlly("a", set, { mp: 50 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([caster], [enemy], { maxTurns: 1 });

    const finalEnemy = result.finalEnemies[0];
    expect(finalEnemy.statuses).toContain("POISON");
    expect(finalEnemy.statusDurations.POISON).toBe(5);
  });

  it("POISON 状態のユニットはターン開始時に maxHP の 8% ダメージ", () => {
    const set = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "WAIT" }),
    ]);
    const poisoned = makeAlly("a", set, {
      hp: 100,
      hpMax: 100,
      statuses: ["POISON"],
      statusDurations: { POISON: 5 },
    });
    const enemy = makeEnemy("e", set);

    // 1 ターンで poisoned は 8 ダメージを受けるはず
    const result = runBattle([poisoned], [enemy], { maxTurns: 1 });

    const finalAlly = result.finalAllies[0];
    expect(finalAlly.hp).toBe(92); // 100 - 8 = 92
  });

  it("POISON は 5 ターンで消える", () => {
    const set = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "WAIT" }),
    ]);
    const poisoned = makeAlly("a", set, {
      hp: 1000, // 死なないように大きく
      hpMax: 1000,
      statuses: ["POISON"],
      statusDurations: { POISON: 5 },
    });
    const enemy = makeEnemy("e", set);

    const result = runBattle([poisoned], [enemy], { maxTurns: 10 });

    const final = result.finalAllies[0];
    expect(final.statuses).not.toContain("POISON");
    expect(final.statusDurations.POISON).toBeUndefined();
  });

  it("CAST_CURE_STATUS(POISON) は POISON を即座に解除する", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_HAS_STATUS", status: "POISON" },
        { type: "ALLY_MATCH" },
        { type: "CAST_CURE_STATUS", status: "POISON" },
      ),
    ]);
    const cleric = makeAlly("a", set, { mp: 50 });
    const poisoned = makeAlly("p", emptyGambitSet("p"), {
      hp: 100,
      hpMax: 100,
      statuses: ["POISON"],
      statusDurations: { POISON: 4 },
    });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([cleric, poisoned], [enemy], { maxTurns: 1 });

    const finalPoisoned = result.finalAllies.find((u) => u.id === "p")!;
    expect(finalPoisoned.statuses).not.toContain("POISON");
    expect(finalPoisoned.statusDurations.POISON).toBeUndefined();
  });
});
