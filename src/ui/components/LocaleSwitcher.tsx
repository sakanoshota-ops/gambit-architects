/**
 * 言語切替トグル（M3-G-8）
 *
 * - 画面右上に「JA / EN」の小さなトグル
 * - クリックで PlayerContext.settings.locale が即時切替
 * - 即時に全画面の useT() が再評価される
 */

import { useLocale } from "../../i18n/useT";

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <div
      className="inline-flex border border-slate-300 rounded overflow-hidden text-xs"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("ja")}
        aria-pressed={locale === "ja"}
        className={
          "px-2 py-1 " +
          (locale === "ja"
            ? "bg-blue-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-100")
        }
      >
        JA
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={
          "px-2 py-1 border-l border-slate-300 " +
          (locale === "en"
            ? "bg-blue-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-100")
        }
      >
        EN
      </button>
    </div>
  );
}
