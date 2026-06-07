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
});
