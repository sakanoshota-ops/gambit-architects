import { useState } from "react";

import { decodeGambitSet, encodeGambitSet } from "../../gambit/sharing";
import { usePlayer } from "../../state/PlayerContext";

export function SettingsScreen() {
  const { data, dispatch } = usePlayer();
  const [selectedId, setSelectedId] = useState(data.party[0]?.id ?? "");
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "ng"; text: string } | null>(null);

  const selected = data.party.find((u) => u.id === selectedId);

  async function handleExport() {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const encoded = await encodeGambitSet(selected.gambitSet);
      setExportText(encoded);
      try {
        await navigator.clipboard.writeText(encoded);
        setMessage({ kind: "ok", text: "クリップボードにコピーしました" });
      } catch {
        setMessage({ kind: "ok", text: "下のテキストを手動でコピーしてください" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    if (!selected) return;
    const trimmed = importText.trim();
    if (!trimmed) return;
    setBusy(true);
    setMessage(null);
    try {
      const decoded = await decodeGambitSet(trimmed);
      if (!decoded) {
        setMessage({ kind: "ng", text: "不正な共有文字列です（GA2: から始まる文字列を貼り付けてください）" });
        return;
      }
      // characterId を選択キャラに合わせて上書き（A 案）
      const adjusted = { ...decoded, characterId: selected.id };
      dispatch({
        type: "UPDATE_UNIT_GAMBIT",
        unitId: selected.id,
        gambitSet: adjusted,
      });
      setImportText("");
      setMessage({ kind: "ok", text: `${selected.name} に適用しました（${adjusted.rules.length} ルール）` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">設定</h2>

      {/* 倍速 */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">戦闘倍速</p>
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

      {/* ガンビット共有 */}
      <div className="space-y-3 border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-700">ガンビット共有</p>

        <label className="flex items-center gap-2 text-sm">
          <span>対象キャラ：</span>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setExportText("");
              setMessage(null);
            }}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            {data.party.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.jobId})
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-1">
          <p className="text-xs text-slate-500">エクスポート</p>
          <button
            type="button"
            onClick={handleExport}
            disabled={busy || !selected}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
          >
            コピー
          </button>
          {exportText && (
            <textarea
              readOnly
              value={exportText}
              rows={3}
              className="w-full mt-1 border border-slate-300 rounded p-2 text-xs font-mono break-all bg-slate-50"
              onFocus={(e) => e.currentTarget.select()}
              aria-label="エクスポート結果"
            />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-500">インポート</p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="GA2:..."
            rows={3}
            className="w-full border border-slate-300 rounded p-2 text-xs font-mono"
            aria-label="インポート用文字列"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={busy || !importText.trim() || !selected}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-300"
          >
            適用
          </button>
        </div>

        {message && (
          <p
            role="status"
            className={
              "text-xs " + (message.kind === "ok" ? "text-emerald-700" : "text-rose-600")
            }
          >
            {message.text}
          </p>
        )}
      </div>

      {/* 初期化 */}
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-700">セーブデータ</p>
        <button
          type="button"
          onClick={() => {
            if (confirm("セーブデータを初期化しますか？")) {
              dispatch({ type: "RESET_TO_DEFAULTS" });
              setExportText("");
              setImportText("");
              setMessage(null);
            }
          }}
          className="border border-rose-300 text-rose-600 rounded px-3 py-1 text-sm hover:bg-rose-50"
        >
          セーブデータを初期化
        </button>
      </div>
    </section>
  );
}
