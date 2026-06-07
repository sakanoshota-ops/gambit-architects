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

import { usePlayer } from "../../state/PlayerContext";

const TAB_ITEMS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/", label: "ホーム", end: true },
  { to: "/party", label: "編成" },
  { to: "/battle", label: "戦闘" },
  { to: "/log", label: "ログ" },
  { to: "/settings", label: "設定" },
];

export function Layout() {
  const { data } = usePlayer();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 px-4 py-3 bg-white flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-tight">Gambit Architects</h1>
        <p className="text-sm text-slate-500">
          深度{" "}
          <span className="font-semibold text-slate-800">{data.dungeon.currentDepth}</span>
        </p>
      </header>

      <main className="flex-1 overflow-auto p-4 max-w-2xl w-full mx-auto">
        <Outlet />
      </main>

      <nav className="border-t border-slate-200 bg-white flex" aria-label="主要ナビゲーション">
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
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
