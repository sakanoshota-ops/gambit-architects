/**
 * 戦闘画面（M2-G）
 *
 * - マウント時に runBattle を実行（同期）
 * - ターン進行は setTimeout で 1 イベントずつ reveal
 * - 倍速設定（1x/2x/4x）に応じて遅延変化
 * - 「スキップ」ボタンで全イベント即時表示
 * - 戦闘終了時：SET_LAST_BATTLE、ALLY 勝利なら INCREMENT_DEPTH を dispatch（1 回だけ）
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { runBattle, type BattleResult } from "../../battle/runner";
import type { BattleEvent, Unit } from "../../battle/types";
import { ALL_ENEMIES } from "../../data/enemies";
import { generateEnemiesForDepth } from "../../data/dungeon";
import {
  localizedActionType,
  localizedEnemyNameById,
  localizedEnemyType,
  localizedJobName,
} from "../../i18n/names";
import type { Locale, StringKey } from "../../i18n/strings";
import { useT, useLocale } from "../../i18n/useT";
import { usePlayer } from "../../state/PlayerContext";

// 倍速 1x のときの 1 イベントあたり ms
const BASE_REVEAL_MS = 220;

export function BattleScreen() {
  const { data, dispatch } = usePlayer();
  const navigate = useNavigate();
  const t = useT();
  const { locale } = useLocale();

  // 戦闘開始時の深度（その後 dispatch で変わっても影響受けない）
  const depthRef = useRef<number>(data.dungeon.currentDepth);
  // 戦闘実行と結果保持
  const [result, setResult] = useState<BattleResult | null>(null);
  // 何イベントまで表示済みか
  const [revealedCount, setRevealedCount] = useState(0);
  // 敵編成（マウント時に固定）
  const enemiesRef = useRef<Unit[] | null>(null);

  // -- マウント時：戦闘実行 --
  useEffect(() => {
    const enemies = generateEnemiesForDepth(depthRef.current);
    enemiesRef.current = enemies;
    const r = runBattle(data.party, enemies, {
      maxTurns: 50,
      rng: Math.random, // 本番は実乱数。テストは明示注入で決定的に
    });
    setResult(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- 1 イベントずつ reveal --
  useEffect(() => {
    if (!result) return;
    if (revealedCount >= result.events.length) return;
    const delay = BASE_REVEAL_MS / data.settings.battleSpeed;
    const timer = setTimeout(() => setRevealedCount((c) => c + 1), delay);
    return () => clearTimeout(timer);
  }, [result, revealedCount, data.settings.battleSpeed]);

  // -- 戦闘終了時の dispatch（1 回だけ） --
  const recordedRef = useRef(false);
  const isFinished = result !== null && revealedCount >= result.events.length;
  useEffect(() => {
    if (!isFinished || !result || recordedRef.current) return;
    recordedRef.current = true;
    dispatch({
      type: "RECORD_BATTLE",
      battle: {
        winner: result.winner,
        turns: result.turns,
        depth: depthRef.current,
      },
    });
    if (result.winner === "ALLY") {
      dispatch({ type: "INCREMENT_DEPTH" });
    }
  }, [isFinished, result, dispatch]);

  // -- 表示用の現在 HP（イベント replay）--
  const currentHp = useMemo(
    () => computeHpAtTime(data.party, enemiesRef.current ?? [], result, revealedCount),
    [data.party, result, revealedCount],
  );

  const enemies = enemiesRef.current ?? [];

  function skip() {
    if (result) setRevealedCount(result.events.length);
  }

  function back() {
    navigate("/");
  }

  /**
   * 勝利後に次の深度へそのまま出撃する。
   * - data.dungeon.currentDepth は既に INCREMENT_DEPTH 済み
   * - depthRef を新しい深度に更新し、敵を再生成、戦闘を再実行、表示状態をリセット
   * - recordedRef をリセットして次戦も RECORD_BATTLE が走るようにする
   */
  function nextDepth() {
    const newDepth = data.dungeon.currentDepth;
    depthRef.current = newDepth;
    const enemies = generateEnemiesForDepth(newDepth);
    enemiesRef.current = enemies;
    const r = runBattle(data.party, enemies, {
      maxTurns: 50,
      rng: Math.random,
    });
    setResult(r);
    setRevealedCount(0);
    recordedRef.current = false;
  }

  // -- 描画 --

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold">
          {t("battle.title", { depth: depthRef.current })}
        </h2>
        {!isFinished && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">{t("battle.speed")}</span>
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => dispatch({ type: "SET_BATTLE_SPEED", speed: s })}
                className={
                  "px-2 py-0.5 border rounded " +
                  (data.settings.battleSpeed === s
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-slate-300 hover:bg-slate-100")
                }
              >
                {s}x
              </button>
            ))}
            <button
              type="button"
              onClick={skip}
              className="ml-2 px-2 py-0.5 border border-slate-300 rounded bg-white hover:bg-slate-100"
            >
              {t("common.skip")}
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3">
        <UnitsPanel
          label={t("battle.party")}
          units={data.party}
          hpMap={currentHp}
          accent="blue"
          locale={locale}
        />
        <UnitsPanel
          label={t("battle.enemies")}
          units={enemies}
          hpMap={currentHp}
          accent="rose"
          locale={locale}
        />
      </div>

      <div className="border border-slate-200 bg-white rounded p-3 h-64 overflow-auto text-xs font-mono">
        {result?.events.slice(0, revealedCount).map((ev, i) => (
          <p key={i} className={lineClassFor(ev)}>
            {formatEvent(ev, [...data.party, ...enemies], locale, t)}
          </p>
        ))}
        {!result && <p className="text-slate-400">{t("battle.preparing")}</p>}
      </div>

      {isFinished && result && (
        <div className="border border-slate-300 bg-slate-50 rounded p-4 space-y-3">
          <h3 className="text-lg font-bold">
            {result.winner === "ALLY" && t("battle.victory")}
            {result.winner === "ENEMY" && t("battle.defeat")}
            {result.winner === "TIMEOUT" && t("battle.timeout")}
          </h3>
          <p className="text-sm">
            {t("battle.turnsElapsed", {
              turns: result.turns,
              depth: depthRef.current,
            })}
            {result.winner === "ALLY" && (
              <span className="ml-2 text-green-700">
                {t("battle.nextDepthHint", { depth: depthRef.current + 1 })}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {result.winner === "ALLY" && (
              <button
                type="button"
                onClick={nextDepth}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700"
              >
                {t("battle.sortieDepth", { depth: depthRef.current + 1 })}
              </button>
            )}
            <button
              type="button"
              onClick={back}
              className={
                "px-4 py-2 text-sm font-semibold rounded " +
                (result.winner === "ALLY"
                  ? "border border-slate-300 bg-white hover:bg-slate-100"
                  : "bg-blue-600 text-white hover:bg-blue-700")
              }
            >
              {t("battle.backHome")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// 内部コンポーネント
// ============================================================================

function UnitsPanel({
  label,
  units,
  hpMap,
  accent,
  locale,
}: {
  label: string;
  units: Unit[];
  hpMap: Record<string, number>;
  accent: "blue" | "rose";
  locale: import("../../i18n/strings").Locale;
}) {
  const barColor = accent === "blue" ? "bg-blue-500" : "bg-rose-500";
  return (
    <div className="border border-slate-200 bg-white rounded p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase">{label}</p>
      {units.map((u) => {
        const currentHp = hpMap[u.id] ?? u.hp;
        const ratio = Math.max(0, Math.min(1, currentHp / u.hpMax));
        const isDown = currentHp <= 0;
        // 味方は固定の表示名（Sword1 等）を使い、敵は ID 由来でローカライズ
        const displayName = u.isAlly
          ? u.name
          : enemyDisplayName(u.id, u.name, locale);
        const jobLabel = u.isAlly
          ? localizedJobName(u.jobId, locale)
          : enemyTypeOrJobLabel(u, locale);
        return (
          <div key={u.id} className={isDown ? "opacity-40" : ""}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold">
                {displayName} <span className="text-slate-400">({jobLabel})</span>
              </span>
              <span className="text-slate-500">
                {Math.max(0, Math.floor(currentHp))}/{u.hpMax}
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded mt-0.5 overflow-hidden">
              <div
                className={"h-full transition-all " + barColor}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 敵の表示名：unit.name は EnemyTemplate.displayName（日本語）が入っている。
 * ALL_ENEMIES を displayName で逆引きして ID（"SKELETON" 等）を得て、ローカライズ。
 */
function enemyDisplayName(
  _unitId: string,
  fallbackName: string,
  locale: Locale,
): string {
  for (const [id, tmpl] of Object.entries(ALL_ENEMIES)) {
    if (tmpl.displayName === fallbackName) {
      return localizedEnemyNameById(id, locale);
    }
  }
  return fallbackName;
}

/** 敵側に「(SWORDSMAN)」が出るのは違和感があるので enemyType を出す */
function enemyTypeOrJobLabel(u: Unit, locale: Locale): string {
  return localizedEnemyType(u.enemyType, locale);
}

// ============================================================================
// 補助関数
// ============================================================================

function computeHpAtTime(
  party: Unit[],
  enemies: Unit[],
  result: BattleResult | null,
  revealedCount: number,
): Record<string, number> {
  const hp: Record<string, number> = {};
  for (const u of party) hp[u.id] = u.hpMax;
  for (const u of enemies) hp[u.id] = u.hpMax;
  if (!result) return hp;

  for (let i = 0; i < revealedCount; i++) {
    const ev = result.events[i];
    if (ev.kind === "DAMAGE" && ev.targetId in hp) {
      hp[ev.targetId] = Math.max(0, hp[ev.targetId] - ev.amount);
    } else if (ev.kind === "HEAL" && ev.targetId in hp) {
      hp[ev.targetId] = hp[ev.targetId] + ev.amount;
    }
  }
  return hp;
}

function formatEvent(
  ev: BattleEvent,
  units: Unit[],
  locale: Locale,
  t: (key: StringKey, params?: Record<string, string | number>) => string,
): string {
  const nameOf = (id: string) => {
    const u = units.find((x) => x.id === id);
    if (!u) return id;
    if (u.isAlly) return u.name;
    return enemyDisplayName(u.id, u.name, locale);
  };
  switch (ev.kind) {
    case "TURN_START":
      return `\n[${t("battle.turn")} ${ev.turn}]`;
    case "ACTION": {
      const action = localizedActionType(ev.actionType, locale);
      return `  ${nameOf(ev.actorId)} → ${action} (${ev.targetIds
        .map(nameOf)
        .join(", ")})`;
    }
    case "DAMAGE":
      return `    - ${nameOf(ev.targetId)} -${ev.amount} HP`;
    case "HEAL":
      return `    + ${nameOf(ev.targetId)} +${ev.amount} HP`;
    case "DOWN":
      return `    x ${nameOf(ev.unitId)} ${t("battle.down")}`;
    case "NOT_IMPLEMENTED":
      return `    ? ${t("battle.notImplemented", { actionType: ev.actionType })}`;
    case "BATTLE_END": {
      const w =
        ev.winner === "ALLY"
          ? t("battle.victory")
          : ev.winner === "ENEMY"
            ? t("battle.defeat")
            : t("battle.timeout");
      return `=== ${t("battle.end")}: ${w} ===`;
    }
  }
}

function lineClassFor(ev: BattleEvent): string {
  switch (ev.kind) {
    case "TURN_START":
      return "text-slate-700 font-semibold mt-1";
    case "BATTLE_END":
      return "text-slate-900 font-bold mt-1";
    case "DAMAGE":
      return "text-rose-600";
    case "HEAL":
      return "text-emerald-600";
    case "DOWN":
      return "text-slate-500 italic";
    case "NOT_IMPLEMENTED":
      return "text-slate-400";
    default:
      return "text-slate-700";
  }
}
