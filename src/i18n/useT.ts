/**
 * 翻訳フック useT()（M3-G-8）
 *
 * 使い方：
 *   const t = useT();
 *   t("common.save")                 // → "保存" or "Save"
 *   t("battle.title", { depth: 5 })  // → "戦闘（深度 5）" or "Battle (Depth 5)"
 *
 * - 現在ロケールは PlayerContext.settings.locale から取得
 * - 引数の {placeholder} は params で置換
 * - SSR 想定なし
 */

import { useCallback, useContext } from "react";

import { PlayerContext } from "../state/PlayerContext";
import { DEFAULT_LOCALE, translate, type Locale, type StringKey } from "./strings";

/**
 * 翻訳フック。PlayerProvider が無い場合は DEFAULT_LOCALE（ja）にフォールバック。
 * これによりレガシーな単体テスト（Provider を巻かない構成）でも壊れない。
 */
export function useT() {
  const ctx = useContext(PlayerContext);
  const locale: Locale = ctx?.data.settings.locale ?? DEFAULT_LOCALE;
  return useCallback(
    (key: StringKey, params?: Record<string, string | number>) =>
      translate(key, locale, params),
    [locale],
  );
}

/** 現在のロケールを直接読み書きしたい場合。Provider 無しではセッターは no-op。 */
export function useLocale() {
  const ctx = useContext(PlayerContext);
  const locale: Locale = ctx?.data.settings.locale ?? DEFAULT_LOCALE;
  const setLocale = useCallback(
    (loc: Locale) => {
      if (ctx) ctx.dispatch({ type: "SET_LOCALE", locale: loc });
    },
    [ctx],
  );
  return { locale, setLocale };
}
