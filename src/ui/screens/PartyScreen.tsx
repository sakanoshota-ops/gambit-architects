import { useState } from "react";
import { Link } from "react-router-dom";

import type { JobId } from "../../battle/types";
import { JOB_IDS } from "../../battle/types";
import {
  localizedArmor,
  localizedJobName,
  localizedSensor,
  localizedWeapon,
} from "../../i18n/names";
import { useT, useLocale } from "../../i18n/useT";
import { usePlayer } from "../../state/PlayerContext";
import { EquipmentPicker } from "../components/EquipmentPicker";

export function PartyScreen() {
  const { data, dispatch } = usePlayer();
  const t = useT();
  const { locale } = useLocale();
  const [equippingId, setEquippingId] = useState<string | null>(null);

  const editingUnit = equippingId
    ? data.party.find((u) => u.id === equippingId)
    : undefined;

  function handleJobChange(unitId: string, newJobId: JobId) {
    const msg =
      locale === "ja"
        ? "ジョブを変更すると装備とガンビットが初期化されます。よろしいですか？"
        : "Changing job will reset equipment and gambit rules. Continue?";
    if (!confirm(msg)) return;
    dispatch({ type: "UPDATE_UNIT_JOB", unitId, newJobId });
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">{t("party.title")}</h2>

      <ul className="space-y-2">
        {data.party.map((u) => {
          const weaponName = u.equipment.weapon
            ? localizedWeapon(u.equipment.weapon, locale)
            : t("common.none");
          const armorName = u.equipment.armor
            ? localizedArmor(u.equipment.armor, locale)
            : t("common.none");
          const sensorName = u.equipment.sensor
            ? localizedSensor(u.equipment.sensor, locale)
            : t("common.none");

          return (
            <li
              key={u.id}
              className="border border-slate-200 bg-white rounded p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{u.name}</div>
                  {/*
                    ジョブ切替：select だと <main overflow-auto> 配下で popup が
                    クリップされる Chromium バグがあるため、3 ボタンの toggle にする。
                    クリックで即変更（confirm で警告）
                  */}
                  <div
                    className="flex items-center gap-1 mt-1"
                    role="group"
                    aria-label={locale === "ja" ? "ジョブ" : "Job"}
                  >
                    {JOB_IDS.map((jid) => {
                      const active = u.jobId === jid;
                      return (
                        <button
                          key={jid}
                          type="button"
                          onClick={() => {
                            if (active) return; // 同じジョブはスキップ
                            handleJobChange(u.id, jid);
                          }}
                          aria-pressed={active}
                          className={
                            "px-2 py-0.5 text-xs rounded border font-normal " +
                            (active
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100")
                          }
                        >
                          {localizedJobName(jid, locale)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    HP {u.hp}/{u.hpMax} ・ MP {u.mp}/{u.mpMax}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <Link
                    to={`/edit/${u.id}`}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 active:bg-slate-200 transition-colors"
                  >
                    {t("common.edit")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEquippingId(u.id)}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 active:bg-slate-200 transition-colors"
                  >
                    {t("party.equipment")}
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-500 grid grid-cols-3 gap-1">
                <span>{t("party.weapon")}: {weaponName}</span>
                <span>{t("party.armor")}: {armorName}</span>
                <span>{t("party.sensor")}: {sensorName}</span>
              </div>
            </li>
          );
        })}
      </ul>

      {editingUnit && (
        <EquipmentPicker
          open={true}
          unit={editingUnit}
          onSave={(eq) => {
            dispatch({
              type: "UPDATE_UNIT_EQUIPMENT",
              unitId: editingUnit.id,
              equipment: eq,
            });
            setEquippingId(null);
          }}
          onCancel={() => setEquippingId(null)}
        />
      )}
    </section>
  );
}
