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
    const parsed = JSON.parse(raw) as Partial<PlayerData>;
    // 簡易スキーマチェック：壊れていたら捨てる
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.party) || parsed.party.length !== 4) return null;
    if (!parsed.dungeon || typeof parsed.dungeon.currentDepth !== "number") return null;
    if (!parsed.settings) return null;
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
