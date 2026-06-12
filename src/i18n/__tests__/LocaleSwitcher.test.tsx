/**
 * LocaleSwitcher の動作テスト（M3-G-8）
 *
 * - JA / EN ボタンが見える
 * - クリックで PlayerContext.settings.locale が切り替わる
 * - 切り替え時に t() の結果が同期して変わる（Layout 全体で観察）
 */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import {
  PlayerProvider,
  type PlayerData,
  type Settings,
} from "../../state/PlayerContext";
import { createSwordsman } from "../../data/jobs";
import { presetTank } from "../../gambit/presets";
import { Layout } from "../../ui/layout/Layout";

function makeData(locale: "ja" | "en" = "ja"): PlayerData {
  const settings: Settings = { battleSpeed: 2, locale };
  return {
    party: [
      createSwordsman("a1", "Sword1", presetTank("a1")),
      createSwordsman("a2", "Sword2", presetTank("a2")),
      createSwordsman("a3", "Sword3", presetTank("a3")),
      createSwordsman("a4", "Sword4", presetTank("a4")),
    ],
    dungeon: { currentDepth: 1, maxDepth: 1, recentBattles: [] },
    settings,
  };
}

function renderLayout(initialLocale: "ja" | "en" = "ja") {
  return render(
    <PlayerProvider initialData={makeData(initialLocale)}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<div>Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </PlayerProvider>,
  );
}

describe("LocaleSwitcher", () => {
  it("JA / EN の 2 つのボタンが見える", () => {
    renderLayout();
    expect(screen.getByRole("button", { name: "JA" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
  });

  it("初期 ja のとき JA ボタンが aria-pressed=true", () => {
    renderLayout("ja");
    expect(screen.getByRole("button", { name: "JA" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("EN をクリックすると Layout のナビ表示が英語に切り替わる", () => {
    renderLayout("ja");
    // 初期は日本語
    expect(screen.getByText("ホーム")).toBeInTheDocument();
    expect(screen.getByText("編成")).toBeInTheDocument();

    // EN クリック
    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    // 英語に切り替わる
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Party")).toBeInTheDocument();
    expect(screen.queryByText("ホーム")).not.toBeInTheDocument();
  });

  it("EN 状態で JA を押すと日本語に戻る", () => {
    renderLayout("en");
    expect(screen.getByText("Home")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "JA" }));
    expect(screen.getByText("ホーム")).toBeInTheDocument();
  });
});
