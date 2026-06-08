/**
 * 戦闘ランタイムの型定義（M1 暫定版）
 *
 * - 関連仕様: docs/m1_checklist.md §2、docs/gambit_dsl_spec.md §2.3 疑似コード
 * - 正式な data_schema.md は M2 以降で作成する。M1 はここに必要分だけを置く。
 *
 * 設計メモ：
 * - `Unit` は味方・敵を統合した型（同じ評価器で両陣営を回すため）。
 * - 敵専用に見える `weaknesses` / `enemyType` / `isBoss` も `Unit` の必須プロパティに置いた。
 *   味方は `weaknesses: []`, `enemyType: "HUMANOID"`, `isBoss: false` をデフォルトとする。
 *   こうしておくと、敵が actor のときも `ENEMY_*` 条件を対称に評価できる。
 */

import type { Element, EnemyType, GambitSet, ItemId, Status } from "../gambit/types";

/** v1.0 で実装するジョブ（M1 は SWORDSMAN のみ）*/
export type JobId = "SWORDSMAN" | "MAGE" | "HEALER";

export const JOB_IDS = ["SWORDSMAN", "MAGE", "HEALER"] as const satisfies readonly JobId[];

/** 戦闘に参加する1キャラクター。味方・敵で同一の型を使う */
export interface Unit {
  /** ユニット ID（"ally_1", "enemy_goblin_1" など）*/
  id: string;
  /** 表示名 */
  name: string;
  /** ジョブ */
  jobId: JobId;

  // -- 体力・行動値 --
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;

  // -- 戦闘パラメータ --
  /** 物理攻撃 */
  atk: number;
  /** 物理防御 */
  def: number;
  /** 魔力（M1 未使用、M2 以降で魔法ダメ計算に使う）*/
  mag: number;

  // -- 状態 --
  /** 付与中の状態異常／バフ（重複を許容しない実装を想定）*/
  statuses: Status[];
  /** 各 Status の残ターン数。0 になると statuses からも除外される */
  statusDurations: Partial<Record<Status, number>>;

  // -- 陣営 --
  /** true: プレイヤー側、false: 敵側 */
  isAlly: boolean;
  /** false になったら戦闘不能。HP 0 と連動 */
  isAlive: boolean;

  // -- 種族・属性（味方も持つ。デフォルト値ありで対称化）--
  /** 弱点属性（味方は通常 []） */
  weaknesses: Element[];
  /** 種族。味方は通常 "HUMANOID"。フィールド名は DSL の `EnemyType` を踏襲 */
  enemyType: EnemyType;
  /** ボスフラグ。味方は常に false */
  isBoss: boolean;

  // -- ガンビット --
  gambitSet: GambitSet;

  // -- インベントリ（M1 は POTION 数個のみ）--
  inventory: Partial<Record<ItemId, number>>;

  // -- 装備（M3-C 以降）。空オブジェクトがデフォルト --
  equipment: import("../data/equipment").Equipment;
}

/** Enemy は意味的なエイリアス。型構造としては Unit と同じ */
export type Enemy = Unit;

/** 戦闘状態のスナップショット。各ターンの開始時点を保持する */
export interface BattleState {
  /** 1 開始のターン番号 */
  turn: number;
  /** 味方ユニット（戦闘不能でも配列には残る）*/
  allies: Unit[];
  /** 敵ユニット */
  enemies: Unit[];
  /** ターンごとに積まれていく出来事ログ */
  log: BattleEvent[];
  /** 敵から狙われている味方の ID 集合（ALLY_TARGETED 条件で参照）*/
  targetedAllyIds: string[];
  /** 当ターン DEFEND 状態のユニット ID 集合。ターン開始時にクリア */
  defendingThisTurn: Set<string>;

  // --- M3-A 追加 ---
  /** CHARGE 中のユニット ID 集合（次の ATTACK で 1.5x） */
  chargedUnitIds: Set<string>;
  /**
   * 同ターン直前に攻撃を受けたユニット ID（CHAIN の対象解決に使用）。
   * ターン開始時に null クリア
   */
  lastUnitAttackedThisTurn: string | null;
  /** PROVOKE 中のユニット ID → 残りターン数（status duration と同じ tick 方式） */
  provokeDurations: Map<string, number>;
  /** INTERPOSE: 守られている味方 ID → 守る味方 ID（単発、当ターンのみ） */
  interposingFor: Map<string, string>;

  // --- M3-B 追加 ---
  /**
   * 確率判定用 RNG（0〜1）。
   * 省略時は「常に成功」扱い（BLIND は当たる、センサーは見える）。
   * テストで決定的な挙動が必要なときに固定値を返す関数を注入する。
   */
  rng?: () => number;
}

/** 戦闘ログの 1 イベント。後段の表示・テスト・リプレイで使う */
export type BattleEvent =
  | { kind: "TURN_START"; turn: number }
  | {
      kind: "ACTION";
      actorId: string;
      ruleId: string;
      actionType: string;
      targetIds: string[];
    }
  | { kind: "DAMAGE"; targetId: string; amount: number }
  | { kind: "HEAL"; targetId: string; amount: number }
  | { kind: "DOWN"; unitId: string }
  | { kind: "NOT_IMPLEMENTED"; actorId: string; actionType: string }
  | { kind: "BATTLE_END"; winner: "ALLY" | "ENEMY" | "TIMEOUT" };
