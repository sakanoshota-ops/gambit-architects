import { usePlayer } from "../../state/PlayerContext";

export function SettingsScreen() {
  const { data, dispatch } = usePlayer();

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">設定</h2>

      <div className="space-y-2">
        <p className="text-sm text-slate-700">戦闘倍速</p>
        <div className="flex gap-2">
          {([1, 2, 4] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => dispatch({ type: "SET_BATTLE_SPEED", speed: s })}
              className={
                "border rounded px-3 py-1 text-sm " +
                (data.settings.battleSpeed === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100")
              }
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (confirm("セーブデータを初期化しますか？")) {
            dispatch({ type: "RESET_TO_DEFAULTS" });
          }
        }}
        className="border border-rose-300 text-rose-600 rounded px-3 py-1 text-sm hover:bg-rose-50"
      >
        セーブデータを初期化
      </button>

      <p className="text-xs text-slate-400">
        （M2-I で import/export を実装予定）
      </p>
    </section>
  );
}
