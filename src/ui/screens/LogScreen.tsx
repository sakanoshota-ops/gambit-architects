/**
 * ログ画面（M2-H, M3-G-8 でローカライズ）
 */

import { useT } from "../../i18n/useT";
import { usePlayer } from "../../state/PlayerContext";

const WINNER_COLOR: Record<string, string> = {
  ALLY: "text-emerald-600",
  ENEMY: "text-rose-600",
  TIMEOUT: "text-slate-500",
};

export function LogScreen() {
  const { data } = usePlayer();
  const t = useT();
  const recent = data.dungeon.recentBattles;

  const winnerLabel = (w: "ALLY" | "ENEMY" | "TIMEOUT") =>
    w === "ALLY"
      ? t("log.winnerAlly")
      : w === "ENEMY"
        ? t("log.winnerEnemy")
        : t("log.winnerTimeout");

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">{t("log.title")}</h2>

      {recent.length === 0 ? (
        <p className="text-sm text-slate-400">{t("log.empty")}</p>
      ) : (
        <ol className="space-y-2">
          {recent.map((b, i) => (
            <li
              key={i}
              className="border border-slate-200 bg-white rounded p-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-baseline gap-3 min-w-0 flex-1">
                <span className="text-xs text-slate-400 w-6 text-right">
                  {i + 1}.
                </span>
                <span
                  className={
                    "font-semibold w-16 shrink-0 " +
                    (WINNER_COLOR[b.winner] ?? "text-slate-700")
                  }
                >
                  {winnerLabel(b.winner)}
                </span>
                <span className="text-sm text-slate-600">
                  {t("log.depth", { depth: b.depth })}
                </span>
              </div>
              <span className="text-sm text-slate-500 shrink-0">
                {t("log.turns", { turns: b.turns })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
