/**
 * Layout コンポーネントのテスト（M2-C）
 *
 * - レイアウトの基本要素が描画されること
 * - 5 タブが見えてナビゲーションリンクとして機能すること
 * - usePlayer から取得した「現在の深度」がヘッダーに反映されること
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { PlayerProvider, type PlayerData } from "../../state/PlayerContext";
import { createDefaultPlayerData } from "../../state/defaults";
import { Layout } from "../layout/Layout";

function renderLayout(initialData?: PlayerData) {
  return render(
    <PlayerProvider initialData={initialData ?? createDefaultPlayerData()}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<div>Home Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </PlayerProvider>,
  );
}

describe("Layout", () => {
  it("タイトルとメインコンテンツが描画される", () => {
    renderLayout();
    expect(screen.getByRole("heading", { name: "Gambit Architects" })).toBeInTheDocument();
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });

  it("5 タブがすべて表示される", () => {
    renderLayout();
    expect(screen.getByText("ホーム")).toBeInTheDocument();
    expect(screen.getByText("編成")).toBeInTheDocument();
    expect(screen.getByText("戦闘")).toBeInTheDocument();
    expect(screen.getByText("ログ")).toBeInTheDocument();
    expect(screen.getByText("設定")).toBeInTheDocument();
  });

  it("ヘッダーに現在の深度が反映される", () => {
    const custom = createDefaultPlayerData();
    custom.dungeon.currentDepth = 7;
    renderLayout(custom);
    // 「深度 7」というテキストが表示される
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
