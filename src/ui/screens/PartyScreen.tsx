import { Link } from "react-router-dom";

import { usePlayer } from "../../state/PlayerContext";

export function PartyScreen() {
  const { data } = usePlayer();

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">編成</h2>

      <ul className="space-y-2">
        {data.party.map((u) => (
          <li
            key={u.id}
            className="border border-slate-200 bg-white rounded p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold">
                {u.name} <span className="text-xs text-slate-500">({u.jobId})</span>
              </div>
              <div className="text-sm text-slate-600 mt-0.5">
                HP {u.hp}/{u.hpMax} ・ MP {u.mp}/{u.mpMax}
              </div>
            </div>
            <Link
              to={`/edit/${u.id}`}
              className="shrink-0 px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              編集
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-xs text-slate-400">（M2-E でジョブ切替を実装予定）</p>
    </section>
  );
}
