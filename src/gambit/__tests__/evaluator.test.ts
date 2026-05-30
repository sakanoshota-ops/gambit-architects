/**
 * ガンビット評価器のコアテスト（M1 Phase 1：RED 段階）
 *
 * - 関連仕様: docs/gambit_dsl_spec.md §11、docs/m1_checklist.md §4
 * - この段階では `decideAction` がスタブ（throws NotImplemented）なので**全 RED** の想定。
 * - 実装が進むにつれて順次 GREEN に変えていく。
 *
 * カバー範囲（12 テスト）：
 *  1. 戦闘中フォールバック：ENEMY_EXISTS → ATTACK
 *  2. 優先度順：上のルールが成立すると下は評価されない
 *  3. MATCH 解決：ALLY_HP_LT → HP%最低の味方
 *  4. MATCH 解決：ALLY_HP_GTE → HP%最高の味方
 *  5. MATCH 解決：ENEMY_LOWEST_HP → HP実数最低の敵
 *  6. MATCH 解決：ENEMY_HIGHEST_HP → HP実数最高の敵
 *  7. フォールスルー：MP 不足 → 次のルールへ
 *  8. フォールスルー：対象不在（ALLY_DEAD で死者ゼロ）→ 次のルールへ
 *  9. enabled:false のルールはスキップされる
 * 10. 全ルール不成立 → null（待機）
 * 11. BOSS_PRESENT：ボスがいない場合は偽、いる場合は真
 * 12. 敵 actor からの視点：同じ評価器で対称に動く
 */

import { describe, expect, it } from "vitest";

import { decideAction } from "../evaluator";
import {
  emptyGambitSet,
  makeAlly,
  makeBattle,
  makeEnemy,
  makeGambitSet,
  makeRule,
} from "../../test/factories";

describe("decideAction", () => {
  // --------------------------------------------------------------------------
  // 1. 基本：戦闘中フォールバック
  // --------------------------------------------------------------------------
  it("ENEMY_EXISTS をフォールバックにすると ATTACK が選ばれる", () => {
    const allySet = makeGambitSet("ally_1", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("ally_1", allySet);
    const enemy = makeEnemy("enemy_1", emptyGambitSet("enemy_1"));
    const battle = makeBattle([ally], [enemy]);

    const decision = decideAction(ally, battle);

    expect(decision).not.toBeNull();
    expect(decision!.ruleId).toBe("r1");
    expect(decision!.action.type).toBe("ATTACK");
    expect(decision!.targetIds).toContain("enemy_1");
  });

  // --------------------------------------------------------------------------
  // 2. 優先度順
  // --------------------------------------------------------------------------
  it("上のルールが成立すると下のルールは評価されない", () => {
    const allySet = makeGambitSet("ally_1", [
      // 上：味方の誰かが HP 50% 未満ならケアル
      makeRule(
        "r1",
        { type: "ALLY_HP_LT", value: 50 },
        { type: "ALLY_MATCH" },
        { type: "CAST_HEAL", spellId: "CURE" },
      ),
      // 下：通常攻撃
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally1 = makeAlly("ally_1", allySet, { mp: 50 });
    const ally2 = makeAlly("ally_2", emptyGambitSet("ally_2"), { hp: 20, hpMax: 100 });
    const enemy = makeEnemy("enemy_1", emptyGambitSet("enemy_1"));
    const battle = makeBattle([ally1, ally2], [enemy]);

    const decision = decideAction(ally1, battle);

    expect(decision!.ruleId).toBe("r1");
    expect(decision!.action.type).toBe("CAST_HEAL");
    expect(decision!.targetIds).toEqual(["ally_2"]);
  });

  // --------------------------------------------------------------------------
  // 3. MATCH 解決：ALLY_HP_LT → HP%最低
  // --------------------------------------------------------------------------
  it("ALLY_HP_LT の MATCH は HP% 最低の味方になる", () => {
    const set = makeGambitSet("ally_1", [
      makeRule(
        "r1",
        { type: "ALLY_HP_LT", value: 60 },
        { type: "ALLY_MATCH" },
        { type: "CAST_HEAL", spellId: "CURE" },
      ),
    ]);
    const healer = makeAlly("ally_1", set);
    // HP% : ally_2 = 50%, ally_3 = 20% （最低）
    const wounded = makeAlly("ally_3", emptyGambitSet("ally_3"), { hp: 20, hpMax: 100 });
    const halfHp = makeAlly("ally_2", emptyGambitSet("ally_2"), { hp: 50, hpMax: 100 });
    const enemy = makeEnemy("enemy_1", emptyGambitSet("enemy_1"));
    const battle = makeBattle([healer, halfHp, wounded], [enemy]);

    const decision = decideAction(healer, battle);

    expect(decision!.targetIds).toEqual(["ally_3"]);
  });

  // --------------------------------------------------------------------------
  // 4. MATCH 解決：ALLY_HP_GTE → HP%最高
  // --------------------------------------------------------------------------
  it("ALLY_HP_GTE の MATCH は HP% 最高の味方になる（ALLY_* は自分も含む点に注意）", () => {
    const set = makeGambitSet("ally_1", [
      makeRule(
        "r1",
        { type: "ALLY_HP_GTE", value: 80 },
        { type: "ALLY_MATCH" },
        { type: "CAST_BUFF", buffId: "PROTECT" },
      ),
    ]);
    // ALLY_* は自分も「味方」に含むため、caster の HP は閾値未満にして候補外にする。
    // そうしないと caster (100% HP) が MATCH になってしまい、ally_3 が選ばれない。
    const caster = makeAlly("ally_1", set, { hp: 50, hpMax: 100 }); // 50%（候補外）
    const healthy = makeAlly("ally_2", emptyGambitSet("ally_2"), { hp: 80, hpMax: 100 }); // 80%（候補）
    const veryHealthy = makeAlly("ally_3", emptyGambitSet("ally_3"), { hp: 95, hpMax: 100 }); // 95%（候補・最高）
    const enemy = makeEnemy("enemy_1", emptyGambitSet("enemy_1"));
    const battle = makeBattle([caster, healthy, veryHealthy], [enemy]);

    const decision = decideAction(caster, battle);

    expect(decision!.targetIds).toEqual(["ally_3"]);
  });

  // --------------------------------------------------------------------------
  // 5. MATCH 解決：ENEMY_LOWEST_HP → HP 実数最低の敵
  // --------------------------------------------------------------------------
  it("ENEMY_LOWEST_HP の MATCH は HP 実数最低の敵になる", () => {
    const set = makeGambitSet("ally_1", [
      makeRule("r1", { type: "ENEMY_LOWEST_HP" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("ally_1", set);
    const enemyA = makeEnemy("enemy_A", emptyGambitSet("enemy_A"), { hp: 30 });
    const enemyB = makeEnemy("enemy_B", emptyGambitSet("enemy_B"), { hp: 5 }); // 最低
    const enemyC = makeEnemy("enemy_C", emptyGambitSet("enemy_C"), { hp: 50 });
    const battle = makeBattle([ally], [enemyA, enemyB, enemyC]);

    const decision = decideAction(ally, battle);

    expect(decision!.targetIds).toEqual(["enemy_B"]);
  });

  // --------------------------------------------------------------------------
  // 6. MATCH 解決：ENEMY_HIGHEST_HP → HP 実数最高の敵
  // --------------------------------------------------------------------------
  it("ENEMY_HIGHEST_HP の MATCH は HP 実数最高の敵になる", () => {
    const set = makeGambitSet("ally_1", [
      makeRule("r1", { type: "ENEMY_HIGHEST_HP" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("ally_1", set);
    const enemyA = makeEnemy("enemy_A", emptyGambitSet("enemy_A"), { hp: 30 });
    const enemyB = makeEnemy("enemy_B", emptyGambitSet("enemy_B"), { hp: 80 }); // 最高
    const enemyC = makeEnemy("enemy_C", emptyGambitSet("enemy_C"), { hp: 50 });
    const battle = makeBattle([ally], [enemyA, enemyB, enemyC]);

    const decision = decideAction(ally, battle);

    expect(decision!.targetIds).toEqual(["enemy_B"]);
  });

  // --------------------------------------------------------------------------
  // 7. フォールスルー：MP 不足
  // --------------------------------------------------------------------------
  it("MP 不足のときは次のルールにフォールスルーする", () => {
    const set = makeGambitSet("ally_1", [
      // 上：MP 12 必要なケアラ。actor の MP は 5 しかない → 実行不能
      makeRule(
        "r1",
        { type: "ALLY_HP_LT", value: 60 },
        { type: "ALLY_MATCH" },
        { type: "CAST_HEAL", spellId: "CURA" },
      ),
      // 下：通常攻撃
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("ally_1", set, { mp: 5, mpMax: 50 });
    const wounded = makeAlly("ally_2", emptyGambitSet("ally_2"), { hp: 30, hpMax: 100 });
    const enemy = makeEnemy("enemy_1", emptyGambitSet("enemy_1"));
    const battle = makeBattle([ally, wounded], [enemy]);

    const decision = decideAction(ally, battle);

    expect(decision!.ruleId).toBe("r2");
    expect(decision!.action.type).toBe("ATTACK");
  });

  // --------------------------------------------------------------------------
  // 8. フォールスルー：対象不在
  // --------------------------------------------------------------------------
  it("ALLY_DEAD で死者ゼロのときは次のルールにフォールスルーする", () => {
    const set = makeGambitSet("ally_1", [
      // 上：戦闘不能の味方を蘇生
      makeRule(
        "r1",
        { type: "ALLY_DEAD" },
        { type: "ALLY_MATCH" },
        { type: "CAST_REVIVE", spellId: "RAISE" },
      ),
      // 下：通常攻撃
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("ally_1", set, { mp: 50 });
    const ally2 = makeAlly("ally_2", emptyGambitSet("ally_2")); // 生存
    const enemy = makeEnemy("enemy_1", emptyGambitSet("enemy_1"));
    const battle = makeBattle([ally, ally2], [enemy]);

    const decision = decideAction(ally, battle);

    expect(decision!.ruleId).toBe("r2");
    expect(decision!.action.type).toBe("ATTACK");
  });

  // --------------------------------------------------------------------------
  // 9. 無効化トグル
  // --------------------------------------------------------------------------
  it("enabled:false のルールはスキップされる", () => {
    const set = makeGambitSet("ally_1", [
      // 上：通常攻撃だが無効化されている
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
        false, // enabled = false
      ),
      // 下：防御
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "DEFEND" }),
    ]);
    const ally = makeAlly("ally_1", set);
    const enemy = makeEnemy("enemy_1", emptyGambitSet("enemy_1"));
    const battle = makeBattle([ally], [enemy]);

    const decision = decideAction(ally, battle);

    expect(decision!.ruleId).toBe("r2");
    expect(decision!.action.type).toBe("DEFEND");
  });

  // --------------------------------------------------------------------------
  // 10. 全ルール不成立
  // --------------------------------------------------------------------------
  it("敵がゼロでフォールバックも不成立なら null を返す", () => {
    const set = makeGambitSet("ally_1", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("ally_1", set);
    const battle = makeBattle([ally], []); // 敵ゼロ

    const decision = decideAction(ally, battle);

    expect(decision).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 11. BOSS_PRESENT
  // --------------------------------------------------------------------------
  it("BOSS_PRESENT は通常敵では偽、ボスがいると真", () => {
    const set = makeGambitSet("ally_1", [
      makeRule("r1", { type: "BOSS_PRESENT" }, { type: "SELF" }, { type: "DEFEND" }),
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = makeAlly("ally_1", set);

    // ケース A: 通常敵のみ → r1 不成立 → r2 で ATTACK
    const normalEnemy = makeEnemy("enemy_1", emptyGambitSet("enemy_1"), { isBoss: false });
    const battleA = makeBattle([ally], [normalEnemy]);
    const decisionA = decideAction(ally, battleA);
    expect(decisionA!.ruleId).toBe("r2");

    // ケース B: ボス入り → r1 成立 → DEFEND
    const boss = makeEnemy("enemy_boss", emptyGambitSet("enemy_boss"), {
      isBoss: true,
      enemyType: "BOSS",
    });
    const battleB = makeBattle([ally], [normalEnemy, boss]);
    const decisionB = decideAction(ally, battleB);
    expect(decisionB!.ruleId).toBe("r1");
    expect(decisionB!.action.type).toBe("DEFEND");
  });

  // --------------------------------------------------------------------------
  // 12. 敵 actor の対称性
  // --------------------------------------------------------------------------
  it("敵 actor の視点でも ENEMY_EXISTS は対称に動く（味方人間を攻撃する）", () => {
    // 敵が actor。「敵から見た敵」= プレイヤー側ユニット
    const enemySet = makeGambitSet("enemy_1", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const enemy = makeEnemy("enemy_1", enemySet);
    const ally = makeAlly("ally_1", emptyGambitSet("ally_1"));
    const battle = makeBattle([ally], [enemy]);

    const decision = decideAction(enemy, battle);

    expect(decision!.action.type).toBe("ATTACK");
    expect(decision!.targetIds).toContain("ally_1");
  });
});

// ============================================================================
// Phase 2: 条件カバレッジ補完
// ============================================================================

describe("decideAction - condition coverage", () => {
  /**
   * 共通ヘルパ：「条件 → SELF → DEFEND」「ENEMY_EXISTS → ENEMY_MATCH → ATTACK」
   * の 2 段構造を組み立てて、上のルールが当たれば DEFEND（ruleId r1）、
   * 当たらなければ ATTACK（ruleId r2）にフォールスルー、という形で真偽を確認する。
   */
  function selfBoundarySet(
    condition: Parameters<typeof makeRule>[1],
  ) {
    return makeGambitSet("a", [
      makeRule("r1", condition, { type: "SELF" }, { type: "DEFEND" }),
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
  }

  // --------------------------------------------------------------------------
  // 境界値テスト
  // --------------------------------------------------------------------------
  it("SELF_HP_LT(50) は境界 49/50/51 で真偽が切り替わる", () => {
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    for (const [hp, expected] of [
      [49, "r1"],
      [50, "r2"],
      [51, "r2"],
    ] as const) {
      const actor = makeAlly("a", selfBoundarySet({ type: "SELF_HP_LT", value: 50 }), {
        hp,
        hpMax: 100,
      });
      expect(decideAction(actor, makeBattle([actor], [enemy]))!.ruleId).toBe(expected);
    }
  });

  it("SELF_HP_GTE(80) は境界 79/80/81 で真偽が切り替わる", () => {
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    for (const [hp, expected] of [
      [79, "r2"],
      [80, "r1"],
      [81, "r1"],
    ] as const) {
      const actor = makeAlly("a", selfBoundarySet({ type: "SELF_HP_GTE", value: 80 }), {
        hp,
        hpMax: 100,
      });
      expect(decideAction(actor, makeBattle([actor], [enemy]))!.ruleId).toBe(expected);
    }
  });

  it("SELF_MP_LT(20) は境界 19/20/21 で真偽が切り替わる", () => {
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    for (const [mp, expected] of [
      [19, "r1"],
      [20, "r2"],
      [21, "r2"],
    ] as const) {
      const actor = makeAlly("a", selfBoundarySet({ type: "SELF_MP_LT", value: 20 }), {
        mp,
        mpMax: 100,
      });
      expect(decideAction(actor, makeBattle([actor], [enemy]))!.ruleId).toBe(expected);
    }
  });

  it("SELF_MP_GTE(50) は境界 49/50/51 で真偽が切り替わる", () => {
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    for (const [mp, expected] of [
      [49, "r2"],
      [50, "r1"],
      [51, "r1"],
    ] as const) {
      const actor = makeAlly("a", selfBoundarySet({ type: "SELF_MP_GTE", value: 50 }), {
        mp,
        mpMax: 100,
      });
      expect(decideAction(actor, makeBattle([actor], [enemy]))!.ruleId).toBe(expected);
    }
  });

  // --------------------------------------------------------------------------
  // 状態異常
  // --------------------------------------------------------------------------
  it("SELF_HAS_STATUS(POISON): 自分に毒があれば真", () => {
    const set = selfBoundarySet({ type: "SELF_HAS_STATUS", status: "POISON" });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const poisoned = makeAlly("a", set, { statuses: ["POISON"] });
    expect(decideAction(poisoned, makeBattle([poisoned], [enemy]))!.ruleId).toBe("r1");

    const clean = makeAlly("a", set);
    expect(decideAction(clean, makeBattle([clean], [enemy]))!.ruleId).toBe("r2");
  });

  it("SELF_NO_STATUS(POISON): 自分に毒がなければ真", () => {
    const set = selfBoundarySet({ type: "SELF_NO_STATUS", status: "POISON" });
    const enemy = makeEnemy("e", emptyGambitSet("e"));

    const clean = makeAlly("a", set);
    expect(decideAction(clean, makeBattle([clean], [enemy]))!.ruleId).toBe("r1");

    const poisoned = makeAlly("a", set, { statuses: ["POISON"] });
    expect(decideAction(poisoned, makeBattle([poisoned], [enemy]))!.ruleId).toBe("r2");
  });

  // --------------------------------------------------------------------------
  // ALLY MATCH 系（MP 版・状態・狙われている）
  // --------------------------------------------------------------------------
  it("ALLY_MP_LT の MATCH は MP% 最低の味方", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_MP_LT", value: 50 },
        { type: "ALLY_MATCH" },
        { type: "USE_ITEM", itemId: "ETHER" },
      ),
    ]);
    const caster = makeAlly("a", set, { mp: 80, mpMax: 100, inventory: { ETHER: 3 } });
    const lowMp = makeAlly("low", emptyGambitSet("low"), { mp: 10, mpMax: 100 }); // 10%（最低）
    const midMp = makeAlly("mid", emptyGambitSet("mid"), { mp: 40, mpMax: 100 }); // 40%
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    const battle = makeBattle([caster, midMp, lowMp], [enemy]);

    expect(decideAction(caster, battle)!.targetIds).toEqual(["low"]);
  });

  it("ALLY_MP_GTE の MATCH は MP% 最高の味方", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_MP_GTE", value: 80 },
        { type: "ALLY_MATCH" },
        { type: "CAST_BUFF", buffId: "HASTE" },
      ),
    ]);
    const caster = makeAlly("a", set, { mp: 50, mpMax: 100 }); // 50%（候補外）
    const fullMp = makeAlly("full", emptyGambitSet("full"), { mp: 100, mpMax: 100 }); // 100%（最高）
    const eightyMp = makeAlly("80mp", emptyGambitSet("80mp"), { mp: 80, mpMax: 100 }); // 80%
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    const battle = makeBattle([caster, eightyMp, fullMp], [enemy]);

    expect(decideAction(caster, battle)!.targetIds).toEqual(["full"]);
  });

  it("ALLY_HAS_STATUS(POISON) は毒の味方を MATCH に取る", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_HAS_STATUS", status: "POISON" },
        { type: "ALLY_MATCH" },
        { type: "CAST_CURE_STATUS", status: "POISON" },
      ),
    ]);
    const cleric = makeAlly("a", set);
    const poisoned = makeAlly("poison", emptyGambitSet("poison"), { statuses: ["POISON"] });
    const clean = makeAlly("clean", emptyGambitSet("clean"));
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    const battle = makeBattle([cleric, clean, poisoned], [enemy]);

    expect(decideAction(cleric, battle)!.targetIds).toEqual(["poison"]);
  });

  it("ALLY_TARGETED は targetedAllyIds に含まれる味方を MATCH に取る", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ALLY_TARGETED" },
        { type: "ALLY_MATCH" },
        { type: "INTERPOSE" },
      ),
    ]);
    const tank = makeAlly("a", set);
    const targeted = makeAlly("tgt", emptyGambitSet("tgt"));
    const safe = makeAlly("safe", emptyGambitSet("safe"));
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    const battle = makeBattle([tank, safe, targeted], [enemy], {
      targetedAllyIds: ["tgt"],
    });

    expect(decideAction(tank, battle)!.targetIds).toEqual(["tgt"]);
  });

  // --------------------------------------------------------------------------
  // ENEMY MATCH 系（状態・属性弱点・種族）
  // --------------------------------------------------------------------------
  it("ENEMY_HAS_STATUS(BLIND) は失明状態の敵を MATCH", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_HAS_STATUS", status: "BLIND" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const ally = makeAlly("a", set);
    const blindEnemy = makeEnemy("blind", emptyGambitSet("blind"), { statuses: ["BLIND"] });
    const cleanEnemy = makeEnemy("clean", emptyGambitSet("clean"));
    const battle = makeBattle([ally], [cleanEnemy, blindEnemy]);

    expect(decideAction(ally, battle)!.targetIds).toEqual(["blind"]);
  });

  it("ENEMY_NO_STATUS(SILENCE) は沈黙していない敵を MATCH", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_NO_STATUS", status: "SILENCE" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_DEBUFF", debuffId: "SILENCE" },
      ),
    ]);
    const ally = makeAlly("a", set);
    const silenced = makeEnemy("silenced", emptyGambitSet("silenced"), { statuses: ["SILENCE"] });
    const unsilenced = makeEnemy("free", emptyGambitSet("free"));
    const battle = makeBattle([ally], [silenced, unsilenced]);

    expect(decideAction(ally, battle)!.targetIds).toEqual(["free"]);
  });

  it("ENEMY_WEAK_TO(FIRE) は火に弱い敵を MATCH", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_WEAK_TO", element: "FIRE" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRA" },
      ),
    ]);
    const ally = makeAlly("a", set);
    const iceEnemy = makeEnemy("ice", emptyGambitSet("ice"), { weaknesses: ["ICE"] });
    const fireEnemy = makeEnemy("fire", emptyGambitSet("fire"), { weaknesses: ["FIRE"] });
    const battle = makeBattle([ally], [iceEnemy, fireEnemy]);

    expect(decideAction(ally, battle)!.targetIds).toEqual(["fire"]);
  });

  it("ENEMY_TYPE(UNDEAD) はアンデッドの敵を MATCH", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_TYPE", enemyType: "UNDEAD" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "HOLY_BOLT" },
      ),
    ]);
    const ally = makeAlly("a", set);
    const beast = makeEnemy("b", emptyGambitSet("b"), { enemyType: "BEAST" });
    const undead = makeEnemy("u", emptyGambitSet("u"), { enemyType: "UNDEAD" });
    const battle = makeBattle([ally], [beast, undead]);

    expect(decideAction(ally, battle)!.targetIds).toEqual(["u"]);
  });
});

// ============================================================================
// Phase 2: 対象カバレッジ補完
// ============================================================================

describe("decideAction - target coverage", () => {
  it("SELF: 行動の対象は actor 自身", () => {
    const set = makeGambitSet("a", [
      makeRule("r1", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "DEFEND" }),
    ]);
    const ally = makeAlly("a", set);
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    expect(decideAction(ally, makeBattle([ally], [enemy]))!.targetIds).toEqual(["a"]);
  });

  it("ALLY_LOWEST_HP: 条件と独立に HP% 最低の生存味方を選ぶ", () => {
    // ENEMY_EXISTS でフォールバック発動、対象は ALLY_LOWEST_HP
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ALLY_LOWEST_HP" },
        { type: "CAST_HEAL", spellId: "CURE" },
      ),
    ]);
    const caster = makeAlly("a", set); // 100%
    const halfHp = makeAlly("half", emptyGambitSet("half"), { hp: 50, hpMax: 100 }); // 50%
    const lowHp = makeAlly("low", emptyGambitSet("low"), { hp: 10, hpMax: 100 }); // 10%（最低）
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    const battle = makeBattle([caster, halfHp, lowHp], [enemy]);

    expect(decideAction(caster, battle)!.targetIds).toEqual(["low"]);
  });

  it("ALLY_ALL: 生存味方全員が対象に入る", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ALLY_ALL" },
        { type: "CAST_HEAL", spellId: "CURE_ALL" },
      ),
    ]);
    const caster = makeAlly("a", set, { mp: 100, mpMax: 100 }); // CURE_ALL は MP40
    const ally2 = makeAlly("a2", emptyGambitSet("a2"));
    const downed = makeAlly("d", emptyGambitSet("d"), { hp: 0, isAlive: false }); // 戦闘不能は除外
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    const battle = makeBattle([caster, ally2, downed], [enemy]);

    const decision = decideAction(caster, battle);
    expect(decision!.targetIds.sort()).toEqual(["a", "a2"]);
    expect(decision!.targetIds).not.toContain("d"); // 死者は含まない
  });

  it("ENEMY_ALL: 生存敵全員が対象に入る", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_ALL" },
        { type: "CAST_OFFENSE", spellId: "FIRA" },
      ),
    ]);
    const ally = makeAlly("a", set, { mp: 100, mpMax: 100 });
    const e1 = makeEnemy("e1", emptyGambitSet("e1"));
    const e2 = makeEnemy("e2", emptyGambitSet("e2"));
    const downed = makeEnemy("d", emptyGambitSet("d"), { hp: 0, isAlive: false });
    const battle = makeBattle([ally], [e1, e2, downed]);

    const decision = decideAction(ally, battle);
    expect(decision!.targetIds.sort()).toEqual(["e1", "e2"]);
    expect(decision!.targetIds).not.toContain("d"); // 死者は含まない
  });
});

// ============================================================================
// Phase 2: 整合性違反は安全に拒否
// ============================================================================

describe("decideAction - integrity violations", () => {
  it("SELF_HP_LT + ALLY_MATCH の不整合は MATCH 解決失敗で fallthrough する", () => {
    const set = makeGambitSet("a", [
      // 不整合：自身条件 → 味方MATCH（MATCH を提供しない）
      makeRule(
        "r1",
        { type: "SELF_HP_LT", value: 99 },
        { type: "ALLY_MATCH" },
        { type: "CAST_HEAL", spellId: "CURE" },
      ),
      // フォールバック
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const actor = makeAlly("a", set, { hp: 50, hpMax: 100 }); // SELF_HP_LT(99) は真
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    const battle = makeBattle([actor], [enemy]);

    expect(decideAction(actor, battle)!.ruleId).toBe("r2");
  });

  it("SELF_HP_LT + ENEMY_MATCH の不整合も fallthrough する", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "SELF_HP_LT", value: 99 },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "DEFEND" }),
    ]);
    const actor = makeAlly("a", set, { hp: 50, hpMax: 100 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    const battle = makeBattle([actor], [enemy]);

    expect(decideAction(actor, battle)!.ruleId).toBe("r2");
  });

  it("ALLY_HP_LT + ENEMY_MATCH の陣営跨ぎは拒否される", () => {
    const set = makeGambitSet("a", [
      // ALLY_HP_LT で味方 MATCH が出るが、ENEMY_MATCH なので陣営が一致せず null
      makeRule(
        "r1",
        { type: "ALLY_HP_LT", value: 60 },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "SELF" }, { type: "DEFEND" }),
    ]);
    const actor = makeAlly("a", set);
    const wounded = makeAlly("w", emptyGambitSet("w"), { hp: 20, hpMax: 100 });
    const enemy = makeEnemy("e", emptyGambitSet("e"));
    const battle = makeBattle([actor, wounded], [enemy]);

    expect(decideAction(actor, battle)!.ruleId).toBe("r2");
  });
});
