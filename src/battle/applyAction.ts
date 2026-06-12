/**
 * 行動を戦闘状態に適用する（M3-B 拡張版）
 *
 * - 入力: `ActionDecision` に従って解決された対象たち
 * - 副作用: `ctx.battle` / `actor` / `targets` を mutate する
 *
 * M3-B で実装した追加：
 *   - 回復魔法バリエーション：CURE / CURA / CURAGA / CURE_ALL
 *   - 攻撃魔法全属性：FIRE/FIRA/BLIZZARD/BLIZZARA/THUNDER/THUNDARA/HOLY_BOLT/DARK_BOLT
 *   - バフ：PROTECT / SHELL / REGEN / HASTE
 *   - デバフ：POISON / SILENCE / BLIND / SLOW
 *   - アイテム：POTION / HI_POTION / ETHER / ANTIDOTE / EYE_DROPS / ECHO_HERB / PHOENIX_DOWN
 *   - 剣士スキル：POWER_SLASH / GUARD_BREAK / WHIRLWIND
 *   - BLIND 状態の attacker は物理 50% miss（rng injection）
 *   - SHELL 状態の target への魔法被ダメ -25%
 *
 * バランス値は M3 仮置き。M4 以降に battle_system_spec.md で正式化。
 */

import type {
  Action,
  BuffId,
  DebuffId,
  Element,
  HealSpellId,
  ItemId,
  OffenseSpellId,
  Status,
} from "../gambit/types";
import { getActionMpCost } from "../gambit/actionCost";
import {
  getEffectiveAtk,
  getEffectiveDef,
  getEffectiveMag,
} from "../data/equipment";
import type { BattleState, Unit } from "./types";

export interface ApplyContext {
  actor: Unit;
  targets: Unit[];
  battle: BattleState;
  ruleId: string;
}

// -- バランス値（M2-A 起源）--
const MIN_DAMAGE = 1;
const DEFEND_REDUCTION = 0.5;
const PROTECT_REDUCTION = 0.75; // 物理被ダメ
const SHELL_REDUCTION = 0.75; // 魔法被ダメ
const POTION_HEAL = 30;
const SKILL_POWER_SLASH_MULT = 1.5;
const SKILL_GUARD_BREAK_MULT = 1.3;
const SKILL_WHIRLWIND_MULT = 0.8; // 全体ヒット、単発威力は控えめ
const WEAKNESS_MULT = 1.5;
const RESISTANCE_MULT = 0.5; // M3-F: 耐性属性の被ダメ
const REVIVE_HP_RATIO = 0.25;
const BLIND_HIT_THRESHOLD = 0.5; // rng() < 0.5 で miss

const BUFF_DURATION = 4;
const POISON_DURATION = 5;
const DEBUFF_DURATION = 5;

// -- M3-A バランス値 --
const CHARGE_MULTIPLIER = 1.5;
const CHAIN_MULTIPLIER = 1.2;
const PROVOKE_DURATION = 3;

// -- M3-B バランス値 --
const HEAL_MULT_BY_SPELL: Record<HealSpellId, number> = {
  CURE: 3, // mag x 3（M2-A 起源）
  CURA: 5,
  CURAGA: 8,
  CURE_ALL: 4, // 全体係数（target は ALLY_ALL 想定）
};

const OFFENSE_MULT_BY_SPELL: Record<OffenseSpellId, number> = {
  FIRE: 1.0,
  BLIZZARD: 1.0,
  THUNDER: 1.0,
  HOLY_BOLT: 1.0,
  DARK_BOLT: 1.0,
  FIRA: 1.5,
  BLIZZARA: 1.5,
  THUNDARA: 1.5,
};

const HI_POTION_HEAL = 80;
const ETHER_RESTORE = 30;

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
      const charged = battle.chargedUnitIds.has(actor.id);
      if (charged) battle.chargedUnitIds.delete(actor.id);
      const mult = charged ? CHARGE_MULTIPLIER : 1.0;
      for (const target of targets) {
        applyDamage(target, calculatePhysicalDamage(actor, target, battle, mult), battle);
        battle.lastUnitAttackedThisTurn = target.id;
      }
      return;
    }

    case "SKILL": {
      const mult = skillMultiplier(action.skillId);
      if (mult === null) {
        battle.log.push({
          kind: "NOT_IMPLEMENTED",
          actorId: actor.id,
          actionType: `SKILL(${action.skillId})`,
        });
        return;
      }
      for (const target of targets) {
        applyDamage(target, calculatePhysicalDamage(actor, target, battle, mult), battle);
        battle.lastUnitAttackedThisTurn = target.id;
      }
      actor.mp = Math.max(0, actor.mp - getActionMpCost(action));
      return;
    }

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
      const mult = OFFENSE_MULT_BY_SPELL[action.spellId];
      for (const target of targets) {
        const dmg = calculateMagicDamage(actor, target, element, mult);
        applyDamage(target, dmg, battle);
      }
      actor.mp = Math.max(0, actor.mp - getActionMpCost(action));
      return;
    }

    case "CAST_HEAL": {
      const mult = HEAL_MULT_BY_SPELL[action.spellId];
      // M3-C: 装備込みの実効 mag
      const heal = Math.max(1, getEffectiveMag(actor) * mult);
      for (const target of targets) {
        const restored = Math.min(target.hpMax - target.hp, heal);
        target.hp += restored;
        battle.log.push({ kind: "HEAL", targetId: target.id, amount: restored });
      }
      actor.mp = Math.max(0, actor.mp - getActionMpCost(action));
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
      actor.mp = Math.max(0, actor.mp - getActionMpCost(action));
      return;
    }

    case "CAST_BUFF": {
      const status = buffStatus(action.buffId);
      for (const target of targets) {
        applyStatus(target, status, BUFF_DURATION);
      }
      actor.mp = Math.max(0, actor.mp - getActionMpCost(action));
      return;
    }

    case "CAST_DEBUFF": {
      const status = debuffStatus(action.debuffId);
      const duration =
        action.debuffId === "POISON" ? POISON_DURATION : DEBUFF_DURATION;
      for (const target of targets) {
        applyStatus(target, status, duration);
      }
      actor.mp = Math.max(0, actor.mp - getActionMpCost(action));
      return;
    }

    case "CAST_CURE_STATUS":
      for (const target of targets) {
        removeStatus(target, action.status);
      }
      actor.mp = Math.max(0, actor.mp - getActionMpCost(action));
      return;

    // ------------------------------------------------------------------------
    // アイテム
    // ------------------------------------------------------------------------
    case "USE_ITEM": {
      const handled = applyItem(action.itemId, actor, targets, battle);
      if (!handled) {
        battle.log.push({
          kind: "NOT_IMPLEMENTED",
          actorId: actor.id,
          actionType: `USE_ITEM(${action.itemId})`,
        });
      }
      return;
    }

    // ------------------------------------------------------------------------
    // M3-A：戦術行動
    // ------------------------------------------------------------------------
    case "CHARGE":
      battle.chargedUnitIds.add(actor.id);
      return;

    case "CHAIN": {
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
      battle.provokeDurations.set(actor.id, PROVOKE_DURATION);
      return;

    case "INTERPOSE":
      for (const target of targets) {
        if (target.id === actor.id) continue;
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
  // M3-B: BLIND attacker は 50% で miss（rng injection が無ければ常に当たる）
  if (attacker.statuses.includes("BLIND") && battle.rng) {
    if (battle.rng() < BLIND_HIT_THRESHOLD) {
      return 0;
    }
  }

  // M3-C: 装備込みの実効ステータス
  const attackerAtk = getEffectiveAtk(attacker);
  const targetDef = getEffectiveDef(target);

  const base = Math.max(MIN_DAMAGE, attackerAtk - targetDef);
  let dmg = Math.floor(base * multiplier);

  if (battle.defendingThisTurn.has(target.id)) {
    dmg = Math.floor(dmg * DEFEND_REDUCTION);
  }
  if (target.statuses.includes("PROTECT")) {
    dmg = Math.floor(dmg * PROTECT_REDUCTION);
  }
  // M3-F: 物理は NEUTRAL 耐性で 0.5x（SLIME / TURTLE / PHANTOM の物理半減）
  if (target.resistances.includes("NEUTRAL")) {
    dmg = Math.floor(dmg * RESISTANCE_MULT);
  }

  return Math.max(MIN_DAMAGE, dmg);
}

function calculateMagicDamage(
  caster: Unit,
  target: Unit,
  element: Element,
  multiplier: number,
): number {
  // M3-C: 装備込みの実効ステータス
  const casterMag = getEffectiveMag(caster);
  const targetDef = getEffectiveDef(target);

  let dmg = Math.max(MIN_DAMAGE, casterMag * 2 - targetDef);
  dmg = Math.floor(dmg * multiplier);
  if (target.weaknesses.includes(element)) {
    dmg = Math.floor(dmg * WEAKNESS_MULT);
  }
  // M3-F: 耐性属性なら 0.5x（弱点とスタックしうる：両方持てば 1.5 * 0.5 = 0.75x）
  if (target.resistances.includes(element)) {
    dmg = Math.floor(dmg * RESISTANCE_MULT);
  }
  // M3-B: SHELL target への魔法被ダメ -25%
  if (target.statuses.includes("SHELL")) {
    dmg = Math.floor(dmg * SHELL_REDUCTION);
  }
  return Math.max(MIN_DAMAGE, dmg);
}

// ============================================================================
// 内部ヘルパ：ダメージ適用と状態管理
// ============================================================================

function applyDamage(target: Unit, amount: number, battle: BattleState): void {
  if (amount === 0) {
    // BLIND miss などのケース
    battle.log.push({ kind: "DAMAGE", targetId: target.id, amount: 0 });
    return;
  }
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

function restoreMp(target: Unit, amount: number, battle: BattleState): void {
  const before = target.mp;
  target.mp = Math.min(target.mpMax, target.mp + amount);
  battle.log.push({
    kind: "HEAL",
    targetId: target.id,
    amount: target.mp - before,
  });
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

function skillMultiplier(skillId: string): number | null {
  switch (skillId) {
    case "POWER_SLASH":
      return SKILL_POWER_SLASH_MULT;
    case "GUARD_BREAK":
      return SKILL_GUARD_BREAK_MULT;
    case "WHIRLWIND":
      return SKILL_WHIRLWIND_MULT;
    default:
      return null;
  }
}

function buffStatus(buffId: BuffId): Status {
  switch (buffId) {
    case "PROTECT":
      return "PROTECT";
    case "SHELL":
      return "SHELL";
    case "REGEN":
      return "REGEN";
    case "HASTE":
      return "HASTE";
  }
}

function debuffStatus(debuffId: DebuffId): Status {
  switch (debuffId) {
    case "POISON":
      return "POISON";
    case "SILENCE":
      return "SILENCE";
    case "BLIND":
      return "BLIND";
    case "SLOW":
      return "SLOW";
  }
}

/**
 * アイテム使用を適用する。実装済みは true、未実装は false を返す。
 * inventory の在庫減算もここで行う（evaluator の canPerform で在庫チェック済み）。
 */
function applyItem(
  itemId: ItemId,
  actor: Unit,
  targets: Unit[],
  battle: BattleState,
): boolean {
  switch (itemId) {
    case "POTION":
      for (const t of targets) {
        const heal = Math.min(t.hpMax - t.hp, POTION_HEAL);
        t.hp += heal;
        battle.log.push({ kind: "HEAL", targetId: t.id, amount: heal });
      }
      break;
    case "HI_POTION":
      for (const t of targets) {
        const heal = Math.min(t.hpMax - t.hp, HI_POTION_HEAL);
        t.hp += heal;
        battle.log.push({ kind: "HEAL", targetId: t.id, amount: heal });
      }
      break;
    case "ETHER":
      for (const t of targets) restoreMp(t, ETHER_RESTORE, battle);
      break;
    case "ANTIDOTE":
      for (const t of targets) removeStatus(t, "POISON");
      break;
    case "EYE_DROPS":
      for (const t of targets) removeStatus(t, "BLIND");
      break;
    case "ECHO_HERB":
      for (const t of targets) removeStatus(t, "SILENCE");
      break;
    case "PHOENIX_DOWN":
      for (const t of targets) {
        if (!t.isAlive) {
          t.isAlive = true;
          t.hp = Math.floor(t.hpMax * REVIVE_HP_RATIO);
          battle.log.push({ kind: "HEAL", targetId: t.id, amount: t.hp });
        }
      }
      break;
    default:
      return false;
  }
  const stock = actor.inventory[itemId] ?? 0;
  actor.inventory[itemId] = stock - 1;
  return true;
}
