/**
 * 深度に応じた敵編成テーブル（M2-G の暫定実装）
 *
 * - M2-G: 固定テーブル（深度 1〜5）
 * - M2-J: procgen で乱数化、深度 6 以降にも対応する予定
 */

import type { Unit } from "../battle/types";
import {
  BANDIT,
  createEnemy,
  GOBLIN,
  GOBLIN_KING,
  GOLEM,
  SKELETON,
  WOLF,
  type EnemyTemplate,
} from "./enemies";
import type { GambitSet } from "../gambit/types";

/** M2 用の最も単純な敵 AI：「敵を見つけたら通常攻撃」だけ */
function enemyGambit(characterId: string): GambitSet {
  return {
    schemaVersion: 2,
    characterId,
    rules: [
      {
        id: "atk",
        enabled: true,
        condition: { type: "ENEMY_EXISTS" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "ATTACK" },
      },
    ],
  };
}

/** 編成テーブル：深度 → 敵テンプレ列 */
const ENCOUNTER_TABLE: Record<number, EnemyTemplate[]> = {
  1: [GOBLIN, GOBLIN],
  2: [GOBLIN, WOLF],
  3: [WOLF, WOLF, BANDIT],
  4: [SKELETON, SKELETON, GOLEM],
  5: [GOBLIN_KING, BANDIT],
};

/** 最大深度（M2-G は 5。深度 6 以降は M2-J で procgen） */
export const M2_MAX_DEPTH = 5;

/**
 * 指定の深度に対応する敵ユニット列を生成する。
 * 範囲外の深度は最高深度の編成を返す（タイブレーク）。
 */
export function generateEnemiesForDepth(depth: number): Unit[] {
  const safeDepth = clampDepth(depth);
  const templates = ENCOUNTER_TABLE[safeDepth] ?? ENCOUNTER_TABLE[M2_MAX_DEPTH];
  return templates.map((tmpl, i) => {
    const id = `enemy_d${safeDepth}_${i}`;
    return createEnemy(tmpl, id, enemyGambit(id));
  });
}

function clampDepth(depth: number): number {
  if (depth < 1) return 1;
  if (depth > M2_MAX_DEPTH) return M2_MAX_DEPTH;
  return depth;
}
