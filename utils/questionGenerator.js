// 题目自动生成器 — 从役种数据自动生成选择题
const yakus = require('../data/yakus');
const { generateHand } = require('./handGenerator');
const { checkAllYaku, normalizeYakuResult } = require('./yakuChecker');
const meldsUtil = require('./melds');

// ===== 题型1: 看牌猜役 =====

/**
 * 上下文排除规则 — 根据 contextHint 中的关键词，排除与之冲突的役种
 *
 * 原理：每个 contextHint 声明一个前提条件（如"已副露"→排除所有门清役种），
 *       排除那些在此前提下不可能成立的役种，避免歧义错误选项。
 */
const CONTEXT_EXCLUDE = {
  // 状态排除
  '已副露': [
    'pinfu', 'riichi', 'ippatsu', 'mentsumo', 'iipeikou',
    'chiitoitsu', 'double_riichi', 'ryanpeikou',
    'suuankou', 'kokushi_musou', 'chuuren_poutou',
    'tenhou', 'chiihou',
    'suuankou_tanki', 'kokushi_musou_13men', 'junsei_chuuren_poutou'
  ],
  '未立直': ['riichi', 'ippatsu', 'double_riichi'],
  '荣和': ['mentsumo'],  // 栄和排除门清自摸

  // 特殊役种排除
  '一巡内': ['riichi', 'double_riichi'],  // 一発的标识：一巡内 → 排除普通立直/両立直
  '第一巡': ['riichi', 'ippatsu'],         // 両立直的标识 → 排除普通立直/一発
  '海底': ['houtei'],                       // 海底摸月 → 排除河底捞鱼
  '河底': ['haitei'],                       // 河底捞鱼 → 排除海底摸月
  '岭上': ['haitei', 'houtei'],            // 岭上开花 → 排除海底/河底
  '抢槓': ['haitei', 'houtei', 'rinshan_kaihou'],  // 抢槓 → 排除特殊和牌方式

  // 门清特殊役种互相排除
  '已宣言立直': ['pinfu', 'mentsumo'],     // 立直后不是平和/门清自摸（立直本身涵盖）
  '七对子形': ['pinfu', 'toitoiho', 'iipeikou', 'ryanpeikou'],  // 七对子 → 排除牌型冲突的
  '九莲宝灯形': ['pinfu', 'tanyao', 'chiitoitsu', 'toitoiho']   // 九莲 → 排除牌型冲突的
};

// 目标役种必然或高度可能复合的役，不能作为“错误选项”。
const IMPLIED_OPTION_EXCLUDE = {
  'shousangen': ['yakuhai'],
  'daisangen': ['yakuhai'],
  'shousuushii': ['yakuhai'],
  'daisuushii': ['yakuhai'],
  'honroutou': ['toitoiho', 'chiitoitsu'],
  'chinroutou': ['toitoiho'],
  'tsuuiisou': ['toitoiho', 'honroutou', 'yakuhai'],
  'suuankou': ['toitoiho', 'sanankou', 'mentsumo'],
  'suuankou_tanki': ['suuankou', 'toitoiho', 'sanankou'],
  'toitoiho': ['suuankou', 'suuankou_tanki'],
  'pinfu': ['iipeikou', 'ryanpeikou'],
  'iipeikou': ['pinfu'],
  'ryanpeikou': ['iipeikou', 'pinfu'],
  'junsei_chuuren_poutou': ['chuuren_poutou']
};

function inferOptionExcludesFromTiles(tiles) {
  const counts = {};
  const suits = new Set();
  let hasHonor = false;
  let hasSimple = false;
  let hasTerminal = false;

  for (const tile of tiles) {
    counts[tile] = (counts[tile] || 0) + 1;
    const num = parseInt(tile[0], 10);
    const suit = tile[1];
    if (suit === 'z') {
      hasHonor = true;
    } else {
      suits.add(suit);
      if (num === 1 || num === 9) {
        hasTerminal = true;
      } else {
        hasSimple = true;
      }
    }
  }

  const ids = [];
  const countValues = Object.values(counts);
  const tripletCount = countValues.filter(c => c >= 3).length;
  const pairCount = countValues.filter(c => c >= 2).length;

  if (!hasHonor && hasSimple && !hasTerminal) ids.push('tanyao');
  if (!hasHonor && suits.size === 1) ids.push('chinitsu');
  if (hasHonor && suits.size === 1) ids.push('honitsu');
  if (hasHonor && suits.size === 0) ids.push('tsuuiisou');
  if (!hasSimple && hasTerminal && !hasHonor) ids.push('chinroutou', 'toitoiho');
  if (!hasSimple && (hasTerminal || hasHonor)) ids.push('honroutou');
  if (tripletCount >= 4 && pairCount >= 1) ids.push('toitoiho', 'suuankou');
  if (['5z', '6z', '7z'].some(t => counts[t] >= 3)) ids.push('yakuhai');

  return ids;
}

/**
 * 为一个役种生成「看牌猜役」题
 * 使用算法生成器实时构造随机手牌，附带 contextHint 来排除歧义
 */
function generateTileQuestion(yaku, allYakus, variant) {
  // 跳过不生成看牌题的役种
  if (yaku.skipTileQuestion) {
    return null;
  }

  // 调用手牌生成器获取随机手牌
  const v = variant || 0;
  const hand = generateHand(yaku.id, v);
  if (!hand || !hand.tiles || hand.tiles.length === 0) {
    return null;
  }

  const hint = hand.contextHint || '';

  // 根据 contextHint 计算应该排除的役种ID
  const excludeIds = new Set();
  excludeIds.add(yaku.id);  // 排除自身
  (IMPLIED_OPTION_EXCLUDE[yaku.id] || []).forEach(id => excludeIds.add(id));
  (hand.excludeOptionIds || []).forEach(id => excludeIds.add(id));
  inferOptionExcludesFromTiles(hand.tiles).forEach(id => excludeIds.add(id));

  for (const [keyword, ids] of Object.entries(CONTEXT_EXCLUDE)) {
    if (hint.includes(keyword)) {
      ids.forEach(id => excludeIds.add(id));
    }
  }

  // 役种判定引擎：找出该手牌实际成立的全部役种，排除出错误选项
  const allSatisfied = checkAllYaku(hand.tiles, {
    winTile: hand.winTile || '',
    contextHint: hint
  });
  const normalizedSatisfied = normalizeYakuResult(allSatisfied).ids;
  if (!normalizedSatisfied.includes(yaku.id)) {
    return null;
  }
  allSatisfied.forEach(id => excludeIds.add(id));

  // 从所有役种中筛选可作为错误选项的
  let wrongPool = allYakus
    .filter(y => !excludeIds.has(y.id))
    .map(y => y.name);

  // 确保至少有3个不同的错误选项
  if (wrongPool.length < 3) {
    const minimalExclude = new Set([yaku.id]);
    wrongPool = allYakus
      .filter(y => !minimalExclude.has(y.id))
      .map(y => y.name);
  }

  const uniqueWrong = [...new Set(wrongPool)];
  const options = shuffle([yaku.name, ...pickRandom(uniqueWrong, 3)]);

  // 生成解释文本：展示此手牌成立的全部役种
  const satisfiedNames = allSatisfied
    .map(id => allYakus.find(y => y.id === id))
    .filter(Boolean)
    .map(y => y.name + '（' + y.nameJa + '）');
  let explanation = yaku.name + '（' + yaku.nameJa + '）' + '：' + yaku.description;
  if (hint) {
    explanation += ' 前提：' + hint + '。';
  }
  if (satisfiedNames.length > 1) {
    explanation += ' 此手牌还含有：' + satisfiedNames.filter(n => !n.startsWith(yaku.name)).join('、') + '。';
  }

  // 从生成器的 groups/pair 推导 melds/concealedTiles
  var questionMelds = [];
  var questionConcealed = hand.tiles.slice();
  var handHasOpen = hint.indexOf('已副露') !== -1;
  if (hand.groups && hand.pair && handHasOpen) {
    var shape = meldsUtil.normalizeHandShape(
      hand.groups, hand.pair, handHasOpen
    );
    questionMelds = shape.melds || [];
    questionConcealed = shape.concealedTiles || hand.tiles.slice();
  }

  return {
    id: 'auto_' + yaku.id + '_tile_v' + v,
    type: 'tiles-to-yaku',
    yakuId: yaku.id,
    tiles: hand.tiles,
    winTile: hand.winTile || '',
    melds: questionMelds,
    concealedTiles: questionConcealed,
    context: hint,
    options,
    answer: options.indexOf(yaku.name),
    explanation
  };
}

// ===== 题型2: 看定义选条件 =====

/**
 * 为一个役种生成「看定义选条件」题
 * 每道题：从该役种的 conditions 中选 1 条正确条件，
 * 从其他役种选 3 条「不适用于该役种」的条件作为错误选项
 */
function generateConditionQuestions(yaku, otherYakus, questionsPerYaku) {
  const questions = [];

  // 每个役种最多生成 questionsPerYaku 道条件题（不超过自身条件数）
  const count = Math.min(questionsPerYaku, yaku.conditions.length);

  for (let i = 0; i < count; i++) {
    const correctCondition = yaku.conditions[i];

    // 从其他役种收集所有候选错误条件，排除有歧义的
    const badPool = [];
    for (const other of otherYakus) {
      for (const cond of other.conditions) {
        if (!isAmbiguous(cond, yaku) && !isConditionTrueForYaku(cond, yaku) && cond !== correctCondition) {
          badPool.push(cond);
        }
      }
    }

    // 去重（多个役种可能有相同或相似的condition）
    const uniqueBadPool = [...new Set(badPool)];

    // 确保至少有3个不同的错误选项
    let wrongOptions;
    if (uniqueBadPool.length >= 3) {
      wrongOptions = pickRandom(uniqueBadPool, 3);
    } else {
      // 兜底：放宽过滤限制，使用所有其他条件
      const allOther = [];
      for (const other of otherYakus) {
        for (const cond of other.conditions) {
          allOther.push(cond);
        }
      }
      const deduped = [...new Set(allOther.filter(c => c !== correctCondition))];
      wrongOptions = pickRandom(deduped, 3);
    }

    // 再次确保不含正确答案且无重复
    const finalWrong = [...new Set(wrongOptions.filter(w => w !== correctCondition))];
    const allOptions = shuffle([correctCondition, ...finalWrong.slice(0, 3)]);

    questions.push({
      id: 'auto_' + yaku.id + '_cond' + i,
      type: 'def-to-condition',
      yakuId: yaku.id,
      question: '以下哪项是' + yaku.name + '（' + yaku.nameJa + '）的正确条件？',
      options: allOptions,
      answer: allOptions.indexOf(correctCondition),
      explanation: yaku.name + '的条件：' + yaku.conditions.join('；') + '。'
    });
  }

  return questions;
}

// ===== 歧义检测 =====

/**
 * 关键特征词组 — 用于判定两个条件是否可能「重叠」
 * 若 candidate 与 target 的任一条件共享同一特征词组，
 * 则认为 candidate 可能是 target 的有效条件（产生歧义），排除
 */
const AMBIGUITY_GROUPS = [
  // 门前清/副露相关
  ['门前清', '门清', '副露', '食替', '不能副露'],
  // 牌型结构
  ['刻子', '槓子', '顺子', '雀头', '暗刻'],
  // 和牌方式
  ['自摸', '荣和', '和牌'],
  // 听牌
  ['两面听', '听牌', '听牌状态', '单骑'],
  // 役牌特有
  ['三元牌', '场风', '自风', '风牌'],
  // 幺九/老头相关
  ['幺九', '老头牌', '字牌', '数牌', '2～8', '1、9'],
  // 立直特有
  ['立直棒', '1000点', '立直宣言', '宣言立直', '立直'],
  // 一発特有
  ['一巡内', '一巡'],
  // 宝牌
  ['宝牌'],
  // 手牌限制
  ['手牌不能再改变'],
  // 花色相关
  ['数牌', '一种花色', '三种花色', '同种', '万字', '筒子', '索子'],
  // 槓相关
  ['开槓', '加槓', '明槓', '暗槓', '大明槓'],
  // 牌型特定
  ['顺子', '对子', '刻子'],
  // 点数/符
  ['25符', '符数'],
  // 役满特定
  ['役满'],
  // 时机/巡
  ['第一巡', '配牌', '牌山', '剩下', '最后一张'],
  // 流局
  ['流局', '荒牌']
];

/**
 * 判断一条候选项（来自其他役种的条件）是否对 target 役种有歧义
 * 核心原则: 若 candidate 描述的情况对 target 也成立，则不能当错误选项
 */
function isAmbiguous(candidate, targetYaku) {
  const targetConditions = targetYaku.conditions;

  // 规则0: candidate 与 target 任一条件相同或互为子串 → 必定歧义
  const duplicateOrSubset = targetConditions.some(cond =>
    cond === candidate || cond.includes(candidate) || candidate.includes(cond)
  );
  if (duplicateOrSubset) {
    return true;
  }

  // 规则1: candidate 直接提到了 target 役种名 → 歧义
  if (candidate.includes(targetYaku.name)) {
    return true;
  }

  // 规则2: 检查特征词组重叠
  for (const group of AMBIGUITY_GROUPS) {
    const candidateHasGroup = group.some(term => candidate.includes(term));
    if (!candidateHasGroup) continue;

    // candidate 包含了该组的某个词，检查 target 是否也包含该组的任何词
    const targetHasGroup = targetConditions.some(cond =>
      group.some(term => cond.includes(term))
    );

    if (targetHasGroup) {
      // candidate 和 target 共享同一特征词组 → 可能歧义
      // 需要进一步判断：target 是否明确「否定」该词

      const targetNegatesSharedTerm = targetConditions.some(cond => {
        return group.some(term => {
          if (!cond.includes(term)) return false;
          // 检查否定词是否直接修饰该 term
          const idx = cond.indexOf(term);
          const prefix = cond.substring(Math.max(0, idx - 4), idx);
          return /不能|不含|不可|不是|并非|没有/.test(prefix);
        });
      });

      if (!targetNegatesSharedTerm) {
        // target 没有否定该特征 → candidate 描述的情况 target 也可能满足 → 歧义
        return true;
      }
      // target 明确否定该特征 → candidate 要求该特征 = 对 target 来说是错的 → 安全
    }
  }

  return false; // 安全
}

// ===== 事实标签系统 =====

/**
 * 从条件文案中解析出其所断言的事实标签
 * 返回 { winMethods?, requiresMenzen?, kuisagari? } 或 null
 */
function parseConditionFacts(condition) {
  const facts = {};

  // 和牌方式断言
  if (/自摸或荣和均可|和牌方式无要求|自摸或荣和均可成立/.test(condition)) {
    facts.winMethods = ['tsumo', 'ron'];
  } else if (/必须自摸|不能.*荣和|自摸方式|自摸成立|必须自摸(?!.*荣和)/.test(condition) &&
             !/自摸或荣和均可|荣和.*自摸|自摸或荣和/.test(condition)) {
    facts.winMethods = ['tsumo'];
  } else if (/(?:荣和方式|以荣和|必须荣和|别家.*荣和|栄和)/.test(condition) &&
             !/自摸/.test(condition) && !/荣和.*自摸|自摸.*荣和/.test(condition)) {
    facts.winMethods = ['ron'];
  }

  // 门前清断言
  if (/必须门前清|不能副露|不可副露/.test(condition) && !/不要求门前清/.test(condition)) {
    facts.requiresMenzen = true;
  } else if (/不要求门前清/.test(condition)) {
    facts.requiresMenzen = false;
  } else if (/可副露/.test(condition) && !/不[可能]副露/.test(condition)) {
    facts.requiresMenzen = false;
  }

  // 食下断言
  if (/副露后降|食下/.test(condition)) {
    facts.kuisagari = true;
  }

  return Object.keys(facts).length > 0 ? facts : null;
}

/**
 * 判断条件文案是否对目标役种也成立（即不能作为错误选项）
 * 核心原则: 若 candidate 描述的事实对 targetYaku 也为真，则 candidate 不能当错误选项。
 */
function isConditionTrueForYaku(conditionText, targetYaku) {
  const yakuFacts = targetYaku.facts;
  if (!yakuFacts) return false;

  const condFacts = parseConditionFacts(conditionText);
  if (!condFacts) return false;

  for (const [key, condValue] of Object.entries(condFacts)) {
    const yakuValue = yakuFacts[key];
    if (yakuValue === undefined) continue;

    if (key === 'winMethods') {
      const condSet = new Set(condValue);
      const yakuSet = new Set(yakuValue);
      // 候选条件的和牌方式集合必须与目标役种完全一致，否则该条件对目标役种不成立
      if (condSet.size === yakuSet.size && [...condSet].every(m => yakuSet.has(m))) return true;
    } else {
      // 布尔类型事实：值相同即条件对目标役种也成立
      if (condValue === yakuValue) return true;
    }
  }

  return false;
}

// ===== 工具函数 =====

function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom(arr, n) {
  return shuffle([...arr]).slice(0, Math.min(n, arr.length));
}

// ===== 主入口 =====

/**
 * 生成全部自动题
 * @param {Object} options — { variantsPerYaku: number }
 */
function generateAllQuestions(options) {
  const opts = options || {};
  const variantsPerYaku = opts.variantsPerYaku || 5;
  const questions = [];

  for (const yaku of yakus) {
    // 题型1: 每个役种 N 道看牌猜役（跳过 skipTileQuestion 的役种）
    if (!yaku.skipTileQuestion) {
      for (let v = 0; v < variantsPerYaku; v++) {
        const tileQ = generateTileQuestion(yaku, yakus, v);
        if (tileQ) {
          questions.push(tileQ);
        }
      }
    }

    // 题型2: 每个役种最多 3 道看定义选条件
    const condQs = generateConditionQuestions(yaku, yakus.filter(y => y.id !== yaku.id), 3);
    questions.push(...condQs);
  }

  return questions;
}

/**
 * 仅生成指定役种的题目
 */
function generateQuestionsForYaku(yakuId, options) {
  const yaku = yakus.find(y => y.id === yakuId);
  if (!yaku) return [];

  const opts = options || {};
  const variantsPerYaku = opts.variantsPerYaku || 5;

  const others = yakus.filter(y => y.id !== yakuId);
  const questions = [];

  if (!yaku.skipTileQuestion) {
    for (let v = 0; v < variantsPerYaku; v++) {
      const tileQ = generateTileQuestion(yaku, yakus, v);
      if (tileQ) {
        questions.push(tileQ);
      }
    }
  }
  questions.push(...generateConditionQuestions(yaku, others, 3));

  return questions;
}

module.exports = {
  generateAllQuestions,
  generateQuestionsForYaku,
  // 暴露细粒度函数便于验证
  generateTileQuestion,
  generateConditionQuestions,
  isAmbiguous,
  parseConditionFacts,
  isConditionTrueForYaku,
  AMBIGUITY_GROUPS
};
