/**
 * 装備テンプレ + 実効ステータス計算のテスト（M3-C）
 */

import { describe, expect, it } from "vitest";

import {
  ARMORS,
  getEffectiveAtk,
  getEffectiveDef,
  getEffectiveMag,
  SENSORS,
  WEAPONS,
  type ArmorId,
  type SensorId,
  type WeaponId,
} from "../equipment";
import { runBattle } from "../../battle/runner";
import { presetTank } from "../../gambit/presets";
import {
  emptyGambitSet,
  makeEnemy,
  makeGambitSet,
  makeRule,
} from "../../test/factories";
import { createHealer, createMage, createSwordsman } from "../jobs";

describe("装備テンプレ：種類と装備可能ジョブ", () => {
  it("WEAPONS に剣 3 / ロッド 3 / メイス 3 = 9 種ある", () => {
    expect(Object.keys(WEAPONS)).toHaveLength(9);
  });

  it("ARMORS に重装 3 / 軽装 3 / 中装 3 = 9 種ある", () => {
    expect(Object.keys(ARMORS)).toHaveLength(9);
  });

  it("SENSORS に 4 種ある", () => {
    expect(Object.keys(SENSORS)).toHaveLength(4);
  });

  it("剣士用武器・防具は jobs に SWORDSMAN を含む", () => {
    const swordIds: WeaponId[] = ["BRONZE_SWORD", "IRON_SWORD", "STEEL_SWORD"];
    for (const id of swordIds) {
      expect(WEAPONS[id].jobs).toContain("SWORDSMAN");
    }
    const heavyArmorIds: ArmorId[] = ["LEATHER_ARMOR", "CHAIN_MAIL", "PLATE_MAIL"];
    for (const id of heavyArmorIds) {
      expect(ARMORS[id].jobs).toContain("SWORDSMAN");
    }
  });

  it("ロッドは mag ボーナスを持つ", () => {
    expect(WEAPONS.MAGE_ROD.bonus.mag).toBe(5);
    expect(WEAPONS.FIRE_STAFF.bonus.mag).toBe(8);
    expect(WEAPONS.CRYSTAL_STAFF.bonus.mag).toBe(12);
  });

  it("センサーは enables の条件タイプリストを持つ", () => {
    const sensorIds: SensorId[] = [
      "HP_SCANNER",
      "STATUS_DETECTOR",
      "ELEMENT_ANALYZER",
      "BASIC_SCANNER",
    ];
    for (const id of sensorIds) {
      expect(SENSORS[id].enables.length).toBeGreaterThan(0);
    }
  });
});

describe("getEffective* ：実効ステータス", () => {
  it("装備なし → 素の atk/def/mag をそのまま返す", () => {
    const unit = createSwordsman("a", "Sword", presetTank("a"));
    expect(getEffectiveAtk(unit)).toBe(unit.atk);
    expect(getEffectiveDef(unit)).toBe(unit.def);
    expect(getEffectiveMag(unit)).toBe(unit.mag);
  });

  it("STEEL_SWORD で atk +15", () => {
    const baseUnit = createSwordsman("a", "Sword", presetTank("a"));
    const equipped = createSwordsman("a", "Sword", presetTank("a"), {
      equipment: { weapon: "STEEL_SWORD" },
    });
    expect(getEffectiveAtk(equipped)).toBe(baseUnit.atk + 15);
    expect(getEffectiveDef(equipped)).toBe(baseUnit.def); // 防具はなし
  });

  it("PLATE_MAIL で def +15", () => {
    const baseUnit = createSwordsman("a", "Sword", presetTank("a"));
    const equipped = createSwordsman("a", "Sword", presetTank("a"), {
      equipment: { armor: "PLATE_MAIL" },
    });
    expect(getEffectiveDef(equipped)).toBe(baseUnit.def + 15);
  });

  it("CRYSTAL_STAFF で atk +7, mag +12（複合ボーナス）", () => {
    const baseUnit = createMage("a", "Mage", presetTank("a"));
    const equipped = createMage("a", "Mage", presetTank("a"), {
      equipment: { weapon: "CRYSTAL_STAFF" },
    });
    expect(getEffectiveAtk(equipped)).toBe(baseUnit.atk + 7);
    expect(getEffectiveMag(equipped)).toBe(baseUnit.mag + 12);
  });

  it("武器 + 防具 + mag ボーナスの組み合わせが累積する", () => {
    const equipped = createHealer("a", "Healer", presetTank("a"), {
      equipment: { weapon: "ANCIENT_MACE", armor: "CARDINAL_GARB" },
    });
    // ANCIENT_MACE: atk +10, mag +12 / CARDINAL_GARB: def +12, mag +8
    // 治癒士の base: atk 8, def 12, mag 18
    expect(getEffectiveAtk(equipped)).toBe(8 + 10);
    expect(getEffectiveDef(equipped)).toBe(12 + 12);
    expect(getEffectiveMag(equipped)).toBe(18 + 12 + 8);
  });
});

describe("装備を戦闘に統合した結果", () => {
  it("STEEL_SWORD 装備の剣士は装備なしより高ダメージを出す", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "ATTACK" },
      ),
    ]);
    const base = createSwordsman("a", "Sword", set);
    const equipped = createSwordsman("a", "Sword", set, {
      equipment: { weapon: "STEEL_SWORD" },
    });
    const enemy1 = makeEnemy("e", emptyGambitSet("e"), {
      hp: 1000,
      hpMax: 1000,
      def: 0,
    });
    const enemy2 = makeEnemy("e", emptyGambitSet("e"), {
      hp: 1000,
      hpMax: 1000,
      def: 0,
    });

    const r1 = runBattle([base], [enemy1], { maxTurns: 1 });
    const r2 = runBattle([equipped], [enemy2], { maxTurns: 1 });

    const baseDmg = 1000 - r1.finalEnemies[0].hp;
    const equippedDmg = 1000 - r2.finalEnemies[0].hp;
    // STEEL_SWORD = atk +15
    expect(equippedDmg).toBe(baseDmg + 15);
  });

  it("CRYSTAL_STAFF 装備の魔導士は装備なしより魔法ダメ増", () => {
    const set = makeGambitSet("a", [
      makeRule(
        "r1",
        { type: "ENEMY_EXISTS" },
        { type: "ENEMY_MATCH" },
        { type: "CAST_OFFENSE", spellId: "FIRE" },
      ),
    ]);
    const base = createMage("a", "Mage", set);
    const equipped = createMage("a", "Mage", set, {
      equipment: { weapon: "CRYSTAL_STAFF" },
    });
    const enemy1 = makeEnemy("e", emptyGambitSet("e"), {
      hp: 1000,
      hpMax: 1000,
      def: 0,
    });
    const enemy2 = makeEnemy("e", emptyGambitSet("e"), {
      hp: 1000,
      hpMax: 1000,
      def: 0,
    });

    const r1 = runBattle([base], [enemy1], { maxTurns: 1 });
    const r2 = runBattle([equipped], [enemy2], { maxTurns: 1 });

    const baseDmg = 1000 - r1.finalEnemies[0].hp;
    const equippedDmg = 1000 - r2.finalEnemies[0].hp;
    // CRYSTAL_STAFF = mag +12 → 魔法ダメ = mag*2 で +24 増える計算
    expect(equippedDmg).toBeGreaterThan(baseDmg);
  });
});
