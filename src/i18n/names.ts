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
  BuffId,
  DebuffId,
  Element,
  EnemyType,
  HealSpellId,
  ItemId,
  OffenseSpellId,
  Status,
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
