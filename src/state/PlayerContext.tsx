/**
 * プレイヤーデータの Context / Reducer / Provider
 *
 * - 単一の `PlayerData` を Context に乗せ、useReducer で更新する
 * - 任意のディスパッチでも自動で localStorage に保存（useEffect）
 * - SSR 想定なし（PWA / Vite CSR）
 */

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import type { JobId, Unit } from "../battle/types";
import {
  createHealer,
  createMage,
  createSwordsman,
} from "../data/jobs";
import type { GambitSet } from "../gambit/types";
import {
  presetBeginner,
  presetExploitWeakness,
  presetTank,
} from "../gambit/presets";
import type { Locale } from "../i18n/strings";
import { createDefaultPlayerData } from "./defaults";
import { loadPlayerData, savePlayerData } from "./storage";

// ============================================================================
// 型定義
// ============================================================================

export type Winner = "ALLY" | "ENEMY" | "TIMEOUT";

export interface LastBattleRecord {
  winner: Winner;
  turns: number;
  depth: number;
}

export interface DungeonProgress {
  /** 次に挑戦する深度 */
  currentDepth: number;
  /** 到達した最高深度（M2 では currentDepth と同じ動きで OK） */
  maxDepth: number;
  /** 直近の戦闘記録（新しい順、最大 5 件）*/
  recentBattles: LastBattleRecord[];
}

/** 同時に保持する直近戦闘の最大件数 */
export const MAX_RECENT_BATTLES = 5;

export interface Settings {
  /** 戦闘倍速の既定値 */
  battleSpeed: 1 | 2 | 4;
  /** UI 言語。デフォルト "ja"（M3-G-8） */
  locale: Locale;
}

export interface PlayerData {
  /** 4 体のパーティ。順序固定 */
  party: Unit[];
  dungeon: DungeonProgress;
  settings: Settings;
}

// ============================================================================
// Action / Reducer
// ============================================================================

export type PlayerAction =
  | { type: "SET_PARTY"; party: Unit[] }
  | { type: "UPDATE_UNIT_GAMBIT"; unitId: string; gambitSet: GambitSet }
  | {
      type: "UPDATE_UNIT_EQUIPMENT";
      unitId: string;
      equipment: import("../data/equipment").Equipment;
    }
  | { type: "INCREMENT_DEPTH" }
  | { type: "RECORD_BATTLE"; battle: LastBattleRecord }
  | { type: "SET_BATTLE_SPEED"; speed: 1 | 2 | 4 }
  | { type: "SET_LOCALE"; locale: Locale }
  | { type: "UPDATE_UNIT_JOB"; unitId: string; newJobId: JobId }
  | { type: "RESET_TO_DEFAULTS" };

function reducer(state: PlayerData, action: PlayerAction): PlayerData {
  switch (action.type) {
    case "SET_PARTY":
      return { ...state, party: action.party };

    case "UPDATE_UNIT_GAMBIT":
      return {
        ...state,
        party: state.party.map((u) =>
          u.id === action.unitId ? { ...u, gambitSet: action.gambitSet } : u,
        ),
      };

    case "UPDATE_UNIT_EQUIPMENT":
      return {
        ...state,
        party: state.party.map((u) =>
          u.id === action.unitId ? { ...u, equipment: action.equipment } : u,
        ),
      };

    case "INCREMENT_DEPTH": {
      const next = state.dungeon.currentDepth + 1;
      return {
        ...state,
        dungeon: {
          ...state.dungeon,
          currentDepth: next,
          maxDepth: Math.max(state.dungeon.maxDepth, next),
        },
      };
    }

    case "RECORD_BATTLE": {
      const next = [action.battle, ...state.dungeon.recentBattles].slice(
        0,
        MAX_RECENT_BATTLES,
      );
      return { ...state, dungeon: { ...state.dungeon, recentBattles: next } };
    }

    case "SET_BATTLE_SPEED":
      return { ...state, settings: { ...state.settings, battleSpeed: action.speed } };

    case "SET_LOCALE":
      return { ...state, settings: { ...state.settings, locale: action.locale } };

    case "UPDATE_UNIT_JOB": {
      // ジョブ変更：ユニットを新ジョブの初期値で作り直し、
      // id と name は維持、equipment と gambitSet はジョブ用デフォルトにリセット
      const target = state.party.find((u) => u.id === action.unitId);
      if (!target) return state;
      const newUnit = createUnitForJob(action.newJobId, target.id, target.name);
      return {
        ...state,
        party: state.party.map((u) => (u.id === action.unitId ? newUnit : u)),
      };
    }

    case "RESET_TO_DEFAULTS":
      return createDefaultPlayerData();
  }
}

/** ジョブ別の Unit 生成ヘルパ（既定プリセットを乗せる） */
function createUnitForJob(jobId: JobId, id: string, name: string): Unit {
  switch (jobId) {
    case "SWORDSMAN":
      return createSwordsman(id, name, presetTank(id));
    case "MAGE":
      return createMage(id, name, presetExploitWeakness(id));
    case "HEALER":
      return createHealer(id, name, presetBeginner(id));
  }
}

// ============================================================================
// Context / Provider / Hook
// ============================================================================

interface PlayerContextValue {
  data: PlayerData;
  dispatch: Dispatch<PlayerAction>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const PlayerContext = createContext<PlayerContextValue | null>(null);

function initPlayerData(): PlayerData {
  return loadPlayerData() ?? createDefaultPlayerData();
}

export interface PlayerProviderProps {
  children: ReactNode;
  /** テスト用：初期データを明示的に指定（localStorage を読みたくない場合）*/
  initialData?: PlayerData;
}

export function PlayerProvider({ children, initialData }: PlayerProviderProps) {
  const [data, dispatch] = useReducer(
    reducer,
    initialData ?? null,
    initialData ? () => initialData : initPlayerData,
  );

  // データ変更時に永続化
  useEffect(() => {
    savePlayerData(data);
  }, [data]);

  return (
    <PlayerContext.Provider value={{ data, dispatch }}>{children}</PlayerContext.Provider>
  );
}

/** Player Data を読み書きするためのフック */
export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within <PlayerProvider>");
  }
  return ctx;
}
