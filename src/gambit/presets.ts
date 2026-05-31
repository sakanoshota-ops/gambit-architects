/**
 * 標準ガンビットプリセット 4 種
 *
 * - 出典: docs/gambit_dsl_spec.md §8
 * - DSL 仕様書通りに 1:1 で実装。M1 で剣士しか実装していなくても、
 *   将来魔導士・治癒士が出てきたとき即使える形を維持する。
 * - M1 では §8.3（タンク）以外は剣士には噛み合わない（魔法行動は NotImplemented）。
 *   ただしデモ実行で評価器とランナーの正しさを示すには十分。
 */

import { GAMBIT_SCHEMA_VERSION, type GambitSet } from "./types";

/**
 * 8.1 「初心者向け：自動回復＋通常攻撃」
 * 治癒士・魔導士向け。M1 の剣士に当てると魔法が空振りして通常攻撃だけになる。
 */
export function presetBeginner(characterId: string): GambitSet {
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
        condition: { type: "ENEMY_EXISTS" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "ATTACK" },
      },
    ],
  };
}

/**
 * 8.2 「弱点突き優先」
 * 魔導士向け。剣士に当てると魔法は全部空振り → 最終的に通常攻撃。
 */
export function presetExploitWeakness(characterId: string): GambitSet {
  return {
    schemaVersion: GAMBIT_SCHEMA_VERSION,
    characterId,
    rules: [
      {
        id: "r1",
        enabled: true,
        condition: { type: "ALLY_HP_LT", value: 30 },
        target: { type: "ALLY_MATCH" },
        action: { type: "CAST_HEAL", spellId: "CURA" },
      },
      {
        id: "r2",
        enabled: true,
        condition: { type: "ENEMY_WEAK_TO", element: "FIRE" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "CAST_OFFENSE", spellId: "FIRA" },
      },
      {
        id: "r3",
        enabled: true,
        condition: { type: "ENEMY_WEAK_TO", element: "ICE" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "CAST_OFFENSE", spellId: "BLIZZARA" },
      },
      {
        id: "r4",
        enabled: true,
        condition: { type: "ENEMY_WEAK_TO", element: "THUNDER" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "CAST_OFFENSE", spellId: "THUNDARA" },
      },
      {
        id: "r5",
        enabled: true,
        condition: { type: "ENEMY_EXISTS" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "ATTACK" },
      },
    ],
  };
}

/**
 * 8.3 「タンク：盾役」
 * 剣士向け。M1 デモで実効果が動くプリセット。
 */
export function presetTank(characterId: string): GambitSet {
  return {
    schemaVersion: GAMBIT_SCHEMA_VERSION,
    characterId,
    rules: [
      {
        id: "r1",
        enabled: true,
        condition: { type: "ALLY_TARGETED" },
        target: { type: "ALLY_MATCH" },
        action: { type: "INTERPOSE" },
      },
      {
        id: "r2",
        enabled: true,
        condition: { type: "SELF_HP_LT", value: 50 },
        target: { type: "SELF" },
        action: { type: "DEFEND" },
      },
      {
        id: "r3",
        enabled: true,
        condition: { type: "BOSS_PRESENT" },
        target: { type: "SELF" },
        action: { type: "PROVOKE" },
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
 * 8.4 「止め刺し優先」
 * HP 最低の敵を狙う／瀕死の味方は回復。M1 では回復魔法が空振り → 最終的に通常攻撃。
 */
export function presetFinisher(characterId: string): GambitSet {
  return {
    schemaVersion: GAMBIT_SCHEMA_VERSION,
    characterId,
    rules: [
      {
        id: "r1",
        enabled: true,
        condition: { type: "ALLY_HP_LT", value: 20 },
        target: { type: "ALLY_MATCH" },
        action: { type: "CAST_HEAL", spellId: "CURA" },
      },
      {
        id: "r2",
        enabled: true,
        condition: { type: "ENEMY_LOWEST_HP" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "ATTACK" },
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
        condition: { type: "ENEMY_EXISTS" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "ATTACK" },
      },
    ],
  };
}

/** 4 プリセットを 1 つのオブジェクトでまとめてエクスポート（一覧表示用）*/
export const STANDARD_PRESETS = {
  beginner: presetBeginner,
  exploitWeakness: presetExploitWeakness,
  tank: presetTank,
  finisher: presetFinisher,
} as const;

export type PresetKey = keyof typeof STANDARD_PRESETS;
