/**
 * RulePicker のテスト（M2-F2）
 *
 * 観点：
 *   - 開く/閉じる
 *   - 3 ステップ間の遷移
 *   - 条件選択 → 対象の互換性フィルタ
 *   - ジョブによる行動フィルタ（剣士に CAST_OFFENSE が出ない）
 *   - 編集モード：initialRule の内容で開く
 *   - 保存時に正しい GambitRule が emit される
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { GambitRule } from "../../gambit/types";
import { RulePicker } from "../components/RulePicker";

describe("RulePicker - 開閉", () => {
  it("open=false のときは何も描画しない", () => {
    const { container } = render(
      <RulePicker open={false} jobId="SWORDSMAN" onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("open=true のときダイアログが見える", () => {
    render(<RulePicker open={true} jobId="SWORDSMAN" onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("ルール追加")).toBeInTheDocument();
  });

  it("キャンセル押下で onCancel が呼ばれる", () => {
    const onCancel = vi.fn();
    render(<RulePicker open={true} jobId="SWORDSMAN" onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("RulePicker - ステップ遷移", () => {
  it("Step 1 → Step 2 → Step 3 と進める", () => {
    render(<RulePicker open={true} jobId="SWORDSMAN" onSave={vi.fn()} onCancel={vi.fn()} />);
    // Step 1
    expect(screen.getByText("自身")).toBeInTheDocument();
    // 次へ（対象）
    fireEvent.click(screen.getByRole("button", { name: /次へ（対象）/ }));
    // Step 2 で対象選択肢が見える（SELF / ALLY_LOWEST_HP など）
    expect(screen.getByRole("button", { name: /^SELF$/ })).toBeInTheDocument();
    // 次へ（行動）
    fireEvent.click(screen.getByRole("button", { name: /次へ（行動）/ }));
    // Step 3 で行動選択肢が見える
    expect(screen.getByRole("button", { name: /^ATTACK$/ })).toBeInTheDocument();
  });

  it("Step 2 で「戻る」を押すと Step 1 へ", () => {
    render(<RulePicker open={true} jobId="SWORDSMAN" onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /次へ（対象）/ }));
    fireEvent.click(screen.getByRole("button", { name: "戻る" }));
    expect(screen.getByText("自身")).toBeInTheDocument();
  });
});

describe("RulePicker - 対象の互換性フィルタ", () => {
  it("条件が ENEMY_EXISTS（デフォルト）のときは ALLY_MATCH が disabled", () => {
    render(<RulePicker open={true} jobId="SWORDSMAN" onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /次へ（対象）/ }));
    const allyMatchBtn = screen.getByRole("button", { name: /^ALLY_MATCH$/ });
    expect(allyMatchBtn).toBeDisabled();
    const enemyMatchBtn = screen.getByRole("button", { name: /^ENEMY_MATCH$/ });
    expect(enemyMatchBtn).not.toBeDisabled();
  });

  it("条件を ALLY_DEAD に変えると ALLY_MATCH が有効、ENEMY_MATCH が disabled", () => {
    render(<RulePicker open={true} jobId="SWORDSMAN" onSave={vi.fn()} onCancel={vi.fn()} />);
    // Step 1 で ALLY_DEAD を選択
    fireEvent.click(screen.getByRole("button", { name: /^ALLY_DEAD$/ }));
    fireEvent.click(screen.getByRole("button", { name: /次へ（対象）/ }));
    expect(screen.getByRole("button", { name: /^ALLY_MATCH$/ })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^ENEMY_MATCH$/ })).toBeDisabled();
  });
});

describe("RulePicker - ジョブによる行動フィルタ", () => {
  it("剣士には CAST_OFFENSE が表示されない", () => {
    render(<RulePicker open={true} jobId="SWORDSMAN" onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /次へ（対象）/ }));
    fireEvent.click(screen.getByRole("button", { name: /次へ（行動）/ }));
    expect(screen.queryByRole("button", { name: /^CAST_OFFENSE$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ATTACK$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^PROVOKE$/ })).toBeInTheDocument();
  });

  it("魔導士には CAST_OFFENSE が表示され、PROVOKE は表示されない", () => {
    render(<RulePicker open={true} jobId="MAGE" onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /次へ（対象）/ }));
    fireEvent.click(screen.getByRole("button", { name: /次へ（行動）/ }));
    expect(screen.getByRole("button", { name: /^CAST_OFFENSE$/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^PROVOKE$/ })).not.toBeInTheDocument();
  });
});

describe("RulePicker - 編集モード", () => {
  it("initialRule の内容で各 step が初期化される", () => {
    const rule: GambitRule = {
      id: "r1",
      enabled: true,
      condition: { type: "ALLY_HP_LT", value: 30 },
      target: { type: "ALLY_MATCH" },
      action: { type: "ATTACK" },
    };
    render(
      <RulePicker
        open={true}
        jobId="SWORDSMAN"
        initialRule={rule}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // Step 1: ALLY_HP_LT が選択中（青背景の判定が難しいので存在チェックのみ）
    expect(screen.getByRole("button", { name: /^ALLY_HP_LT$/ })).toBeInTheDocument();
    // スライダーの値が 30
    expect(screen.getByText("30")).toBeInTheDocument();
    // 題名が「ルール編集」
    expect(screen.getByText("ルール編集")).toBeInTheDocument();
  });
});

describe("RulePicker - 保存", () => {
  it("保存で onSave に GambitRule が emit される（新規）", () => {
    const onSave = vi.fn();
    render(<RulePicker open={true} jobId="SWORDSMAN" onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /次へ（対象）/ }));
    fireEvent.click(screen.getByRole("button", { name: /次へ（行動）/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const rule = onSave.mock.calls[0][0] as GambitRule;
    expect(rule.condition.type).toBe("ENEMY_EXISTS");
    expect(rule.target.type).toBe("SELF"); // デフォルトは SELF
    expect(rule.action.type).toBe("ATTACK");
    expect(rule.enabled).toBe(true);
    expect(rule.id).toMatch(/^r_/);
  });

  it("編集モードで保存すると id が引き継がれる", () => {
    const onSave = vi.fn();
    const initial: GambitRule = {
      id: "preserved-id",
      enabled: false,
      condition: { type: "SELF_HP_LT", value: 50 },
      target: { type: "SELF" },
      action: { type: "DEFEND" },
    };
    render(
      <RulePicker
        open={true}
        jobId="SWORDSMAN"
        initialRule={initial}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );
    // ステップ移動なしですぐ Step 3 まで進めて保存
    fireEvent.click(screen.getByRole("button", { name: /次へ（対象）/ }));
    fireEvent.click(screen.getByRole("button", { name: /次へ（行動）/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const out = onSave.mock.calls[0][0] as GambitRule;
    expect(out.id).toBe("preserved-id");
    expect(out.enabled).toBe(false);
  });
});
