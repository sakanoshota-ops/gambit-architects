/**
 * E2E 風統合テスト（M2-J）
 *
 * - 全画面のコンポーネントをマウントし、画面遷移を含む 1 周フローを検証
 * - 観点：ホーム → 戦闘 → ホーム → 編集 → ホームの中で state が正しく動く
 *
 * 戦略：
 *   - createMemoryRouter で URL 操作をエミュレート
 *   - PlayerProvider に initialData を与え、localStorage に依存しない
 *   - 戦闘画面では「スキップ」で即時終端
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { createSwordsman } from "../../data/jobs";
import { presetFinisher } from "../../gambit/presets";
import {
  PlayerProvider,
  type PlayerData,
  type Settings,
} from "../../state/PlayerContext";
import { BattleScreen } from "../screens/BattleScreen";
import { GambitEditorScreen } from "../screens/GambitEditorScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LogScreen } from "../screens/LogScreen";
import { PartyScreen } from "../screens/PartyScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { Layout } from "../layout/Layout";

function makeInitialData(): PlayerData {
  const settings: Settings = { battleSpeed: 4, locale: "ja" };
  return {
    party: [
      createSwordsman("ally_1", "Sword1", presetFinisher("ally_1")),
      createSwordsman("ally_2", "Sword2", presetFinisher("ally_2")),
      createSwordsman("ally_3", "Sword3", presetFinisher("ally_3")),
      createSwordsman("ally_4", "Sword4", presetFinisher("ally_4")),
    ],
    dungeon: { currentDepth: 1, maxDepth: 1, recentBattles: [] },
    settings,
  };
}

function setupApp(initialData: PlayerData = makeInitialData()) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <Layout />,
        children: [
          { index: true, element: <HomeScreen /> },
          { path: "party", element: <PartyScreen /> },
          { path: "edit/:charId", element: <GambitEditorScreen /> },
          { path: "battle", element: <BattleScreen /> },
          { path: "log", element: <LogScreen /> },
          { path: "settings", element: <SettingsScreen /> },
        ],
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(
    <PlayerProvider initialData={initialData}>
      <RouterProvider router={router} />
    </PlayerProvider>,
  );
}

describe("E2E：ホーム → 戦闘 → ホーム", () => {
  it("出撃 → スキップ → ホームへ戻る で深度が +1 され、ログに記録される", () => {
    setupApp();

    // ホーム画面の出撃ボタン
    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /出撃/ }));

    // 戦闘画面
    expect(screen.getByText("戦闘（深度 1）")).toBeInTheDocument();

    // スキップで戦闘終端
    fireEvent.click(screen.getByRole("button", { name: "スキップ" }));
    expect(screen.getByText("勝利！")).toBeInTheDocument();

    // ホームへ戻る
    fireEvent.click(screen.getByRole("button", { name: "ホームへ戻る" }));

    // ホーム画面で深度が 2 になっていて、直近戦闘記録が出る
    expect(screen.getByRole("heading", { name: "ホーム" })).toBeInTheDocument();
    // 「現在の深度: 2」のような表示
    expect(screen.getByText(/出撃（深度\s*2\s*）/)).toBeInTheDocument();
    // 直近戦闘の勝者（M3-G-8 で「ALLY」→ ローカライズ済み「勝利」表示）
    expect(screen.getByText("勝利")).toBeInTheDocument();
  });
});

describe("E2E：編成 → 編集 → ガンビット変更 → 戦闘", () => {
  it("Sword1 の編集画面でプリセットを変更 → 保存 → state に反映される", () => {
    // window.confirm を常に true にする
    vi.spyOn(window, "confirm").mockReturnValue(true);
    setupApp();

    // 編成タブへ
    fireEvent.click(screen.getByRole("link", { name: "編成" }));
    expect(screen.getByRole("heading", { name: "編成" })).toBeInTheDocument();

    // Sword1 の編集リンクをクリック
    const editLinks = screen.getAllByRole("link", { name: "編集" });
    fireEvent.click(editLinks[0]);

    // 編集画面：Sword1
    expect(screen.getByText("編集：Sword1")).toBeInTheDocument();

    // 初期は presetFinisher → 「タンク」プリセットに切り替え
    fireEvent.click(screen.getByRole("button", { name: "タンク" }));
    // 「未保存」マークが出る
    expect(screen.getByText(/未保存の変更あり/)).toBeInTheDocument();

    // 保存
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.queryByText(/未保存の変更あり/)).not.toBeInTheDocument();

    // 設定タブで Sword1 が presetTank になっているか確認
    fireEvent.click(screen.getByRole("link", { name: "設定" }));
    // Sword1 のルール文字列に "INTERPOSE" が含まれるかは設定画面では確認不可
    // → 編成タブに戻って Sword1 を再度編集し、ルールリストに INTERPOSE が含まれていれば OK

    fireEvent.click(screen.getByRole("link", { name: "編成" }));
    const editLinks2 = screen.getAllByRole("link", { name: "編集" });
    fireEvent.click(editLinks2[0]);
    expect(screen.getByText(/INTERPOSE/)).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});

describe("E2E：ログ画面が戦闘後に記録される", () => {
  it("戦闘 → ログタブで結果が見える", () => {
    setupApp();
    fireEvent.click(screen.getByRole("button", { name: /出撃/ }));
    fireEvent.click(screen.getByRole("button", { name: "スキップ" }));
    fireEvent.click(screen.getByRole("button", { name: "ホームへ戻る" }));

    // ログタブ
    fireEvent.click(screen.getByRole("link", { name: "ログ" }));
    expect(screen.getByRole("heading", { name: "ログ" })).toBeInTheDocument();

    // 1 件記録されている
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("勝利");
    expect(items[0]).toHaveTextContent("深度 1");
  });
});
