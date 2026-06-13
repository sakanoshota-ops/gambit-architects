/// <reference types="vite/client" />

/**
 * vite.config.ts の `define` で埋め込まれるグローバル定数。
 * package.json の version をビルド時に文字列リテラルへ置換される。
 */
declare const __APP_VERSION__: string;
