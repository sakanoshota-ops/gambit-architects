/**
 * ガンビット編集画面
 *
 * M2-F1：
 *   - 下書きモード、並べ替え、削除、有効化、プリセットロード、保存/取消
 *
 * M2-F2（追加）：
 *   - 「+ ルール追加」ボタン → RulePicker を新規モードで開く
 *   - ルールテキストクリックで RulePicker を編集モードで開く
 *   - 保存時に DSL §9.1 のバリデーション
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  presetBeginner,
  presetExploitWeakness,
  presetFinisher,
  presetTank,
} from "../../gambit/presets";
import type { GambitRule } from "../../gambit/types";
import { MAX_RULES_PER_SET } from "../../gambit/types";
import { isActionAllowedForJob, isTargetCompatible } from "../../gambit/uiHelpers";
import { usePlayer } from "../../state/PlayerContext";
import { RulePicker } from "../components/RulePicker";

const PRESETS = [
  { key: "tank", label: "タンク", build: presetTank },
  { key: "finisher", label: "止め刺し", build: presetFinisher },
  { key: "beginner", label: "初心者向け", build: presetBeginner },
  { key: "exploit", label: "弱点突き", build: presetExploitWeakness },
] as const;

type PickerState = { mode: "add" } | { mode: "edit"; index: number } | null;

export function GambitEditorScreen() {
  const { charId } = useParams<{ charId: string }>();
  const { data, dispatch } = usePlayer();
  const unit = data.party.find((u) => u.id === charId);

  const [draftRules, setDraftRules] = useState<GambitRule[]>(() =>
    unit ? cloneRules(unit.gambitSet.rules) : [],
  );
  const [picker, setPicker] = useState<PickerState>(null);

  useEffect(() => {
    if (unit) setDraftRules(cloneRules(unit.gambitSet.rules));
  }, [unit?.id]);

  if (!unit) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">ガンビット編集</h2>
        <p className="text-sm text-rose-600">
          ID `{charId}` のキャラクターが見つかりません。
        </p>
        <Link to="/party" className="text-sm text-blue-600 underline">
          編成画面に戻る
        </Link>
      </section>
    );
  }

  const isDirty = !rulesEqual(draftRules, unit.gambitSet.rules);
  const canAdd = draftRules.length < MAX_RULES_PER_SET;

  // -- ハンドラ --

  function moveUp(index: number) {
    if (index <= 0) return;
    setDraftRules((rules) => {
      const next = [...rules];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    if (index >= draftRules.length - 1) return;
    setDraftRules((rules) => {
      const next = [...rules];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function removeRule(index: number) {
    if (!confirm("このルールを削除しますか？")) return;
    setDraftRules((rules) => rules.filter((_, i) => i !== index));
  }

  function toggleEnabled(index: number) {
    setDraftRules((rules) =>
      rules.map((r, i) => (i === index ? { ...r, enabled: !r.enabled } : r)),
    );
  }

  function loadPreset(build: (id: string) => { rules: GambitRule[] }) {
    if (!confirm("現在のルールを置き換えます。よろしいですか？")) return;
    if (!unit) return;
    const preset = build(unit.id);
    setDraftRules(cloneRules(preset.rules));
  }

  function openAddPicker() {
    setPicker({ mode: "add" });
  }

  function openEditPicker(index: number) {
    setPicker({ mode: "edit", index });
  }

  function handlePickerSave(rule: GambitRule) {
    setDraftRules((rules) => {
      if (picker?.mode === "edit") {
        return rules.map((r, i) => (i === picker.index ? rule : r));
      }
      return [...rules, rule];
    });
    setPicker(null);
  }

  function save() {
    if (!unit) return;
    // バリデーション：DSL §9.1
    const errors = validateRules(draftRules, unit.jobId);
    if (errors.length > 0) {
      alert("保存できません：\n" + errors.join("\n"));
      return;
    }
    dispatch({
      type: "UPDATE_UNIT_GAMBIT",
      unitId: unit.id,
      gambitSet: { ...unit.gambitSet, rules: cloneRules(draftRules) },
    });
  }

  function cancel() {
    if (!unit) return;
    setDraftRules(cloneRules(unit.gambitSet.rules));
  }

  // -- 表示 --

  const initialRule =
    picker?.mode === "edit" ? draftRules[picker.index] : undefined;

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold">編集：{unit.name}</h2>
        <Link to="/party" className="text-sm text-blue-600 underline">
          編成に戻る
        </Link>
      </div>

      <p className="text-sm text-slate-600">
        ルール数: <strong>{draftRules.length}</strong> / {MAX_RULES_PER_SET}
        {isDirty && (
          <span className="ml-3 text-amber-600 text-xs">（未保存の変更あり）</span>
        )}
      </p>

      <ol className="space-y-2">
        {draftRules.map((rule, index) => (
          <li
            key={rule.id}
            className="border border-slate-200 bg-white rounded p-3 flex items-center gap-3"
          >
            <label className="flex items-center gap-2 shrink-0">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={() => toggleEnabled(index)}
                aria-label={`ルール ${index + 1} を有効にする`}
              />
            </label>
            <span className="shrink-0 text-xs text-slate-500 w-6 text-center">
              {index + 1}.
            </span>
            <button
              type="button"
              onClick={() => openEditPicker(index)}
              className={
                "flex-1 text-left text-sm font-mono rounded px-1 hover:bg-slate-50 transition-colors " +
                (rule.enabled ? "text-slate-800" : "line-through text-slate-400")
              }
            >
              {ruleSummary(rule)}
            </button>
            <div className="shrink-0 flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="px-2 py-1 text-xs border border-slate-300 rounded disabled:opacity-30 hover:bg-slate-100"
                aria-label="上へ"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === draftRules.length - 1}
                className="px-2 py-1 text-xs border border-slate-300 rounded disabled:opacity-30 hover:bg-slate-100"
                aria-label="下へ"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeRule(index)}
                className="px-2 py-1 text-xs border border-rose-300 text-rose-600 rounded hover:bg-rose-50"
                aria-label="削除"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ol>

      {draftRules.length === 0 && (
        <p className="text-sm text-slate-500 italic">
          ルールがありません。プリセットを読み込むか、追加してください。
        </p>
      )}

      <button
        type="button"
        onClick={openAddPicker}
        disabled={!canAdd}
        className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + ルール追加
        {!canAdd && <span className="ml-1 text-xs text-slate-400">（上限）</span>}
      </button>

      <div className="border-t border-slate-200 pt-4 space-y-2">
        <p className="text-sm font-medium text-slate-700">プリセットから読み込み</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => loadPreset(p.build)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!isDirty}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          保存
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={!isDirty}
          className="px-4 py-2 border border-slate-300 text-sm rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          取り消し
        </button>
      </div>

      <RulePicker
        key={picker?.mode === "edit" ? `edit-${picker.index}` : "add"}
        open={picker !== null}
        jobId={unit.jobId}
        initialRule={initialRule}
        onSave={handlePickerSave}
        onCancel={() => setPicker(null)}
      />
    </section>
  );
}

// ============================================================================
// 補助関数
// ============================================================================

function ruleSummary(rule: GambitRule): string {
  return `${describeCondition(rule.condition)} → ${rule.target.type} → ${describeAction(rule.action)}`;
}

function describeCondition(c: GambitRule["condition"]): string {
  if ("value" in c) return `${c.type}(${c.value})`;
  if ("status" in c) return `${c.type}(${c.status})`;
  if ("element" in c) return `${c.type}(${c.element})`;
  if ("enemyType" in c) return `${c.type}(${c.enemyType})`;
  return c.type;
}

function describeAction(a: GambitRule["action"]): string {
  if ("spellId" in a) return `${a.type}(${a.spellId})`;
  if ("skillId" in a) return `${a.type}(${a.skillId})`;
  if ("buffId" in a) return `${a.type}(${a.buffId})`;
  if ("debuffId" in a) return `${a.type}(${a.debuffId})`;
  if ("status" in a) return `${a.type}(${a.status})`;
  if ("itemId" in a) return `${a.type}(${a.itemId})`;
  return a.type;
}

function cloneRules(rules: GambitRule[]): GambitRule[] {
  return rules.map((r) => ({ ...r }));
}

function rulesEqual(a: GambitRule[], b: GambitRule[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** DSL §9.1 の保存時バリデーション */
function validateRules(rules: GambitRule[], jobId: import("../../battle/types").JobId): string[] {
  const errors: string[] = [];
  if (rules.length > MAX_RULES_PER_SET) {
    errors.push(`ルール数が上限 ${MAX_RULES_PER_SET} を超えています`);
  }
  rules.forEach((rule, i) => {
    if (!isTargetCompatible(rule.condition, rule.target.type)) {
      errors.push(
        `ルール ${i + 1}: 条件 ${rule.condition.type} と対象 ${rule.target.type} が不整合`,
      );
    }
    if (!isActionAllowedForJob(rule.action, jobId)) {
      errors.push(`ルール ${i + 1}: ${jobId} は ${rule.action.type} を使えません`);
    }
  });
  return errors;
}
