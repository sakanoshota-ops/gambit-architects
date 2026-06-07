import { useNavigate } from "react-router-dom";

import { usePlayer } from "../../state/PlayerContext";

export function HomeScreen() {
  const { data } = usePlayer();
  const navigate = useNavigate();
  const last = data.dungeon.lastBattle;

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">ホーム</h2>

      <div className="space-y-1 text-sm text-slate-600">
        <p>
          現在の深度: <strong className="text-slate-900">{data.dungeon.currentDepth}</strong> / 最高記録{" "}
          <strong className="text-slate-900">{data.dungeon.maxDepth}</strong>
        </p>
        {last ? (
          <p className="text-slate-500">
            直近の戦闘： <strong>{last.winner}</strong> ({last.turns} ターン / 深度 {last.depth})
          </p>
        ) : (
          <p className="text-slate-400">まだ戦闘記録はありません</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate("/battle")}
        className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white text-base font-semibold rounded-lg shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
      >
        出撃（深度 {data.dungeon.currentDepth}）
      </button>

      <p className="text-xs text-slate-400">（M2-G で戦闘画面の実装に進む予定）</p>
    </section>
  );
}
