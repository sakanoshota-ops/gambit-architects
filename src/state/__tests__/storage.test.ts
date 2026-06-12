/**
 * storage.ts のマイグレーションテスト（M2-H）
 *
 * - 旧形式（lastBattle あり、recentBattles なし）を読んだとき、recentBattles に変換される
 * - lastBattle も recentBattles もない旧データは recentBattles: [] になる
 * - 新形式はそのまま読める
 */

import { describe, expect, it, beforeEach } from "vitest";

import { createDefaultPlayerData } from "../defaults";
import { clearPlayerData, loadPlayerData, savePlayerData } from "../storage";

const STORAGE_KEY = "gambit-architects-save-v1";

describe("loadPlayerData マイグレーション", () => {
  beforeEach(() => {
    clearPlayerData();
  });

  it("recentBattles をそのまま含む新形式は通過する", () => {
    const data = createDefaultPlayerData();
    data.dungeon.recentBattles = [{ winner: "ALLY", turns: 5, depth: 1 }];
    savePlayerData(data);

    const loaded = loadPlayerData();
    expect(loaded?.dungeon.recentBattles).toHaveLength(1);
    expect(loaded?.dungeon.recentBattles[0].winner).toBe("ALLY");
  });

  it("旧形式の lastBattle は recentBattles[0] に変換される", () => {
    const data = createDefaultPlayerData();
    // 旧形式を直接書き込む（型を回避）
    const rawOld = {
      ...data,
      dungeon: {
        currentDepth: 2,
        maxDepth: 2,
        lastBattle: { winner: "ENEMY", turns: 10, depth: 1 },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawOld));

    const loaded = loadPlayerData();
    expect(loaded?.dungeon.recentBattles).toHaveLength(1);
    expect(loaded?.dungeon.recentBattles[0].winner).toBe("ENEMY");
    expect(loaded?.dungeon.recentBattles[0].depth).toBe(1);
  });

  it("旧形式で lastBattle が無い場合は recentBattles: [] になる", () => {
    const data = createDefaultPlayerData();
    const rawOld = {
      ...data,
      dungeon: {
        currentDepth: 1,
        maxDepth: 1,
        // recentBattles も lastBattle も無い
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawOld));

    const loaded = loadPlayerData();
    expect(loaded?.dungeon.recentBattles).toEqual([]);
  });

  it("旧形式で Unit.equipment が無いユニットは equipment: {} で補完される（M3-C）", () => {
    const data = createDefaultPlayerData();
    // 旧データを再現：各 unit から equipment を削除
    const rawOld = JSON.parse(JSON.stringify(data));
    for (const u of rawOld.party) {
      delete u.equipment;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawOld));

    const loaded = loadPlayerData();
    expect(loaded).not.toBeNull();
    for (const u of loaded!.party) {
      expect(u.equipment).toBeDefined();
      expect(u.equipment).toEqual({});
    }
  });

  it("旧形式で Unit.statusDurations が無いユニットは {} で補完される", () => {
    const data = createDefaultPlayerData();
    const rawOld = JSON.parse(JSON.stringify(data));
    for (const u of rawOld.party) {
      delete u.statusDurations;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawOld));

    const loaded = loadPlayerData();
    expect(loaded).not.toBeNull();
    for (const u of loaded!.party) {
      expect(u.statusDurations).toEqual({});
    }
  });

  it("M3-F: 旧形式で Unit.resistances が無いユニットは [] で補完される", () => {
    const data = createDefaultPlayerData();
    const rawOld = JSON.parse(JSON.stringify(data));
    for (const u of rawOld.party) {
      delete u.resistances;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawOld));

    const loaded = loadPlayerData();
    expect(loaded).not.toBeNull();
    for (const u of loaded!.party) {
      expect(Array.isArray(u.resistances)).toBe(true);
      expect(u.resistances).toEqual([]);
    }
  });

  it("M3-F: 既存セーブで resistances が既に存在する場合は上書きしない", () => {
    const data = createDefaultPlayerData();
    const rawOld = JSON.parse(JSON.stringify(data));
    // 1 体目に DARK 耐性を入れた状態でセーブ
    rawOld.party[0].resistances = ["DARK"];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawOld));

    const loaded = loadPlayerData();
    expect(loaded!.party[0].resistances).toEqual(["DARK"]);
  });

  it("M3-G-8: 旧形式で settings.locale が無い場合は ja を補完", () => {
    const data = createDefaultPlayerData();
    const rawOld = JSON.parse(JSON.stringify(data));
    delete rawOld.settings.locale;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawOld));

    const loaded = loadPlayerData();
    expect(loaded!.settings.locale).toBe("ja");
  });

  it("M3-G-8: 不正な locale 値（zh など）は ja にフォールバック", () => {
    const data = createDefaultPlayerData();
    const rawOld = JSON.parse(JSON.stringify(data));
    rawOld.settings.locale = "zh";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawOld));

    const loaded = loadPlayerData();
    expect(loaded!.settings.locale).toBe("ja");
  });

  it("M3-G-8: 有効な locale 値（en）はそのまま保持", () => {
    const data = createDefaultPlayerData();
    const rawOld = JSON.parse(JSON.stringify(data));
    rawOld.settings.locale = "en";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawOld));

    const loaded = loadPlayerData();
    expect(loaded!.settings.locale).toBe("en");
  });
});
