/**
 * 行動を戦闘状態に適用する（M2-A 拡張版）
 *
 * - 入力: `ActionDecision` に従って解決された対象たち
 * - 副作用: `ctx.battle` / `actor` / `targets` を mutate する
 *
 * M2-A で実装済みの行動：
 *   - ATTACK（+ PROTECT/DEFEND の被ダメージ軽減）
 *   - DEFEND, WAIT
 *   - USE_ITEM(POTION)
 *   - CAST_OFFENSE（FIRE 系のみ実効果。他属性も同じ式で動くが M2-A の検証範囲は FIRE）
 *   - CAST_HEAL（CURE 系を一律で実装）
 *   - CAST_REVIVE（RAISE：戦闘不能から 25% HP で復活）
 *   - CAST_BUFF(PROTECT)（他バフは NOT_IMPLEMENTED）
 *   - CAST_DEBUFF(POISON)（他デバフは NOT_IMPLEMENTED）
 *   - CAST_CURE_STATUS（POISON など、指定状態を解除）
 *   - SKILL(POWER_SLASH)（物理 1.5x。他スキルは NOT_IMPLEMENTED）
 *
 * バランス値は M2 仮置き。M3 以降に battle_system_spec.md で正式化。
 */

import type { Action, Element, OffenseSpellId, Status } from "../gambit/types";
import { getActionMpCost } from "../gambit/actionCost";
import type { BattleState, Unit } from "./types";

export interface ApplyContext {
  actor: Unit;
  targets: Unit[];
  battle: BattleState;
  ruleId: string;
}

// -- M2-A バランス値（仮置き）--
const MIN_DAMAGE = 1;
const DEFEND_REDUCTION = 0.5;
const PROTECT_REDUCTION = 0.75; // 物理被ダメ x0.75
const POTION_HEAL = 30;
const SKILL_POWER_SLASH_MULT = 1.5;
const WEAKNESS_MULT = 1.5;
const REVIVE_HP_RATIO = 0.25;
const CURE_BASE_MULT = 3; // mag x 3 が回復量

const PROTECT_DURATION = 4;
const POISON_DURATION = 5;

// -- M3-A バランス値（仮置き）--
const CHARGE_MULTIPLIER = 1.5; // CHARGE 後の ATTACK
const CHAIN_MULTIPLIER = 1.2; // CHAIN ボーナス
const PROVOKE_DURATION = 3;

export function applyAction(action: Action, ctx: ApplyContext): void {
  const { actor, targets, battle, ruleId } = ctx;

  battle.log.push({
    kind: "ACTION",
    actorId: actor.id,
    ruleId,
    actionType: action.type,
    targetIds: targets.map((t) => t.id),
  });

  switch (action.type) {
    // ------------------------------------------------------------------------
    // 物理攻撃
    // ------------------------------------------------------------------------
    case "ATTACK": {
      // CHARGE 中の actor は次の ATTACK で 1.5x（消費する）
      const charged = battle.chargedUnitIds.has(actor.id);
      if (charged) battle.chargedUnitIds.delete(actor.id);
      const mult = charged ? CHARGE_MULTIPLIER : 1.0;
      for (const target of targets) {
        applyDamage(target, calculatePhysicalDamage(actor, target, battle, mult), battle);
        // CHAIN の対象解決に使われる：直近に殴られたユニット
        battle.lastUnitAttackedThisTurn = target.id;
      }
      return;
    }

    case "SKILL":
      if (action.skillId === "POWER_SLASH") {
        for (const target of targets) {
          applyDamage(
            target,
            calculatePhysicalDamage(actor, target, battle, SKILL_POWER_SLASH_MULT),
            battle,
          );
        }
        return;
      }
      battle.log.push({
        kind: "NOT_IMPLEMENTED",
        actorId: actor.id,
        actionType: `SKILL(${action.skillId})`,
      });
      return;

    // ------------------------------------------------------------------------
    // 戦術
    // ------------------------------------------------------------------------
    case "DEFEND":
      battle.defendingThisTurn.add(actor.id);
      return;

    case "WAIT":
      return;

    // ------------------------------------------------------------------------
    // 魔法
    // ------------------------------------------------------------------------
    case "CAST_OFFENSE": {
      const element = getSpellElement(action.spellId);
      for (const target of targets) {
        const dmg = calculateMagicDamage(actor, target, element);
        applyDamage(target, dmg, battle);
      }
      actor.mp = Math.max(0, actor.mp - getActionCostFromAction(action));
      return;
    }

    case "CAST_HEAL": {
      // CURE / CURA / CURAGA は同式（係数は将来差別化）。M2-A は CURE のみ動作検証範囲
      const heal = Math.max(1, actor.mag * CURE_BASE_MULT);
      for (const target of targets) {
        const restored = Math.min(target.hpMax - target.hp, heal);
        target.hp += restored;
        battle.log.push({ kind: "HEAL", targetId: target.id, amount: restored });
      }
      actor.mp = Math.max(0, actor.mp - getActionCostFromAction(action));
      return;
    }

    case "CAST_REVIVE": {
      for (const target of targets) {
        if (!target.isAlive) {
          target.isAlive = true;
          target.hp = Math.floor(target.hpMax * REVIVE_HP_RATIO);
          battle.log.push({ kind: "HEAL", targetId: target.id, amount: target.hp });
        }
      }
      actor.mp = Math.max(0, actor.mp - getActionCostFromAction(action));
      return;
    }

    case "CAST_BUFF":
      if (action.buffId === "PROTECT") {
        for (const target of targets) {
          applyStatus(target, "PROTECT", PROTECT_DURATION);
        }
        actor.mp = Math.max(0, actor.mp - getActionCostFromAction(action));
        return;
      }
      battle.log.push({
        kind: "NOT_IMPLEMENTED",
        actorId: actor.id,
        actionType: `CAST_BUFF(${action.buffId})`,
      });
      return;

    case "CAST_DEBUFF":
      if (action.debuffId === "POISON") {
        for (const target of targets) {
          applyStatus(target, "POISON", POISON_DURATION);
        }
        actor.mp = Math.max(0, actor.mp - getActionCostFromAction(action));
        return;
      }
      battle.log.push({
        kind: "NOT_IMPLEMENTED",
        actorId: actor.id,
        actionType: `CAST_DEBUFF(${action.debuffId})`,
      });
      return;

    case "CAST_CURE_STATUS":
      for (const target of targets) {
        removeStatus(target, action.status);
      }
      actor.mp = Math.max(0, actor.mp - getActionCostFromAction(action));
      return;

    // ------------------------------------------------------------------------
    // アイテム
    // ------------------------------------------------------------------------
    case "USE_ITEM":
      if (action.itemId === "POTION") {
        for (const target of targets) {
          const healed = Math.min(target.hpMax - target.hp, POTION_HEAL);
          target.hp += healed;
          battle.log.push({ kind: "HEAL", targetId: target.id, amount: healed });
        }
        const stock = actor.inventory.POTION ?? 0;
        actor.inventory.POTION = stock - 1;
        return;
      }
      battle.log.push({
        kind: "NOT_IMPLEMENTED",
        actorId: actor.id,
        actionType: `USE_ITEM(${action.itemId})`,
      });
      return;

    // ------------------------------------------------------------------------
    // M3-A：戦術行動
    // ------------------------------------------------------------------------
    case "CHARGE":
      // 次の ATTACK で 1.5x。当ターンは何もしない（フラグだけ立てる）
      battle.chargedUnitIds.add(actor.id);
      return;

    case "CHAIN": {
      // 同ターン直前に攻撃された "actor の敵側" のユニットを狙って +20% ダメ
      const lastId = battle.lastUnitAttackedThisTurn;
      if (!lastId) {
        battle.log.push({
          kind: "NOT_IMPLEMENTED",
          actorId: actor.id,
          actionType: "CHAIN(no chain target)",
        });
        return;
      }
      const opposingSide = actor.isAlly ? battle.enemies : battle.allies;
      const target = opposingSide.find((u) => u.id === lastId && u.isAlive);
      if (!target) {
        battle.log.push({
          kind: "NOT_IMPLEMENTED",
          actorId: actor.id,
          actionType: "CHAIN(target gone)",
        });
        return;
      }
      applyDamage(
        target,
        calculatePhysicalDamage(actor, target, battle, CHAIN_MULTIPLIER),
        battle,
      );
      battle.lastUnitAttackedThisTurn = target.id;
      return;
    }

    case "PROVOKE":
      // 自陣営の actor が PROVOKE 状態になる：敵 ATTACK を引き付ける
      battle.provokeDurations.set(actor.id, PROVOKE_DURATION);
      return;

    case "INTERPOSE":
      // 対象（味方）への単体物理を 1 回肩代わり
      for (const target of targets) {
        if (target.id === actor.id) continue; // 自分への INTERPOSE は無効
        battle.interposingFor.set(target.id, actor.id);
      }
      return;
  }
}

// ============================================================================
// 内部ヘルパ：ダメージ計算
// ============================================================================

function calculatePhysicalDamage(
  attacker: Unit,
  target: Unit,
  battle: BattleState,
  multiplier: number,
): number {
  const base = Math.max(MIN_DAMAGE, attacker.atk - target.def);
  let dmg = Math.floor(base * multiplier);

  // DEFEND と PROTECT は乗算で重ねがけ可
  if (battle.defendingThisTurn.has(target.id)) {
    dmg = Math.floor(dmg * DEFEND_REDUCTION);
  }
  if (target.statuses.includes("PROTECT")) {
    dmg = Math.floor(dmg * PROTECT_REDUCTION);
  }

  return Math.max(MIN_DAMAGE, dmg);
}

function calculateMagicDamage(caster: Unit, target: Unit, element: Element): number {
  let dmg = Math.max(MIN_DAMAGE, caster.mag * 2 - target.def);
  if (target.weaknesses.includes(element)) {
    dmg = Math.floor(dmg * WEAKNESS_MULT);
  }
  return Math.max(MIN_DAMAGE, dmg);
}

// ============================================================================
// 内部ヘルパ：ダメージ適用と状態管理
// ============================================================================

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

function applyStatus(target: Unit, status: Status, duration: number): void {
  if (!target.statuses.includes(status)) {
    target.statuses.push(status);
  }
  target.statusDurations[status] = duration;
}

function removeStatus(target: Unit, status: Status): void {
  target.statuses = target.statuses.filter((s) => s !== status);
  delete target.statusDurations[status];
}

// ============================================================================
// 内部ヘルパ：行動メタ
// ============================================================================

function getSpellElement(spellId: OffenseSpellId): Element {
  switch (spellId) {
    case "FIRE":
    case "FIRA":
      return "FIRE";
    case "BLIZZARD":
    case "BLIZZARA":
      return "ICE";
    case "THUNDER":
    case "THUNDARA":
      return "THUNDER";
    case "HOLY_BOLT":
      return "HOLY";
    case "DARK_BOLT":
      return "DARK";
  }
}

/** 行動 1 回ぶんの MP コストを評価器と同じソースから取得 */
function getActionCostFromAction(action: Action): number {
  return getActionMpCost(action);
}
