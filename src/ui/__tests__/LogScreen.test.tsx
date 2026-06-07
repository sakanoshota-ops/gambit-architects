/**
 * LogScreen のテスト（M2-H）
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { createSwordsman } from "../../data/jobs";
import { presetTank } from "../../gambit/presets";
import {
  PlayerProvider,
  type LastBattleRecord,
  type PlayerData,
} from "../../state/PlayerContext";
import { LogScreen } from "../screens/LogScreen";

function makeData(recentBattles: LastBattleRecord[] = []): PlayerData {
  return {
    party: [
      createSwordsman("a1", "Sword1", presetTank("a1")),
      createSwordsman("a2", "Sword2", presetTank("a2")),
      createSwordsman("a3", "Sword3", presetTank("a3")),
      createSwordsman("a4", "Sword4", presetTank("a4")),
    ],
    dungeon: { currentDepth: 1, maxDepth: 1, recentBattles },
    settings: { battleSpeed: 2 },
  };
}

function renderLog(data: PlayerData) {
  return render(
    <PlayerProvider initialData={data}>
      <MemoryRouter initialEntries={["/log"]}>
        <LogScreen />
      </MemoryRouter>
    </PlayerProvider>,
  );
}

describe("LogScreen", () => {
  it("recentBattles が空のとき「まだ戦闘記録はありません」", () => {
    renderLog(makeData([]));
    expect(screen.getByText("まだ戦闘記録はありません")).toBeInTheDocument();
  });

  it("recentBattles 3 件を新しい順で表示する", () => {
    const records: LastBattleRecord[] = [
      { winner: "ALLY", turns: 5, depth: 3 },
      { winner: "ENEMY", turns: 12, depth: 2 },
      { winner: "TIMEOUT", turns: 50, depth: 1 },
    ];
    renderLog(makeData(records));

    expect(screen.getByText("勝利")).toBeInTheDocument();
    expect(screen.getByText("敗北")).toBeInTheDocument();
    expect(screen.getByText("時間切れ")).toBeInTheDocument();

    // 各深度・ターン数
    expect(screen.getByText("深度 3")).toBeInTheDocument();
    expect(screen.getByText("深度 2")).toBeInTheDocument();
    expect(screen.getByText("深度 1")).toBeInTheDocument();
    expect(screen.getByText("5 ターン")).toBeInTheDocument();
    expect(screen.getByText("12 ターン")).toBeInTheDocument();
    expect(screen.getByText("50 ターン")).toBeInTheDocument();
  });
});
