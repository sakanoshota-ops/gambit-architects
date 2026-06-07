/**
 * ガンビット共有用の文字列エンコード／デコード（DSL §7）
 *
 * 形式：`GA2:` + base64url(gzip(JSON))
 *
 * - ブラウザ標準の `CompressionStream` / `DecompressionStream` を使用
 * - インポート時のスキーマ検証は型・列挙値のレベルまで
 * - 検証失敗は全て null を返す（DSL §7.3「全拒否」）
 */

import {
  ACTION_TYPES,
  CONDITION_TYPES,
  GAMBIT_SCHEMA_VERSION,
  MAX_RULES_PER_SET,
  TARGET_TYPES,
  type GambitSet,
} from "./types";

const PREFIX = "GA2:";

// ============================================================================
// 公開 API
// ============================================================================

/** GambitSet を共有文字列 `GA2:...` に変換する */
export async function encodeGambitSet(set: GambitSet): Promise<string> {
  const json = JSON.stringify(set);
  const bytes = new TextEncoder().encode(json);

  const stream = bytesToReadableStream(bytes).pipeThrough(
    new CompressionStream("gzip"),
  );
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());

  return PREFIX + bytesToBase64Url(compressed);
}

/**
 * 共有文字列を GambitSet にデコードする。
 * - 文字列の prefix・base64・gzip・JSON・スキーマすべてに通らないと null
 */
export async function decodeGambitSet(input: string): Promise<GambitSet | null> {
  if (!input.startsWith(PREFIX)) return null;

  let compressed: Uint8Array;
  try {
    compressed = base64UrlToBytes(input.slice(PREFIX.length));
  } catch {
    return null;
  }

  let json: string;
  try {
    const stream = bytesToReadableStream(compressed).pipeThrough(
      new DecompressionStream("gzip"),
    );
    const decompressed = await new Response(stream).arrayBuffer();
    json = new TextDecoder().decode(decompressed);
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!isValidGambitSet(parsed)) return null;
  return parsed;
}

// ============================================================================
// 内部：ストリーム生成（Blob.stream() を使わない実装）
// ============================================================================

/**
 * Uint8Array を 1 チャンクで吐く ReadableStream を作る。
 * `Blob.stream()` の代替（jsdom が未対応のため）。
 */
function bytesToReadableStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

// ============================================================================
// 内部：base64url 変換
// ============================================================================

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ============================================================================
// 内部：スキーマ検証
// ============================================================================

function isValidGambitSet(obj: unknown): obj is GambitSet {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (o.schemaVersion !== GAMBIT_SCHEMA_VERSION) return false;
  if (typeof o.characterId !== "string") return false;
  if (!Array.isArray(o.rules)) return false;
  if (o.rules.length > MAX_RULES_PER_SET) return false;
  return o.rules.every(isValidRule);
}

function isValidRule(r: unknown): boolean {
  if (!r || typeof r !== "object") return false;
  const rule = r as Record<string, unknown>;
  if (typeof rule.id !== "string") return false;
  if (typeof rule.enabled !== "boolean") return false;

  if (!isValidConditionShape(rule.condition)) return false;
  if (!isValidTargetShape(rule.target)) return false;
  if (!isValidActionShape(rule.action)) return false;

  return true;
}

function isValidConditionShape(c: unknown): boolean {
  if (!c || typeof c !== "object") return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.type === "string" && (CONDITION_TYPES as readonly string[]).includes(obj.type)
  );
}

function isValidTargetShape(t: unknown): boolean {
  if (!t || typeof t !== "object") return false;
  const obj = t as Record<string, unknown>;
  return typeof obj.type === "string" && (TARGET_TYPES as readonly string[]).includes(obj.type);
}

function isValidActionShape(a: unknown): boolean {
  if (!a || typeof a !== "object") return false;
  const obj = a as Record<string, unknown>;
  return typeof obj.type === "string" && (ACTION_TYPES as readonly string[]).includes(obj.type);
}
