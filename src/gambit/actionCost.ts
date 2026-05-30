/**
 * 行動の MP コスト表
 *
 * - 評価器が `canPerform`（MP 不足 → フォールスルー）の判定に使う。
 * - バランス値は M1 では仮置き。M2 以降に data_schema / battle_system_spec で正式化。
 */

import type { Action } from "./types";

/** 指定された行動の MP コストを返す。負値は実装ミス扱いで 0 にクランプ */
export function getActionMpCost(action: Action): number {
  const cost = computeMpCost(action);
  return cost < 0 ? 0 : cost;
}

function computeMpCost(action: Action): number {
  switch (action.type) {
    // -- MP を消費しない行動 --
    case "ATTACK":
    case "CHARGE":
    case "CHAIN":
    case "USE_ITEM":
    case "DEFEND":
    case "WAIT":
    case "PROVOKE":
    case "INTERPOSE":
      return 0;

    // -- ジョブスキル（M1 仮値）--
    case "SKILL":
      switch (action.skillId) {
        case "POWER_SLASH":
          return 4;
        case "GUARD_BREAK":
          return 6;
        case "WHIRLWIND":
          return 12;
      }
      return 0;

    // -- 攻撃魔法 --
    case "CAST_OFFENSE":
      switch (action.spellId) {
        case "FIRE":
        case "BLIZZARD":
        case "THUNDER":
        case "HOLY_BOLT":
        case "DARK_BOLT":
          return 4;
        case "FIRA":
        case "BLIZZARA":
        case "THUNDARA":
          return 12;
      }
      return 0;

    // -- 回復魔法 --
    case "CAST_HEAL":
      switch (action.spellId) {
        case "CURE":
          return 4;
        case "CURA":
          return 12;
        case "CURAGA":
          return 32;
        case "CURE_ALL":
          return 40;
      }
      return 0;

    // -- 蘇生 --
    case "CAST_REVIVE":
      return 20;

    // -- バフ / デバフ / 状態回復 --
    case "CAST_BUFF":
    case "CAST_DEBUFF":
      return 8;
    case "CAST_CURE_STATUS":
      return 6;
  }
}
