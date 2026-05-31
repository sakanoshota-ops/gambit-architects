/**
 * 行動を戦闘状態に適用する（M1 本実装）
 *
 * - 入力: `ActionDecision` に従って解決された対象たち
 * - 副作用: `ctx.battle` / `actor` / `targets` を mutate する
 * - M1 で実効果を持つのは `ATTACK` / `DEFEND` / `WAIT` / `USE_ITEM(POTION)` の 4 つ
 *   それ以外は `NOT_IMPLEMENTED` イベントを残して空振り（MP も消費しない）
 *
 * バランス値は M1 暫定。M2 以降に battle_system_spec.md で正式化する。
 */

import type { Action } from "../gambit/types";
import type { BattleState, Unit } from "./types";

export interface ApplyContext {
  actor: Unit;
  /** 解決済みの対象ユニット参照（範囲攻撃は複数、単体は 1 つ）*/
  targets: Unit[];
  battle: BattleState;
  ruleId: string;
}

// -- M1 バランス値（仮置き）--
const MIN_DAMAGE = 1;
const DEFEND_REDUCTION = 0.5;
const POTION_HEAL = 30;

export function applyAction(action: Action, ctx: ApplyContext): void {
  const { actor, targets, battle, ruleId } = ctx;

  // 共通：行動 ACTION イベントを記録
  battle.log.push({
    kind: "ACTION",
    actorId: actor.id,
    ruleId,
    actionType: action.type,
    targetIds: targets.map((t) => t.id),
  });

  switch (action.type) {
    // ------------------------------------------------------------------------
    // 実効果あり（M1 で動かす 4 つ）
    // ------------------------------------------------------------------------
    case "ATTACK":
      for (const target of targets) {
        const baseDmg = Math.max(MIN_DAMAGE, actor.atk - target.def);
        const isDefending = battle.defendingThisTurn.has(target.id);
        const finalDmg = isDefending ? Math.max(MIN_DAMAGE, Math.floor(baseDmg * DEFEND_REDUCTION)) : baseDmg;
        applyDamage(target, finalDmg, battle);
      }
      return;

    case "DEFEND":
      // actor 自身を「当ターン防御中」に登録
      battle.defendingThisTurn.add(actor.id);
      return;

    case "WAIT":
      // 何もしない
      return;

    case "USE_ITEM":
      if (action.itemId === "POTION") {
        // POTION：targets を回復し、actor の inventory を 1 減らす
        for (const target of targets) {
          const healed = Math.min(target.hpMax - target.hp, POTION_HEAL);
          target.hp += healed;
          battle.log.push({ kind: "HEAL", targetId: target.id, amount: healed });
        }
        const stock = actor.inventory.POTION ?? 0;
        actor.inventory.POTION = stock - 1;
        return;
      }
      // 他のアイテムは M1 未実装
      battle.log.push({
        kind: "NOT_IMPLEMENTED",
        actorId: actor.id,
        actionType: `USE_ITEM(${action.itemId})`,
      });
      return;

    // ------------------------------------------------------------------------
    // M1 未実装（型は識別、実効果なし）
    // ------------------------------------------------------------------------
    case "SKILL":
    case "CHARGE":
    case "CHAIN":
    case "CAST_OFFENSE":
    case "CAST_HEAL":
    case "CAST_REVIVE":
    case "CAST_BUFF":
    case "CAST_DEBUFF":
    case "CAST_CURE_STATUS":
    case "PROVOKE":
    case "INTERPOSE":
      battle.log.push({
        kind: "NOT_IMPLEMENTED",
        actorId: actor.id,
        actionType: action.type,
      });
      return;
  }
}

/**
 * 単体ユニットにダメージを適用。HP が 0 を切らないよう clamp し、
 * DOWN したら isAlive を false にして DOWN イベントを残す。
 */
function applyDamage(target: Unit, amount: number, battle: BattleState): void {
  const newHp = Math.max(0, target.hp - amount);
  const actualDmg = target.hp - newHp;
  target.hp = newHp;
  battle.log.push({ kind: "DAMAGE", targetId: target.id, amount: actualDmg });

  if (target.hp === 0 && target.isAlive) {
    target.isAlive = false;
    battle.log.push({ kind: "DOWN", unitId: target.id });
  }
}
