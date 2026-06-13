import { useState } from "react";

import { decodeGambitSet, encodeGambitSet } from "../../gambit/sharing";
import { localizedJobName } from "../../i18n/names";
import { useT, useLocale } from "../../i18n/useT";
import { usePlayer } from "../../state/PlayerContext";

export function SettingsScreen() {
  const { data, dispatch } = usePlayer();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const ja = locale === "ja";
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
        setMessage({
          kind: "ok",
          text: ja ? "クリップボードにコピーしました" : "Copied to clipboard",
        });
      } catch {
        setMessage({
          kind: "ok",
          text: ja
            ? "下のテキストを手動でコピーしてください"
            : "Please copy the text below manually",
        });
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
        setMessage({
          kind: "ng",
          text: ja
            ? "不正な共有文字列です（GA2: から始まる文字列を貼り付けてください）"
            : "Invalid share string (paste a GA2:... string)",
        });
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
      setMessage({
        kind: "ok",
        text: ja
          ? `${selected.name} に適用しました（${adjusted.rules.length} ルール）`
          : `Applied to ${selected.name} (${adjusted.rules.length} rules)`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">{t("nav.settings")}</h2>

      {/* 言語 */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">
          {t("settings.language")}
        </p>
        <div className="flex gap-2">
          {(["ja", "en"] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocale(loc)}
              className={
                "border rounded px-3 py-1 text-sm " +
                (locale === loc
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100")
              }
            >
              {t(`settings.${loc}`)}
            </button>
          ))}
        </div>
      </div>

      {/* 倍速 */}
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-700">
          {ja ? "戦闘倍速" : "Battle Speed"}
        </p>
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
        <p className="text-sm font-medium text-slate-700">
          {ja ? "ガンビット共有" : "Gambit Share"}
        </p>

        {/*
          M3-G-14：select は <main overflow-auto> 配下で popup がクリップされるため
          4 ボタンの toggle に置き換え
        */}
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            {ja ? "対象キャラ" : "Character"}
          </p>
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label={ja ? "対象キャラ" : "Character"}
          >
            {data.party.map((u) => {
              const active = u.id === selectedId;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(u.id);
                    setExportText("");
                    setMessage(null);
                  }}
                  aria-pressed={active}
                  className={
                    "px-2 py-1 text-xs rounded border " +
                    (active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100")
                  }
                >
                  {u.name} ({localizedJobName(u.jobId, locale)})
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-500">{ja ? "エクスポート" : "Export"}</p>
          <button
            type="button"
            onClick={handleExport}
            disabled={busy || !selected}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
          >
            {ja ? "コピー" : "Copy"}
          </button>
          {exportText && (
            <textarea
              readOnly
              value={exportText}
              rows={3}
              className="w-full mt-1 border border-slate-300 rounded p-2 text-xs font-mono break-all bg-slate-50"
              onFocus={(e) => e.currentTarget.select()}
              aria-label={ja ? "エクスポート結果" : "Export result"}
            />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-500">{ja ? "インポート" : "Import"}</p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="GA2:..."
            rows={3}
            className="w-full border border-slate-300 rounded p-2 text-xs font-mono"
            aria-label={ja ? "インポート用文字列" : "Import string"}
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={busy || !importText.trim() || !selected}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-300"
          >
            {ja ? "適用" : "Apply"}
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
        <p className="text-sm font-medium text-slate-700">
          {ja ? "セーブデータ" : "Save Data"}
        </p>
        <button
          type="button"
          onClick={() => {
            const msg = ja
              ? "セーブデータを初期化しますか？"
              : "Reset save data?";
            if (confirm(msg)) {
              dispatch({ type: "RESET_TO_DEFAULTS" });
              setExportText("");
              setImportText("");
              setMessage(null);
            }
          }}
          className="border border-rose-300 text-rose-600 rounded px-3 py-1 text-sm hover:bg-rose-50"
        >
          {ja ? "セーブデータを初期化" : "Reset Save Data"}
        </button>
      </div>
    </section>
  );
}
