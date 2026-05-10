// 役种倾向评分器
// 面向未完成手牌，评估每条役种路线的接近程度
// 返回 { id, name, distance, score(0-100), reasons }

var mt = require('./mahjongTiles');
var sc = require('./shantenCalculator');

// 所有支持的役种方向
var YAKU_LIST = [
  { id: 'tanyao', name: '断幺九' },
  { id: 'pinfu', name: '平和' },
  { id: 'yakuhai', name: '役牌' },
  { id: 'chiitoitsu', name: '七对子' },
  { id: 'toitoiho', name: '对对和' },
  { id: 'honitsu', name: '混一色' },
  { id: 'chinitsu', name: '清一色' },
  { id: 'kokushi_musou', name: '国士无双' },
  { id: 'sanshoku_doujun', name: '三色同顺' },
  { id: 'ittsuu', name: '一气通贯' },
  { id: 'honchantaiyaochuu', name: '混全带幺九' },
  { id: 'junchan_taiyaochuu', name: '纯全带幺九' },
];

// 统计 counts 中总牌数
function sumCounts(counts) {
  var sum = 0;
  for (var i = 0; i < 34; i++) {
    sum += counts[i];
  }
  return sum;
}

// 幺九牌数量统计
function countOrphans(counts) {
  var count = 0;
  for (var i = 0; i < mt.ORPHAN_INDICES.length; i++) {
    count += counts[mt.ORPHAN_INDICES[i]];
  }
  return count;
}

// 数牌 2-8 的数量
function countTanyao(counts) {
  var count = 0;
  // 万子 2-8: indices 1-7
  // 筒子 2-8: indices 10-16
  // 索子 2-8: indices 19-25
  var tanyaoIndices = [];
  for (var suit = 0; suit < 3; suit++) {
    for (var n = 1; n <= 7; n++) {
      tanyaoIndices.push(suit * 9 + n);
    }
  }
  for (var i = 0; i < tanyaoIndices.length; i++) {
    count += counts[tanyaoIndices[i]];
  }
  return count;
}

// 统计各花色数量
function countBySuit(counts) {
  var suits = [0, 0, 0, 0]; // m, p, s, z
  for (var i = 0; i < 34; i++) {
    var suit = Math.floor(i / 9);
    suits[suit] += counts[i];
  }
  return suits;
}

// 统计对子数
function countPairs(counts) {
  var pairs = 0;
  for (var i = 0; i < 34; i++) {
    if (counts[i] >= 2) pairs++;
  }
  return pairs;
}

// 统计刻子/槓子数（3+ 张）
function countTriplets(counts) {
  var trips = 0;
  for (var i = 0; i < 34; i++) {
    if (counts[i] >= 3) trips++;
  }
  return trips;
}

// 从 counts 中检测顺子 / 搭子覆盖
// 返回每个花色的顺子/搭子起点集合
function analyzeNumberStructure(counts, suitBase) {
  var seqStarts = {}; // 完整顺子起点
  var ryanmenStarts = {}; // 两面搭子起点
  var kanchanStarts = {}; // 嵌张搭子起点

  for (var start = 0; start < 7; start++) {
    var i = suitBase + start;
    var hasFirst = counts[i] > 0;
    var hasSecond = counts[i + 1] > 0;
    var hasThird = counts[i + 2] > 0;

    if (hasFirst && hasSecond && hasThird) {
      seqStarts[start] = true;
    }
    if (hasFirst && hasSecond) {
      ryanmenStarts[start] = true;
    }
    if (hasFirst && hasThird) {
      kanchanStarts[start] = true;
    }
  }

  return { seqStarts: seqStarts, ryanmenStarts: ryanmenStarts, kanchanStarts: kanchanStarts };
}

// =========================================================================
// 各役种评分
// =========================================================================

function scoreTanyao(counts) {
  var orphanCount = countOrphans(counts);
  var totalTiles = sumCounts(counts);
  var tanyaoCount = totalTiles - orphanCount;

  // 幺九越少越好
  var score = Math.round((tanyaoCount / totalTiles) * 100);
  var distance = orphanCount;

  var reasons = [];
  if (orphanCount === 0) {
    reasons.push('全部都是2~8数字牌，断幺九已成立');
  } else if (orphanCount <= 2) {
    reasons.push('只有 ' + orphanCount + ' 张幺九牌，很容易扔掉');
  } else {
    reasons.push('有 ' + orphanCount + ' 张幺九牌需要处理掉');
  }

  return { id: 'tanyao', name: '断幺九', distance: distance, score: score, reasons: reasons };
}

function scorePinfu(counts) {
  // 平和条件：全顺子 + 非役牌雀头 + 门清 + 两面听
  // 倾向评估：顺子和两面搭子越多越高分
  var suits = [0, 9, 18]; // m, p, s bases
  var seqCount = 0;
  var ryanmenCount = 0;
  var tripletCount = countTriplets(counts);
  var pairCount = countPairs(counts);

  for (var s = 0; s < suits.length; s++) {
    var struct = analyzeNumberStructure(counts, suits[s]);
    seqCount += Object.keys(struct.seqStarts).length;
    ryanmenCount += Object.keys(struct.ryanmenStarts).length;
  }

  // 有刻子扣分
  var score = Math.min(100, seqCount * 25 + ryanmenCount * 15);
  score = Math.max(0, score - tripletCount * 30);

  var distance = Math.max(0, 4 - seqCount);
  var reasons = [];

  if (tripletCount > 0) {
    reasons.push(tripletCount + ' 组刻子不利于做平和');
  }
  if (seqCount >= 3 && ryanmenCount >= 1) {
    reasons.push('顺子结构很好，适合做平和');
  } else if (seqCount < 2) {
    reasons.push('还缺几组顺子');
  }

  if (reasons.length === 0) reasons.push('顺子结构在发展中');

  return { id: 'pinfu', name: '平和', distance: distance, score: Math.round(score), reasons: reasons };
}

function scoreYakuhai(counts, context) {
  // 役牌：三元牌（确定役牌）+ 场风/自风（需上下文）
  var ctx = context || {};
  var dragonTiles = [31, 32, 33]; // 5z, 6z, 7z — 三元牌一定是役牌
  var windTiles = [27, 28, 29, 30]; // 1z-4z — 只有场风/自风才是役牌

  var dragonPairs = 0;
  var dragonTriplets = 0;
  var windPairs = 0;
  var windTriplets = 0;

  for (var i = 0; i < dragonTiles.length; i++) {
    var c = counts[dragonTiles[i]];
    if (c >= 3) dragonTriplets++;
    else if (c >= 2) dragonPairs++;
  }

  // 有 context 时只统计场风/自风，否则风牌不计为确定役牌
  for (var j = 0; j < windTiles.length; j++) {
    var c2 = counts[windTiles[j]];
    if (c2 < 2) continue;
    var windCode = mt.ALL_TILES[windTiles[j]];
    var isYakuhaiWind = ctx.roundWind === windCode || ctx.seatWind === windCode;
    if (isYakuhaiWind) {
      if (c2 >= 3) windTriplets++;
      else windPairs++;
    }
    // 无 context 时，风牌对子/刻子仍记录但降低权重
    if (!ctx.roundWind && !ctx.seatWind) {
      if (c2 >= 3) windTriplets++;
      else windPairs++;
    }
  }

  var hasYakuhai = dragonTriplets + windTriplets > 0;
  var nearYakuhai = dragonPairs + windPairs;
  // 无 context 时风牌权值减半
  var windWeight = ctx.roundWind || ctx.seatWind ? 1 : 0.5;
  var score = Math.min(100, Math.round(dragonTriplets * 50 + windTriplets * 40 * windWeight + nearYakuhai * 20));
  var distance = Math.max(0, 1 - dragonTriplets - windTriplets);

  var reasons = [];
  if (hasYakuhai) {
    if (dragonTriplets > 0) {
      reasons.push('已有三元牌刻子，和牌就有番');
    } else if (ctx.roundWind || ctx.seatWind) {
      reasons.push('已有役牌刻子，和牌就有番');
    } else {
      reasons.push('有字牌刻子，确认场风/自风后可能是役牌');
    }
  } else if (nearYakuhai > 0) {
    if (dragonPairs > 0) {
      reasons.push('有 ' + dragonPairs + ' 组三元牌对子，碰一下就是役牌');
    } else {
      reasons.push('有字牌对子，需确认是否为场风/自风');
    }
  } else {
    reasons.push('还没有役牌对子，可以留意三元牌');
  }

  return { id: 'yakuhai', name: '役牌', distance: distance, score: score, reasons: reasons };
}

function scoreChiitoitsu(counts) {
  var pairs = countPairs(counts);
  var unique = 0;
  for (var i = 0; i < 34; i++) {
    if (counts[i] > 0) unique++;
  }

  // 七对需要 7 对不同对子
  var shanten = Math.max(-1, 6 - pairs + Math.max(0, 7 - unique));
  var score = pairs >= 5 ? Math.min(100, pairs * 14 + (unique >= 7 ? 20 : 0)) : pairs * 12;
  var distance = Math.max(0, 6 - pairs);

  var reasons = [];
  if (pairs >= 5) {
    reasons.push('已有 ' + pairs + ' 对，七对子近在眼前');
  } else if (pairs >= 3) {
    reasons.push('有 ' + pairs + ' 对，可以往七对子走');
  } else {
    reasons.push('对子还不多，七对子比较远');
  }

  return { id: 'chiitoitsu', name: '七对子', distance: distance, score: Math.round(score), reasons: reasons };
}

function scoreToitoiho(counts) {
  var pairs = countPairs(counts);
  var triplets = countTriplets(counts);

  // 对对和需要 4 刻子 + 1 雀头
  var score = Math.min(100, triplets * 25 + pairs * 8);
  var distance = Math.max(0, 4 - triplets - pairs);

  var reasons = [];
  if (triplets >= 2) {
    reasons.push('已有 ' + triplets + ' 组刻子，碰碰和很近了');
  } else if (pairs >= 3) {
    reasons.push('有 ' + pairs + ' 组对子，碰出来就是碰碰和');
  } else {
    reasons.push('刻子和对子还不太够');
  }

  return { id: 'toitoiho', name: '对对和', distance: distance, score: Math.round(score), reasons: reasons };
}

function scoreHonitsu(counts) {
  var suitCounts = countBySuit(counts);
  var bestNumSuit = Math.max(suitCounts[0], suitCounts[1], suitCounts[2]);
  var honorCount = suitCounts[3];
  var total = sumCounts(counts);
  var restCount = total - bestNumSuit - honorCount;

  var mainCount = bestNumSuit + honorCount;
  var score = Math.round((mainCount / total) * 100);
  var distance = restCount;

  var reasons = [];
  if (restCount === 0) {
    reasons.push('已经是一色加字牌，混一色成立');
  } else if (restCount <= 3) {
    reasons.push('主花色+字牌有 ' + mainCount + ' 张，快混一色了');
  } else {
    reasons.push('杂牌有 ' + restCount + ' 张，扔掉就能混一色');
  }

  return { id: 'honitsu', name: '混一色', distance: distance, score: score, reasons: reasons };
}

function scoreChinitsu(counts) {
  var suitCounts = countBySuit(counts);
  var bestSuit = Math.max(suitCounts[0], suitCounts[1], suitCounts[2]);
  var total = sumCounts(counts);
  var restCount = total - bestSuit;

  var score = Math.round((bestSuit / total) * 100);
  var distance = restCount;

  var reasons = [];
  if (restCount === 0) {
    reasons.push('全部是同一花色，清一色成立');
  } else if (restCount <= 3) {
    reasons.push('主花色 ' + bestSuit + ' 张，快清一色了');
  } else {
    reasons.push('还有 ' + restCount + ' 张其他花色的牌');
  }

  return { id: 'chinitsu', name: '清一色', distance: distance, score: score, reasons: reasons };
}

function scoreKokushi(counts) {
  var uniqueOrphans = 0;
  var hasPair = false;
  for (var i = 0; i < mt.ORPHAN_INDICES.length; i++) {
    var c = counts[mt.ORPHAN_INDICES[i]];
    if (c > 0) uniqueOrphans++;
    if (c >= 2) hasPair = true;
  }

  var orphanCount = 0;
  for (var j = 0; j < mt.ORPHAN_INDICES.length; j++) {
    orphanCount += counts[mt.ORPHAN_INDICES[j]];
  }

  var total = sumCounts(counts);
  var nonOrphanCount = total - orphanCount;
  var shanten = Math.max(-1, total === 13 ? sc.calcKokushiShanten13(counts) : sc.calcKokushiShanten(counts));
  var score = uniqueOrphans >= 10 ? Math.min(100, uniqueOrphans * 7 + (hasPair ? 10 : 0)) : uniqueOrphans * 5;
  var distance = Math.max(0, 13 - uniqueOrphans);

  var reasons = [];
  if (shanten <= 0) {
    reasons.push('国士无双已经听牌了');
  } else if (uniqueOrphans >= 10) {
    reasons.push('已有 ' + uniqueOrphans + ' 种幺九牌，国士很近');
  } else if (nonOrphanCount > 6) {
    reasons.push('非幺九牌太多，国士不太好做');
  } else {
    reasons.push('有 ' + uniqueOrphans + ' 种幺九牌，还差 ' + (13 - uniqueOrphans) + ' 种');
  }

  return { id: 'kokushi_musou', name: '国士无双', distance: distance, score: Math.round(score), reasons: reasons };
}

function scoreSanshoku(counts) {
  // 三色同顺：对 1-7 的每个数字起点，检查 m/p/s 三色是否都有顺子或搭子
  var bestScore = 0;
  var bestNum = 0;

  for (var num = 0; num < 7; num++) {
    var covered = 0;
    for (var suit = 0; suit < 3; suit++) {
      var base = suit * 9 + num;
      if (counts[base] > 0 && counts[base + 1] > 0 && counts[base + 2] > 0) {
        covered += 2; // 完整顺子权重大
      } else if (
        (counts[base] > 0 && counts[base + 1] > 0) ||
        (counts[base] > 0 && counts[base + 2] > 0) ||
        (counts[base + 1] > 0 && counts[base + 2] > 0)
      ) {
        covered += 1; // 部分搭子
      }
    }
    if (covered > bestScore) {
      bestScore = covered;
      bestNum = num + 1;
    }
  }

  var score = Math.min(100, bestScore * 16);
  var distance = Math.max(0, 3 - Math.floor(bestScore / 2));

  var reasons = [];
  if (bestScore >= 5) {
    reasons.push('数字' + bestNum + '附近三色都有顺子，三色同顺近了');
  } else if (bestScore >= 3) {
    reasons.push('数字' + bestNum + '附近部分花色有顺子');
  } else {
    reasons.push('三色同顺的结构还不太明显');
  }

  return { id: 'sanshoku_doujun', name: '三色同顺', distance: distance, score: Math.round(score), reasons: reasons };
}

function scoreIttsuu(counts) {
  // 一气通贯：对每个花色检查 123 + 456 + 789 三段覆盖
  var bestCover = 0;
  var bestSuit = -1;
  var suitNames = ['万', '筒', '索'];

  for (var suit = 0; suit < 3; suit++) {
    var base = suit * 9;
    var seg1 = counts[base] > 0 && counts[base + 1] > 0 && counts[base + 2] > 0 ? 1 : 0;
    var seg2 = counts[base + 3] > 0 && counts[base + 4] > 0 && counts[base + 5] > 0 ? 1 : 0;
    var seg3 = counts[base + 6] > 0 && counts[base + 7] > 0 && counts[base + 8] > 0 ? 1 : 0;
    var cover = seg1 + seg2 + seg3;
    if (cover > bestCover) {
      bestCover = cover;
      bestSuit = suit;
    }
  }

  var score = bestCover * 33 + (bestCover === 3 ? 1 : 0);
  var distance = Math.max(0, 3 - bestCover);

  var reasons = [];
  if (bestCover === 3) {
    reasons.push(suitNames[bestSuit] + '子123·456·789三段都有了');
  } else if (bestCover >= 2) {
    reasons.push(suitNames[bestSuit] + '子已有 ' + bestCover + ' 段，再凑一段就是一条龙');
  } else if (bestCover === 1) {
    reasons.push(suitNames[bestSuit] + '子只有 1 段，还差不少');
  } else {
    reasons.push('还没形成一条龙的形状');
  }

  return { id: 'ittsuu', name: '一气通贯', distance: distance, score: Math.round(score), reasons: reasons };
}

function scoreHonchantaiyaochuu(counts) {
  // 混全带幺九：每个面子都含幺九牌
  var orphanTileCount = countOrphans(counts);
  var total = sumCounts(counts);
  var ratio = orphanTileCount / total;

  // 有顺子倾向时更适合混全（混全要求至少一个顺子含幺九）
  var score = Math.min(100, Math.round(ratio * 80));
  var distance = Math.max(0, total - orphanTileCount);

  var reasons = [];
  if (ratio >= 0.9) {
    reasons.push('几乎都是幺九牌，混全带幺九很近了');
  } else if (ratio >= 0.5) {
    reasons.push(Math.round(ratio * 100) + '% 是幺九牌');
  } else {
    reasons.push('幺九牌还不太够，混全带幺九比较远');
  }

  return { id: 'honchantaiyaochuu', name: '混全带幺九', distance: distance, score: score, reasons: reasons };
}

function scoreJunchan(counts) {
  // 纯全带幺九：每个面子都含老头牌(1/9)，无字牌
  var honors = countBySuit(counts)[3];
  var terminalCount = 0;
  // 老头牌：1m,9m,1p,9p,1s,9s
  var terminalIndices = [0, 8, 9, 17, 18, 26];
  for (var i = 0; i < terminalIndices.length; i++) {
    terminalCount += counts[terminalIndices[i]];
  }

  var total = sumCounts(counts);
  var penalty = honors + (total - terminalCount - honors);
  var score = Math.max(0, Math.min(100, Math.round((terminalCount / total) * 100 - honors * 10)));
  var distance = penalty;

  var reasons = [];
  if (honors > 0) {
    reasons.push('有字牌在手里，纯全带幺九不能有字牌');
  }
  if (terminalCount >= 8) {
    reasons.push('有 ' + terminalCount + ' 张老头牌，纯全有望');
  } else {
    reasons.push('老头牌还不太够');
  }

  return { id: 'junchan_taiyaochuu', name: '纯全带幺九', distance: distance, score: score, reasons: reasons };
}

// =========================================================================
// 主入口
// =========================================================================

function evaluateYaku(counts, context) {
  var results = [];
  var scorers = [
    scoreTanyao,
    scorePinfu,
    scoreYakuhai,
    scoreChiitoitsu,
    scoreToitoiho,
    scoreHonitsu,
    scoreChinitsu,
    scoreKokushi,
    scoreSanshoku,
    scoreIttsuu,
    scoreHonchantaiyaochuu,
    scoreJunchan,
  ];

  for (var i = 0; i < scorers.length; i++) {
    results.push(scorers[i](counts, context));
  }

  // 按 score 降序排列，取前 3
  results.sort(function (a, b) {
    return b.score - a.score;
  });
  return results.slice(0, 3);
}

module.exports = {
  evaluateYaku: evaluateYaku,
  YAKU_LIST: YAKU_LIST,
};
