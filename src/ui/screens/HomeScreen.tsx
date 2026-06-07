import { usePlayer } from "../../state/PlayerContext";

export function HomeScreen() {
  const { data } = usePlayer();
  const last = data.dungeon.lastBattle;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">ホーム</h2>
      <p className="text-sm text-slate-600">
        現在の深度: <strong>{data.dungeon.currentDepth}</strong> / 最高記録{" "}
        <strong>{data.dungeon.maxDepth}</strong>
      </p>
      {last ? (
        <p className="text-sm text-slate-500">
          直近の戦闘： {last.winner} ({last.turns} ターン / 深度 {last.depth})
        </p>
      ) : (
        <p className="text-sm text-slate-400">まだ戦闘記録はありません</p>
      )}
      <p className="text-xs text-slate-400">（M2-D で「出撃」ボタンを実装予定）</p>
    </section>
  );
}
