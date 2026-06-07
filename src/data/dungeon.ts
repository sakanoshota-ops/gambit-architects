/**
 * 深度に応じた敵編成（M2-G/J）
 *
 * - 深度 1〜5：固定テーブル（M2-G で確定、ターゲットバランス用）
 * - 深度 6 以降：tier ベースの procgen
 *     - tier は深度に応じて weak / medium / strong に切り替わる
 *     - 5 の倍数の深度はボス戦
 *     - 同じ深度なら毎回同じ編成（深度をシードとした決定的乱数）
 *
 * M3 以降の予定：
 *   - 装備・センサーで条件付き編成
 *   - 連続バトル（クリアで自動的に次の深度）
 *   - ボス特殊条件
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

// ============================================================================
// 固定テーブル（深度 1〜5）
// ============================================================================

const FIXED_ENCOUNTERS: Record<number, EnemyTemplate[]> = {
  1: [GOBLIN, GOBLIN],
  2: [GOBLIN, WOLF],
  3: [WOLF, WOLF, BANDIT],
  4: [SKELETON, SKELETON, GOLEM],
  5: [GOBLIN_KING, BANDIT],
};

const FIXED_MAX_DEPTH = 5;

// ============================================================================
// procgen（深度 6 以降）
// ============================================================================

type Tier = "weak" | "medium" | "strong";

const TIER_POOL: Record<Tier, EnemyTemplate[]> = {
  weak: [GOBLIN, WOLF],
  medium: [WOLF, BANDIT, SKELETON],
  strong: [BANDIT, SKELETON, GOLEM],
};

const BOSS_POOL: EnemyTemplate[] = [GOBLIN_KING];

function tierForDepth(depth: number): Tier {
  if (depth <= 7) return "weak";
  if (depth <= 12) return "medium";
  return "strong";
}

function isBossDepth(depth: number): boolean {
  return depth >= 5 && depth % 5 === 0;
}

/**
 * 簡易 PRNG（mulberry32 派生）。
 * 同じ seed なら同じ系列を返す（決定的）。
 */
function makeRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFromPool<T>(pool: T[], rng: () => number): T {
  return pool[Math.floor(rng() * pool.length)];
}

function generateProcgenForDepth(depth: number): EnemyTemplate[] {
  const rng = makeRng(depth);

  if (isBossDepth(depth)) {
    const boss = pickFromPool(BOSS_POOL, rng);
    const support = pickFromPool(TIER_POOL[tierForDepth(depth)], rng);
    return [boss, support];
  }

  const pool = TIER_POOL[tierForDepth(depth)];
  const count = 2 + Math.floor(rng() * 2); // 2 or 3
  return Array.from({ length: count }, () => pickFromPool(pool, rng));
}

// ============================================================================
// 公開 API
// ============================================================================

/**
 * 指定の深度に対応する敵ユニット列を生成する。
 * - 深度 1〜5：固定テーブル
 * - 深度 6 以降：procgen（決定的）
 * - 範囲外の深度（≤ 0）は 1 にクランプ
 */
export function generateEnemiesForDepth(depth: number): Unit[] {
  const safe = Math.max(1, depth);
  const templates =
    safe <= FIXED_MAX_DEPTH ? FIXED_ENCOUNTERS[safe] : generateProcgenForDepth(safe);

  return templates.map((tmpl, i) => {
    const id = `enemy_d${safe}_${i}`;
    return createEnemy(tmpl, id, enemyGambit(id));
  });
}

/** ボス深度かどうか（UI が「ボス挑戦」表示などに使う想定） */
export function depthHasBoss(depth: number): boolean {
  return isBossDepth(depth) || depth === 5;
}
