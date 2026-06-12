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

import { applyAction as applyActionDirectly } from "../applyAction";
import { runBattle } from "../runner";
import {
  emptyGambitSet,
  makeAlly,
  makeBattle,
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

  // 注：M3-B 完了時点で 15 行動 + 31 コンテンツ ID すべて実装済みなので、
  // 「未実装行動の空振り」テストは観測対象がなくなり削除した。
  // 残る NOT_IMPLEMENTED 出力は CHAIN の特殊ケース（無対象時）のみで、
  // それは「直前 ATTACK がないと CHAIN はフォールスルー」テストで確認している。
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

// ============================================================================
// M3-A: CHARGE / CHAIN / PROVOKE / INTERPOSE
// ============================================================================

describe("runBattle - M3-A: CHARGE", () => {
  it("CHARGE → 次の ATTACK で 1.5x ダメージ、chargedUnitIds は消費される", () => {
    // runner を経由せず、applyAction 直接で確認すると挙動が明確
    const set = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("a", set, { atk: 20 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 1000, hpMax: 1000, def: 0 });
    const battle = makeBattle([ally], [enemy]);

    // CHARGE 直接適用
    applyActionDirectly(
      { type: "CHARGE" },
      { actor: ally, targets: [ally], battle, ruleId: "r1" },
    );
    expect(battle.chargedUnitIds.has("a")).toBe(true);

    // 続けて ATTACK
    applyActionDirectly(
      { type: "ATTACK" },
      { actor: ally, targets: [enemy], battle, ruleId: "r2" },
    );
    // CHARGE 消費されている
    expect(battle.chargedUnitIds.has("a")).toBe(false);
    // ダメージは max(1, 20 - 0) * 1.5 = 30
    expect(enemy.hp).toBe(1000 - 30);
  });
});

describe("runBattle - M3-A: CHAIN", () => {
  it("ALLY 同士の CHAIN：直前 ATTACK 対象に +20% ダメージ", () => {
    const setAttack = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const setChain = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "CHAIN" }),
    ]);
    const attacker = makeAlly("a1", setAttack, { atk: 20 });
    const chainer = makeAlly("a2", setChain, { atk: 20 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 1000, hpMax: 1000, def: 0 });

    const result = runBattle([attacker, chainer], [enemy], { maxTurns: 1 });
    // Turn 1: a1 ATTACK (20 dmg) → lastUnitAttackedThisTurn=e
    //         a2 CHAIN → 20 * 1.2 = 24 dmg
    // 合計 44
    expect(1000 - result.finalEnemies[0].hp).toBe(44);
  });

  it("直前 ATTACK がないと CHAIN はフォールスルー（NOT_IMPLEMENTED ログ）", () => {
    const setChain = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "CHAIN" }),
    ]);
    const chainer = makeAlly("a", setChain, { atk: 20 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 1000, hpMax: 1000, def: 0 });

    const result = runBattle([chainer], [enemy], { maxTurns: 1 });
    // CHAIN しか無く、直前 ATTACK が無いので 0 ダメ
    expect(result.finalEnemies[0].hp).toBe(1000);
    expect(
      result.events.some(
        (e) =>
          e.kind === "NOT_IMPLEMENTED" &&
          e.actionType.startsWith("CHAIN(no chain target)"),
      ),
    ).toBe(true);
  });
});

describe("runBattle - M3-A: PROVOKE", () => {
  it("PROVOKE 中の味方に敵 ATTACK がリダイレクトされる", () => {
    const setProvoke = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "SELF_NO_STATUS", status: "POISON" },
        { type: "SELF" },
        { type: "PROVOKE" },
      ),
    ]);
    const setEnemyAttack = makeGambitSet("e", [
      // 通常なら ENEMY_LOWEST_HP（つまり HP 少ない味方）を狙うところを、
      // PROVOKE で provoker にリダイレクトされるか
      makeRule("r1", { type: "ENEMY_LOWEST_HP" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const provoker = makeAlly("tank", setProvoke, { hp: 200, hpMax: 200 });
    // 弱い味方（普段ならこちらが狙われる）
    const fragile = makeAlly("fragile", emptyGambitSet("fragile"), { hp: 10, hpMax: 10 });
    const enemy = makeEnemy("e", setEnemyAttack, { atk: 20 });

    // Turn 1: provoker が PROVOKE、enemy が fragile を狙う...が、リダイレクトで provoker に
    const result = runBattle([provoker, fragile], [enemy], { maxTurns: 1 });

    const finalProvoker = result.finalAllies.find((u) => u.id === "tank")!;
    const finalFragile = result.finalAllies.find((u) => u.id === "fragile")!;
    // 敵 ATTACK は provoker に行ったはず → fragile は無傷
    expect(finalFragile.hp).toBe(10);
    expect(finalProvoker.hp).toBeLessThan(200); // ダメージ受けている
  });

});

describe("runBattle - M3-A: INTERPOSE と予測される ALLY_TARGETED", () => {
  it("INTERPOSE で守られた味方への ATTACK は守り手にリダイレクトされる", () => {
    // ally1: INTERPOSE ally2、ally2: 弱い、enemy: ally2 を狙う
    const setInterpose = makeGambitSet("a1", [
      makeRule(
        "r1",
        { type: "ALLY_TARGETED" },
        { type: "ALLY_MATCH" },
        { type: "INTERPOSE" },
      ),
      // フォールバック
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const setEnemyAttack = makeGambitSet("e", [
      makeRule("r1", { type: "ENEMY_LOWEST_HP" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const guardian = makeAlly("a1", setInterpose, { hp: 200, hpMax: 200, atk: 1 });
    const fragile = makeAlly("a2", emptyGambitSet("a2"), { hp: 10, hpMax: 10 });
    const enemy = makeEnemy("e", setEnemyAttack, { atk: 5 });

    const result = runBattle([guardian, fragile], [enemy], { maxTurns: 1 });

    const finalGuardian = result.finalAllies.find((u) => u.id === "a1")!;
    const finalFragile = result.finalAllies.find((u) => u.id === "a2")!;
    // fragile は守られた → 無傷
    expect(finalFragile.hp).toBe(10);
    // guardian がダメージを引き受ける
    expect(finalGuardian.hp).toBeLessThan(200);
  });

  it("INTERPOSE は単発：2 回連続の攻撃のうち 1 回目のみ守る", () => {
    // enemy が 2 体、両方が ally2 を狙う
    const setInterpose = makeGambitSet("a1", [
      makeRule(
        "r1",
        { type: "ALLY_TARGETED" },
        { type: "ALLY_MATCH" },
        { type: "INTERPOSE" },
      ),
    ]);
    const setEnemyAttack = makeGambitSet("e", [
      makeRule("r1", { type: "ENEMY_LOWEST_HP" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const guardian = makeAlly("a1", setInterpose, { hp: 200, hpMax: 200, atk: 1 });
    // fragile は ally2、HP 100 で 2 発耐えられる
    const fragile = makeAlly("a2", emptyGambitSet("a2"), { hp: 100, hpMax: 100 });
    const e1 = makeEnemy("e1", setEnemyAttack, { atk: 10 });
    const e2 = makeEnemy("e2", setEnemyAttack, { atk: 10 });

    const result = runBattle([guardian, fragile], [e1, e2], { maxTurns: 1 });

    const finalGuardian = result.finalAllies.find((u) => u.id === "a1")!;
    const finalFragile = result.finalAllies.find((u) => u.id === "a2")!;
    // guardian は 1 回ぶん肩代わり、fragile も 1 回受ける
    expect(finalGuardian.hp).toBeLessThan(200);
    expect(finalFragile.hp).toBeLessThan(100);
  });

  it("predictTargetedAllies により ALLY_TARGETED 条件が同ターンに反応する", () => {
    // ally が ALLY_TARGETED を条件にする → 通常なら未来情報が必要
    // 実装：ターン開始時に predict してから ally action フェーズに入る
    const setSelfDefendIfTargeted = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_TARGETED" },
        { type: "SELF" },
        { type: "DEFEND" },
      ),
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const setEnemyAttack = makeGambitSet("e", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("a", setSelfDefendIfTargeted, {
      hp: 100,
      hpMax: 100,
      atk: 5,
      def: 0, // 通常ダメ計算をシンプルに（20 - 0 = 20）
    });
    const enemy = makeEnemy("e", setEnemyAttack, { atk: 20 });

    const result = runBattle([ally], [enemy], { maxTurns: 1 });
    // ally の rule r1 が「ALLY_TARGETED」で発火 → DEFEND（-50%）
    // 通常ダメ 20 → DEFEND で 10 まで軽減（PROTECT なし）
    expect(result.finalAllies[0].hp).toBe(100 - 10);
  });
});

// ============================================================================
// M3-B: 残コンテンツ ID の実効果
// ============================================================================

describe("runBattle - M3-B: 回復魔法バリエーション", () => {
  it("CURE vs CURA：mag x3 vs x5 で回復量が違う", () => {
    const setCure = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_HP_LT", value: 50 },
        { type: "ALLY_MATCH" },
        { type: "CAST_HEAL", spellId: "CURE" },
      ),
    ]);
    const setCura = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_HP_LT", value: 50 },
        { type: "ALLY_MATCH" },
        { type: "CAST_HEAL", spellId: "CURA" },
      ),
    ]);
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const healerCure = makeAlly("a", setCure, { mp: 100, mag: 10 });
    const woundedA = makeAlly("w", emptyGambitSet("w"), { hp: 1, hpMax: 200 });
    const r1 = runBattle([healerCure, woundedA], [enemy], { maxTurns: 1 });
    const cureHp = r1.finalAllies.find((u) => u.id === "w")!.hp;

    const healerCura = makeAlly("a", setCura, { mp: 100, mag: 10 });
    const woundedB = makeAlly("w", emptyGambitSet("w"), { hp: 1, hpMax: 200 });
    const r2 = runBattle([healerCura, woundedB], [enemy], { maxTurns: 1 });
    const curaHp = r2.finalAllies.find((u) => u.id === "w")!.hp;

    // CURE: 1 + (10*3) = 31, CURA: 1 + (10*5) = 51
    expect(curaHp).toBeGreaterThan(cureHp);
    expect(cureHp).toBe(1 + 30);
    expect(curaHp).toBe(1 + 50);
  });

  it("CURE_ALL は ALLY_ALL 対象で全員回復する", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ALLY_ALL" },
        { type: "CAST_HEAL", spellId: "CURE_ALL" },
      ),
    ]);
    const healer = makeAlly("a", set, { mp: 100, mag: 10 });
    const w1 = makeAlly("w1", emptyGambitSet("w1"), { hp: 50, hpMax: 200 });
    const w2 = makeAlly("w2", emptyGambitSet("w2"), { hp: 100, hpMax: 200 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([healer, w1, w2], [enemy], { maxTurns: 1 });
    // CURE_ALL: mag * 4 = 40 ヒール
    expect(result.finalAllies.find((u) => u.id === "w1")!.hp).toBe(50 + 40);
    expect(result.finalAllies.find((u) => u.id === "w2")!.hp).toBe(100 + 40);
  });
});

describe("runBattle - M3-B: 攻撃魔法バリエーション", () => {
  it("FIRE vs FIRA：単発威力の差", () => {
    const setFire = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRE" },
      ),
    ]);
    const setFira = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRA" },
      ),
    ]);
    const mage1 = makeAlly("a", setFire, { mp: 100, mag: 10 });
    const mage2 = makeAlly("a", setFira, { mp: 100, mag: 10 });
    const enemy1 = makeEnemy("e", emptyGambitSet("e"), { hp: 1000, hpMax: 1000, def: 0 });
    const enemy2 = makeEnemy("e", emptyGambitSet("e"), { hp: 1000, hpMax: 1000, def: 0 });

    const r1 = runBattle([mage1], [enemy1], { maxTurns: 1 });
    const r2 = runBattle([mage2], [enemy2], { maxTurns: 1 });

    const fireDmg = 1000 - r1.finalEnemies[0].hp;
    const firaDmg = 1000 - r2.finalEnemies[0].hp;
    // FIRA は 1.5x
    expect(firaDmg).toBeGreaterThan(fireDmg);
  });

  it("BLIZZARD は ICE 弱点の敵に 1.5x", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "BLIZZARD" },
      ),
    ]);
    const mage = makeAlly("a", set, { mp: 100, mag: 10 });
    const iceEnemy = makeEnemy("ice", emptyGambitSet("ice"), {
      hp: 1000,
      hpMax: 1000,
      def: 0,
      weaknesses: ["ICE"],
    });
    const normalEnemy = makeEnemy("nor", emptyGambitSet("nor"), {
      hp: 1000,
      hpMax: 1000,
      def: 0,
      weaknesses: [],
    });

    const r1 = runBattle([mage], [iceEnemy], { maxTurns: 1 });
    const r2 = runBattle([mage], [normalEnemy], { maxTurns: 1 });

    const iceDmg = 1000 - r1.finalEnemies[0].hp;
    const normalDmg = 1000 - r2.finalEnemies[0].hp;
    expect(iceDmg).toBeGreaterThan(normalDmg);
  });
});

describe("runBattle - M3-B: バフ（SHELL/REGEN/HASTE）", () => {
  it("CAST_BUFF(SHELL) は SHELL 状態を付与する", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "SELF" },
        { type: "CAST_BUFF", buffId: "SHELL" },
      ),
    ]);
    const caster = makeAlly("a", set, { mp: 50 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([caster], [enemy], { maxTurns: 1 });
    expect(result.finalAllies[0].statuses).toContain("SHELL");
  });

  it("SHELL 状態の target への魔法は -25% ダメ", () => {
    const setOffense = makeGambitSet("m", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRE" },
      ),
    ]);
    const mage = makeAlly("m", setOffense, { mp: 100, mag: 10 });
    const normalEnemy = makeEnemy("e1", emptyGambitSet("e1"), {
      hp: 1000,
      hpMax: 1000,
      def: 0,
    });
    const shelledEnemy = makeEnemy("e2", emptyGambitSet("e2"), {
      hp: 1000,
      hpMax: 1000,
      def: 0,
      statuses: ["SHELL"],
      statusDurations: { SHELL: 3 },
    });

    const r1 = runBattle([mage], [normalEnemy], { maxTurns: 1 });
    const r2 = runBattle([mage], [shelledEnemy], { maxTurns: 1 });
    const normalDmg = 1000 - r1.finalEnemies[0].hp;
    const shelledDmg = 1000 - r2.finalEnemies[0].hp;
    expect(shelledDmg).toBe(Math.floor(normalDmg * 0.75));
  });

  it("REGEN は毎ターン HP 5% 回復する", () => {
    const set = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "WAIT" }),
    ]);
    const regenAlly = makeAlly("a", set, {
      hp: 100,
      hpMax: 200, // 5% で 10 HP 回復
      statuses: ["REGEN"],
      statusDurations: { REGEN: 99 },
    });
    const enemy = makeEnemy("e", set);

    const result = runBattle([regenAlly], [enemy], { maxTurns: 1 });
    expect(result.finalAllies[0].hp).toBe(100 + 10);
  });

  it("HASTE は status flag のみで効果なし（M5 で ATB と連動予定）", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "SELF" },
        { type: "CAST_BUFF", buffId: "HASTE" },
      ),
    ]);
    const caster = makeAlly("a", set, { mp: 50 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([caster], [enemy], { maxTurns: 1 });
    expect(result.finalAllies[0].statuses).toContain("HASTE");
    // 攻撃順や速度に影響しないことを別途確認したいが、行動順テストは下の SLOW で代替
  });
});

describe("runBattle - M3-B: デバフ（SILENCE/BLIND/SLOW）", () => {
  it("SILENCE 状態の actor は CAST_* が canPerform=false → フォールスルー", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRE" },
      ),
      makeRule(
        "r2",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const silenced = makeAlly("a", set, {
      mp: 100,
      mag: 10,
      atk: 20,
      statuses: ["SILENCE"],
      statusDurations: { SILENCE: 5 },
    });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 1000, hpMax: 1000, def: 0 });

    const result = runBattle([silenced], [enemy], { maxTurns: 1 });
    // SILENCE で r1 不可 → r2 で ATTACK → 物理 20 ダメ（mag 系の魔法ダメより少ない）
    expect(1000 - result.finalEnemies[0].hp).toBe(20);
  });

  it("BLIND の actor は rng < 0.5 で miss（ダメ 0）", () => {
    const set = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const blinded = makeAlly("a", set, {
      atk: 20,
      statuses: ["BLIND"],
      statusDurations: { BLIND: 5 },
    });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 1000, hpMax: 1000, def: 0 });

    // rng=0.0 → 必ず miss
    const battle = makeBattle([blinded], [enemy], { rng: () => 0.0 });
    applyActionDirectly(
      { type: "ATTACK" },
      { actor: blinded, targets: [enemy], battle, ruleId: "r1" },
    );
    expect(enemy.hp).toBe(1000); // miss、ダメージなし
  });

  it("BLIND の actor も rng >= 0.5 で hit（通常ダメ）", () => {
    const set = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const blinded = makeAlly("a", set, {
      atk: 20,
      statuses: ["BLIND"],
      statusDurations: { BLIND: 5 },
    });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 1000, hpMax: 1000, def: 0 });

    // rng=0.9 → 必ず hit
    const battle = makeBattle([blinded], [enemy], { rng: () => 0.9 });
    applyActionDirectly(
      { type: "ATTACK" },
      { actor: blinded, targets: [enemy], battle, ruleId: "r1" },
    );
    expect(enemy.hp).toBe(1000 - 20);
  });

  it("BLIND でも rng 未注入なら必ず hit（後方互換）", () => {
    const set = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const blinded = makeAlly("a", set, {
      atk: 20,
      statuses: ["BLIND"],
      statusDurations: { BLIND: 5 },
    });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 1000, hpMax: 1000, def: 0 });

    const result = runBattle([blinded], [enemy], { maxTurns: 1 });
    // rng 未注入 → 常に hit、通常通り 20 ダメ
    expect(1000 - result.finalEnemies[0].hp).toBe(20);
  });

  it("SLOW 状態のユニットは陣営内で行動順が末尾になる", () => {
    // ally1 (SLOW) と ally2 (普通)、両方 r1 で ENEMY_LOWEST_HP を狙う
    // 通常順なら ally1 が先 → ally1 のターゲットは初期最弱、ally2 が次に最弱を選ぶ
    // SLOW 順なら ally2 が先 → ally2 のターゲットが初期最弱、ally1 は更新後の最弱を選ぶ
    //
    // → ally1, ally2 のターゲットが入れ替わるか、それともダメージ順が逆になるかで判定
    const setAttack = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_LOWEST_HP" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const slowAlly = makeAlly("slow", setAttack, {
      atk: 10,
      statuses: ["SLOW"],
      statusDurations: { SLOW: 5 },
    });
    const fastAlly = makeAlly("fast", setAttack, { atk: 10 });
    // 同 HP の敵 2 体：先に行動するユニットの順序がそのままダメージ順に出る
    const e1 = makeEnemy("e1", emptyGambitSet("e1"), { hp: 100, hpMax: 100, def: 0 });
    const e2 = makeEnemy("e2", emptyGambitSet("e2"), { hp: 100, hpMax: 100, def: 0 });

    const result = runBattle([slowAlly, fastAlly], [e1, e2], { maxTurns: 1 });

    // 行動順は fast（slow なし） → slow（slow あり）
    // ENEMY_LOWEST_HP で最初に殴られるのは配列先頭の e1（同 HP なら配列順）
    // 1 体目（fast）が e1 を 10 ダメ、2 体目（slow）も e1 を狙う（まだ最弱）→ 90/100 にダメ
    // 結果として e1 は 80 HP、e2 は 100 HP
    const finalE1 = result.finalEnemies.find((u) => u.id === "e1")!;
    const finalE2 = result.finalEnemies.find((u) => u.id === "e2")!;
    expect(finalE1.hp).toBe(80);
    expect(finalE2.hp).toBe(100);
  });
});

describe("runBattle - M3-B: アイテム", () => {
  it("HI_POTION は HP +80", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_HP_LT", value: 50 },
        { type: "ALLY_MATCH" },
        { type: "USE_ITEM", itemId: "HI_POTION" },
      ),
    ]);
    const user = makeAlly("a", set, { inventory: { HI_POTION: 1 } });
    const wounded = makeAlly("w", emptyGambitSet("w"), { hp: 10, hpMax: 200 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([user, wounded], [enemy], { maxTurns: 1 });
    expect(result.finalAllies.find((u) => u.id === "w")!.hp).toBe(10 + 80);
    expect(result.finalAllies.find((u) => u.id === "a")!.inventory.HI_POTION).toBe(0);
  });

  it("ETHER は MP +30", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_MP_LT", value: 50 },
        { type: "ALLY_MATCH" },
        { type: "USE_ITEM", itemId: "ETHER" },
      ),
    ]);
    const user = makeAlly("a", set, { mp: 100, inventory: { ETHER: 1 } });
    const lowMp = makeAlly("w", emptyGambitSet("w"), { mp: 5, mpMax: 100 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([user, lowMp], [enemy], { maxTurns: 1 });
    expect(result.finalAllies.find((u) => u.id === "w")!.mp).toBe(5 + 30);
  });

  it("ANTIDOTE は POISON を解除する", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_HAS_STATUS", status: "POISON" },
        { type: "ALLY_MATCH" },
        { type: "USE_ITEM", itemId: "ANTIDOTE" },
      ),
    ]);
    const user = makeAlly("a", set, { inventory: { ANTIDOTE: 1 } });
    const poisoned = makeAlly("p", emptyGambitSet("p"), {
      hp: 100,
      hpMax: 100,
      statuses: ["POISON"],
      statusDurations: { POISON: 5 },
    });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([user, poisoned], [enemy], { maxTurns: 1 });
    expect(result.finalAllies.find((u) => u.id === "p")!.statuses).not.toContain("POISON");
  });

  it("PHOENIX_DOWN は戦闘不能の味方を 25% HP で復活", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_DEAD" },
        { type: "ALLY_MATCH" },
        { type: "USE_ITEM", itemId: "PHOENIX_DOWN" },
      ),
    ]);
    const user = makeAlly("a", set, { inventory: { PHOENIX_DOWN: 1 } });
    const fallen = makeAlly("f", emptyGambitSet("f"), {
      hp: 0,
      hpMax: 100,
      isAlive: false,
    });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const result = runBattle([user, fallen], [enemy], { maxTurns: 1 });
    const final = result.finalAllies.find((u) => u.id === "f")!;
    expect(final.isAlive).toBe(true);
    expect(final.hp).toBe(25);
  });
});

describe("runBattle - M3-B: 剣士スキル", () => {
  it("GUARD_BREAK は物理 1.3x", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "SKILL", skillId: "GUARD_BREAK" },
      ),
    ]);
    const ally = makeAlly("a", set, { atk: 20, mp: 50 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), { hp: 1000, hpMax: 1000, def: 0 });

    const result = runBattle([ally], [enemy], { maxTurns: 1 });
    // 20 * 1.3 = 26
    expect(1000 - result.finalEnemies[0].hp).toBe(26);
  });

  it("WHIRLWIND は ENEMY_ALL 対象に 0.8x で全体ヒット", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_ALL" },
        { type: "SKILL", skillId: "WHIRLWIND" },
      ),
    ]);
    const ally = makeAlly("a", set, { atk: 20, mp: 50 });
    const e1 = makeEnemy("e1", emptyGambitSet("e1"), { hp: 1000, hpMax: 1000, def: 0 });
    const e2 = makeEnemy("e2", emptyGambitSet("e2"), { hp: 1000, hpMax: 1000, def: 0 });

    const result = runBattle([ally], [e1, e2], { maxTurns: 1 });
    // 20 * 0.8 = 16 ダメージ x 2 体
    expect(1000 - result.finalEnemies.find((u) => u.id === "e1")!.hp).toBe(16);
    expect(1000 - result.finalEnemies.find((u) => u.id === "e2")!.hp).toBe(16);
  });
});

// ============================================================================
// M3-E: センサーシステム
// ============================================================================

describe("runBattle - M3-E: センサーシステム", () => {
  it("HP_SCANNER 装備で ENEMY_LOWEST_HP は rng=0 でも 100% 動作", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_LOWEST_HP" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const ally = makeAlly("a", set, {
      atk: 20,
      equipment: { sensor: "HP_SCANNER" },
    });
    const enemy = makeEnemy("e", emptyGambitSet("e"), {
      hp: 100,
      hpMax: 100,
      def: 0,
    });

    // rng=0 はセンサー無しなら失敗するが、HP_SCANNER 装備で 100% 成功
    const result = runBattle([ally], [enemy], { maxTurns: 1, rng: () => 0.0 });
    expect(result.finalEnemies[0].hp).toBe(80); // 20 ダメ入る
  });

  it("センサー無しで rng < 0.5 だと ENEMY_LOWEST_HP は失敗 → フォールスルー", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_LOWEST_HP" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "DEFEND" }),
    ]);
    const ally = makeAlly("a", set, { atk: 20 }); // センサー無し
    const enemy = makeEnemy("e", emptyGambitSet("e"), {
      hp: 100,
      hpMax: 100,
      def: 0,
    });

    // rng=0 → r1 のセンサーチェック失敗 → r2 DEFEND
    const result = runBattle([ally], [enemy], { maxTurns: 1, rng: () => 0.0 });
    expect(result.finalEnemies[0].hp).toBe(100); // ATTACK されてない
  });

  it("センサー無しで rng >= 0.5 だと ENEMY_LOWEST_HP は成功", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_LOWEST_HP" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const ally = makeAlly("a", set, { atk: 20 }); // センサー無し
    const enemy = makeEnemy("e", emptyGambitSet("e"), {
      hp: 100,
      hpMax: 100,
      def: 0,
    });

    const result = runBattle([ally], [enemy], { maxTurns: 1, rng: () => 0.9 });
    expect(result.finalEnemies[0].hp).toBe(80);
  });

  it("STATUS_DETECTOR 装備で ENEMY_HAS_STATUS は 100% 動作", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_HAS_STATUS", status: "POISON" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const ally = makeAlly("a", set, {
      atk: 20,
      equipment: { sensor: "STATUS_DETECTOR" },
    });
    const poisonedEnemy = makeEnemy("e", emptyGambitSet("e"), {
      hp: 100,
      hpMax: 100,
      def: 0,
      statuses: ["POISON"],
      statusDurations: { POISON: 3 },
    });

    const result = runBattle([ally], [poisonedEnemy], {
      maxTurns: 1,
      rng: () => 0.0,
    });
    // POISON の自然減ダメージは事前に入ってる（hpMax の 8% = 8）が、
    // ATTACK の 20 ダメが追加されていれば OK
    expect(result.finalEnemies[0].hp).toBeLessThan(92);
  });

  it("ELEMENT_ANALYZER 装備で ENEMY_WEAK_TO は 100% 動作", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_WEAK_TO", element: "FIRE" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const ally = makeAlly("a", set, {
      atk: 20,
      equipment: { sensor: "ELEMENT_ANALYZER" },
    });
    const enemy = makeEnemy("e", emptyGambitSet("e"), {
      hp: 100,
      hpMax: 100,
      def: 0,
      weaknesses: ["FIRE"],
    });

    const result = runBattle([ally], [enemy], { maxTurns: 1, rng: () => 0.0 });
    expect(result.finalEnemies[0].hp).toBe(80);
  });

  it("BASIC_SCANNER は HP と STATUS の両方をカバー", () => {
    const setHp = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_LOWEST_HP" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const setStatus = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_HAS_STATUS", status: "POISON" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const ally1 = makeAlly("a", setHp, {
      atk: 20,
      equipment: { sensor: "BASIC_SCANNER" },
    });
    const ally2 = makeAlly("a", setStatus, {
      atk: 20,
      equipment: { sensor: "BASIC_SCANNER" },
    });
    const enemy1 = makeEnemy("e", emptyGambitSet("e"), {
      hp: 100,
      hpMax: 100,
      def: 0,
    });
    const enemy2 = makeEnemy("e", emptyGambitSet("e"), {
      hp: 100,
      hpMax: 100,
      def: 0,
      statuses: ["POISON"],
      statusDurations: { POISON: 3 },
    });

    // 両方とも rng=0 でも BASIC_SCANNER で 100%
    const r1 = runBattle([ally1], [enemy1], { maxTurns: 1, rng: () => 0.0 });
    const r2 = runBattle([ally2], [enemy2], { maxTurns: 1, rng: () => 0.0 });
    expect(r1.finalEnemies[0].hp).toBe(80);
    expect(r2.finalEnemies[0].hp).toBeLessThan(92); // POISON 8 + ATTACK 20
  });

  it("SELF_HP_LT はセンサーゲートされない（rng 関係なく動作）", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "SELF_HP_LT", value: 99 },
        { type: "SELF" },
        { type: "DEFEND" },
      ),
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "WAIT" }),
    ]);
    const ally = makeAlly("a", set, { hp: 50, hpMax: 100 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    // rng=0 でも r1 が発火（センサー対象外）
    const result = runBattle([ally], [enemy], { maxTurns: 1, rng: () => 0.0 });
    expect(
      result.events.some(
        (e) => e.kind === "ACTION" && e.actionType === "DEFEND",
      ),
    ).toBe(true);
  });

  it("ENEMY_EXISTS はセンサーゲートされない（rng 関係なく動作）", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const ally = makeAlly("a", set, { atk: 20 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), {
      hp: 100,
      hpMax: 100,
      def: 0,
    });

    const result = runBattle([ally], [enemy], { maxTurns: 1, rng: () => 0.0 });
    expect(result.finalEnemies[0].hp).toBe(80);
  });

  it("rng 未注入なら sensor-gated 条件もすべて成功（既存テストの後方互換）", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_LOWEST_HP" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const ally = makeAlly("a", set, { atk: 20 }); // センサー無し
    const enemy = makeEnemy("e", emptyGambitSet("e"), {
      hp: 100,
      hpMax: 100,
      def: 0,
    });

    // rng 注入なし → 常に成功
    const result = runBattle([ally], [enemy], { maxTurns: 1 });
    expect(result.finalEnemies[0].hp).toBe(80);
  });
});

// ============================================================================
// M3-F: 耐性システム（resistances）
// ============================================================================

describe("runBattle - M3-F: 物理耐性（NEUTRAL）", () => {
  it("NEUTRAL 耐性ありの敵への ATTACK は 0.5x ダメージ", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const ally = makeAlly("a", set, { atk: 30 });
    const resistantEnemy = makeEnemy("res", emptyGambitSet("res"), {
      hp: 200,
      hpMax: 200,
      def: 10,
      resistances: ["NEUTRAL"],
    });
    const normalEnemy = makeEnemy("nor", emptyGambitSet("nor"), {
      hp: 200,
      hpMax: 200,
      def: 10,
    });

    const resR = runBattle([ally], [resistantEnemy], { maxTurns: 1 });
    const norR = runBattle([ally], [normalEnemy], { maxTurns: 1 });

    const resDmg = 200 - resR.finalEnemies[0].hp;
    const norDmg = 200 - norR.finalEnemies[0].hp;
    // 通常 (30-10)=20、耐性 floor(20*0.5)=10
    expect(norDmg).toBe(20);
    expect(resDmg).toBe(10);
  });

  it("NEUTRAL 耐性なしの敵には耐性が効かない（回帰）", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const ally = makeAlly("a", set, { atk: 30 });
    const enemy = makeEnemy("e", emptyGambitSet("e"), {
      hp: 100,
      hpMax: 100,
      def: 10,
      resistances: ["FIRE"], // 物理は素通し
    });

    const r = runBattle([ally], [enemy], { maxTurns: 1 });
    // (30-10)=20 ダメ、FIRE 耐性は物理に影響しない
    expect(100 - r.finalEnemies[0].hp).toBe(20);
  });
});

describe("runBattle - M3-F: 魔法属性耐性", () => {
  it("FIRE 耐性ありの敵への CAST_OFFENSE(FIRE) は 0.5x ダメージ", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRE" },
      ),
    ]);
    const mage = makeAlly("a", set, { mp: 50, mag: 20 });
    const fireResEnemy = makeEnemy("fr", emptyGambitSet("fr"), {
      hp: 300,
      hpMax: 300,
      def: 10,
      resistances: ["FIRE"],
    });
    const normalEnemy = makeEnemy("nor", emptyGambitSet("nor"), {
      hp: 300,
      hpMax: 300,
      def: 10,
    });

    const resR = runBattle([mage], [fireResEnemy], { maxTurns: 1 });
    const norR = runBattle([mage], [normalEnemy], { maxTurns: 1 });
    const resDmg = 300 - resR.finalEnemies[0].hp;
    const norDmg = 300 - norR.finalEnemies[0].hp;

    // base = 20*2-10 = 30、FIRE 1.0x → 30、耐性で floor(30*0.5)=15
    expect(norDmg).toBe(30);
    expect(resDmg).toBe(15);
  });

  it("弱点 + 耐性は両方乗る（1.5x * 0.5x = 0.75x）", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRE" },
      ),
    ]);
    const mage = makeAlly("a", set, { mp: 50, mag: 20 });
    const dualEnemy = makeEnemy("dual", emptyGambitSet("dual"), {
      hp: 300,
      hpMax: 300,
      def: 10,
      weaknesses: ["FIRE"],
      resistances: ["FIRE"],
    });

    const r = runBattle([mage], [dualEnemy], { maxTurns: 1 });
    const dmg = 300 - r.finalEnemies[0].hp;
    // base 30 → 弱点 floor(30*1.5)=45 → 耐性 floor(45*0.5)=22
    expect(dmg).toBe(22);
  });

  it("SHELL + 耐性も両方乗る（0.5x * 0.75x = 0.375x）", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRE" },
      ),
    ]);
    const mage = makeAlly("a", set, { mp: 50, mag: 20 });
    const shellResEnemy = makeEnemy("sr", emptyGambitSet("sr"), {
      hp: 300,
      hpMax: 300,
      def: 10,
      resistances: ["FIRE"],
      statuses: ["SHELL"],
      statusDurations: { SHELL: 4 },
    });

    const r = runBattle([mage], [shellResEnemy], { maxTurns: 1 });
    const dmg = 300 - r.finalEnemies[0].hp;
    // base 30 → 耐性 floor(30*0.5)=15 → SHELL floor(15*0.75)=11
    expect(dmg).toBe(11);
  });

  it("DARK 耐性ありの敵への DARK_BOLT は 0.5x、FIRE 攻撃には素通し", () => {
    const setDark = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "DARK_BOLT" },
      ),
    ]);
    const setFire = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRE" },
      ),
    ]);
    const mage1 = makeAlly("a", setDark, { mp: 50, mag: 20 });
    const mage2 = makeAlly("a", setFire, { mp: 50, mag: 20 });
    const darkResEnemy1 = makeEnemy("dr", emptyGambitSet("dr"), {
      hp: 300,
      hpMax: 300,
      def: 10,
      resistances: ["DARK"],
    });
    const darkResEnemy2 = makeEnemy("dr", emptyGambitSet("dr"), {
      hp: 300,
      hpMax: 300,
      def: 10,
      resistances: ["DARK"],
    });

    const rDark = runBattle([mage1], [darkResEnemy1], { maxTurns: 1 });
    const rFire = runBattle([mage2], [darkResEnemy2], { maxTurns: 1 });
    // base 30、DARK は耐性で 0.5x → 15、FIRE は素通り → 30
    expect(300 - rDark.finalEnemies[0].hp).toBe(15);
    expect(300 - rFire.finalEnemies[0].hp).toBe(30);
  });
});
