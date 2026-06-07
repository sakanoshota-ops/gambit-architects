/**
 * 画面間ナビゲーションのテスト（M2-D）
 *
 * - HomeScreen の「出撃」ボタンが /battle に遷移する
 * - PartyScreen の「編集」リンクが /edit/:charId に遷移する
 *
 * テスト戦略：
 *   MemoryRouter に各 path のスタブを用意し、押下後の DOM 変化を確認する。
 *   Layout 全体は使わず、対象 screen と遷移先のスタブだけをマウントする。
 */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";

import { PlayerProvider } from "../../state/PlayerContext";
import { createDefaultPlayerData } from "../../state/defaults";
import { HomeScreen } from "../screens/HomeScreen";
import { PartyScreen } from "../screens/PartyScreen";

// テスト用の編集画面スタブ：URL パラメータをそのまま表示する
function EditStub() {
  const { charId } = useParams<{ charId: string }>();
  return <div>EDIT PAGE: {charId}</div>;
}

describe("HomeScreen の出撃ボタン", () => {
  it("クリックで /battle に遷移する", () => {
    render(
      <PlayerProvider initialData={createDefaultPlayerData()}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route index element={<HomeScreen />} />
            <Route path="/battle" element={<div>BATTLE PAGE</div>} />
          </Routes>
        </MemoryRouter>
      </PlayerProvider>,
    );

    // 出撃ボタンが見える（深度番号付き）
    const btn = screen.getByRole("button", { name: /出撃/ });
    expect(btn).toBeInTheDocument();

    // クリックすると BATTLE PAGE が描画される
    fireEvent.click(btn);
    expect(screen.getByText("BATTLE PAGE")).toBeInTheDocument();
  });
});

describe("PartyScreen の編集リンク", () => {
  it("クリックで /edit/:charId に遷移する", () => {
    render(
      <PlayerProvider initialData={createDefaultPlayerData()}>
        <MemoryRouter initialEntries={["/party"]}>
          <Routes>
            <Route path="/party" element={<PartyScreen />} />
            <Route path="/edit/:charId" element={<EditStub />} />
          </Routes>
        </MemoryRouter>
      </PlayerProvider>,
    );

    // 編集リンクが 4 つある
    const links = screen.getAllByRole("link", { name: "編集" });
    expect(links).toHaveLength(4);

    // 最初の編集リンクをクリックすると /edit/ally_1 へ
    fireEvent.click(links[0]);
    expect(screen.getByText("EDIT PAGE: ally_1")).toBeInTheDocument();
  });
});
