// 算分随机题生成器 — 从役种生成器实时构造算分题
// 采用"按目标役种生成 + 概率宝牌 + 模板兜底"策略

var hg = require('../../utils/handGenerator');
var builder = require('../../utils/scoreAnswerBuilder');
var sg = require('../../utils/scoreQuestionGenerator');
var dora = require('../../utils/dora');
var sc = require('../../utils/scoreCalculator');
var meldsUtil = require('../../utils/melds');

// 难度役种池（只包含有算法生成器的役种）
var BASIC_YAKU_POOL = [
  'tanyao', 'yakuhai', 'pinfu', 'chiitoitsu', 'riichi', 'mentsumo'
];

var ADVANCED_YAKU_POOL = [
  'tanyao', 'yakuhai', 'pinfu', 'chiitoitsu', 'riichi', 'mentsumo',
  'toitoiho', 'honitsu', 'ittsuu', 'sanshoku_doujun',
  'honchantaiyaochuu', 'sanankou', 'shousangen'
];

var MIXED_YAKU_POOL = [
  'tanyao', 'yakuhai', 'pinfu', 'chiitoitsu', 'riichi', 'mentsumo',
  'toitoiho', 'honitsu', 'chinitsu', 'ittsuu', 'sanshoku_doujun',
  'honchantaiyaochuu', 'junchan_taiyaochuu', 'sanankou', 'shousangen',
  'ryanpeikou', 'sanshoku_doukou', 'honroutou',
  'daisangen', 'shousuushii', 'tsuuiisou', 'ryuuiisou', 'chinroutou',
  'chuuren_poutou', 'suuankou', 'kokushi_musou'
];

var MENZEN_TARGET_YAKU = {
  chiitoitsu: true,
  riichi: true,
  double_riichi: true,
  mentsumo: true,
  ippatsu: true,
  iipeikou: true,
  ryanpeikou: true,
  pinfu: true,
  suuankou: true,
  suuankou_tanki: true,
  kokushi_musou: true,
  kokushi_musou_13men: true,
  chuuren_poutou: true,
  junsei_chuuren_poutou: true
};

// 上下文概率配置
var CONTEXT_PROB = {
  basic: { ronRate: 0.70, childRate: 0.75, menzenRate: 0.80, riichiInMenzenRate: 0.55 },
  advanced: { ronRate: 0.60, childRate: 0.65, menzenRate: 0.60, riichiInMenzenRate: 0.45 },
  mixed: { ronRate: 0.55, childRate: 0.60, menzenRate: 0.55, riichiInMenzenRate: 0.40 }
};

// 宝牌概率配置
var DORA_PROB = {
  basic: { appearRate: 0.35, dist: [0.65, 0.25, 0.10], maxDora: 2 },
  advanced: { appearRate: 0.60, dist: [0.40, 0.25, 0.20, 0.10, 0.05], maxDora: 5 },
  mixed: { appearRate: 0.75, dist: [0.25, 0.20, 0.15, 0.15, 0.15, 0.10], maxDora: 8 }
};

// 赤五概率配置
var RED_DORA_RATE = {
  basic: 0.05,
  advanced: 0.15,
  mixed: 0.25
};

var URA_DORA_PROB = {
  basic: { appearRate: 0.20, dist: [0.80, 0.20], maxDora: 1 },
  advanced: { appearRate: 0.35, dist: [0.65, 0.25, 0.10], maxDora: 2 },
  mixed: { appearRate: 0.45, dist: [0.55, 0.25, 0.15, 0.05], maxDora: 3 }
};

function randomFloat() {
  return Math.random();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function windName(code) {
  var map = { '1z': '东', '2z': '南', '3z': '西', '4z': '北' };
  return map[code] || '';
}

function shuffle(arr) {
  var result = arr.slice();
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

/**
 * 根据概率分布随机选出宝牌数
 */
function pickDoraCount(dist) {
  var r = randomFloat();
  var cumulative = 0;
  for (var i = 0; i < dist.length; i++) {
    cumulative += dist[i];
    if (r < cumulative) return i;
  }
  return dist.length - 1;
}

/**
 * 生成随机上下文
 */
function randomContext(difficulty) {
  var prob = CONTEXT_PROB[difficulty] || CONTEXT_PROB.basic;
  var isDealer = randomFloat() >= prob.childRate;
  var isMenzen = randomFloat() < prob.menzenRate;
  var hasOpenMeld = !isMenzen;
  var riichi = false;

  if (isMenzen && randomFloat() < prob.riichiInMenzenRate) {
    riichi = true;
  }

  // 自风: 庄家必须是东，子家不能是东
  var seatWind;
  if (isDealer) {
    seatWind = '1z';
  } else if (difficulty === 'basic') {
    seatWind = '2z';
  } else {
    seatWind = ['2z', '3z', '4z'][randomInt(0, 2)];
  }

  return {
    winMethod: randomFloat() < prob.ronRate ? 'ron' : 'tsumo',
    isDealer: isDealer,
    isMenzen: isMenzen,
    hasOpenMeld: hasOpenMeld,
    roundWind: '1z',
    seatWind: seatWind,
    riichi: riichi
  };
}

function replaceFirstTile(tiles, from, to) {
  var result = (tiles || []).slice();
  var idx = result.indexOf(from);
  if (idx >= 0) result[idx] = to;
  return result;
}

function replaceFirstTileInMelds(melds, from, to) {
  var replaced = false;
  return (melds || []).map(function (meld) {
    var next = {};
    var keys = Object.keys(meld);
    for (var k = 0; k < keys.length; k++) next[keys[k]] = meld[keys[k]];
    if (!replaced) {
      next.tiles = replaceFirstTile(meld.tiles || [], from, to);
      replaced = next.tiles.join('|') !== (meld.tiles || []).join('|');
    } else {
      next.tiles = (meld.tiles || []).slice();
    }
    return next;
  });
}

function applyRedReplacementToShape(concealedTiles, melds, from, to) {
  var nextConcealed = replaceFirstTile(concealedTiles || [], from, to);
  if (nextConcealed.join('|') !== (concealedTiles || []).join('|')) {
    return {
      concealedTiles: nextConcealed,
      melds: melds || []
    };
  }

  return {
    concealedTiles: concealedTiles || [],
    melds: replaceFirstTileInMelds(melds || [], from, to)
  };
}

/**
 * 尝试在手牌中替换赤五，同时返回替换信息供展示结构同步。
 */
function applyRedDora(tiles, redRate) {
  var original = tiles.slice();
  if (randomFloat() >= redRate) return { tiles: original, replacement: null };

  var result = original.slice();
  var redCandidates = [];

  for (var i = 0; i < result.length; i++) {
    var t = result[i];
    if (t === '5m' || t === '5p' || t === '5s') {
      redCandidates.push(i);
    }
  }

  if (redCandidates.length === 0) return { tiles: result, replacement: null };

  var idx = redCandidates[randomInt(0, redCandidates.length - 1)];
  var tile = result[idx];
  var redTile = '0' + tile[1];
  result[idx] = redTile;
  return {
    tiles: result,
    replacement: { from: tile, to: redTile }
  };
}

/**
 * 生成指示牌以达到目标宝牌数
 * makeIndicatorsForCount 内部已处理赤五扣除，此处直接透传
 */
function generateIndicators(tiles, desiredCount) {
  if (desiredCount <= 0) return [];
  return dora.makeSingleIndicatorForCount(tiles, desiredCount);
}

function generateUraIndicators(tiles, desiredCount) {
  if (desiredCount <= 0) return [];
  return dora.makeSingleIndicatorForCount(tiles, desiredCount, false);
}

function makeHanOptions(correctHan) {
  var pool = [1, 2, 3, 4, 5];
  if (correctHan >= 5) {
    pool = [correctHan - 2, correctHan - 1, correctHan, correctHan + 1, correctHan + 2]
      .filter(function (h) { return h > 0; });
  }
  if (correctHan >= 8) {
    pool = [correctHan - 3, correctHan - 2, correctHan - 1, correctHan, correctHan + 1]
      .filter(function (h) { return h > 0; });
  }
  if (correctHan >= 13) {
    pool = [11, 12, 13, 26, 39];
  }
  if (pool.indexOf(correctHan) === -1) pool.push(correctHan);
  return pool.sort(function (a, b) { return a - b; });
}

function makeFuOptions(correctFu) {
  var pool = [20, 25, 30, 40, 50];
  if (pool.indexOf(correctFu) === -1) pool.push(correctFu);
  return pool.sort(function (a, b) { return a - b; });
}

function makePointOptions(answer, context) {
  var correct = answer.pointText;
  var candidates = [];

  [20, 25, 30, 40, 50].filter(function (f) { return f !== answer.fu && f > 0; })
    .forEach(function (f) {
      try {
        var r = sc.calculatePoints({
          han: answer.han, fu: f,
          winMethod: context.winMethod, isDealer: context.isDealer
        });
        if (r.pointText !== correct && candidates.indexOf(r.pointText) === -1) {
          candidates.push(r.pointText);
        }
      } catch (e) {}
    });

  [answer.han - 1, answer.han + 1].forEach(function (h) {
    if (h <= 0) return;
    try {
      var r = sc.calculatePoints({
        han: h, fu: answer.fu,
        winMethod: context.winMethod, isDealer: context.isDealer
      });
      if (r.pointText !== correct && candidates.indexOf(r.pointText) === -1) {
        candidates.push(r.pointText);
      }
    } catch (e) {}
  });

  var distractors = candidates.slice(0, 3);
  var options = [correct].concat(distractors);
  var seen = {};
  options = options.filter(function (o) {
    if (seen[o]) return false;
    seen[o] = true;
    return true;
  });
  // 尝试更多候选避免重复
  if (options.length < 4) {
    [60, 70, 80, 25, 30, 40, 50].filter(function(f) { return f !== answer.fu && f > 0; })
      .forEach(function (f) {
        if (options.length >= 4) return;
        try {
          var er = sc.calculatePoints({
            han: answer.han, fu: f,
            winMethod: context.winMethod, isDealer: context.isDealer
          });
          if (options.indexOf(er.pointText) === -1) options.push(er.pointText);
        } catch (e) {}
      });
    [answer.han - 2, answer.han + 2].forEach(function (h) {
      if (h <= 0 || options.length >= 4) return;
      try {
        var er2 = sc.calculatePoints({
          han: h, fu: answer.fu,
          winMethod: context.winMethod, isDealer: context.isDealer
        });
        if (options.indexOf(er2.pointText) === -1) options.push(er2.pointText);
      } catch (e) {}
    });
  }
  // 仍不足时降级，不推重复按钮
  while (options.length < 4) {
    var fallback = '—';
    if (options.indexOf(fallback) === -1) {
      options.push(fallback);
    } else {
      break;
    }
  }
  return shuffle(options);
}

function makeOptions(answer, context) {
  return {
    han: makeHanOptions(answer.han),
    fu: makeFuOptions(answer.fu),
    points: makePointOptions(answer, context)
  };
}

/**
 * 单题构建：从手牌生成完整的算分题
 */
function buildQuestionFromHand(handTiles, winTile, context, difficulty, melds, concealedTiles) {
  // 尝试赤五替换
  var redRate = RED_DORA_RATE[difficulty] || 0;
  var redResult = applyRedDora(handTiles, redRate);
  var tiles = redResult.tiles;
  var displayShape = {
    concealedTiles: concealedTiles || tiles.slice(),
    melds: melds || []
  };
  if (redResult.replacement) {
    displayShape = applyRedReplacementToShape(
      displayShape.concealedTiles,
      displayShape.melds,
      redResult.replacement.from,
      redResult.replacement.to
    );
    if (winTile === redResult.replacement.from) {
      winTile = redResult.replacement.to;
    }
  }

  // 宝牌：分布已包含0枚概率，直接从分布采样
  var doraConfig = DORA_PROB[difficulty] || DORA_PROB.basic;
  var doraCount = pickDoraCount(doraConfig.dist);
  doraCount = Math.min(doraCount, doraConfig.maxDora);
  var doraIndicators = [];
  var uraDoraCount = 0;
  var uraDoraIndicators = [];

  if (doraCount > 0) {
    doraIndicators = generateIndicators(tiles, doraCount);
    // 用 countDora 核实实际宝牌数（赤五 + 指示牌），以实际为准
    doraCount = dora.countDora(tiles, doraIndicators, true);
  }

  if (context.riichi) {
    var uraConfig = URA_DORA_PROB[difficulty] || URA_DORA_PROB.basic;
    if (randomFloat() < uraConfig.appearRate) {
      uraDoraCount = pickDoraCount(uraConfig.dist);
      uraDoraCount = Math.min(uraDoraCount, uraConfig.maxDora);
      if (uraDoraCount > 0) {
        uraDoraIndicators = generateUraIndicators(tiles, uraDoraCount);
        uraDoraCount = dora.countDora(tiles, uraDoraIndicators, false);
      }
    }
  }

  // 构建答案
  var ctx = {};
  var keys = Object.keys(context);
  for (var ki = 0; ki < keys.length; ki++) { ctx[keys[ki]] = context[keys[ki]]; }
  ctx.doraIndicators = doraIndicators;
  ctx.uraDoraIndicators = uraDoraIndicators;
  ctx.winTile = winTile;
  ctx.melds = displayShape.melds;
  ctx.concealedTiles = displayShape.concealedTiles;

  var result = builder.buildAnswer(tiles, ctx);

  if (!result.valid) return null;

  var answer = result.answer;

  // 入门难度过滤：不超过4番（含宝牌）或恰为满贯教学题
  if (difficulty === 'basic') {
    if (answer.han > 4 && answer.han < 5) {
      // 4番以上但不到5番（即4番+非满贯）= 允许
    } else if (answer.han > 5) {
      return null; // 太高番，过滤
    }
    // 入门宝牌最多2
    if (answer.doraCount > 2) return null;
  }

  // 进阶过滤：避免役满
  if (difficulty === 'advanced' && answer.han >= 13) return null;

  // 过滤 yaku 过多导致解释过长的（入门最多4个役种，进阶6个）
  var yakuCount = answer.yaku.filter(function (y) {
    return y.id !== 'dora' && y.id !== 'ura_dora';
  }).length;
  if (difficulty === 'basic' && yakuCount > 4) return null;
  if (difficulty === 'advanced' && yakuCount > 6) return null;

  // 生成选项
  var options = makeOptions(answer, context);

  return {
    id: 'rand-' + difficulty + '-' + Date.now() + '-' + randomInt(0, 9999),
    source: 'random',
    difficulty: difficulty,
    tiles: tiles,
    winTile: winTile,
    melds: displayShape.melds,
    concealedTiles: displayShape.concealedTiles,
    context: {
      winMethod: context.winMethod,
      isDealer: context.isDealer,
      isMenzen: context.isMenzen,
      hasOpenMeld: context.hasOpenMeld,
      roundWind: context.roundWind,
      seatWind: context.seatWind,
      roundWindText: windName(context.roundWind) + '场',
      seatWindText: windName(context.seatWind) + '家',
      riichi: context.riichi,
      doraCount: answer.doraCount,
      normalDoraCount: answer.normalDoraCount,
      uraDoraCount: answer.uraDoraCount,
      doraIndicators: doraIndicators,
      doraDisplays: result.doraDisplays,
      uraDoraIndicators: uraDoraIndicators,
      uraDoraDisplays: result.uraDoraDisplays
    },
    answer: {
      han: answer.han,
      fu: answer.fu,
      fuSubtotal: answer.fuSubtotal,
      limit: answer.limit,
      pointText: answer.pointText,
      totalPoints: answer.totalPoints,
      yaku: answer.yaku,
      fuDetails: answer.fuDetails,
      explanation: answer.explanation
    },
    options: options
  };
}

/**
 * 单题随机生成（含重试）
 */
function buildRandomScoreQuestion(opts) {
  opts = opts || {};
  var difficulty = opts.difficulty || 'basic';
  var maxAttempts = opts.maxAttempts || 40;

  var pool;
  if (difficulty === 'advanced') pool = ADVANCED_YAKU_POOL;
  else if (difficulty === 'mixed') pool = MIXED_YAKU_POOL;
  else pool = BASIC_YAKU_POOL;

  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    // 随机选目标役种
    var yakuId = pool[Math.floor(Math.random() * pool.length)];

    // 生成手牌
    var variant = randomInt(0, 9);
    var hand = hg.generateHand(yakuId, variant);
    if (!hand || !hand.tiles || hand.tiles.length < 14) continue;

    // 随机上下文
    var context = randomContext(difficulty);

    if (MENZEN_TARGET_YAKU[yakuId] || yakuId === 'sanankou') {
      context.isMenzen = true;
      context.hasOpenMeld = false;
      context.riichi = yakuId === 'riichi' || yakuId === 'double_riichi' ||
        yakuId === 'ippatsu' || context.riichi;
    }

    if (yakuId === 'sanankou') {
      if (context.winMethod === 'ron' && hand.pair && hand.pair.length > 0) {
        hand.winTile = hand.pair[0];
      }
    }

    // 对于 riichi/mentsumo 这类纯上下文役，手牌可能不特定
    // 需要确保 context 与 hand.contextHint 兼容
    if (hand.contextHint) {
      if (hand.contextHint.indexOf('已副露') !== -1 && context.hasOpenMeld !== true) {
        context.hasOpenMeld = true;
        context.isMenzen = false;
        context.riichi = false;
      }
      if (hand.contextHint.indexOf('已宣言立直') !== -1 && !context.riichi) {
        context.riichi = true;
        context.isMenzen = true;
        context.hasOpenMeld = false;
      }
    }

    // 从生成器的 groups/pair 推导 melds/concealedTiles
    var questionMelds = [];
    var questionConcealed = hand.tiles.slice();
    if (hand.groups && hand.pair && context.hasOpenMeld) {
      var shape = meldsUtil.normalizeHandShape(
        hand.groups, hand.pair, context.hasOpenMeld
      );
      questionMelds = shape.melds || [];
      questionConcealed = shape.concealedTiles || hand.tiles.slice();
    }

    // 构建题目
    var question = buildQuestionFromHand(
      hand.tiles, hand.winTile || '', context, difficulty,
      questionMelds, questionConcealed
    );

    if (question) return question;
  }

  return null;
}

/**
 * 生成一轮随机算分题（带模板兜底）
 */
function buildRandomScorePracticeSet(count, opts) {
  count = count || 10;
  opts = opts || {};
  var difficulty = opts.difficulty || 'basic';

  var questions = [];
  var fallbackCount = 0;

  for (var i = 0; i < count; i++) {
    var q = buildRandomScoreQuestion({
      difficulty: difficulty,
      maxAttempts: opts.maxAttempts || 80
    });

    if (q) {
      questions.push(q);
    } else {
      // 兜底：从模板池取一道同难度题
      fallbackCount++;
      var fallback = sg.buildScorePracticeSet(1, { difficulty: difficulty });
      if (fallback.length > 0) {
        var fb = fallback[0];
        fb.source = 'template-fallback';
        questions.push(fb);
      }
    }
  }

  // 如果随机成功率低于50%，整轮回退模板题
  if (fallbackCount > count / 2) {
    return sg.buildScorePracticeSet(count, { difficulty: difficulty });
  }

  return questions;
}

module.exports = {
  buildRandomScorePracticeSet: buildRandomScorePracticeSet,
  buildRandomScoreQuestion: buildRandomScoreQuestion,
  // 暴露配置便于测试
  BASIC_YAKU_POOL: BASIC_YAKU_POOL,
  ADVANCED_YAKU_POOL: ADVANCED_YAKU_POOL,
  MIXED_YAKU_POOL: MIXED_YAKU_POOL,
  __test__: {
    makeFuOptions: makeFuOptions
  }
};
