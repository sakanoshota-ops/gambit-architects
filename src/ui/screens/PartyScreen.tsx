import { useState } from "react";
import { Link } from "react-router-dom";

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
                  <div className="font-semibold">
                    {u.name}{" "}
                    <span className="text-xs text-slate-500">
                      ({localizedJobName(u.jobId, locale)})
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-0.5">
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
