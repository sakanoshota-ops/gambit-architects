/**
 * 多言語辞書のテスト（M3-G-8）
 */

import { describe, expect, it } from "vitest";

import { LOCALES, STRINGS, translate, type StringKey } from "../strings";

describe("strings 辞書の完全性", () => {
  it("全エントリが ja と en を持つ", () => {
    for (const [key, value] of Object.entries(STRINGS)) {
      expect(value.ja, `${key}.ja が空`).toBeTruthy();
      expect(value.en, `${key}.en が空`).toBeTruthy();
    }
  });

  it("LOCALES は ja と en の 2 種類", () => {
    expect(LOCALES).toEqual(["ja", "en"]);
  });
});

describe("translate()", () => {
  it("ja ロケールで日本語を返す", () => {
    expect(translate("common.save", "ja")).toBe("保存");
    expect(translate("nav.home", "ja")).toBe("ホーム");
    expect(translate("job.SWORDSMAN", "ja")).toBe("剣士");
  });

  it("en ロケールで英語を返す", () => {
    expect(translate("common.save", "en")).toBe("Save");
    expect(translate("nav.home", "en")).toBe("Home");
    expect(translate("job.SWORDSMAN", "en")).toBe("Swordsman");
  });

  it("{placeholder} を params で置換", () => {
    expect(translate("battle.title", "ja", { depth: 5 })).toBe(
      "戦闘（深度 5）",
    );
    expect(translate("battle.title", "en", { depth: 5 })).toBe(
      "Battle (Depth 5)",
    );
  });

  it("複数 placeholder の同時置換", () => {
    expect(
      translate("battle.turnsElapsed", "ja", { turns: 10, depth: 3 }),
    ).toBe("10 ターン経過 ・ 深度 3");
    expect(
      translate("battle.turnsElapsed", "en", { turns: 10, depth: 3 }),
    ).toBe("10 turns elapsed · Depth 3");
  });

  it("未知のキーはキー文字列を返す（フォールバック）", () => {
    expect(translate("not.a.real.key" as StringKey, "ja")).toBe("not.a.real.key");
  });
});

describe("敵・装備・状態などの ID 系翻訳", () => {
  it("全 15 種の敵に ja と en が揃う", () => {
    const enemyIds = [
      "GOBLIN",
      "WOLF",
      "BANDIT",
      "SKELETON",
      "GOLEM",
      "GOBLIN_KING",
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
    for (const id of enemyIds) {
      const key = `enemy.${id}` as StringKey;
      expect(translate(key, "ja"), `${key}.ja`).not.toBe(key);
      expect(translate(key, "en"), `${key}.en`).not.toBe(key);
    }
  });

  it("全武器・防具・センサーが ja と en を持つ", () => {
    const weaponIds = [
      "BRONZE_SWORD",
      "IRON_SWORD",
      "STEEL_SWORD",
      "MAGE_ROD",
      "FIRE_STAFF",
      "CRYSTAL_STAFF",
      "HEALER_MACE",
      "BLESSED_MACE",
      "ANCIENT_MACE",
    ];
    for (const id of weaponIds) {
      expect(translate(`weapon.${id}` as StringKey, "en")).not.toBe(
        `weapon.${id}`,
      );
    }
  });

  it("全要素・状態・スキルが ja と en を持つ", () => {
    for (const el of ["FIRE", "ICE", "THUNDER", "HOLY", "DARK", "NEUTRAL"]) {
      expect(translate(`element.${el}` as StringKey, "ja")).not.toBe(
        `element.${el}`,
      );
    }
    for (const st of ["PROTECT", "SHELL", "REGEN", "HASTE", "POISON", "BLIND"]) {
      expect(translate(`status.${st}` as StringKey, "en")).not.toBe(
        `status.${st}`,
      );
    }
  });
});
