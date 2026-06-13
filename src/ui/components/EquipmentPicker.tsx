/**
 * 装備変更モーダル（M3-D）
 *
 * - 武器・防具・センサーの 3 ドロップダウンを 1 画面で同時編集
 * - ジョブで装備可能なものだけ表示（`jobs` 制限あり）
 * - 装備の現値と変更後の効果プレビュー
 * - RulePicker と同じ overlay モーダルパターン
 */

import { useState } from "react";
import { createPortal } from "react-dom";

import {
  ARMORS,
  getEffectiveAtk,
  getEffectiveDef,
  getEffectiveMag,
  SENSORS,
  WEAPONS,
  type ArmorId,
  type Equipment,
  type SensorId,
  type WeaponId,
} from "../../data/equipment";
import type { Unit } from "../../battle/types";
import {
  localizedArmor,
  localizedSensor,
  localizedWeapon,
} from "../../i18n/names";
import { useT, useLocale } from "../../i18n/useT";

interface EquipmentPickerProps {
  open: boolean;
  unit: Unit;
  onSave: (equipment: Equipment) => void;
  onCancel: () => void;
}

export function EquipmentPicker({ open, unit, onSave, onCancel }: EquipmentPickerProps) {
  const t = useT();
  const { locale } = useLocale();
  const [weapon, setWeapon] = useState<WeaponId | "">(unit.equipment.weapon ?? "");
  const [armor, setArmor] = useState<ArmorId | "">(unit.equipment.armor ?? "");
  const [sensor, setSensor] = useState<SensorId | "">(unit.equipment.sensor ?? "");

  if (!open) return null;

  // ジョブ制限フィルタ
  const allowedWeapons = Object.values(WEAPONS).filter(
    (w) => !w.jobs || w.jobs.includes(unit.jobId),
  );
  const allowedArmors = Object.values(ARMORS).filter(
    (a) => !a.jobs || a.jobs.includes(unit.jobId),
  );
  const allSensors = Object.values(SENSORS);

  // プレビュー用の Unit（装備変更を反映）
  const previewUnit: Unit = {
    ...unit,
    equipment: {
      weapon: weapon || undefined,
      armor: armor || undefined,
      sensor: sensor || undefined,
    },
  };

  const baseAtk = unit.atk;
  const baseDef = unit.def;
  const baseMag = unit.mag;
  const effAtk = getEffectiveAtk(previewUnit);
  const effDef = getEffectiveDef(previewUnit);
  const effMag = getEffectiveMag(previewUnit);

  function handleSave() {
    onSave({
      weapon: weapon || undefined,
      armor: armor || undefined,
      sensor: sensor || undefined,
    });
  }

  // M3-G-12：Portal で document.body 直下に描画して
  // 親 <main overflow-auto> の影響を受けないようにする
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="equipment-picker-title"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col">
        <header className="border-b border-slate-200 px-5 py-3">
          <h3 id="equipment-picker-title" className="font-semibold">
            {t("party.changeEquipment", { name: unit.name })}
          </h3>
        </header>

        <div className="p-5 space-y-4">
          <SelectRow
            label={t("party.weapon")}
            noneLabel={t("common.none")}
            value={weapon}
            onChange={setWeapon}
            options={allowedWeapons.map((w) => ({
              id: w.id,
              label: localizedWeapon(w.id, locale),
            }))}
          />
          <SelectRow
            label={t("party.armor")}
            noneLabel={t("common.none")}
            value={armor}
            onChange={setArmor}
            options={allowedArmors.map((a) => ({
              id: a.id,
              label: localizedArmor(a.id, locale),
            }))}
          />
          <SelectRow
            label={t("party.sensor")}
            noneLabel={t("common.none")}
            value={sensor}
            onChange={setSensor}
            options={allSensors.map((s) => ({
              id: s.id,
              label: localizedSensor(s.id, locale),
            }))}
          />

          <div className="border-t border-slate-200 pt-3 space-y-1 text-sm font-mono">
            <p className="text-xs text-slate-500 font-sans">
              {t("party.statChange")}
            </p>
            <StatLine label="ATK" base={baseAtk} eff={effAtk} />
            <StatLine label="DEF" base={baseDef} eff={effDef} />
            <StatLine label="MAG" base={baseMag} eff={effMag} />
          </div>
        </div>

        <footer className="border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t("common.equip")}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// ============================================================================
// 内部部品
// ============================================================================

/**
 * 装備選択行：toggle ボタン群で実装。
 * - native <select> は Chromium で「途中で開かなくなる」現象が起きるため避ける
 * - 「なし」を含めて 4〜6 個のボタンを並べる（ジョブで装備可能な分のみフィルタ済）
 */
function SelectRow<TId extends string>({
  label,
  noneLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  noneLabel: string;
  value: TId | "";
  onChange: (v: TId | "") => void;
  options: Array<{ id: TId; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          onClick={() => onChange("")}
          aria-pressed={value === ""}
          className={
            "px-2 py-1 text-xs rounded border " +
            (value === ""
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100")
          }
        >
          {noneLabel}
        </button>
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              className={
                "px-2 py-1 text-xs rounded border " +
                (active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatLine({ label, base, eff }: { label: string; base: number; eff: number }) {
  const diff = eff - base;
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span>
        {base}
        {diff !== 0 && (
          <>
            {" → "}
            <span className={diff > 0 ? "text-emerald-700" : "text-rose-700"}>
              {eff}
            </span>
            <span className="text-xs text-slate-500 ml-1">
              ({diff > 0 ? "+" : ""}
              {diff})
            </span>
          </>
        )}
      </span>
    </div>
  );
}
