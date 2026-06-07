/**
 * 3 ステップ Picker：条件 → 対象 → 行動
 *
 * - 条件: 21 種をカテゴリ別表示、必要なら引数入力
 * - 対象: 6 種、条件と整合するものだけ enable（DSL §5.2）
 * - 行動: ジョブで使えるものだけ、必要なら引数入力
 *
 * - 新規ルールでも既存ルールの編集でも同じ Picker を使う（initialRule で切り替え）
 * - Picker は自前のローカル state で 3 ステップ管理し、保存時に GambitRule を emit
 */

import { useState } from "react";

import type { JobId } from "../../battle/types";
import {
  BUFF_IDS,
  CONDITION_TYPES,
  DEBUFF_IDS,
  ELEMENTS,
  ENEMY_TYPES,
  HEAL_SPELL_IDS,
  ITEM_IDS,
  OFFENSE_SPELL_IDS,
  REVIVE_SPELL_IDS,
  SKILL_IDS,
  STATUSES,
  type Action,
  type ActionType,
  type Condition,
  type ConditionType,
  type Element,
  type EnemyType,
  type GambitRule,
  type Status,
  type Target,
  type TargetType,
} from "../../gambit/types";
import {
  getCompatibleTargets,
  getConditionCategory,
  getJobActions,
} from "../../gambit/uiHelpers";

interface RulePickerProps {
  open: boolean;
  jobId: JobId;
  /** 編集対象のルール。undefined なら新規追加モード */
  initialRule?: GambitRule;
  onSave: (rule: GambitRule) => void;
  onCancel: () => void;
}

export function RulePicker({ open, jobId, initialRule, onSave, onCancel }: RulePickerProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [condition, setCondition] = useState<Condition>(
    initialRule?.condition ?? defaultCondition(),
  );
  const [target, setTarget] = useState<Target>(initialRule?.target ?? { type: "SELF" });
  const [action, setAction] = useState<Action>(initialRule?.action ?? defaultAction(jobId));

  if (!open) return null;

  // ステップ遷移時に互換性が崩れていれば自動修正
  function goToStep2() {
    const compatibleTargets = getCompatibleTargets(condition);
    if (!compatibleTargets.includes(target.type)) {
      // target が新条件で無効になっていたら SELF にフォールバック
      setTarget({ type: "SELF" });
    }
    setStep(2);
  }

  function goToStep3() {
    setStep(3);
  }

  function handleSave() {
    onSave({
      id: initialRule?.id ?? generateRuleId(),
      enabled: initialRule?.enabled ?? true,
      condition,
      target,
      action,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <header className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h3 id="picker-title" className="font-semibold">
            {initialRule ? "ルール編集" : "ルール追加"}
          </h3>
          <StepTabs current={step} onChange={(s) => setStep(s)} />
        </header>

        <div className="flex-1 overflow-auto p-5 space-y-3">
          {step === 1 && (
            <ConditionStep condition={condition} onChange={setCondition} />
          )}
          {step === 2 && (
            <TargetStep condition={condition} target={target} onChange={setTarget} />
          )}
          {step === 3 && (
            <ActionStep jobId={jobId} action={action} onChange={setAction} />
          )}
        </div>

        <footer className="border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100"
          >
            キャンセル
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100"
              >
                戻る
              </button>
            )}
            {step === 1 && (
              <button
                type="button"
                onClick={goToStep2}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                次へ（対象）
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={goToStep3}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                次へ（行動）
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

// ============================================================================
// ステップタブ
// ============================================================================

function StepTabs({
  current,
  onChange,
}: {
  current: 1 | 2 | 3;
  onChange: (step: 1 | 2 | 3) => void;
}) {
  const tabs: Array<{ step: 1 | 2 | 3; label: string }> = [
    { step: 1, label: "条件" },
    { step: 2, label: "対象" },
    { step: 3, label: "行動" },
  ];
  return (
    <div className="flex gap-1 text-xs">
      {tabs.map((t) => (
        <button
          key={t.step}
          type="button"
          onClick={() => onChange(t.step)}
          className={
            "px-2.5 py-1 rounded " +
            (current === t.step
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200")
          }
        >
          {t.step}. {t.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Step 1：条件
// ============================================================================

function ConditionStep({
  condition,
  onChange,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
}) {
  const grouped = groupBy(CONDITION_TYPES, (t) => getConditionCategory(t as ConditionType));
  const labels: Record<string, string> = {
    self: "自身",
    ally: "味方",
    enemy: "敵",
    battle: "戦況",
  };

  return (
    <div className="space-y-4">
      {(["self", "ally", "enemy", "battle"] as const).map((cat) => (
        <div key={cat}>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            {labels[cat]}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {grouped[cat]?.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onChange(initialConditionForType(type as ConditionType))}
                className={
                  "px-2.5 py-1 text-xs font-mono rounded border " +
                  (condition.type === type
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-slate-300 hover:bg-slate-100")
                }
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      ))}

      {needsValueParam(condition.type) && (
        <ValueSlider
          value={(condition as { value: number }).value}
          onChange={(v) => onChange({ ...condition, value: v } as Condition)}
        />
      )}
      {needsStatusParam(condition.type) && "status" in condition && (
        <EnumSelector
          label="状態"
          options={STATUSES}
          value={condition.status}
          onChange={(s) => onChange({ ...condition, status: s } as Condition)}
        />
      )}
      {condition.type === "ENEMY_WEAK_TO" && (
        <EnumSelector
          label="属性"
          options={ELEMENTS}
          value={condition.element}
          onChange={(e) =>
            onChange({ type: "ENEMY_WEAK_TO", element: e as Element })
          }
        />
      )}
      {condition.type === "ENEMY_TYPE" && (
        <EnumSelector
          label="種族"
          options={ENEMY_TYPES}
          value={condition.enemyType}
          onChange={(e) =>
            onChange({ type: "ENEMY_TYPE", enemyType: e as EnemyType })
          }
        />
      )}
    </div>
  );
}

// ============================================================================
// Step 2：対象
// ============================================================================

function TargetStep({
  condition,
  target,
  onChange,
}: {
  condition: Condition;
  target: Target;
  onChange: (t: Target) => void;
}) {
  const compatible = new Set(getCompatibleTargets(condition));
  const targets: TargetType[] = [
    "SELF",
    "ALLY_MATCH",
    "ALLY_LOWEST_HP",
    "ALLY_ALL",
    "ENEMY_MATCH",
    "ENEMY_ALL",
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        条件 <code className="font-mono">{condition.type}</code> と組み合わせ可能な対象だけが選べます。
      </p>
      <div className="grid grid-cols-2 gap-2">
        {targets.map((t) => {
          const enabled = compatible.has(t);
          const selected = target.type === t;
          return (
            <button
              key={t}
              type="button"
              disabled={!enabled}
              onClick={() => onChange({ type: t })}
              className={
                "px-3 py-2 text-sm font-mono rounded border text-left " +
                (selected
                  ? "bg-blue-600 text-white border-blue-600"
                  : enabled
                    ? "bg-white border-slate-300 hover:bg-slate-100"
                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed")
              }
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Step 3：行動
// ============================================================================

function ActionStep({
  jobId,
  action,
  onChange,
}: {
  jobId: JobId;
  action: Action;
  onChange: (a: Action) => void;
}) {
  const allowed = getJobActions(jobId);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        {jobId} が使える行動だけが表示されています。
      </p>
      <div className="flex flex-wrap gap-1.5">
        {allowed.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(initialActionForType(type))}
            className={
              "px-2.5 py-1 text-xs font-mono rounded border " +
              (action.type === type
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-slate-300 hover:bg-slate-100")
            }
          >
            {type}
          </button>
        ))}
      </div>

      {action.type === "SKILL" && (
        <EnumSelector
          label="スキル"
          options={SKILL_IDS}
          value={action.skillId}
          onChange={(v) => onChange({ type: "SKILL", skillId: v as (typeof SKILL_IDS)[number] })}
        />
      )}
      {action.type === "CAST_OFFENSE" && (
        <EnumSelector
          label="攻撃魔法"
          options={OFFENSE_SPELL_IDS}
          value={action.spellId}
          onChange={(v) =>
            onChange({
              type: "CAST_OFFENSE",
              spellId: v as (typeof OFFENSE_SPELL_IDS)[number],
            })
          }
        />
      )}
      {action.type === "CAST_HEAL" && (
        <EnumSelector
          label="回復魔法"
          options={HEAL_SPELL_IDS}
          value={action.spellId}
          onChange={(v) =>
            onChange({ type: "CAST_HEAL", spellId: v as (typeof HEAL_SPELL_IDS)[number] })
          }
        />
      )}
      {action.type === "CAST_REVIVE" && (
        <EnumSelector
          label="蘇生魔法"
          options={REVIVE_SPELL_IDS}
          value={action.spellId}
          onChange={(v) =>
            onChange({ type: "CAST_REVIVE", spellId: v as (typeof REVIVE_SPELL_IDS)[number] })
          }
        />
      )}
      {action.type === "CAST_BUFF" && (
        <EnumSelector
          label="補助魔法"
          options={BUFF_IDS}
          value={action.buffId}
          onChange={(v) => onChange({ type: "CAST_BUFF", buffId: v as (typeof BUFF_IDS)[number] })}
        />
      )}
      {action.type === "CAST_DEBUFF" && (
        <EnumSelector
          label="妨害魔法"
          options={DEBUFF_IDS}
          value={action.debuffId}
          onChange={(v) =>
            onChange({ type: "CAST_DEBUFF", debuffId: v as (typeof DEBUFF_IDS)[number] })
          }
        />
      )}
      {action.type === "CAST_CURE_STATUS" && (
        <EnumSelector
          label="解除する状態"
          options={STATUSES}
          value={action.status}
          onChange={(v) => onChange({ type: "CAST_CURE_STATUS", status: v as Status })}
        />
      )}
      {action.type === "USE_ITEM" && (
        <EnumSelector
          label="アイテム"
          options={ITEM_IDS}
          value={action.itemId}
          onChange={(v) => onChange({ type: "USE_ITEM", itemId: v as (typeof ITEM_IDS)[number] })}
        />
      )}
    </div>
  );
}

// ============================================================================
// 共通 UI 部品
// ============================================================================

function ValueSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-slate-500 shrink-0">値 (%)</label>
      <input
        type="range"
        min={0}
        max={100}
        step={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
        aria-label="閾値"
      />
      <span className="font-mono text-sm w-10 text-right">{value}</span>
    </div>
  );
}

function EnumSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-slate-500 shrink-0">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-300 rounded px-2 py-1 text-sm font-mono"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// 補助関数
// ============================================================================

function defaultCondition(): Condition {
  return { type: "ENEMY_EXISTS" };
}

function defaultAction(_jobId: JobId): Action {
  return { type: "ATTACK" };
}

function initialConditionForType(type: ConditionType): Condition {
  switch (type) {
    case "SELF_HP_LT":
    case "SELF_HP_GTE":
    case "SELF_MP_LT":
    case "SELF_MP_GTE":
    case "ALLY_HP_LT":
    case "ALLY_HP_GTE":
    case "ALLY_MP_LT":
    case "ALLY_MP_GTE":
      return { type, value: 50 };
    case "SELF_HAS_STATUS":
    case "SELF_NO_STATUS":
    case "ALLY_HAS_STATUS":
    case "ENEMY_HAS_STATUS":
    case "ENEMY_NO_STATUS":
      return { type, status: "POISON" };
    case "ENEMY_WEAK_TO":
      return { type: "ENEMY_WEAK_TO", element: "FIRE" };
    case "ENEMY_TYPE":
      return { type: "ENEMY_TYPE", enemyType: "HUMANOID" };
    default:
      return { type };
  }
}

function initialActionForType(type: ActionType): Action {
  switch (type) {
    case "SKILL":
      return { type: "SKILL", skillId: SKILL_IDS[0] };
    case "CAST_OFFENSE":
      return { type: "CAST_OFFENSE", spellId: OFFENSE_SPELL_IDS[0] };
    case "CAST_HEAL":
      return { type: "CAST_HEAL", spellId: HEAL_SPELL_IDS[0] };
    case "CAST_REVIVE":
      return { type: "CAST_REVIVE", spellId: REVIVE_SPELL_IDS[0] };
    case "CAST_BUFF":
      return { type: "CAST_BUFF", buffId: BUFF_IDS[0] };
    case "CAST_DEBUFF":
      return { type: "CAST_DEBUFF", debuffId: DEBUFF_IDS[0] };
    case "CAST_CURE_STATUS":
      return { type: "CAST_CURE_STATUS", status: "POISON" };
    case "USE_ITEM":
      return { type: "USE_ITEM", itemId: "POTION" };
    default:
      return { type };
  }
}

function needsValueParam(type: ConditionType): boolean {
  return (
    type === "SELF_HP_LT" ||
    type === "SELF_HP_GTE" ||
    type === "SELF_MP_LT" ||
    type === "SELF_MP_GTE" ||
    type === "ALLY_HP_LT" ||
    type === "ALLY_HP_GTE" ||
    type === "ALLY_MP_LT" ||
    type === "ALLY_MP_GTE"
  );
}

function needsStatusParam(type: ConditionType): boolean {
  return (
    type === "SELF_HAS_STATUS" ||
    type === "SELF_NO_STATUS" ||
    type === "ALLY_HAS_STATUS" ||
    type === "ENEMY_HAS_STATUS" ||
    type === "ENEMY_NO_STATUS"
  );
}

function generateRuleId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function groupBy<T, K extends string>(arr: readonly T[], keyFn: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of arr) {
    const k = keyFn(item);
    (out[k] ??= []).push(item);
  }
  return out;
}
