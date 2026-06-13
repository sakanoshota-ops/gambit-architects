/**
 * データ表示名のローカライズヘルパ（M3-G-8）
 *
 * - ジョブ・敵・装備・属性・状態・アイテム・スキル・魔法・行動などの
 *   "表示名" を、ID から locale-aware に解決する
 * - データ側（jobs.ts / enemies.ts / equipment.ts）の `displayName` は
 *   日本語のまま残し、UI 側はこのヘルパを使って翻訳する
 *
 * 使い方：
 *   import { localizedEnemyName } from "../i18n/names";
 *   const name = localizedEnemyName(unit.name, locale);
 */

import type { JobId } from "../battle/types";
import type { ArmorId, SensorId, WeaponId } from "../data/equipment";
import type {
  Action,
  BuffId,
  Condition,
  DebuffId,
  Element,
  EnemyType,
  GambitRule,
  HealSpellId,
  ItemId,
  OffenseSpellId,
  Status,
  Target,
} from "../gambit/types";

import { translate, type Locale, type StringKey } from "./strings";

/** key が存在しなければ fallback を返す */
function safeT(key: string, locale: Locale, fallback: string): string {
  // strings.ts のキー型と整合させるため as でキャスト
  return translate(key as StringKey, locale) || fallback;
}

export function localizedJobName(jobId: JobId, locale: Locale): string {
  return safeT(`job.${jobId}`, locale, jobId);
}

export function localizedEnemyNameById(id: string, locale: Locale): string {
  return safeT(`enemy.${id}`, locale, id);
}

export function localizedEnemyType(type: EnemyType, locale: Locale): string {
  return safeT(`enemyType.${type}`, locale, type);
}

export function localizedElement(el: Element, locale: Locale): string {
  return safeT(`element.${el}`, locale, el);
}

export function localizedStatus(status: Status, locale: Locale): string {
  return safeT(`status.${status}`, locale, status);
}

export function localizedWeapon(id: WeaponId, locale: Locale): string {
  return safeT(`weapon.${id}`, locale, id);
}

export function localizedArmor(id: ArmorId, locale: Locale): string {
  return safeT(`armor.${id}`, locale, id);
}

export function localizedSensor(id: SensorId, locale: Locale): string {
  return safeT(`sensor.${id}`, locale, id);
}

export function localizedItem(id: ItemId, locale: Locale): string {
  return safeT(`item.${id}`, locale, id);
}

export function localizedOffenseSpell(id: OffenseSpellId, locale: Locale): string {
  return safeT(`spell.${id}`, locale, id);
}

export function localizedHealSpell(id: HealSpellId, locale: Locale): string {
  return safeT(`spell.${id}`, locale, id);
}

export function localizedBuff(id: BuffId, locale: Locale): string {
  return safeT(`status.${id}`, locale, id);
}

export function localizedDebuff(id: DebuffId, locale: Locale): string {
  return safeT(`status.${id}`, locale, id);
}

export function localizedSkill(id: string, locale: Locale): string {
  return safeT(`skill.${id}`, locale, id);
}

export function localizedActionType(type: string, locale: Locale): string {
  return safeT(`action.${type}`, locale, type);
}

// ============================================================================
// ガンビットルール 1 行を組み立てる（条件 → 対象 → 行動）
// ============================================================================

/** 条件の人間可読表記（プレースホルダ {value}/{status} 等は埋めた状態）*/
export function localizedCondition(c: Condition, locale: Locale): string {
  const key = `condition.${c.type}` as StringKey;
  if ("value" in c) {
    return translate(key, locale, { value: c.value });
  }
  if ("status" in c) {
    return translate(key, locale, { status: localizedStatus(c.status, locale) });
  }
  if ("element" in c) {
    return translate(key, locale, { element: localizedElement(c.element, locale) });
  }
  if ("enemyType" in c) {
    return translate(key, locale, {
      enemyType: localizedEnemyType(c.enemyType, locale),
    });
  }
  return translate(key, locale);
}

/** 対象の人間可読表記 */
export function localizedTarget(t: Target, locale: Locale): string {
  return safeT(`target.${t.type}`, locale, t.type);
}

/** 行動の人間可読表記（パラメータ付きは括弧で補足）*/
export function localizedAction(a: Action, locale: Locale): string {
  const typeLabel = localizedActionType(a.type, locale);
  if ("spellId" in a) {
    return `${typeLabel}（${safeT(`spell.${a.spellId}`, locale, a.spellId)}）`;
  }
  if ("skillId" in a) {
    return `${typeLabel}（${localizedSkill(a.skillId, locale)}）`;
  }
  if ("buffId" in a) {
    return `${typeLabel}（${localizedBuff(a.buffId, locale)}）`;
  }
  if ("debuffId" in a) {
    return `${typeLabel}（${localizedDebuff(a.debuffId, locale)}）`;
  }
  if ("status" in a) {
    return `${typeLabel}（${localizedStatus(a.status, locale)}）`;
  }
  if ("itemId" in a) {
    return `${typeLabel}（${localizedItem(a.itemId, locale)}）`;
  }
  return typeLabel;
}

/** ルール 1 行のサマリ：条件 → 対象 → 行動 */
export function localizedRuleSummary(rule: GambitRule, locale: Locale): string {
  return `${localizedCondition(rule.condition, locale)} → ${localizedTarget(
    rule.target,
    locale,
  )} → ${localizedAction(rule.action, locale)}`;
}
