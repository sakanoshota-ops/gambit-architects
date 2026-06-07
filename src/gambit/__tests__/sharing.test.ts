/**
 * sharing.ts のテスト（M2-I）
 *
 * - 観点：
 *   - ラウンドトリップ：encode → decode で同じ GambitSet
 *   - プレフィックス不正は null
 *   - 改ざん文字列（壊れた base64）は null
 *   - JSON ではあるがスキーマ違反（rules が長すぎ／未知の type）は null
 */

import { describe, expect, it } from "vitest";

import { presetExploitWeakness, presetTank } from "../presets";
import { decodeGambitSet, encodeGambitSet } from "../sharing";

describe("encode/decode ラウンドトリップ", () => {
  it("presetTank: encode してから decode しても同じ GambitSet", async () => {
    const set = presetTank("ally_1");
    const encoded = await encodeGambitSet(set);
    expect(encoded.startsWith("GA2:")).toBe(true);
    const decoded = await decodeGambitSet(encoded);
    expect(decoded).toEqual(set);
  });

  it("presetExploitWeakness（5 ルール）も同様", async () => {
    const set = presetExploitWeakness("ally_2");
    const decoded = await decodeGambitSet(await encodeGambitSet(set));
    expect(decoded).toEqual(set);
  });
});

describe("decodeGambitSet の不正入力の拒否", () => {
  it("プレフィックスが違うと null", async () => {
    expect(await decodeGambitSet("GA1:abc")).toBeNull();
    expect(await decodeGambitSet("hello world")).toBeNull();
    expect(await decodeGambitSet("")).toBeNull();
  });

  it("base64 部分が壊れていると null", async () => {
    expect(await decodeGambitSet("GA2:!!!not-base64!!!")).toBeNull();
  });

  it("gzip 解凍に失敗すると null（base64 だが gzip ではない）", async () => {
    // base64 として有効だが gzip ヘッダがない
    expect(await decodeGambitSet("GA2:aGVsbG8")).toBeNull();
  });
});

describe("decodeGambitSet のスキーマ検証", () => {
  it("schemaVersion が違うと null", async () => {
    const bad = await encodeGambitSet({
      // @ts-expect-error 故意に違うバージョン
      schemaVersion: 1,
      characterId: "x",
      rules: [],
    });
    expect(await decodeGambitSet(bad)).toBeNull();
  });

  it("ルール数が 8 を超えると null", async () => {
    const tooMany = {
      schemaVersion: 2,
      characterId: "x",
      rules: Array.from({ length: 9 }, (_, i) => ({
        id: `r${i}`,
        enabled: true,
        condition: { type: "ENEMY_EXISTS" },
        target: { type: "ENEMY_MATCH" },
        action: { type: "ATTACK" },
      })),
    };
    // @ts-expect-error tooMany は GambitSet として不正なため
    const bad = await encodeGambitSet(tooMany);
    expect(await decodeGambitSet(bad)).toBeNull();
  });

  it("未知の condition.type は null", async () => {
    const bad = await encodeGambitSet({
      schemaVersion: 2,
      characterId: "x",
      rules: [
        {
          id: "r1",
          enabled: true,
          // @ts-expect-error 未知の type
          condition: { type: "ALIEN_HP_OK" },
          target: { type: "SELF" },
          action: { type: "ATTACK" },
        },
      ],
    });
    expect(await decodeGambitSet(bad)).toBeNull();
  });
});
