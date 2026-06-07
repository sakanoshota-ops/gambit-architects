/**
 * 初回起動時のデフォルトプレイヤーデータ
 *
 * - パーティは剣士 4 体 + presetTank
 * - M2-E（編成画面）でジョブを切り替えられるようにする予定
 */

import { createSwordsman } from "../data/jobs";
import { presetTank } from "../gambit/presets";
import type { PlayerData } from "./PlayerContext";

export function createDefaultPlayerData(): PlayerData {
  const party = [
    createSwordsman("ally_1", "Sword1", presetTank("ally_1")),
    createSwordsman("ally_2", "Sword2", presetTank("ally_2")),
    createSwordsman("ally_3", "Sword3", presetTank("ally_3")),
    createSwordsman("ally_4", "Sword4", presetTank("ally_4")),
  ];
  return {
    party,
    dungeon: {
      currentDepth: 1,
      maxDepth: 1,
    },
    settings: {
      battleSpeed: 2,
    },
  };
}
