import { Link, useParams } from "react-router-dom";

import { usePlayer } from "../../state/PlayerContext";

export function GambitEditorScreen() {
  const { charId } = useParams<{ charId: string }>();
  const { data } = usePlayer();
  const unit = data.party.find((u) => u.id === charId);

  if (!unit) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">ガンビット編集</h2>
        <p className="text-sm text-rose-600">
          ID `{charId}` のキャラクターが見つかりません。
        </p>
        <Link to="/party" className="text-sm text-blue-600 underline">
          編成画面に戻る
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">ガンビット編集：{unit.name}</h2>
      <p className="text-sm text-slate-600">
        現在のルール数: {unit.gambitSet.rules.length} / 8
      </p>
      <ol className="space-y-1 list-decimal list-inside text-sm">
        {unit.gambitSet.rules.map((r) => (
          <li key={r.id} className={r.enabled ? "" : "line-through text-slate-400"}>
            {r.condition.type} → {r.target.type} → {r.action.type}
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-400">
        （M2-F で 3 ステップ選択 UI を実装予定）
      </p>
    </section>
  );
}
