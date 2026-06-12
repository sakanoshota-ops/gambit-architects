/**
 * localStorage への永続化ヘルパ
 *
 * - キー: `gambit-architects-save-v1`
 * - 失敗（読み取り不可、JSON parse 失敗、形が違う）は null を返して呼び元でフォールバック
 * - SSR を想定しないが、`localStorage` が無い環境でも壊れないようガードする
 */

import type { PlayerData } from "./PlayerContext";

const STORAGE_KEY = "gambit-architects-save-v1";

export function loadPlayerData(): PlayerData | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 簡易スキーマチェック：壊れていたら捨てる
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.party) || parsed.party.length !== 4) return null;
    if (!parsed.dungeon || typeof parsed.dungeon.currentDepth !== "number") return null;
    if (!parsed.settings) return null;

    // M3-G-8 マイグレーション：locale が無い古いセーブは "ja" を補う
    if (typeof parsed.settings.locale !== "string") {
      parsed.settings.locale = "ja";
    } else if (parsed.settings.locale !== "ja" && parsed.settings.locale !== "en") {
      parsed.settings.locale = "ja";
    }

    // M2-H マイグレーション：lastBattle → recentBattles
    if (!Array.isArray(parsed.dungeon.recentBattles)) {
      if (parsed.dungeon.lastBattle) {
        parsed.dungeon.recentBattles = [parsed.dungeon.lastBattle];
      } else {
        parsed.dungeon.recentBattles = [];
      }
      delete parsed.dungeon.lastBattle;
    }

    // M3-C マイグレーション：Unit.equipment が無いユニットに空オブジェクトを補う
    // M3-F マイグレーション：Unit.resistances が無いユニットに空配列を補う
    for (const u of parsed.party) {
      if (!u || typeof u !== "object") continue;
      const unit = u as Record<string, unknown>;
      if (!unit.equipment || typeof unit.equipment !== "object") {
        unit.equipment = {};
      }
      // M3-A 関連の statusDurations が無い場合の保険
      if (!unit.statusDurations || typeof unit.statusDurations !== "object") {
        unit.statusDurations = {};
      }
      // M3-F: resistances 既定 []
      if (!Array.isArray(unit.resistances)) {
        unit.resistances = [];
      }
    }

    return parsed as PlayerData;
  } catch {
    return null;
  }
}

export function savePlayerData(data: PlayerData): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded など → 無視（M2 では検出しない）
  }
}

/** テスト用：保存をクリア */
export function clearPlayerData(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無視
  }
}
