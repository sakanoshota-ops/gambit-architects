/**
 * EquipmentPicker のテスト（M3-D / M3-G-15 で button UI に変更）
 *
 * - 開閉
 * - ジョブ制限：剣士に剣しか出さない、ロッドは出さない
 * - 効果プレビューが正しい（base → eff）
 * - 保存時に Equipment が emit される
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { presetTank } from "../../gambit/presets";
import { createMage, createSwordsman } from "../../data/jobs";
import { EquipmentPicker } from "../components/EquipmentPicker";

describe("EquipmentPicker - 開閉", () => {
  it("open=false なら何も描画しない", () => {
    const unit = createSwordsman("a", "Sword", presetTank("a"));
    const { container } = render(
      <EquipmentPicker
        open={false}
        unit={unit}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // Portal 化で container は空、document.body にも dialog がないこと
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("open=true でダイアログが見える", () => {
    const unit = createSwordsman("a", "Sword", presetTank("a"));
    render(
      <EquipmentPicker
        open={true}
        unit={unit}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/装備変更：Sword/)).toBeInTheDocument();
  });

  it("キャンセル押下で onCancel が呼ばれる", () => {
    const unit = createSwordsman("a", "Sword", presetTank("a"));
    const onCancel = vi.fn();
    render(
      <EquipmentPicker open={true} unit={unit} onSave={vi.fn()} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("EquipmentPicker - ジョブ制限", () => {
  it("剣士には剣 3 種のみ表示（ロッドやメイスは出ない）", () => {
    const unit = createSwordsman("a", "Sword", presetTank("a"));
    render(
      <EquipmentPicker
        open={true}
        unit={unit}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const weaponGroup = screen.getByRole("group", { name: "武器" });
    expect(
      within(weaponGroup).getByRole("button", { name: "ブロンズソード" }),
    ).toBeInTheDocument();
    expect(
      within(weaponGroup).getByRole("button", { name: "スティールソード" }),
    ).toBeInTheDocument();
    expect(
      within(weaponGroup).queryByRole("button", { name: "魔導士のロッド" }),
    ).not.toBeInTheDocument();
    expect(
      within(weaponGroup).queryByRole("button", { name: "治癒のメイス" }),
    ).not.toBeInTheDocument();
  });

  it("魔導士にはロッド 3 種のみ表示（剣やメイスは出ない）", () => {
    const unit = createMage("a", "Mage", presetTank("a"));
    render(
      <EquipmentPicker
        open={true}
        unit={unit}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const weaponGroup = screen.getByRole("group", { name: "武器" });
    expect(
      within(weaponGroup).getByRole("button", { name: "魔導士のロッド" }),
    ).toBeInTheDocument();
    expect(
      within(weaponGroup).getByRole("button", { name: "クリスタルスタッフ" }),
    ).toBeInTheDocument();
    expect(
      within(weaponGroup).queryByRole("button", { name: "ブロンズソード" }),
    ).not.toBeInTheDocument();
  });

  it("センサーはジョブ制限なし（4 種 + なし = 5 ボタン）", () => {
    const unit = createSwordsman("a", "Sword", presetTank("a"));
    render(
      <EquipmentPicker
        open={true}
        unit={unit}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const sensorGroup = screen.getByRole("group", { name: "センサー" });
    const buttons = within(sensorGroup).getAllByRole("button");
    expect(buttons.length).toBe(5);
  });
});

describe("EquipmentPicker - 効果プレビュー", () => {
  it("装備なし → プレビューも素のステータス", () => {
    const unit = createSwordsman("a", "Sword", presetTank("a"));
    // 剣士: atk 25, def 15, mag 5
    render(
      <EquipmentPicker
        open={true}
        unit={unit}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // 装備なしのときは base 値のみ表示（"→" は出ない）
    const dialog = screen.getByRole("dialog");
    const statsSection = within(dialog).getByText(/ステータス変化/).parentElement!;
    expect(within(statsSection).getByText("ATK")).toBeInTheDocument();
    // base 値が見える
    expect(within(statsSection).getByText("25")).toBeInTheDocument(); // ATK
  });

  it("STEEL_SWORD 選択で ATK のプレビュー差分が表示される", () => {
    const unit = createSwordsman("a", "Sword", presetTank("a"));
    render(
      <EquipmentPicker
        open={true}
        unit={unit}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const weaponGroup = screen.getByRole("group", { name: "武器" });
    fireEvent.click(
      within(weaponGroup).getByRole("button", { name: "スティールソード" }),
    );

    // ATK 25 → 40 (+15)
    expect(screen.getByText("40")).toBeInTheDocument(); // 装備後
    expect(screen.getByText("(+15)")).toBeInTheDocument(); // 差分
  });
});

describe("EquipmentPicker - 保存", () => {
  it("装備選択 → 装備ボタンで Equipment を onSave に渡す", () => {
    const unit = createSwordsman("a", "Sword", presetTank("a"));
    const onSave = vi.fn();
    render(
      <EquipmentPicker open={true} unit={unit} onSave={onSave} onCancel={vi.fn()} />,
    );

    const weaponGroup = screen.getByRole("group", { name: "武器" });
    const armorGroup = screen.getByRole("group", { name: "防具" });
    const sensorGroup = screen.getByRole("group", { name: "センサー" });

    fireEvent.click(
      within(weaponGroup).getByRole("button", { name: "アイアンソード" }),
    );
    fireEvent.click(
      within(armorGroup).getByRole("button", { name: "チェインメイル" }),
    );
    fireEvent.click(
      within(sensorGroup).getByRole("button", { name: "HP スキャナー" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "装備" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      weapon: "IRON_SWORD",
      armor: "CHAIN_MAIL",
      sensor: "HP_SCANNER",
    });
  });

  it("「なし」選択 → undefined で emit", () => {
    const unit = createSwordsman("a", "Sword", presetTank("a"), {
      equipment: { weapon: "STEEL_SWORD" },
    });
    const onSave = vi.fn();
    render(
      <EquipmentPicker open={true} unit={unit} onSave={onSave} onCancel={vi.fn()} />,
    );

    // 元々 STEEL_SWORD だったのを「なし」に
    const weaponGroup = screen.getByRole("group", { name: "武器" });
    // 「なし」ボタンは「なし」というラベル
    fireEvent.click(within(weaponGroup).getByRole("button", { name: "なし" }));
    fireEvent.click(screen.getByRole("button", { name: "装備" }));

    expect(onSave).toHaveBeenCalledWith({
      weapon: undefined,
      armor: undefined,
      sensor: undefined,
    });
  });
});
