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
  DARK_DRAGON,
  DARK_KNIGHT,
  DEMON_LORD,
  DEMON_LORD_MINION,
  GOBLIN,
  GOBLIN_KING,
  GOLEM,
  HARPY,
  IMP,
  LICH,
  NECROMANCER,
  ORC,
  PHANTOM,
  SKELETON,
  SLIME,
  TROLL,
  TURTLE,
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

type Tier = "weak" | "medium" | "strong" | "strong-plus";

/**
 * M3-F: tier 拡張
 * - weak (深度 6〜7)：GOBLIN/WOLF/SLIME（初級）
 * - medium (8〜12)：WOLF/BANDIT/SKELETON/ORC/HARPY
 * - strong (13〜17)：BANDIT/SKELETON/GOLEM/ORC/TROLL/IMP/PHANTOM
 * - strong-plus (18+)：GOLEM/TROLL/DARK_KNIGHT/LICH/TURTLE/DEMON_LORD_MINION
 *
 * 各 tier の HP/atk 帯がオーバーラップしすぎないよう敵を分配。
 */
const TIER_POOL: Record<Tier, EnemyTemplate[]> = {
  weak: [GOBLIN, WOLF, SLIME],
  medium: [WOLF, BANDIT, SKELETON, ORC, HARPY],
  strong: [BANDIT, SKELETON, GOLEM, ORC, TROLL, IMP, PHANTOM],
  "strong-plus": [GOLEM, TROLL, DARK_KNIGHT, LICH, TURTLE, DEMON_LORD_MINION],
};

/**
 * M3-F: 深度別ボスプール
 * - 5:  GOBLIN_KING（チュートリアル後初ボス）
 * - 10: DARK_DRAGON
 * - 15: NECROMANCER
 * - 20+: DEMON_LORD（v1.0 想定のラスボス、超深度でもループ）
 */
const BOSS_POOL_BY_DEPTH: Record<number, EnemyTemplate[]> = {
  5: [GOBLIN_KING],
  10: [DARK_DRAGON],
  15: [NECROMANCER],
  20: [DEMON_LORD],
};

function bossPoolForDepth(depth: number): EnemyTemplate[] {
  const exact = BOSS_POOL_BY_DEPTH[depth];
  if (exact) return exact;
  // 25 以降は最後のスケジュール（20 の魔王）を再利用
  return BOSS_POOL_BY_DEPTH[20];
}

function tierForDepth(depth: number): Tier {
  if (depth <= 7) return "weak";
  if (depth <= 12) return "medium";
  if (depth <= 17) return "strong";
  return "strong-plus";
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
    const boss = pickFromPool(bossPoolForDepth(depth), rng);
    const tierPool = TIER_POOL[tierForDepth(depth)];
    // M3-F: ボス階のミニオン同行数を深度で増やす
    //   - 深度 5:  ミニオン 1（既存挙動を維持）
    //   - 深度 10: ミニオン 1〜2
    //   - 深度 15+: ミニオン 2
    const minionCount = depth <= 5 ? 1 : depth <= 10 ? 1 + Math.floor(rng() * 2) : 2;
    const minions = Array.from({ length: minionCount }, () =>
      pickFromPool(tierPool, rng),
    );
    return [boss, ...minions];
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
