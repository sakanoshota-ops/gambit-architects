import { useNavigate } from "react-router-dom";

import { useT } from "../../i18n/useT";
import { usePlayer } from "../../state/PlayerContext";

export function HomeScreen() {
  const { data } = usePlayer();
  const navigate = useNavigate();
  const t = useT();
  const last = data.dungeon.recentBattles[0];

  const winnerLabel = (w: "ALLY" | "ENEMY" | "TIMEOUT") =>
    w === "ALLY"
      ? t("log.winnerAlly")
      : w === "ENEMY"
        ? t("log.winnerEnemy")
        : t("log.winnerTimeout");

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">{t("home.title")}</h2>

      <div className="space-y-1 text-sm text-slate-600">
        <p>
          {t("home.currentDepth")}:{" "}
          <strong className="text-slate-900">{data.dungeon.currentDepth}</strong> /{" "}
          {t("home.maxDepth")}{" "}
          <strong className="text-slate-900">{data.dungeon.maxDepth}</strong>
        </p>
        {last ? (
          <p className="text-slate-500">
            <strong>{winnerLabel(last.winner)}</strong>{" "}
            ({t("log.turns", { turns: last.turns })} / {t("log.depth", { depth: last.depth })})
          </p>
        ) : (
          <p className="text-slate-400">{t("log.empty")}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate("/battle")}
        className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white text-base font-semibold rounded-lg shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
      >
        {t("home.sortieButton", { depth: data.dungeon.currentDepth })}
      </button>
    </section>
  );
}
