/**
 * バランステスト（M3-G）
 *
 * 目的：
 *   - 各深度で「標準パーティ」が破綻なく決着できる（TIMEOUT しない）ことを担保
 *   - 深度 1〜10：勝てる（個人開発スコープでは「装備＋プリセットで届く」体感）
 *   - 深度 15、20：勝敗どちらでも構わないが TIMEOUT しないこと
 *   - 6 パーティバリエーションを使って depth 20（DEMON_LORD）の勝率を測定
 *     → 50% 以上勝てれば合格（標準ラスボス想定の指標）
 *
 * 注意：
 *   - runBattle はデフォルトで決定的（rng 未注入）
 *   - 「勝率」はパーティ構成バリエーションを使って measure
 *   - センサーは標準パーティに含む（HP_SCANNER + ELEMENT_ANALYZER + STATUS_DETECTOR）
 *
 * 関連仕様：docs/m3_checklist.md §1.9 / §3、CLAUDE.md「コアフロー」
 */

import { describe, expect, it } from "vitest";

import { runBattle } from "../../battle/runner";
import type { Unit } from "../../battle/types";
import type { Equipment } from "../equipment";
import { generateEnemiesForDepth } from "../dungeon";
import { createHealer, createMage, createSwordsman } from "../jobs";
import {
  presetBeginner,
  presetExploitWeakness,
  presetFinisher,
  presetTank,
} from "../../gambit/presets";
import {
  GAMBIT_SCHEMA_VERSION,
  type GambitSet,
} from "../../gambit/types";

// ============================================================================
// 標準パーティ生成
// ============================================================================

/**
 * 全弱点属性をカバーする魔導士向けプリセット。
 * HOLY を含めることで DEMON_LORD などの聖弱点ボスにも対応。
 */
function magePresetAllElements(characterId: string): GambitSet {
  return {
    schemaVersion: GAMBIT_SCHEMA_VERSION,
    characterId,
    rules: [
      {
        id: "r1",
        enabled: true,
        condition: { type: "ALLY_HP_LT", value: 30 },
        target: { type: "ALLY_MATCH" },
        action: { type: "CAST_HEAL", spellId: "CURE" },
      },
      {
        id: "r2",
        enabled: true,
        condition: { type: "ENEMY_WEAK_TO", element: "HOLY" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "CAST_OFFENSE", spellId: "HOLY_BOLT" },
      },
      {
        id: "r3",
        enabled: true,
        condition: { type: "ENEMY_WEAK_TO", element: "FIRE" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "CAST_OFFENSE", spellId: "FIRA" },
      },
      {
        id: "r4",
        enabled: true,
        condition: { type: "ENEMY_WEAK_TO", element: "ICE" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "CAST_OFFENSE", spellId: "BLIZZARA" },
      },
      {
        id: "r5",
        enabled: true,
        condition: { type: "ENEMY_WEAK_TO", element: "THUNDER" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "CAST_OFFENSE", spellId: "THUNDARA" },
      },
      {
        id: "r6",
        enabled: true,
        condition: { type: "ENEMY_LOWEST_HP" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "ATTACK" },
      },
    ],
  };
}

/**
 * 治癒士向け：HOLY 攻撃も持つ拡張版。
 * 瀕死回復・蘇生・聖攻撃・通常攻撃の優先順。
 */
function healerPresetHolyFocus(characterId: string): GambitSet {
  return {
    schemaVersion: GAMBIT_SCHEMA_VERSION,
    characterId,
    rules: [
      {
        id: "r1",
        enabled: true,
        condition: { type: "ALLY_HP_LT", value: 40 },
        target: { type: "ALLY_MATCH" },
        action: { type: "CAST_HEAL", spellId: "CURE" },
      },
      {
        id: "r2",
        enabled: true,
        condition: { type: "ALLY_DEAD" },
        target: { type: "ALLY_MATCH" },
        action: { type: "CAST_REVIVE", spellId: "RAISE" },
      },
      {
        id: "r3",
        enabled: true,
        condition: { type: "ENEMY_WEAK_TO", element: "HOLY" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "CAST_OFFENSE", spellId: "HOLY_BOLT" },
      },
      {
        id: "r4",
        enabled: true,
        condition: { type: "ENEMY_EXISTS" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "ATTACK" },
      },
    ],
  };
}

/**
 * 標準パーティ：剣士2 + 魔導士 + 治癒士、フル装備、最適プリセット。
 * これが「M3 で目指す体感」のベースライン。
 */
function createStandardParty(): Unit[] {
  const sword1 = createSwordsman("a1", "Sword1", presetTank("a1"), {
    equipment: {
      weapon: "STEEL_SWORD",
      armor: "PLATE_MAIL",
      sensor: "HP_SCANNER",
    },
  });
  const sword2 = createSwordsman("a2", "Sword2", presetFinisher("a2"), {
    equipment: {
      weapon: "STEEL_SWORD",
      armor: "PLATE_MAIL",
      sensor: "STATUS_DETECTOR",
    },
  });
  const mage = createMage("a3", "Mage1", magePresetAllElements("a3"), {
    equipment: {
      weapon: "CRYSTAL_STAFF",
      armor: "ARCHWIZARD_ROBE",
      sensor: "ELEMENT_ANALYZER",
    },
  });
  const healer = createHealer("a4", "Healer1", healerPresetHolyFocus("a4"), {
    equipment: {
      weapon: "ANCIENT_MACE",
      armor: "CARDINAL_GARB",
      sensor: "BASIC_SCANNER",
    },
  });
  return [sword1, sword2, mage, healer];
}

// ============================================================================
// パーティバリエーション（depth 20 勝率測定用）
// ============================================================================

interface PartyVariant {
  name: string;
  build: () => Unit[];
}

/** 装備違いのバリエーションを 6 種類用意（ガンビット・センサー・武器を入れ替える）*/
const PARTY_VARIANTS: PartyVariant[] = [
  {
    name: "標準（フル装備）",
    build: createStandardParty,
  },
  {
    name: "全員 finisher（火力重視）",
    build: () => {
      const eq = (sensor: Equipment["sensor"]): Equipment => ({
        weapon: "STEEL_SWORD",
        armor: "PLATE_MAIL",
        sensor,
      });
      return [
        createSwordsman("a1", "S1", presetFinisher("a1"), { equipment: eq("HP_SCANNER") }),
        createSwordsman("a2", "S2", presetFinisher("a2"), { equipment: eq("STATUS_DETECTOR") }),
        createMage("a3", "M1", magePresetAllElements("a3"), {
          equipment: {
            weapon: "CRYSTAL_STAFF",
            armor: "ARCHWIZARD_ROBE",
            sensor: "ELEMENT_ANALYZER",
          },
        }),
        createHealer("a4", "H1", healerPresetHolyFocus("a4"), {
          equipment: {
            weapon: "ANCIENT_MACE",
            armor: "CARDINAL_GARB",
            sensor: "BASIC_SCANNER",
          },
        }),
      ];
    },
  },
  {
    name: "中ランク装備（IRON_SWORD / CHAIN_MAIL / FIRE_STAFF）",
    build: () => [
      createSwordsman("a1", "S1", presetTank("a1"), {
        equipment: { weapon: "IRON_SWORD", armor: "CHAIN_MAIL", sensor: "HP_SCANNER" },
      }),
      createSwordsman("a2", "S2", presetFinisher("a2"), {
        equipment: { weapon: "IRON_SWORD", armor: "CHAIN_MAIL", sensor: "STATUS_DETECTOR" },
      }),
      createMage("a3", "M1", magePresetAllElements("a3"), {
        equipment: { weapon: "FIRE_STAFF", armor: "WIZARD_CLOAK", sensor: "ELEMENT_ANALYZER" },
      }),
      createHealer("a4", "H1", healerPresetHolyFocus("a4"), {
        equipment: { weapon: "BLESSED_MACE", armor: "BISHOP_ROBE", sensor: "BASIC_SCANNER" },
      }),
    ],
  },
  {
    name: "魔導士 2 人（聖+火）",
    build: () => [
      createSwordsman("a1", "S1", presetTank("a1"), {
        equipment: { weapon: "STEEL_SWORD", armor: "PLATE_MAIL", sensor: "HP_SCANNER" },
      }),
      createMage("a2", "M1", magePresetAllElements("a2"), {
        equipment: {
          weapon: "CRYSTAL_STAFF",
          armor: "ARCHWIZARD_ROBE",
          sensor: "ELEMENT_ANALYZER",
        },
      }),
      createMage("a3", "M2", magePresetAllElements("a3"), {
        equipment: {
          weapon: "CRYSTAL_STAFF",
          armor: "ARCHWIZARD_ROBE",
          sensor: "ELEMENT_ANALYZER",
        },
      }),
      createHealer("a4", "H1", healerPresetHolyFocus("a4"), {
        equipment: { weapon: "ANCIENT_MACE", armor: "CARDINAL_GARB", sensor: "BASIC_SCANNER" },
      }),
    ],
  },
  {
    name: "治癒士 2 人（持久戦）",
    build: () => [
      createSwordsman("a1", "S1", presetTank("a1"), {
        equipment: { weapon: "STEEL_SWORD", armor: "PLATE_MAIL", sensor: "HP_SCANNER" },
      }),
      createSwordsman("a2", "S2", presetFinisher("a2"), {
        equipment: { weapon: "STEEL_SWORD", armor: "PLATE_MAIL", sensor: "STATUS_DETECTOR" },
      }),
      createHealer("a3", "H1", healerPresetHolyFocus("a3"), {
        equipment: { weapon: "ANCIENT_MACE", armor: "CARDINAL_GARB", sensor: "BASIC_SCANNER" },
      }),
      createHealer("a4", "H2", healerPresetHolyFocus("a4"), {
        equipment: { weapon: "ANCIENT_MACE", armor: "CARDINAL_GARB", sensor: "BASIC_SCANNER" },
      }),
    ],
  },
  {
    name: "exploitWeakness ベース（攻め重視）",
    build: () => [
      createSwordsman("a1", "S1", presetExploitWeakness("a1"), {
        equipment: { weapon: "STEEL_SWORD", armor: "PLATE_MAIL", sensor: "HP_SCANNER" },
      }),
      createSwordsman("a2", "S2", presetFinisher("a2"), {
        equipment: { weapon: "STEEL_SWORD", armor: "PLATE_MAIL", sensor: "STATUS_DETECTOR" },
      }),
      createMage("a3", "M1", magePresetAllElements("a3"), {
        equipment: {
          weapon: "CRYSTAL_STAFF",
          armor: "ARCHWIZARD_ROBE",
          sensor: "ELEMENT_ANALYZER",
        },
      }),
      createHealer("a4", "H1", presetBeginner("a4"), {
        equipment: { weapon: "ANCIENT_MACE", armor: "CARDINAL_GARB", sensor: "BASIC_SCANNER" },
      }),
    ],
  },
];

// ============================================================================
// 共通シミュレーション
// ============================================================================

interface BattleOutcome {
  winner: "ALLY" | "ENEMY" | "TIMEOUT";
  turns: number;
}

function simulate(party: Unit[], depth: number, maxTurns = 80): BattleOutcome {
  const enemies = generateEnemiesForDepth(depth);
  const result = runBattle(party, enemies, { maxTurns });
  return { winner: result.winner, turns: result.turns };
}

// ============================================================================
// テスト
// ============================================================================

describe("M3-G バランス: 標準パーティのスモークテスト", () => {
  it("depth 1〜5（固定テーブル）は標準パーティが勝てる", () => {
    for (const d of [1, 2, 3, 4, 5]) {
      const party = createStandardParty();
      const out = simulate(party, d);
      expect(out.winner, `depth ${d} で勝てない (${out.winner}, ${out.turns} turns)`).toBe(
        "ALLY",
      );
    }
  });

  it("depth 6〜12（procgen 中盤）は標準パーティが TIMEOUT しない", () => {
    for (const d of [6, 7, 8, 9, 10, 11, 12]) {
      const party = createStandardParty();
      const out = simulate(party, d);
      expect(out.winner, `depth ${d} で TIMEOUT (${out.turns} turns)`).not.toBe("TIMEOUT");
    }
  });

  it("depth 10 ボス（DARK_DRAGON）には標準パーティが勝てる", () => {
    const party = createStandardParty();
    const out = simulate(party, 10);
    expect(out.winner).toBe("ALLY");
  });

  it("depth 15〜20 は TIMEOUT しない（決定的決着）", () => {
    for (const d of [15, 20]) {
      const party = createStandardParty();
      const out = simulate(party, d, 100);
      expect(out.winner, `depth ${d} で TIMEOUT (${out.turns} turns)`).not.toBe("TIMEOUT");
    }
  });
});

describe("M3-G バランス: パーティバリエーション勝率", () => {
  it("depth 20（DEMON_LORD）で 6 バリエーション中過半数が勝つ（標準ラスボス想定 50%+）", () => {
    const outcomes = PARTY_VARIANTS.map((v) => ({
      name: v.name,
      result: simulate(v.build(), 20, 100),
    }));
    const wins = outcomes.filter((o) => o.result.winner === "ALLY").length;
    const total = outcomes.length;
    const winRate = wins / total;

    // 詳細をテストログに残す（fail 時に状況把握しやすい）
    // eslint-disable-next-line no-console
    console.log(
      "[balance] depth 20 results:\n" +
        outcomes
          .map((o) => `  ${o.name}: ${o.result.winner} (${o.result.turns}t)`)
          .join("\n"),
    );

    expect(
      winRate,
      `depth 20 勝率 ${(winRate * 100).toFixed(0)}% （${wins}/${total}）` +
        ` → DEMON_LORD バランスを再調整`,
    ).toBeGreaterThanOrEqual(0.5);
  });

  it("depth 10（DARK_DRAGON）で 6 バリエーション中 5 つ以上が勝つ（中盤ボス想定）", () => {
    const outcomes = PARTY_VARIANTS.map((v) => ({
      name: v.name,
      result: simulate(v.build(), 10),
    }));
    const wins = outcomes.filter((o) => o.result.winner === "ALLY").length;

    // eslint-disable-next-line no-console
    console.log(
      "[balance] depth 10 results:\n" +
        outcomes
          .map((o) => `  ${o.name}: ${o.result.winner} (${o.result.turns}t)`)
          .join("\n"),
    );

    expect(wins).toBeGreaterThanOrEqual(5);
  });
});

describe("M3-G バランス: 個別検証（DEMON_LORD と PROVOKE / 装備差）", () => {
  it("標準パーティから装備を全部外すと depth 10 では負け（装備が機能している証拠）", () => {
    const party = createStandardParty().map((u) => ({ ...u, equipment: {} }));
    const out = simulate(party, 10);
    // 装備なしで勝ててしまうとボスが弱すぎる
    expect(out.winner).not.toBe("ALLY");
  });

  it("depth 5 のボス戦は装備なしでも勝てる（初心者ボス想定）", () => {
    const party = createStandardParty().map((u) => ({ ...u, equipment: {} }));
    const out = simulate(party, 5);
    expect(out.winner).toBe("ALLY");
  });
});
