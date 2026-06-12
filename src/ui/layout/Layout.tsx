/**
 * 共通レイアウト
 *
 * - ヘッダー：タイトル + 現在の深度
 * - メイン：各 screen が `<Outlet />` から差し込まれる
 * - フッター：5 タブのナビゲーション
 *
 * Tailwind v4 のクラスを JSX に直接書くスタイル。
 */

import { NavLink, Outlet } from "react-router-dom";

import { useT } from "../../i18n/useT";
import { usePlayer } from "../../state/PlayerContext";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import type { StringKey } from "../../i18n/strings";

const TAB_ITEMS: Array<{ to: string; labelKey: StringKey; end?: boolean }> = [
  { to: "/", labelKey: "nav.home", end: true },
  { to: "/party", labelKey: "nav.party" },
  { to: "/battle", labelKey: "nav.battle" },
  { to: "/log", labelKey: "nav.log" },
  { to: "/settings", labelKey: "nav.settings" },
];

export function Layout() {
  const { data } = usePlayer();
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 px-4 py-3 bg-white flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Gambit Architects</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            {t("home.currentDepth")}{" "}
            <span className="font-semibold text-slate-800">
              {data.dungeon.currentDepth}
            </span>
          </p>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 max-w-2xl w-full mx-auto">
        <Outlet />
      </main>

      <nav
        className="border-t border-slate-200 bg-white flex"
        aria-label={t("nav.home")}
      >
        {TAB_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              "flex-1 text-center py-3 text-sm transition-colors " +
              (isActive
                ? "text-blue-600 font-semibold"
                : "text-slate-600 hover:text-slate-900")
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
