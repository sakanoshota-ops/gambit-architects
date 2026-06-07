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
            className="border border-slate-200 bg-white rounded p-3 flex items-center justify-between"
          >
            <span>
              <strong>{u.name}</strong>{" "}
              <span className="text-xs text-slate-500">({u.jobId})</span>
            </span>
            <span className="text-sm text-slate-600">
              HP {u.hp}/{u.hpMax} ・ MP {u.mp}/{u.mpMax}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400">（M2-E で詳細編集／ジョブ切替を実装予定）</p>
    </section>
  );
}
