/**
 * データ定義のサニティテスト（Phase 3b）
 *
 * - ジョブ／敵／プリセットの構造的健全性を確認
 * - 評価器 + ランナーと組み合わせて実行時にクラッシュしないことを確認
 */

import { describe, expect, it } from "vitest";

import { decideAction } from "../../gambit/evaluator";
import {
  presetBeginner,
  presetExploitWeakness,
  presetFinisher,
  presetTank,
  STANDARD_PRESETS,
} from "../../gambit/presets";
import { MAX_RULES_PER_SET } from "../../gambit/types";
import { runBattle } from "../../battle/runner";
import { makeBattle } from "../../test/factories";
import { BANDIT, createEnemy, GOBLIN, WOLF, type EnemyTemplate } from "../enemies";
import { createSwordsman, SWORDSMAN } from "../jobs";

describe("data: 剣士テンプレ", () => {
  it("ステータス値が妥当（HP/MP/atk/def が正の整数）", () => {
    expect(SWORDSMAN.hp).toBeGreaterThan(0);
    expect(SWORDSMAN.mp).toBeGreaterThanOrEqual(0);
    expect(SWORDSMAN.atk).toBeGreaterThan(0);
    expect(SWORDSMAN.def).toBeGreaterThan(0);
  });

  it("createSwordsman は isAlly=true・isAlive=true のユニットを返す", () => {
    const set = presetTank("ally_1");
    const unit = createSwordsman("ally_1", "アシュ", set);
    expect(unit.isAlly).toBe(true);
    expect(unit.isAlive).toBe(true);
    expect(unit.jobId).toBe("SWORDSMAN");
    expect(unit.hp).toBe(unit.hpMax);
    expect(unit.gambitSet).toBe(set);
  });
});

describe("data: 敵テンプレ", () => {
  it("3 種が難度順（HP が GOBLIN < WOLF < BANDIT）", () => {
    expect(GOBLIN.hp).toBeLessThan(WOLF.hp);
    expect(WOLF.hp).toBeLessThan(BANDIT.hp);
  });

  it("各テンプレに弱点属性が 1 つ以上ある", () => {
    for (const tmpl of [GOBLIN, WOLF, BANDIT]) {
      expect(tmpl.weaknesses.length).toBeGreaterThan(0);
    }
  });

  it("createEnemy は isAlly=false・isAlive=true のユニットを返す", () => {
    const set = presetTank("e1");
    const goblin = createEnemy(GOBLIN, "e1", set);
    expect(goblin.isAlly).toBe(false);
    expect(goblin.isAlive).toBe(true);
    expect(goblin.weaknesses).toContain("FIRE");
    expect(goblin.enemyType).toBe("HUMANOID");
  });

  it("createEnemy は weaknesses をテンプレと別の配列として持つ（共有しない）", () => {
    const set = presetTank("e1");
    const g1 = createEnemy(GOBLIN, "e1", set);
    g1.weaknesses.push("ICE");
    // テンプレ側に副作用が出ていないこと
    const g2 = createEnemy(GOBLIN, "e2", set);
    expect(g2.weaknesses).toEqual(["FIRE"]);
  });
});

describe("gambit: 標準プリセット", () => {
  const presetFactories = [
    ["beginner", presetBeginner],
    ["exploitWeakness", presetExploitWeakness],
    ["tank", presetTank],
    ["finisher", presetFinisher],
  ] as const;

  it.each(presetFactories)(
    "%s: schemaVersion=2、ルール数 1〜%i、すべて enabled=true",
    (_name, factory) => {
      const set = factory("char_x");
      expect(set.schemaVersion).toBe(2);
      expect(set.rules.length).toBeGreaterThan(0);
      expect(set.rules.length).toBeLessThanOrEqual(MAX_RULES_PER_SET);
      for (const rule of set.rules) {
        expect(rule.enabled).toBe(true);
      }
    },
  );

  it("STANDARD_PRESETS にも 4 つすべて入っている", () => {
    expect(Object.keys(STANDARD_PRESETS).sort()).toEqual(
      ["beginner", "exploitWeakness", "finisher", "tank"].sort(),
    );
  });

  it.each(presetFactories)(
    "%s: 剣士に当てて評価器が走ってもクラッシュしない",
    (_name, factory) => {
      const allySet = factory("ally_1");
      const ally = createSwordsman("ally_1", "Sword1", allySet);
      const enemy = createEnemy(GOBLIN, "e1", presetTank("e1"));
      const battle = makeBattle([ally], [enemy]);

      // 例外を投げないこと（結果が null でもOK）
      expect(() => decideAction(ally, battle)).not.toThrow();
    },
  );
});

describe("integration: data + runner", () => {
  it("剣士 4 体 vs 敵 3 種（GOBLIN/WOLF/BANDIT）の戦闘を最後まで実行できる", () => {
    const allies = [
      createSwordsman("a1", "Sword1", presetTank("a1")),
      createSwordsman("a2", "Sword2", presetTank("a2")),
      createSwordsman("a3", "Sword3", presetFinisher("a3")),
      createSwordsman("a4", "Sword4", presetFinisher("a4")),
    ];
    const enemies: Array<[EnemyTemplate, string]> = [
      [GOBLIN, "e_goblin"],
      [WOLF, "e_wolf"],
      [BANDIT, "e_bandit"],
    ];
    const enemyUnits = enemies.map(([tmpl, id]) =>
      createEnemy(tmpl, id, presetTank(id)),
    );

    const result = runBattle(allies, enemyUnits, { maxTurns: 30 });

    // 何らかの形で決着またはタイムアウト
    expect(["ALLY", "ENEMY", "TIMEOUT"]).toContain(result.winner);
    // 最低 1 ターンは進んでいる
    expect(result.turns).toBeGreaterThan(0);
    // 何らかのアクションが起きている
    expect(result.events.length).toBeGreaterThan(0);
  });
});
