/**
 * 多言語辞書（M3-G-8）
 *
 * - 日本語（ja）と英語（en）の 2 言語をサポート（v1.0 スコープ）
 * - flat dictionary：1 つのキーが両言語の文字列を持つ
 * - キー命名：`namespace.id` 形式（"common.save"、"job.SWORDSMAN" 等）
 * - {placeholder} で文字列補間。t() がランタイムで置換
 */

export type Locale = "ja" | "en";
export const LOCALES = ["ja", "en"] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = "ja";

interface LocalizedString {
  ja: string;
  en: string;
}

// ============================================================================
// 辞書本体
// ============================================================================

export const STRINGS = {
  // ----- 共通 UI ----------------------------------------------------------
  "common.save": { ja: "保存", en: "Save" },
  "common.cancel": { ja: "キャンセル", en: "Cancel" },
  "common.back": { ja: "戻る", en: "Back" },
  "common.edit": { ja: "編集", en: "Edit" },
  "common.equip": { ja: "装備", en: "Equip" },
  "common.sortie": { ja: "出撃", en: "Sortie" },
  "common.skip": { ja: "スキップ", en: "Skip" },
  "common.next": { ja: "次へ", en: "Next" },
  "common.add": { ja: "追加", en: "Add" },
  "common.delete": { ja: "削除", en: "Delete" },
  "common.none": { ja: "なし", en: "None" },
  "common.preset": { ja: "プリセット", en: "Preset" },
  "common.loading": { ja: "読み込み中...", en: "Loading..." },

  // ----- ナビゲーション ----------------------------------------------------
  "nav.home": { ja: "ホーム", en: "Home" },
  "nav.party": { ja: "編成", en: "Party" },
  "nav.gambit": { ja: "ガンビット編集", en: "Gambit Editor" },
  "nav.battle": { ja: "戦闘", en: "Battle" },
  "nav.log": { ja: "ログ", en: "Log" },
  "nav.settings": { ja: "設定", en: "Settings" },

  // ----- 戦闘 -------------------------------------------------------------
  "battle.title": {
    ja: "戦闘（深度 {depth}）",
    en: "Battle (Depth {depth})",
  },
  "battle.party": { ja: "パーティ", en: "Party" },
  "battle.enemies": { ja: "敵", en: "Enemies" },
  "battle.turn": { ja: "ターン", en: "Turn" },
  "battle.preparing": { ja: "戦闘準備中...", en: "Preparing battle..." },
  "battle.victory": { ja: "勝利！", en: "Victory!" },
  "battle.defeat": { ja: "敗北...", en: "Defeat..." },
  "battle.timeout": { ja: "時間切れ", en: "Timeout" },
  "battle.turnsElapsed": {
    ja: "{turns} ターン経過 ・ 深度 {depth}",
    en: "{turns} turns elapsed · Depth {depth}",
  },
  "battle.nextDepthHint": {
    ja: "→ 次は深度 {depth}",
    en: "→ Next: Depth {depth}",
  },
  "battle.sortieDepth": {
    ja: "深度 {depth} へ出撃",
    en: "Sortie to Depth {depth}",
  },
  "battle.backHome": { ja: "ホームへ戻る", en: "Back to Home" },
  "battle.speed": { ja: "倍速", en: "Speed" },
  "battle.down": { ja: "戦闘不能", en: "Down" },
  "battle.notImplemented": {
    ja: "未実装：{actionType}",
    en: "Not implemented: {actionType}",
  },
  "battle.end": { ja: "戦闘終了", en: "Battle End" },

  // ----- パーティ画面 ------------------------------------------------------
  "party.title": { ja: "編成", en: "Party" },
  "party.equipment": { ja: "装備", en: "Equipment" },
  "party.weapon": { ja: "武器", en: "Weapon" },
  "party.armor": { ja: "防具", en: "Armor" },
  "party.sensor": { ja: "センサー", en: "Sensor" },
  "party.gambitRules": { ja: "ガンビット", en: "Gambit Rules" },
  "party.statChange": {
    ja: "ステータス変化（base → 装備後）",
    en: "Stat change (base → equipped)",
  },
  "party.changeEquipment": {
    ja: "装備変更：{name}",
    en: "Change equipment: {name}",
  },

  // ----- ホーム画面 --------------------------------------------------------
  "home.title": { ja: "ホーム", en: "Home" },
  "home.currentDepth": { ja: "現在深度", en: "Current Depth" },
  "home.maxDepth": { ja: "最深記録", en: "Max Depth" },
  "home.sortieToBattle": { ja: "出撃", en: "Sortie" },
  "home.sortieButton": {
    ja: "出撃（深度 {depth}）",
    en: "Sortie (Depth {depth})",
  },

  // ----- ガンビット編集 ----------------------------------------------------
  "gambit.title": { ja: "ガンビット編集", en: "Gambit Editor" },
  "gambit.ruleAdd": { ja: "ルール追加", en: "Add Rule" },
  "gambit.ruleEdit": { ja: "ルール編集", en: "Edit Rule" },
  "gambit.stepCondition": { ja: "条件", en: "Condition" },
  "gambit.stepTarget": { ja: "対象", en: "Target" },
  "gambit.stepAction": { ja: "行動", en: "Action" },
  "gambit.nextToTarget": { ja: "次へ（対象）", en: "Next (Target)" },
  "gambit.nextToAction": { ja: "次へ（行動）", en: "Next (Action)" },
  "gambit.enabled": { ja: "有効", en: "Enabled" },
  "gambit.disabled": { ja: "無効", en: "Disabled" },
  "gambit.moveUp": { ja: "上へ", en: "Move Up" },
  "gambit.moveDown": { ja: "下へ", en: "Move Down" },

  // ----- ログ画面 ----------------------------------------------------------
  "log.title": { ja: "ログ", en: "Log" },
  "log.empty": { ja: "まだ戦闘記録はありません", en: "No battles recorded yet" },
  "log.battleNumber": { ja: "戦闘 #{num}", en: "Battle #{num}" },
  "log.depth": { ja: "深度 {depth}", en: "Depth {depth}" },
  "log.turns": { ja: "{turns} ターン", en: "{turns} turns" },
  "log.winnerAlly": { ja: "勝利", en: "Victory" },
  "log.winnerEnemy": { ja: "敗北", en: "Defeat" },
  "log.winnerTimeout": { ja: "時間切れ", en: "Timeout" },

  // ----- 設定 -------------------------------------------------------------
  "settings.language": { ja: "言語", en: "Language" },
  "settings.ja": { ja: "日本語", en: "Japanese" },
  "settings.en": { ja: "英語", en: "English" },

  // ----- ジョブ -----------------------------------------------------------
  "job.SWORDSMAN": { ja: "剣士", en: "Swordsman" },
  "job.MAGE": { ja: "魔導士", en: "Mage" },
  "job.HEALER": { ja: "治癒士", en: "Healer" },

  // ----- 敵テンプレ -------------------------------------------------------
  "enemy.GOBLIN": { ja: "ゴブリン", en: "Goblin" },
  "enemy.WOLF": { ja: "ウルフ", en: "Wolf" },
  "enemy.BANDIT": { ja: "バンディット", en: "Bandit" },
  "enemy.SKELETON": { ja: "スケルトン", en: "Skeleton" },
  "enemy.GOLEM": { ja: "ゴーレム", en: "Golem" },
  "enemy.GOBLIN_KING": { ja: "ゴブリン王", en: "Goblin King" },
  "enemy.ORC": { ja: "オーク", en: "Orc" },
  "enemy.IMP": { ja: "インプ", en: "Imp" },
  "enemy.LICH": { ja: "リッチ", en: "Lich" },
  "enemy.TROLL": { ja: "トロール", en: "Troll" },
  "enemy.DARK_KNIGHT": { ja: "ダークナイト", en: "Dark Knight" },
  "enemy.TURTLE": { ja: "タートル", en: "Turtle" },
  "enemy.SLIME": { ja: "スライム", en: "Slime" },
  "enemy.PHANTOM": { ja: "ファントム", en: "Phantom" },
  "enemy.HARPY": { ja: "ハーピー", en: "Harpy" },
  "enemy.DEMON_LORD_MINION": { ja: "魔王の眷属", en: "Demon Lord's Minion" },
  "enemy.DARK_DRAGON": { ja: "暗黒竜", en: "Dark Dragon" },
  "enemy.NECROMANCER": { ja: "ネクロマンサー", en: "Necromancer" },
  "enemy.DEMON_LORD": { ja: "魔王", en: "Demon Lord" },

  // ----- 種族（EnemyType）-------------------------------------------------
  "enemyType.HUMANOID": { ja: "人型", en: "Humanoid" },
  "enemyType.BEAST": { ja: "獣", en: "Beast" },
  "enemyType.UNDEAD": { ja: "不死", en: "Undead" },
  "enemyType.MACHINE": { ja: "機械", en: "Machine" },
  "enemyType.MAGICAL": { ja: "魔生物", en: "Magical" },
  "enemyType.BOSS": { ja: "ボス", en: "Boss" },

  // ----- 属性 -------------------------------------------------------------
  "element.FIRE": { ja: "火", en: "Fire" },
  "element.ICE": { ja: "氷", en: "Ice" },
  "element.THUNDER": { ja: "雷", en: "Thunder" },
  "element.HOLY": { ja: "聖", en: "Holy" },
  "element.DARK": { ja: "闇", en: "Dark" },
  "element.NEUTRAL": { ja: "物理", en: "Physical" },

  // ----- 状態異常・バフ ---------------------------------------------------
  "status.PROTECT": { ja: "プロテス", en: "Protect" },
  "status.SHELL": { ja: "シェル", en: "Shell" },
  "status.REGEN": { ja: "リジェネ", en: "Regen" },
  "status.HASTE": { ja: "ヘイスト", en: "Haste" },
  "status.POISON": { ja: "毒", en: "Poison" },
  "status.SILENCE": { ja: "沈黙", en: "Silence" },
  "status.BLIND": { ja: "暗闇", en: "Blind" },
  "status.SLOW": { ja: "スロウ", en: "Slow" },
  // M3-G-19：未翻訳分（types.ts に定義はあるが辞書に無かった）
  "status.SLEEP": { ja: "睡眠", en: "Sleep" },
  "status.STUN": { ja: "スタン", en: "Stun" },
  "status.BERSERK": { ja: "バーサーク", en: "Berserk" },
  "status.BUFF_ATK": { ja: "攻撃強化", en: "Atk Up" },
  "status.BUFF_DEF": { ja: "防御強化", en: "Def Up" },
  "status.BUFF_MAG": { ja: "魔力強化", en: "Mag Up" },

  // ----- 武器 -------------------------------------------------------------
  "weapon.BRONZE_SWORD": { ja: "ブロンズソード", en: "Bronze Sword" },
  "weapon.IRON_SWORD": { ja: "アイアンソード", en: "Iron Sword" },
  "weapon.STEEL_SWORD": { ja: "スティールソード", en: "Steel Sword" },
  "weapon.MAGE_ROD": { ja: "魔導士のロッド", en: "Mage's Rod" },
  "weapon.FIRE_STAFF": { ja: "火炎の杖", en: "Fire Staff" },
  "weapon.CRYSTAL_STAFF": { ja: "クリスタルスタッフ", en: "Crystal Staff" },
  "weapon.HEALER_MACE": { ja: "治癒のメイス", en: "Healer's Mace" },
  "weapon.BLESSED_MACE": { ja: "祝福のメイス", en: "Blessed Mace" },
  "weapon.ANCIENT_MACE": { ja: "古代のメイス", en: "Ancient Mace" },

  // ----- 防具 -------------------------------------------------------------
  "armor.LEATHER_ARMOR": { ja: "レザーアーマー", en: "Leather Armor" },
  "armor.CHAIN_MAIL": { ja: "チェインメイル", en: "Chain Mail" },
  "armor.PLATE_MAIL": { ja: "プレートメイル", en: "Plate Mail" },
  "armor.MAGE_ROBE": { ja: "魔導士のローブ", en: "Mage's Robe" },
  "armor.WIZARD_CLOAK": { ja: "ウィザードクローク", en: "Wizard's Cloak" },
  "armor.ARCHWIZARD_ROBE": { ja: "大魔導士のローブ", en: "Archwizard's Robe" },
  "armor.PRIEST_VEST": { ja: "司祭の祭服", en: "Priest's Vest" },
  "armor.BISHOP_ROBE": { ja: "司教のローブ", en: "Bishop's Robe" },
  "armor.CARDINAL_GARB": { ja: "枢機卿の法衣", en: "Cardinal's Garb" },

  // ----- センサー ---------------------------------------------------------
  "sensor.HP_SCANNER": { ja: "HP スキャナー", en: "HP Scanner" },
  "sensor.STATUS_DETECTOR": { ja: "状態検知センサー", en: "Status Detector" },
  "sensor.ELEMENT_ANALYZER": { ja: "属性アナライザー", en: "Element Analyzer" },
  "sensor.BASIC_SCANNER": { ja: "基礎スキャナー", en: "Basic Scanner" },

  // ----- アイテム ---------------------------------------------------------
  "item.POTION": { ja: "ポーション", en: "Potion" },
  "item.HI_POTION": { ja: "ハイポーション", en: "Hi-Potion" },
  "item.ETHER": { ja: "エーテル", en: "Ether" },
  "item.ANTIDOTE": { ja: "毒消し", en: "Antidote" },
  "item.EYE_DROPS": { ja: "目薬", en: "Eye Drops" },
  "item.ECHO_HERB": { ja: "やまびこ草", en: "Echo Herb" },
  "item.PHOENIX_DOWN": { ja: "フェニックスの尾", en: "Phoenix Down" },

  // ----- 魔法（攻撃）-----------------------------------------------------
  "spell.FIRE": { ja: "ファイア", en: "Fire" },
  "spell.FIRA": { ja: "ファイラ", en: "Fira" },
  "spell.BLIZZARD": { ja: "ブリザド", en: "Blizzard" },
  "spell.BLIZZARA": { ja: "ブリザラ", en: "Blizzara" },
  "spell.THUNDER": { ja: "サンダー", en: "Thunder" },
  "spell.THUNDARA": { ja: "サンダラ", en: "Thundara" },
  "spell.HOLY_BOLT": { ja: "ホーリーボルト", en: "Holy Bolt" },
  "spell.DARK_BOLT": { ja: "ダークボルト", en: "Dark Bolt" },

  // ----- 魔法（回復・蘇生）-----------------------------------------------
  "spell.CURE": { ja: "ケアル", en: "Cure" },
  "spell.CURA": { ja: "ケアルラ", en: "Cura" },
  "spell.CURAGA": { ja: "ケアルガ", en: "Curaga" },
  "spell.CURE_ALL": { ja: "ケアルオール", en: "Cure All" },
  "spell.RAISE": { ja: "レイズ", en: "Raise" },

  // ----- スキル -----------------------------------------------------------
  "skill.POWER_SLASH": { ja: "パワースラッシュ", en: "Power Slash" },
  "skill.GUARD_BREAK": { ja: "ガードブレイク", en: "Guard Break" },
  "skill.WHIRLWIND": { ja: "ホワールウィンド", en: "Whirlwind" },

  // ----- 行動タイプ（戦闘ログ表示用）-------------------------------------
  "action.ATTACK": { ja: "攻撃", en: "Attack" },
  "action.DEFEND": { ja: "防御", en: "Defend" },
  "action.WAIT": { ja: "待機", en: "Wait" },
  "action.SKILL": { ja: "スキル", en: "Skill" },
  "action.CAST_HEAL": { ja: "回復魔法", en: "Heal Magic" },
  "action.CAST_OFFENSE": { ja: "攻撃魔法", en: "Offense Magic" },
  "action.CAST_BUFF": { ja: "強化魔法", en: "Buff Magic" },
  "action.CAST_DEBUFF": { ja: "弱体魔法", en: "Debuff Magic" },
  "action.CAST_CURE_STATUS": { ja: "状態回復", en: "Cure Status" },
  "action.CAST_REVIVE": { ja: "蘇生魔法", en: "Revive Magic" },
  "action.USE_ITEM": { ja: "アイテム使用", en: "Use Item" },
  "action.CHARGE": { ja: "ためる", en: "Charge" },
  "action.CHAIN": { ja: "追撃", en: "Chain" },
  "action.PROVOKE": { ja: "挑発", en: "Provoke" },
  "action.INTERPOSE": { ja: "かばう", en: "Interpose" },

  // ----- ガンビット条件タイプ ----------------------------------------------
  "condition.SELF_HP_LT": { ja: "自分の HP < {value}%", en: "Self HP < {value}%" },
  "condition.SELF_HP_GTE": { ja: "自分の HP ≥ {value}%", en: "Self HP ≥ {value}%" },
  "condition.SELF_MP_LT": { ja: "自分の MP < {value}%", en: "Self MP < {value}%" },
  "condition.SELF_MP_GTE": { ja: "自分の MP ≥ {value}%", en: "Self MP ≥ {value}%" },
  "condition.SELF_HAS_STATUS": { ja: "自分が {status}", en: "Self has {status}" },
  "condition.SELF_NO_STATUS": { ja: "自分が {status} ではない", en: "Self lacks {status}" },
  "condition.ALLY_HP_LT": { ja: "味方の HP < {value}%", en: "Ally HP < {value}%" },
  "condition.ALLY_HP_GTE": { ja: "味方の HP ≥ {value}%", en: "Ally HP ≥ {value}%" },
  "condition.ALLY_MP_LT": { ja: "味方の MP < {value}%", en: "Ally MP < {value}%" },
  "condition.ALLY_MP_GTE": { ja: "味方の MP ≥ {value}%", en: "Ally MP ≥ {value}%" },
  "condition.ALLY_HAS_STATUS": { ja: "味方が {status}", en: "Ally has {status}" },
  "condition.ALLY_DEAD": { ja: "戦闘不能の味方", en: "Dead ally" },
  "condition.ALLY_TARGETED": { ja: "狙われている味方", en: "Targeted ally" },
  "condition.ENEMY_EXISTS": { ja: "敵がいる", en: "Enemy exists" },
  "condition.ENEMY_LOWEST_HP": { ja: "HP 最低の敵", en: "Lowest HP enemy" },
  "condition.ENEMY_HIGHEST_HP": { ja: "HP 最高の敵", en: "Highest HP enemy" },
  "condition.ENEMY_HAS_STATUS": { ja: "{status} の敵", en: "Enemy with {status}" },
  "condition.ENEMY_NO_STATUS": { ja: "{status} でない敵", en: "Enemy without {status}" },
  "condition.ENEMY_WEAK_TO": { ja: "{element} 弱点の敵", en: "Enemy weak to {element}" },
  "condition.ENEMY_TYPE": { ja: "{enemyType} 系の敵", en: "{enemyType}-type enemy" },
  "condition.BOSS_PRESENT": { ja: "ボスがいる", en: "Boss present" },

  // ----- ガンビット条件タイプ：選択ボタン用の短縮ラベル（プレースホルダーなし）-----
  "conditionLabel.SELF_HP_LT": { ja: "自分のHP低下", en: "Self HP low" },
  "conditionLabel.SELF_HP_GTE": { ja: "自分のHP残量", en: "Self HP high" },
  "conditionLabel.SELF_MP_LT": { ja: "自分のMP低下", en: "Self MP low" },
  "conditionLabel.SELF_MP_GTE": { ja: "自分のMP残量", en: "Self MP high" },
  "conditionLabel.SELF_HAS_STATUS": { ja: "自分が状態異常", en: "Self has status" },
  "conditionLabel.SELF_NO_STATUS": { ja: "自分は状態異常でない", en: "Self lacks status" },
  "conditionLabel.ALLY_HP_LT": { ja: "味方のHP低下", en: "Ally HP low" },
  "conditionLabel.ALLY_HP_GTE": { ja: "味方のHP残量", en: "Ally HP high" },
  "conditionLabel.ALLY_MP_LT": { ja: "味方のMP低下", en: "Ally MP low" },
  "conditionLabel.ALLY_MP_GTE": { ja: "味方のMP残量", en: "Ally MP high" },
  "conditionLabel.ALLY_HAS_STATUS": { ja: "味方が状態異常", en: "Ally has status" },
  "conditionLabel.ALLY_DEAD": { ja: "戦闘不能の味方", en: "Dead ally" },
  "conditionLabel.ALLY_TARGETED": { ja: "狙われている味方", en: "Targeted ally" },
  "conditionLabel.ENEMY_EXISTS": { ja: "敵がいる", en: "Enemy exists" },
  "conditionLabel.ENEMY_LOWEST_HP": { ja: "HP最低の敵", en: "Lowest HP enemy" },
  "conditionLabel.ENEMY_HIGHEST_HP": { ja: "HP最高の敵", en: "Highest HP enemy" },
  "conditionLabel.ENEMY_HAS_STATUS": { ja: "状態異常の敵", en: "Enemy with status" },
  "conditionLabel.ENEMY_NO_STATUS": { ja: "状態異常でない敵", en: "Enemy without status" },
  "conditionLabel.ENEMY_WEAK_TO": { ja: "弱点属性の敵", en: "Weakness-matched enemy" },
  "conditionLabel.ENEMY_TYPE": { ja: "指定種族の敵", en: "Type-matched enemy" },
  "conditionLabel.BOSS_PRESENT": { ja: "ボスがいる", en: "Boss present" },

  // ----- ガンビット対象タイプ ----------------------------------------------
  "target.SELF": { ja: "自分", en: "Self" },
  "target.ALLY_MATCH": { ja: "条件で選んだ味方", en: "Matched ally" },
  "target.ALLY_LOWEST_HP": { ja: "HP 最低の味方", en: "Lowest HP ally" },
  "target.ALLY_ALL": { ja: "味方全体", en: "All allies" },
  "target.ENEMY_MATCH": { ja: "条件で選んだ敵", en: "Matched enemy" },
  "target.ENEMY_ALL": { ja: "敵全体", en: "All enemies" },
} as const satisfies Record<string, LocalizedString>;

export type StringKey = keyof typeof STRINGS;

// ============================================================================
// 翻訳ヘルパ
// ============================================================================

/**
 * 文字列を翻訳。{placeholder} は params で置換される。
 * 未知のキーはキー文字列をそのまま返す（フォールバック）。
 */
export function translate(
  key: StringKey,
  locale: Locale,
  params?: Record<string, string | number>,
): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  // `as const satisfies` でリテラル型になっているため、変数は string 型に明示する
  let text: string = entry[locale] ?? entry.ja ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}
