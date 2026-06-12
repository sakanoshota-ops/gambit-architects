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
import { makeBattle, makeGambitSet, makeRule } from "../../test/factories";
import {
  ALL_ENEMIES,
  BANDIT,
  createEnemy,
  DARK_DRAGON,
  DARK_KNIGHT,
  DEMON_LORD,
  DEMON_LORD_MINION,
  GOBLIN,
  GOBLIN_KING,
  GOLEM,
  HARPY,
  IMP,
  LICH,
  NECROMANCER,
  ORC,
  PHANTOM,
  SKELETON,
  SLIME,
  TROLL,
  TURTLE,
  WOLF,
  type EnemyTemplate,
} from "../enemies";
import { ALL_JOBS, createHealer, createMage, createSwordsman, HEALER, MAGE, SWORDSMAN } from "../jobs";

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

// ============================================================================
// Phase M2-B: 追加ジョブ・敵テンプレ
// ============================================================================

describe("data: M2-B 追加ジョブ（魔導士・治癒士）", () => {
  it("MAGE テンプレが正しいバランス（MP/mag 高、HP/def 低）", () => {
    expect(MAGE.hp).toBeLessThan(SWORDSMAN.hp); // 後衛なので HP は剣士未満
    expect(MAGE.mp).toBeGreaterThan(SWORDSMAN.mp);
    expect(MAGE.mag).toBeGreaterThan(SWORDSMAN.mag);
    expect(MAGE.def).toBeLessThan(SWORDSMAN.def);
  });

  it("HEALER テンプレが正しいバランス（MP 高、回復役）", () => {
    expect(HEALER.mp).toBeGreaterThan(SWORDSMAN.mp);
    expect(HEALER.mag).toBeGreaterThan(SWORDSMAN.mag);
  });

  it("createMage は isAlly=true・jobId=MAGE のユニットを返す", () => {
    const set = presetTank("mage_1");
    const mage = createMage("mage_1", "Mage1", set);
    expect(mage.isAlly).toBe(true);
    expect(mage.jobId).toBe("MAGE");
    expect(mage.hp).toBe(MAGE.hp);
    expect(mage.hp).toBe(mage.hpMax);
    expect(mage.mp).toBe(MAGE.mp);
  });

  it("createHealer は isAlly=true・jobId=HEALER のユニットを返す", () => {
    const set = presetBeginner("healer_1");
    const healer = createHealer("healer_1", "Healer1", set);
    expect(healer.isAlly).toBe(true);
    expect(healer.jobId).toBe("HEALER");
    expect(healer.hp).toBe(HEALER.hp);
    expect(healer.mp).toBe(HEALER.mp);
  });

  it("ALL_JOBS に 3 ジョブすべてが入っている", () => {
    expect(Object.keys(ALL_JOBS).sort()).toEqual(["HEALER", "MAGE", "SWORDSMAN"]);
  });
});

describe("data: M2-B 追加敵（SKELETON / GOLEM / GOBLIN_KING）", () => {
  it("SKELETON は UNDEAD で HOLY 弱点", () => {
    expect(SKELETON.enemyType).toBe("UNDEAD");
    expect(SKELETON.weaknesses).toContain("HOLY");
    expect(SKELETON.isBoss ?? false).toBe(false);
  });

  it("GOLEM は MACHINE で THUNDER 弱点・def 高め", () => {
    expect(GOLEM.enemyType).toBe("MACHINE");
    expect(GOLEM.weaknesses).toContain("THUNDER");
    expect(GOLEM.def).toBeGreaterThan(BANDIT.def);
    expect(GOLEM.isBoss ?? false).toBe(false);
  });

  it("GOBLIN_KING はボス、FIRE 弱点", () => {
    expect(GOBLIN_KING.isBoss).toBe(true);
    expect(GOBLIN_KING.enemyType).toBe("BOSS");
    expect(GOBLIN_KING.weaknesses).toContain("FIRE");
    expect(GOBLIN_KING.hp).toBeGreaterThan(BANDIT.hp); // ボスは最強
  });

  it("createEnemy(GOBLIN_KING) は isBoss=true のユニットを返す", () => {
    const set = presetTank("boss");
    const boss = createEnemy(GOBLIN_KING, "boss_1", set);
    expect(boss.isBoss).toBe(true);
    expect(boss.isAlly).toBe(false);
  });

  it("BOSS_PRESENT 条件は GOBLIN_KING がいると真になる", () => {
    // 通常敵だけのケース：偽 → r1 不成立 → r2 で ATTACK
    // ボス込みのケース：真 → r1 成立 → DEFEND
    const set = makeGambitSet("a", [
      makeRule("r1", { type: "BOSS_PRESENT" }, { type: "SELF" }, { type: "DEFEND" }),
      makeRule("r2", { type: "ENEMY_EXISTS" }, { type: "ENEMY_MATCH" }, { type: "ATTACK" }),
    ]);
    const ally = createSwordsman("a", "Sword1", set);
    const goblin = createEnemy(GOBLIN, "g", presetTank("g"));
    const boss = createEnemy(GOBLIN_KING, "boss", presetTank("boss"));

    const battleNormal = makeBattle([ally], [goblin]);
    const battleBoss = makeBattle([ally], [goblin, boss]);

    expect(decideAction(ally, battleNormal)!.ruleId).toBe("r2");
    expect(decideAction(ally, battleBoss)!.ruleId).toBe("r1");
  });

  it("ALL_ENEMIES に M2 までの 6 種が含まれる", () => {
    const keys = Object.keys(ALL_ENEMIES);
    for (const id of ["BANDIT", "GOBLIN", "GOBLIN_KING", "GOLEM", "SKELETON", "WOLF"]) {
      expect(keys).toContain(id);
    }
  });
});

// ============================================================================
// Phase M3-F: 新敵テンプレ 10 種 + ボス 3 種、resistances 導入
// ============================================================================

describe("data: M3-F 新通常敵テンプレ", () => {
  const newEnemies: Array<[string, EnemyTemplate, string, string[]]> = [
    ["ORC", ORC, "HUMANOID", ["ICE"]],
    ["IMP", IMP, "MAGICAL", ["HOLY"]],
    ["LICH", LICH, "UNDEAD", ["HOLY"]],
    ["TROLL", TROLL, "BEAST", ["FIRE"]],
    ["DARK_KNIGHT", DARK_KNIGHT, "HUMANOID", ["HOLY"]],
    ["TURTLE", TURTLE, "BEAST", ["THUNDER"]],
    ["SLIME", SLIME, "BEAST", ["FIRE"]],
    ["PHANTOM", PHANTOM, "UNDEAD", ["HOLY"]],
    ["HARPY", HARPY, "BEAST", ["THUNDER"]],
    ["DEMON_LORD_MINION", DEMON_LORD_MINION, "MAGICAL", ["HOLY"]],
  ];

  it.each(newEnemies)(
    "%s は enemyType=%s で弱点 %s を持つ",
    (_name, tmpl, expectedType, expectedWeaknesses) => {
      expect(tmpl.enemyType).toBe(expectedType);
      for (const w of expectedWeaknesses) {
        expect(tmpl.weaknesses).toContain(w);
      }
      expect(tmpl.isBoss ?? false).toBe(false);
      expect(tmpl.hp).toBeGreaterThan(0);
      expect(tmpl.atk).toBeGreaterThanOrEqual(0);
    },
  );

  it("IMP は FIRE 耐性を持つ", () => {
    expect(IMP.resistances).toContain("FIRE");
  });

  it("LICH/DARK_KNIGHT/PHANTOM/DEMON_LORD_MINION は DARK 耐性を持つ", () => {
    for (const tmpl of [LICH, DARK_KNIGHT, PHANTOM, DEMON_LORD_MINION]) {
      expect(tmpl.resistances).toContain("DARK");
    }
  });

  it("TURTLE/SLIME/PHANTOM は物理半減（NEUTRAL 耐性）", () => {
    for (const tmpl of [TURTLE, SLIME, PHANTOM]) {
      expect(tmpl.resistances).toContain("NEUTRAL");
    }
  });

  it("耐性なしの敵（ORC/TROLL/HARPY）は resistances 未定義または空", () => {
    for (const tmpl of [ORC, TROLL, HARPY]) {
      expect((tmpl.resistances ?? []).length).toBe(0);
    }
  });

  it("createEnemy は resistances をテンプレと共有しない", () => {
    const set = presetTank("p1");
    const p1 = createEnemy(PHANTOM, "p1", set);
    p1.resistances.push("FIRE");
    const p2 = createEnemy(PHANTOM, "p2", set);
    expect(p2.resistances).toEqual(["NEUTRAL", "DARK"]);
  });
});

describe("data: M3-F ボス +3 種", () => {
  it("DARK_DRAGON はボス、HOLY 弱点、DARK 耐性、深度 10 想定の HP", () => {
    expect(DARK_DRAGON.isBoss).toBe(true);
    expect(DARK_DRAGON.enemyType).toBe("BOSS");
    expect(DARK_DRAGON.weaknesses).toContain("HOLY");
    expect(DARK_DRAGON.resistances).toContain("DARK");
    expect(DARK_DRAGON.hp).toBeGreaterThan(GOBLIN_KING.hp);
  });

  it("NECROMANCER は HOLY 弱点・DARK 耐性、魔法寄り（mag が atk より高い）", () => {
    expect(NECROMANCER.isBoss).toBe(true);
    expect(NECROMANCER.weaknesses).toContain("HOLY");
    expect(NECROMANCER.resistances).toContain("DARK");
    expect(NECROMANCER.mag).toBeGreaterThan(NECROMANCER.atk);
  });

  it("DEMON_LORD は HOLY 弱点、DARK+NEUTRAL 耐性、最強 HP（>= 1500）", () => {
    expect(DEMON_LORD.isBoss).toBe(true);
    expect(DEMON_LORD.weaknesses).toContain("HOLY");
    expect(DEMON_LORD.resistances).toContain("DARK");
    expect(DEMON_LORD.resistances).toContain("NEUTRAL");
    expect(DEMON_LORD.hp).toBeGreaterThanOrEqual(1500);
  });

  it("ALL_ENEMIES に M3-F の 13 種が追加されている（合計 19）", () => {
    const m3fIds = [
      "ORC",
      "IMP",
      "LICH",
      "TROLL",
      "DARK_KNIGHT",
      "TURTLE",
      "SLIME",
      "PHANTOM",
      "HARPY",
      "DEMON_LORD_MINION",
      "DARK_DRAGON",
      "NECROMANCER",
      "DEMON_LORD",
    ];
    const keys = Object.keys(ALL_ENEMIES);
    for (const id of m3fIds) {
      expect(keys).toContain(id);
    }
    expect(keys.length).toBe(19);
  });
});

describe("integration: 混成パーティで戦闘が完走する", () => {
  it("剣士 + 魔導士 + 治癒士 + 剣士 vs SKELETON x 2 + GOLEM が決着する", () => {
    const allies = [
      createSwordsman("a1", "Sword1", presetTank("a1")),
      createMage("a2", "Mage1", presetExploitWeakness("a2")),
      createHealer("a3", "Healer1", presetBeginner("a3")),
      createSwordsman("a4", "Sword2", presetFinisher("a4")),
    ];
    const enemies = [
      createEnemy(SKELETON, "e1", presetTank("e1")),
      createEnemy(SKELETON, "e2", presetTank("e2")),
      createEnemy(GOLEM, "e3", presetTank("e3")),
    ];

    const result = runBattle(allies, enemies, { maxTurns: 50 });

    expect(["ALLY", "ENEMY", "TIMEOUT"]).toContain(result.winner);
    expect(result.turns).toBeGreaterThan(0);
    expect(result.events.length).toBeGreaterThan(0);
  });
});
