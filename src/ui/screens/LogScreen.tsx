import { usePlayer } from "../../state/PlayerContext";

export function LogScreen() {
  const { data } = usePlayer();
  const last = data.dungeon.lastBattle;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">ログ</h2>
      {last ? (
        <div className="border border-slate-200 bg-white rounded p-3 text-sm">
          <p>
            勝敗: <strong>{last.winner}</strong>
          </p>
          <p>ターン数: {last.turns}</p>
          <p>深度: {last.depth}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-400">まだ戦闘記録はありません</p>
      )}
      <p className="text-xs text-slate-400">
        （M2-H で直近 3〜5 戦のリプレイを実装予定）
      </p>
    </section>
  );
}
