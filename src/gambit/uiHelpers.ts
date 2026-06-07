/**
 * 編集 UI のための制約ヘルパ
 *
 * 関連仕様: docs/gambit_dsl_spec.md §4.2（行動の使用可能ジョブ）、§5.2（条件↔対象の整合性）
 *
 * - 「不整合な対象は選択肢に出さない」（M2-F2 仕様分岐 A）
 * - 「ジョブで使えない行動は選択肢に出さない」（M2-F2 仕様分岐 A）
 */

import type { JobId } from "../battle/types";
import type {
  Action,
  ActionType,
  Condition,
  ConditionType,
  TargetType,
} from "./types";

// ============================================================================
// 条件 → 適合する対象
// ============================================================================

/** 対象のタイプ別、いつ使えるか */
type TargetCompatibilityRule =
  | { kind: "ALWAYS" } // 条件と独立に使える
  | { kind: "ALLY_CONDITION_ONLY" } // 条件が ALLY_* のときのみ
  | { kind: "ENEMY_CONDITION_ONLY" }; // 条件が ENEMY_* または BOSS_PRESENT のときのみ

const TARGET_RULES: Record<TargetType, TargetCompatibilityRule> = {
  SELF: { kind: "ALWAYS" },
  ALLY_MATCH: { kind: "ALLY_CONDITION_ONLY" },
  ALLY_LOWEST_HP: { kind: "ALWAYS" },
  ALLY_ALL: { kind: "ALWAYS" },
  ENEMY_MATCH: { kind: "ENEMY_CONDITION_ONLY" },
  ENEMY_ALL: { kind: "ALWAYS" },
};

/** 指定した条件と組み合わせて整合する対象タイプを返す */
export function getCompatibleTargets(condition: Condition): TargetType[] {
  const isAlly = condition.type.startsWith("ALLY_");
  const isEnemy = condition.type.startsWith("ENEMY_") || condition.type === "BOSS_PRESENT";

  const result: TargetType[] = [];
  for (const [t, rule] of Object.entries(TARGET_RULES) as [TargetType, TargetCompatibilityRule][]) {
    switch (rule.kind) {
      case "ALWAYS":
        result.push(t);
        break;
      case "ALLY_CONDITION_ONLY":
        if (isAlly) result.push(t);
        break;
      case "ENEMY_CONDITION_ONLY":
        if (isEnemy) result.push(t);
        break;
    }
  }
  return result;
}

/** ある対象が、ある条件と組み合わせて整合するか */
export function isTargetCompatible(condition: Condition, target: TargetType): boolean {
  return getCompatibleTargets(condition).includes(target);
}

// ============================================================================
// ジョブ → 使える行動
// ============================================================================

const JOB_ACTIONS: Record<JobId, ActionType[]> = {
  SWORDSMAN: [
    "ATTACK",
    "SKILL",
    "CHARGE",
    "CHAIN",
    "USE_ITEM",
    "DEFEND",
    "WAIT",
    "PROVOKE",
    "INTERPOSE",
  ],
  MAGE: ["ATTACK", "USE_ITEM", "DEFEND", "WAIT", "CAST_OFFENSE", "CAST_DEBUFF"],
  HEALER: [
    "ATTACK",
    "USE_ITEM",
    "DEFEND",
    "WAIT",
    "CAST_HEAL",
    "CAST_REVIVE",
    "CAST_BUFF",
    "CAST_CURE_STATUS",
  ],
};

export function getJobActions(jobId: JobId): ActionType[] {
  return JOB_ACTIONS[jobId];
}

/** ある Action がそのジョブで使えるか（actionType レベルでチェック）*/
export function isActionAllowedForJob(action: Action, jobId: JobId): boolean {
  return JOB_ACTIONS[jobId].includes(action.type);
}

// ============================================================================
// 条件カテゴリ分け（UI のグループ表示用）
// ============================================================================

export type ConditionCategory = "self" | "ally" | "enemy" | "battle";

const CATEGORY_BY_CONDITION: Record<ConditionType, ConditionCategory> = {
  SELF_HP_LT: "self",
  SELF_HP_GTE: "self",
  SELF_MP_LT: "self",
  SELF_MP_GTE: "self",
  SELF_HAS_STATUS: "self",
  SELF_NO_STATUS: "self",
  ALLY_HP_LT: "ally",
  ALLY_HP_GTE: "ally",
  ALLY_MP_LT: "ally",
  ALLY_MP_GTE: "ally",
  ALLY_HAS_STATUS: "ally",
  ALLY_DEAD: "ally",
  ALLY_TARGETED: "ally",
  ENEMY_EXISTS: "enemy",
  ENEMY_LOWEST_HP: "enemy",
  ENEMY_HIGHEST_HP: "enemy",
  ENEMY_HAS_STATUS: "enemy",
  ENEMY_NO_STATUS: "enemy",
  ENEMY_WEAK_TO: "enemy",
  ENEMY_TYPE: "enemy",
  BOSS_PRESENT: "battle",
};

export function getConditionCategory(type: ConditionType): ConditionCategory {
  return CATEGORY_BY_CONDITION[type];
}
