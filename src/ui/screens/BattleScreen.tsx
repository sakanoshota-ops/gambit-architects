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
import { generateEnemiesForDepth } from "../../data/dungeon";
import { usePlayer } from "../../state/PlayerContext";

// 倍速 1x のときの 1 イベントあたり ms
const BASE_REVEAL_MS = 220;

export function BattleScreen() {
  const { data, dispatch } = usePlayer();
  const navigate = useNavigate();

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
    const r = runBattle(data.party, enemies, { maxTurns: 50 });
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

  // -- 描画 --

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold">戦闘（深度 {depthRef.current}）</h2>
        {!isFinished && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">倍速</span>
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
              スキップ
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3">
        <UnitsPanel label="パーティ" units={data.party} hpMap={currentHp} accent="blue" />
        <UnitsPanel label="敵" units={enemies} hpMap={currentHp} accent="rose" />
      </div>

      <div className="border border-slate-200 bg-white rounded p-3 h-64 overflow-auto text-xs font-mono">
        {result?.events.slice(0, revealedCount).map((ev, i) => (
          <p key={i} className={lineClassFor(ev)}>
            {formatEvent(ev, [...data.party, ...enemies])}
          </p>
        ))}
        {!result && <p className="text-slate-400">戦闘準備中...</p>}
      </div>

      {isFinished && result && (
        <div className="border border-slate-300 bg-slate-50 rounded p-4 space-y-3">
          <h3 className="text-lg font-bold">
            {result.winner === "ALLY" && "勝利！"}
            {result.winner === "ENEMY" && "敗北..."}
            {result.winner === "TIMEOUT" && "時間切れ"}
          </h3>
          <p className="text-sm">
            {result.turns} ターン経過 ・ 深度 {depthRef.current}
            {result.winner === "ALLY" && (
              <span className="ml-2 text-green-700">→ 次は深度 {depthRef.current + 1}</span>
            )}
          </p>
          <button
            type="button"
            onClick={back}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700"
          >
            ホームへ戻る
          </button>
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
}: {
  label: string;
  units: Unit[];
  hpMap: Record<string, number>;
  accent: "blue" | "rose";
}) {
  const barColor = accent === "blue" ? "bg-blue-500" : "bg-rose-500";
  return (
    <div className="border border-slate-200 bg-white rounded p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase">{label}</p>
      {units.map((u) => {
        const currentHp = hpMap[u.id] ?? u.hp;
        const ratio = Math.max(0, Math.min(1, currentHp / u.hpMax));
        const isDown = currentHp <= 0;
        return (
          <div key={u.id} className={isDown ? "opacity-40" : ""}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold">
                {u.name} <span className="text-slate-400">({u.jobId})</span>
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

function formatEvent(ev: BattleEvent, units: Unit[]): string {
  const nameOf = (id: string) => units.find((u) => u.id === id)?.name ?? id;
  switch (ev.kind) {
    case "TURN_START":
      return `\n[Turn ${ev.turn}]`;
    case "ACTION":
      return `  ${nameOf(ev.actorId)} → ${ev.actionType} (${ev.targetIds.map(nameOf).join(", ")})`;
    case "DAMAGE":
      return `    - ${nameOf(ev.targetId)} -${ev.amount} HP`;
    case "HEAL":
      return `    + ${nameOf(ev.targetId)} +${ev.amount} HP`;
    case "DOWN":
      return `    x ${nameOf(ev.unitId)} DOWN`;
    case "NOT_IMPLEMENTED":
      return `    ? [NotImplemented: ${ev.actionType}]`;
    case "BATTLE_END":
      return `=== BATTLE END: ${ev.winner} ===`;
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
