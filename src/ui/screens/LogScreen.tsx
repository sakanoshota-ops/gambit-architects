/**
 * ログ画面（M2-H）
 *
 * - 直近 5 戦のサマリ一覧
 * - 詳細リプレイは M2-I 以降で検討（M2-H ではサマリのみ）
 */

import { usePlayer } from "../../state/PlayerContext";

const WINNER_LABEL: Record<string, string> = {
  ALLY: "勝利",
  ENEMY: "敗北",
  TIMEOUT: "時間切れ",
};

const WINNER_COLOR: Record<string, string> = {
  ALLY: "text-emerald-600",
  ENEMY: "text-rose-600",
  TIMEOUT: "text-slate-500",
};

export function LogScreen() {
  const { data } = usePlayer();
  const recent = data.dungeon.recentBattles;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">ログ</h2>
      <p className="text-xs text-slate-500">直近 5 戦の戦闘記録（新しい順）</p>

      {recent.length === 0 ? (
        <p className="text-sm text-slate-400">まだ戦闘記録はありません</p>
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
                  {WINNER_LABEL[b.winner] ?? b.winner}
                </span>
                <span className="text-sm text-slate-600">深度 {b.depth}</span>
              </div>
              <span className="text-sm text-slate-500 shrink-0">
                {b.turns} ターン
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-slate-400">
        （M2-I 以降で詳細リプレイの保存／再生を検討）
      </p>
    </section>
  );
}
