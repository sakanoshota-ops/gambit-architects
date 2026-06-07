/**
 * 戦闘画面のテスト（M2-G）
 *
 * 観点：
 *   - 戦闘がマウント時に実行されパーティ表示が現れる
 *   - 「スキップ」で全イベントが reveal され「ホームへ戻る」が出る
 *   - 勝利時に LastBattle が記録され、深度が +1 される
 *   - 敗北時に LastBattle のみ記録され、深度はそのまま
 */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { createSwordsman } from "../../data/jobs";
import { presetFinisher, presetTank } from "../../gambit/presets";
import {
  PlayerProvider,
  usePlayer,
  type PlayerData,
  type Settings,
} from "../../state/PlayerContext";
import { BattleScreen } from "../screens/BattleScreen";

function makeStrongParty(): PlayerData["party"] {
  return [
    createSwordsman("a1", "Sword1", presetFinisher("a1")),
    createSwordsman("a2", "Sword2", presetFinisher("a2")),
    createSwordsman("a3", "Sword3", presetFinisher("a3")),
    createSwordsman("a4", "Sword4", presetFinisher("a4")),
  ];
}

/** 死にやすいパーティ：HP/atk を低めにする（敗北テスト用）*/
function makeFragileParty(): PlayerData["party"] {
  return [
    createSwordsman("a1", "Sword1", presetTank("a1"), { hp: 5, hpMax: 5, atk: 1 }),
    createSwordsman("a2", "Sword2", presetTank("a2"), { hp: 5, hpMax: 5, atk: 1 }),
    createSwordsman("a3", "Sword3", presetTank("a3"), { hp: 5, hpMax: 5, atk: 1 }),
    createSwordsman("a4", "Sword4", presetTank("a4"), { hp: 5, hpMax: 5, atk: 1 }),
  ];
}

/** state を data-testid でダンプするスタブ画面 */
function HomeStub() {
  const { data } = usePlayer();
  return (
    <div>
      <span data-testid="depth">{data.dungeon.currentDepth}</span>
      <span data-testid="winner">{data.dungeon.lastBattle?.winner ?? "none"}</span>
      <span data-testid="battle-depth">{data.dungeon.lastBattle?.depth ?? -1}</span>
    </div>
  );
}

function renderBattleAt(party: PlayerData["party"], currentDepth = 1) {
  const settings: Settings = { battleSpeed: 4 };
  const initialData: PlayerData = {
    party,
    dungeon: { currentDepth, maxDepth: currentDepth },
    settings,
  };
  return render(
    <PlayerProvider initialData={initialData}>
      <MemoryRouter initialEntries={["/battle"]}>
        <Routes>
          <Route path="/battle" element={<BattleScreen />} />
          <Route path="/" element={<HomeStub />} />
        </Routes>
      </MemoryRouter>
    </PlayerProvider>,
  );
}

describe("BattleScreen 初期表示", () => {
  it("マウント時にパーティ 4 体と敵が表示される", () => {
    renderBattleAt(makeStrongParty(), 1);
    expect(screen.getByText("戦闘（深度 1）")).toBeInTheDocument();
    expect(screen.getByText("Sword1")).toBeInTheDocument();
    expect(screen.getByText("Sword4")).toBeInTheDocument();
    expect(screen.getAllByText("ゴブリン")).toHaveLength(2);
  });
});

describe("BattleScreen のスキップ", () => {
  it("「スキップ」を押すと結果ダイアログが表示される", () => {
    renderBattleAt(makeStrongParty(), 1);
    fireEvent.click(screen.getByRole("button", { name: "スキップ" }));
    expect(screen.getByText("勝利！")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ホームへ戻る" })).toBeInTheDocument();
  });
});

describe("BattleScreen の戦闘終了時の state 更新", () => {
  it("勝利すると深度が +1 され、LastBattle が記録される", () => {
    renderBattleAt(makeStrongParty(), 1);
    fireEvent.click(screen.getByRole("button", { name: "スキップ" }));
    fireEvent.click(screen.getByRole("button", { name: "ホームへ戻る" }));

    expect(screen.getByTestId("depth")).toHaveTextContent("2");
    expect(screen.getByTestId("winner")).toHaveTextContent("ALLY");
    expect(screen.getByTestId("battle-depth")).toHaveTextContent("1");
  });

  it("敗北すると深度は変わらず、LastBattle に ENEMY が記録される", () => {
    renderBattleAt(makeFragileParty(), 3);
    fireEvent.click(screen.getByRole("button", { name: "スキップ" }));
    fireEvent.click(screen.getByRole("button", { name: "ホームへ戻る" }));

    expect(screen.getByTestId("depth")).toHaveTextContent("3"); // 変わらない
    expect(screen.getByTestId("winner")).toHaveTextContent("ENEMY");
    expect(screen.getByTestId("battle-depth")).toHaveTextContent("3");
  });
});
