/**
 * dungeon.ts のテスト（M2-J）
 */

import { describe, expect, it } from "vitest";

import { depthHasBoss, generateEnemiesForDepth } from "../dungeon";

describe("generateEnemiesForDepth：固定テーブル（深度 1〜5）", () => {
  it("深度 1 はゴブリン x2", () => {
    const enemies = generateEnemiesForDepth(1);
    expect(enemies).toHaveLength(2);
    expect(enemies.every((e) => e.name === "ゴブリン")).toBe(true);
  });

  it("深度 5 はボス（GOBLIN_KING）を含む", () => {
    const enemies = generateEnemiesForDepth(5);
    expect(enemies.some((e) => e.isBoss)).toBe(true);
  });

  it("各敵ユニットは isAlly=false、HP=hpMax", () => {
    const enemies = generateEnemiesForDepth(3);
    for (const e of enemies) {
      expect(e.isAlly).toBe(false);
      expect(e.hp).toBe(e.hpMax);
      expect(e.isAlive).toBe(true);
    }
  });
});

describe("generateEnemiesForDepth：procgen（深度 6 以降）", () => {
  it("深度 6 では 2〜3 体の敵が出る（ノンボス）", () => {
    const enemies = generateEnemiesForDepth(6);
    expect(enemies.length).toBeGreaterThanOrEqual(2);
    expect(enemies.length).toBeLessThanOrEqual(3);
    expect(enemies.every((e) => !e.isBoss)).toBe(true);
  });

  it("深度 10 はボス戦", () => {
    const enemies = generateEnemiesForDepth(10);
    expect(enemies.some((e) => e.isBoss)).toBe(true);
  });

  it("同じ深度を 2 回呼ぶと敵の種族が一致する（決定的）", () => {
    const a = generateEnemiesForDepth(7);
    const b = generateEnemiesForDepth(7);
    expect(a.map((e) => e.enemyType)).toEqual(b.map((e) => e.enemyType));
  });

  it("深度が高くなるほど tier が上がる（深度 13 は strong 系のみ）", () => {
    const enemies = generateEnemiesForDepth(13);
    const strongPool = ["BANDIT", "SKELETON", "GOLEM"];
    const enemyTypes = ["HUMANOID", "UNDEAD", "MACHINE"];
    expect(
      enemies.every(
        (e) =>
          strongPool.includes(e.name) ||
          enemyTypes.includes(e.enemyType),
      ),
    ).toBe(true);
  });
});

describe("depthHasBoss", () => {
  it("深度 5・10・15 はボスあり", () => {
    expect(depthHasBoss(5)).toBe(true);
    expect(depthHasBoss(10)).toBe(true);
    expect(depthHasBoss(15)).toBe(true);
  });

  it("深度 1・3・6 はボスなし", () => {
    expect(depthHasBoss(1)).toBe(false);
    expect(depthHasBoss(3)).toBe(false);
    expect(depthHasBoss(6)).toBe(false);
  });
});

describe("generateEnemiesForDepth：エッジケース", () => {
  it("深度 0 や -1 でもクラッシュせず、深度 1 と同じ編成を返す", () => {
    const e0 = generateEnemiesForDepth(0);
    const e1 = generateEnemiesForDepth(1);
    const eMinus = generateEnemiesForDepth(-3);
    expect(e0.map((e) => e.name)).toEqual(e1.map((e) => e.name));
    expect(eMinus.map((e) => e.name)).toEqual(e1.map((e) => e.name));
  });
});
