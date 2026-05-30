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
