// 手牌分析器 — 统一编排入口
// 输出合法性、向听、役种倾向、切牌建议

var mt = require('./mahjongTiles');
var sc = require('./shantenCalculator');
var uc = require('./ukeireCalculator');
var ya = require('./yakuAdvisor');
var yc = require('./yakuChecker');

// 已完成手牌的役种显示名
var YAKU_COMPLETED_NAME = {
  tanyao: '断幺九',
  yakuhai: '役牌',
  pinfu: '平和',
  riichi: '立直',
  mentsumo: '门前清自摸和',
  ippatsu: '一发',
  iipeikou: '一杯口',
  rinshan_kaihou: '岭上开花',
  chankan: '抢杠',
  haitei: '海底摸月',
  houtei: '河底捞鱼',
  sanshoku_doujun: '三色同顺',
  chiitoitsu: '七对子',
  toitoiho: '对对和',
  ittsuu: '一气通贯',
  honchantaiyaochuu: '混全带幺九',
  sanankou: '三暗刻',
  double_riichi: '两立直',
  shousangen: '小三元',
  honroutou: '混老头',
  sanshoku_doukou: '三色同刻',
  sankantsu: '三杠子',
  honitsu: '混一色',
  junchan_taiyaochuu: '纯全带幺九',
  ryanpeikou: '二杯口',
  nagashi_mangan: '流局满贯',
  chinitsu: '清一色',
  suuankou: '四暗刻',
  kokushi_musou: '国士无双',
  daisangen: '大三元',
  shousuushii: '小四喜',
  tsuuiisou: '字一色',
  ryuuiisou: '绿一色',
  chinroutou: '清老头',
  chuuren_poutou: '九莲宝灯',
  tenhou: '天和',
  chiihou: '地和',
  suukantsu: '四杠子',
  daisuushii: '大四喜',
  suuankou_tanki: '四暗刻单骑',
  kokushi_musou_13men: '国士无双十三面',
  junsei_chuuren_poutou: '纯正九莲宝灯',
};

function getCompletedYaku(tiles) {
  // 收集所有可能成立的役种（遍历每种可能的和牌张）
  var allIds = {};

  // 先不带 winTile 跑一次（特殊牌形 + 组成役）
  var baseResult = yc.checkAllYaku(tiles, {});
  baseResult.forEach(function (id) {
    allIds[id] = true;
  });

  // 枚举每张不同的牌作为和牌张，补全结构系役种（如平和需知道听牌形）
  var seenTiles = {};
  for (var i = 0; i < tiles.length; i++) {
    var t = tiles[i];
    if (seenTiles[t]) continue;
    seenTiles[t] = true;
    var result = yc.checkAllYaku(tiles, { winTile: t });
    result.forEach(function (id) {
      allIds[id] = true;
    });
  }

  var yakuList = [];
  for (var id in allIds) {
    var han = yc.YAKU_HAN[id] || 0;
    var name = YAKU_COMPLETED_NAME[id] || id;
    yakuList.push({ id: id, name: name, han: han });
  }
  // 按翻数降序排列
  yakuList.sort(function (a, b) {
    return b.han - a.han;
  });
  return yakuList;
}

// 判断一张牌是否为孤立牌（无相邻数牌，无双张）
function isIsolated(counts, idx) {
  if (counts[idx] >= 2) return false; // 有对子不算孤立
  var suit = Math.floor(idx / 9);
  var num = idx % 9;

  // 字牌：只有 1 张即为孤立
  if (suit === 3) return counts[idx] === 1;

  // 数牌：检查相邻位置
  var adjacents = [idx - 2, idx - 1, idx + 1, idx + 2];
  for (var i = 0; i < adjacents.length; i++) {
    var a = adjacents[i];
    if (a >= suit * 9 && a < (suit + 1) * 9 && counts[a] > 0) {
      return false;
    }
  }
  return true;
}

// 判断牌是否为顺子核心牌（处在可构成顺子的中间位置）
function isSequenceCore(counts, idx) {
  var suit = Math.floor(idx / 9);
  var num = idx % 9;
  if (suit === 3) return false;

  // 检查是否参与完整顺子：idx 在 [start, start+2] 范围内
  for (var start = Math.max(0, num - 2); start <= Math.min(num, 6); start++) {
    var i = suit * 9 + start;
    if (counts[i] > 0 && counts[i + 1] > 0 && counts[i + 2] > 0) {
      if (idx >= i && idx <= i + 2) return true;
    }
  }
  return false;
}

// 计算切牌 shape bonus
function calcShapeBonus(counts14, discardIdx) {
  var bonus = 0;

  // 切孤立牌加分
  if (isIsolated(counts14, discardIdx)) {
    bonus += 10;
  }

  // 切顺子核心牌减分
  if (isSequenceCore(counts14, discardIdx)) {
    bonus -= 20;
  }

  // 切字牌对子（破坏对子）减分
  if (Math.floor(discardIdx / 9) === 3 && counts14[discardIdx] === 2) {
    bonus -= 15;
  }

  // 切客风（3z 西，4z 北 — 通常不是场风/自风）小加分
  if (discardIdx === 29 || discardIdx === 30) {
    bonus += 5; // 西、北客风价值低
  }

  return bonus;
}

// 主分析入口
function analyzeHand(options) {
  var tiles = (options && options.tiles) || [];
  var visibleTiles = (options && options.visibleTiles) || [];
  var context = (options && options.context) || {};

  // 1. 合法性校验
  var errors = mt.validateTiles(tiles);
  if (errors.length > 0) {
    return {
      valid: false,
      errors: errors,
      summary: null,
      closestYaku: [],
      discards: [],
    };
  }

  // 2. 构建计数
  var counts14 = mt.tilesToCounts(tiles);
  var visibleCounts = visibleTiles.length > 0 ? mt.tilesToCounts(visibleTiles) : null;

  // 3. 计算向听
  var standardShanten = sc.calcStandardShanten(counts14.slice());
  var chiitoiShanten = sc.calcChiitoitsuShanten(counts14.slice());
  var kokushiShanten = sc.calcKokushiShanten(counts14.slice());
  var minShanten = Math.min(standardShanten, chiitoiShanten, kokushiShanten);

  var bestShape = 'standard';
  if (chiitoiShanten < standardShanten) bestShape = 'chiitoitsu';
  if (kokushiShanten < Math.min(standardShanten, chiitoiShanten)) bestShape = 'kokushi';

  // 4. 役种倾向（未和牌时）
  var closestYaku = ya.evaluateYaku(counts14, context);

  // 4b. 已完成手牌的实际役种
  var completedYaku = minShanten <= -1 ? getCompletedYaku(tiles) : [];

  // 5. 切牌分析
  var ukeireResults = uc.calcAllUkeire(counts14, visibleCounts);

  // 6. 对每张切牌计算役种倾向分和综合分
  var discards = ukeireResults.map(function (info) {
    var discardIdx = mt.tileIndex(info.discardTile);

    // 模拟切出后手牌
    var counts13 = counts14.slice();
    counts13[discardIdx]--;

    // 切后役种倾向
    var yakuHints = ya.evaluateYaku(counts13, context);
    var yakuScore = yakuHints.length > 0 ? yakuHints[0].score : 0;
    var yakuIds = yakuHints.map(function (y) {
      return y.id;
    });

    // shape bonus
    var shapeBonus = calcShapeBonus(counts14, discardIdx);

    // 综合评分
    var score = info.ukeireCount * 5 - info.shantenAfterDiscard * 30 + yakuScore + shapeBonus;

    // 生成理由（通俗易懂）
    var reasons = [];
    if (isIsolated(counts14, discardIdx)) {
      reasons.push(mt.tileDisplay(info.discardTile) + '是孤立的，打掉不影响手牌结构');
    }
    if (isSequenceCore(counts14, discardIdx)) {
      reasons.push('注意：' + mt.tileDisplay(info.discardTile) + '是顺子的一部分，打掉会破坏好形');
    }
    if (info.ukeireKinds > 3) {
      reasons.push('摸到有用牌的种类比较多');
    }
    if (info.shantenAfterDiscard === minShanten) {
      reasons.push('打出后离听牌最近');
    }
    if (yakuIds.length > 0 && yakuScore > 50) {
      reasons.push('适合往' + yakuHints[0].name + '发展');
    }

    return {
      tile: info.discardTile,
      tileName: mt.tileDisplay(info.discardTile),
      rank: 0,
      recommended: false,
      shantenAfterDiscard: info.shantenAfterDiscard,
      ukeireKinds: info.ukeireKinds,
      ukeireCount: info.ukeireCount,
      ukeireTiles: info.ukeireTiles,
      yakuHints: yakuIds,
      score: score,
      reasons: reasons.length > 0 ? reasons : ['综合评估'],
    };
  });

  // 排序：先按切后向听升序，再按分数降序
  discards.sort(function (a, b) {
    if (a.shantenAfterDiscard !== b.shantenAfterDiscard) {
      return a.shantenAfterDiscard - b.shantenAfterDiscard;
    }
    return b.score - a.score;
  });

  // 标记排名和推荐
  for (var i = 0; i < discards.length; i++) {
    discards[i].rank = i + 1;
    if (i === 0) discards[i].recommended = true;
  }

  // 7. 生成总结文案
  var summaryTexts = [];
  if (minShanten <= -1) {
    summaryTexts.push('这副牌已经和了！');
  } else if (minShanten === 0) {
    summaryTexts.push('已经听牌了，等一张合适的牌就能和。');
  } else {
    summaryTexts.push('只需再摸 ' + minShanten + ' 张有用的牌，就能听牌。');
  }

  if (discards.length > 0 && discards[0].reasons.length > 0) {
    summaryTexts.push(discards[0].reasons[0]);
  }

  return {
    valid: true,
    errors: [],
    summary: {
      tileCount: 14,
      shanten: minShanten,
      bestShape: bestShape,
      standardShanten: standardShanten,
      chiitoiShanten: chiitoiShanten,
      kokushiShanten: kokushiShanten,
      text: summaryTexts.join(''),
    },
    closestYaku: closestYaku,
    completedYaku: completedYaku,
    discards: discards,
  };
}

module.exports = {
  analyzeHand: analyzeHand,
};
