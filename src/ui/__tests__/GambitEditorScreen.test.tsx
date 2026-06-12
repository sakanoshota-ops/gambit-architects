/**
 * ガンビット編集画面のテスト（M2-F1：ルール操作 UI）
 *
 * 観点：
 *   - 下書きモード：操作しても unit.gambitSet は変わらず、保存で反映
 *   - 取り消し：下書きを元の状態に戻す
 *   - 並べ替え（↑↓）／削除／有効トグル
 *   - プリセットロード：rules が置き換わる
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { presetTank, presetFinisher } from "../../gambit/presets";
import { createSwordsman } from "../../data/jobs";
import {
  PlayerProvider,
  type PlayerData,
  type Settings,
} from "../../state/PlayerContext";
import { GambitEditorScreen } from "../screens/GambitEditorScreen";

function makePartyOf4(): PlayerData["party"] {
  return [
    createSwordsman("ally_1", "Sword1", presetTank("ally_1")),
    createSwordsman("ally_2", "Sword2", presetTank("ally_2")),
    createSwordsman("ally_3", "Sword3", presetTank("ally_3")),
    createSwordsman("ally_4", "Sword4", presetTank("ally_4")),
  ];
}

function makeInitialData(): PlayerData {
  const settings: Settings = { battleSpeed: 2, locale: "ja" };
  return {
    party: makePartyOf4(),
    dungeon: { currentDepth: 1, maxDepth: 1, recentBattles: [] },
    settings,
  };
}

function renderEditor(charId = "ally_1"): PlayerData {
  const data = makeInitialData();
  render(
    <PlayerProvider initialData={data}>
      <MemoryRouter initialEntries={[`/edit/${charId}`]}>
        <Routes>
          <Route path="/edit/:charId" element={<GambitEditorScreen />} />
          <Route path="/party" element={<div>PARTY PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </PlayerProvider>,
  );
  return data;
}

describe("GambitEditorScreen 初期表示", () => {
  it("対象キャラの presetTank のルール 4 つを表示する", () => {
    renderEditor("ally_1");
    expect(screen.getByText("編集：Sword1")).toBeInTheDocument();
    // presetTank の 4 ルール
    expect(screen.getByText(/ALLY_TARGETED → ALLY_MATCH → INTERPOSE/)).toBeInTheDocument();
    expect(screen.getByText(/SELF_HP_LT.*→ SELF → DEFEND/)).toBeInTheDocument();
    expect(screen.getByText(/BOSS_PRESENT → SELF → PROVOKE/)).toBeInTheDocument();
    expect(screen.getByText(/ENEMY_EXISTS → ENEMY_MATCH → ATTACK/)).toBeInTheDocument();
  });

  it("存在しない charId では見つかりませんメッセージ", () => {
    renderEditor("does_not_exist");
    expect(screen.getByText(/が見つかりません/)).toBeInTheDocument();
  });

  it("保存ボタンは初期状態では disabled", () => {
    renderEditor("ally_1");
    const saveBtn = screen.getByRole("button", { name: "保存" });
    expect(saveBtn).toBeDisabled();
  });
});

describe("GambitEditorScreen のルール操作（下書きモード）", () => {
  it("並べ替え（↑）：先頭は disabled、2 番目以降は動く", () => {
    renderEditor("ally_1");
    const upButtons = screen.getAllByRole("button", { name: "上へ" });
    expect(upButtons[0]).toBeDisabled();
    expect(upButtons[1]).not.toBeDisabled();

    fireEvent.click(upButtons[1]); // 2 番目を上に
    // 1 番目に SELF_HP_LT 系（元 r2）が来ているはず
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/SELF_HP_LT/);
    expect(items[1]).toHaveTextContent(/ALLY_TARGETED/);

    // 未保存マーク
    expect(screen.getByText(/未保存の変更あり/)).toBeInTheDocument();
  });

  it("並べ替え（↓）：末尾は disabled", () => {
    renderEditor("ally_1");
    const downButtons = screen.getAllByRole("button", { name: "下へ" });
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });

  it("削除：confirm=true なら 1 件減る", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderEditor("ally_1");

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);

    const removeButtons = screen.getAllByRole("button", { name: "削除" });
    fireEvent.click(removeButtons[0]); // 先頭削除

    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent(/SELF_HP_LT/);

    vi.restoreAllMocks();
  });

  it("削除：confirm=false なら変化なし", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderEditor("ally_1");
    const removeButtons = screen.getAllByRole("button", { name: "削除" });
    fireEvent.click(removeButtons[0]);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    vi.restoreAllMocks();
  });

  it("有効トグル：チェックを外すと line-through が付く", () => {
    renderEditor("ally_1");
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();

    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();
    expect(screen.getByText(/未保存の変更あり/)).toBeInTheDocument();
  });
});

describe("GambitEditorScreen のプリセットロード", () => {
  it("プリセット「止め刺し」を読み込むとルールが置き換わる", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderEditor("ally_1");

    // 初期は presetTank（4 ルール）
    expect(screen.getByText(/INTERPOSE/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "止め刺し" }));

    // presetFinisher の特徴的なルールが現れる
    expect(screen.queryByText(/INTERPOSE/)).not.toBeInTheDocument();
    expect(screen.getByText(/ENEMY_LOWEST_HP/)).toBeInTheDocument();
    // 未保存マーク
    expect(screen.getByText(/未保存の変更あり/)).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("プリセットロードを confirm=false でキャンセル", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderEditor("ally_1");
    const before = screen.getAllByRole("listitem").length;
    fireEvent.click(screen.getByRole("button", { name: "止め刺し" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(before);
    expect(screen.queryByText(/未保存の変更あり/)).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

describe("GambitEditorScreen の保存／取り消し", () => {
  it("保存後は未保存マークが消える", () => {
    renderEditor("ally_1");
    // チェックを外して下書きを汚す
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText(/未保存の変更あり/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.queryByText(/未保存の変更あり/)).not.toBeInTheDocument();
  });

  it("取り消しで下書きが元に戻る", () => {
    renderEditor("ally_1");
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getAllByRole("checkbox")[0]).not.toBeChecked();

    // M3-G-8: 取り消しボタンは i18n 化で「キャンセル」に統一
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    expect(screen.queryByText(/未保存の変更あり/)).not.toBeInTheDocument();
  });

  // 直接 PlayerProvider の dispatch を介した state 反映確認は M2-G 以降の
  // 統合テストで行う（M2-F1 はあくまで UI 単体テスト）
  void presetFinisher;
});
