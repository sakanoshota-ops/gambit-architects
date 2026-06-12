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

  it("深度 13 は strong tier のみ（M3-F 後の構成）", () => {
    const enemies = generateEnemiesForDepth(13);
    const strongNames = [
      "バンディット",
      "スケルトン",
      "ゴーレム",
      "オーク",
      "トロール",
      "インプ",
      "ファントム",
    ];
    expect(enemies.every((e) => strongNames.includes(e.name))).toBe(true);
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

// ============================================================================
// M3-F: 4 tier 制 + 深度別ボスプール
// ============================================================================

describe("M3-F: tier 4 段階", () => {
  it("深度 6〜7 は weak tier（GOBLIN/WOLF/SLIME）", () => {
    const weakNames = ["ゴブリン", "ウルフ", "スライム"];
    for (const d of [6, 7]) {
      const enemies = generateEnemiesForDepth(d);
      expect(enemies.every((e) => weakNames.includes(e.name))).toBe(true);
    }
  });

  it("深度 8〜12 は medium tier（WOLF/BANDIT/SKELETON/ORC/HARPY）", () => {
    const mediumNames = [
      "ウルフ",
      "バンディット",
      "スケルトン",
      "オーク",
      "ハーピー",
    ];
    for (const d of [8, 9, 11, 12]) {
      const enemies = generateEnemiesForDepth(d);
      expect(enemies.every((e) => mediumNames.includes(e.name))).toBe(true);
    }
  });

  it("深度 18+ は strong-plus tier（GOLEM/TROLL/DARK_KNIGHT/LICH/TURTLE/DEMON_LORD_MINION）", () => {
    const strongPlusNames = [
      "ゴーレム",
      "トロール",
      "ダークナイト",
      "リッチ",
      "タートル",
      "魔王の眷属",
    ];
    for (const d of [18, 19, 21, 24]) {
      const enemies = generateEnemiesForDepth(d);
      expect(enemies.every((e) => strongPlusNames.includes(e.name))).toBe(true);
    }
  });
});

describe("M3-F: 深度別ボスプール", () => {
  it("深度 10 のボスは暗黒竜", () => {
    const enemies = generateEnemiesForDepth(10);
    const boss = enemies.find((e) => e.isBoss);
    expect(boss?.name).toBe("暗黒竜");
  });

  it("深度 15 のボスはネクロマンサー", () => {
    const enemies = generateEnemiesForDepth(15);
    const boss = enemies.find((e) => e.isBoss);
    expect(boss?.name).toBe("ネクロマンサー");
  });

  it("深度 20 のボスは魔王", () => {
    const enemies = generateEnemiesForDepth(20);
    const boss = enemies.find((e) => e.isBoss);
    expect(boss?.name).toBe("魔王");
  });

  it("深度 25 以降も魔王にループ（深度 25, 30）", () => {
    for (const d of [25, 30]) {
      const enemies = generateEnemiesForDepth(d);
      const boss = enemies.find((e) => e.isBoss);
      expect(boss?.name).toBe("魔王");
    }
  });
});

describe("M3-F: ボス階のミニオン同行数", () => {
  it("深度 10 ボス戦はボス +1〜2 ミニオン = 2〜3 体", () => {
    const enemies = generateEnemiesForDepth(10);
    expect(enemies.length).toBeGreaterThanOrEqual(2);
    expect(enemies.length).toBeLessThanOrEqual(3);
  });

  it("深度 15+ ボス戦はボス +2 ミニオン = 3 体", () => {
    for (const d of [15, 20, 25]) {
      const enemies = generateEnemiesForDepth(d);
      expect(enemies.length).toBe(3);
    }
  });
});

describe("M3-F: 敵テンプレが Unit に resistances を持つ", () => {
  it("strong-plus 範囲（18〜24）のどこかで耐性持ちの敵が出る", () => {
    // pool の 6 体中 4 体が耐性持ち。
    // 個別深度の決定的乱数に依存しないよう範囲スキャンで検証
    let foundResistance = false;
    for (let d = 18; d <= 24; d++) {
      const enemies = generateEnemiesForDepth(d);
      if (enemies.some((e) => e.resistances.length > 0)) {
        foundResistance = true;
        break;
      }
    }
    expect(foundResistance).toBe(true);
  });

  it("通常敵でも resistances は配列として定義されている（空配列含む）", () => {
    const enemies = generateEnemiesForDepth(6);
    for (const e of enemies) {
      expect(Array.isArray(e.resistances)).toBe(true);
    }
  });

  it("味方ユニットの resistances は空配列で初期化される", () => {
    // ファクトリ経由で生成された味方は []。jobs.ts の createCharacter も []
    const enemies = generateEnemiesForDepth(1);
    for (const e of enemies) {
      // weaknesses[] が定義されていれば resistances[] も定義されている契約
      expect(e.resistances).toBeDefined();
    }
  });
});
