// 向听数计算器 — 标准形 / 七对子 / 国士无双
// 输入统一为 tiles(牌编码数组) 或 counts(34 位计数数组)

var mt = require('./mahjongTiles');

var ORPHAN_INDICES = mt.ORPHAN_INDICES;

// =========================================================================
// 标准形向听
// =========================================================================

function calcStandardShantenFromCounts(counts) {
  var best = -1;
  var c = counts.slice();

  // 尝试每种可能的雀头
  for (var i = 0; i < 34; i++) {
    if (c[i] >= 2) {
      c[i] -= 2;
      best = Math.max(best, dfsMeld(c, 0, 0) + 1); // +1 for hasPair
      c[i] += 2;
    }
  }

  // 无雀头情况
  best = Math.max(best, dfsMeld(c, 0, 0));

  return Math.max(-1, 8 - best);
}

// 从 counts 中递归提取面子，返回 melds*2 + taatsu 的最大值
// counts 会被临时修改但会在回溯时恢复
function dfsMeld(counts, idx, melds) {
  while (idx < 34 && counts[idx] === 0) idx++;
  if (idx >= 34 || melds >= 4) {
    var taatsu = countTaatsu(counts, 4 - melds);
    return melds * 2 + taatsu;
  }

  var suit = Math.floor(idx / 9);
  var num = idx % 9;

  // 跳过当前牌（留给 taatsu 计数）
  var bestScore = dfsMeld(counts, idx + 1, melds);

  // 尝试刻子
  if (melds < 4 && counts[idx] >= 3) {
    counts[idx] -= 3;
    bestScore = Math.max(bestScore, dfsMeld(counts, idx, melds + 1));
    counts[idx] += 3;
  }

  // 尝试顺子（仅数牌且起始数字 ≤ 6）
  if (melds < 4 && suit < 3 && num <= 6 && counts[idx + 1] > 0 && counts[idx + 2] > 0) {
    counts[idx]--;
    counts[idx + 1]--;
    counts[idx + 2]--;
    bestScore = Math.max(bestScore, dfsMeld(counts, idx, melds + 1));
    counts[idx]++;
    counts[idx + 1]++;
    counts[idx + 2]++;
  }

  return bestScore;
}

// 从剩余 counts 中贪心统计搭子数（不修改原数组）
function countTaatsu(counts, limit) {
  if (limit <= 0) return 0;
  var c = counts.slice();
  var result = 0;

  // 数牌花色
  for (var suit = 0; suit < 3 && result < limit; suit++) {
    var base = suit * 9;
    for (var i = base; i < base + 9 && result < limit; i++) {
      if (c[i] === 0) continue;

      // 对子搭子（两张相同，但主雀头已在外层处理）
      if (c[i] >= 2 && result < limit) {
        c[i] -= 2;
        result++;
        if (c[i] > 0) {
          i--;
        }
        continue;
      }

      // 两面/边张搭子（连续）
      if (i < base + 8 && c[i + 1] > 0 && result < limit) {
        c[i]--;
        c[i + 1]--;
        result++;
        continue;
      }

      // 嵌张搭子（间隔一张）
      if (i < base + 7 && c[i + 2] > 0 && result < limit) {
        c[i]--;
        c[i + 2]--;
        result++;
        continue;
      }
    }
  }

  // 字牌
  for (var j = 27; j < 34 && result < limit; j++) {
    if (c[j] >= 2) {
      c[j] -= 2;
      result++;
    }
  }

  return Math.min(result, limit);
}

// =========================================================================
// 七对子向听
// =========================================================================

function calcChiitoitsuShantenFromCounts(counts) {
  var pairs = 0;
  var unique = 0;

  for (var i = 0; i < 34; i++) {
    if (counts[i] > 0) {
      unique++;
      if (counts[i] >= 2) pairs++;
    }
  }

  // 四张相同牌在七对子中只算一对
  return Math.max(-1, 6 - pairs + Math.max(0, 7 - unique));
}

// =========================================================================
// 国士无双向听
// =========================================================================

// 13 张入口：直接公式，不做切牌枚举
// shanten = 13 - uniqueOrphans - (hasPair ? 1 : 0)
function calcKokushiShanten13FromCounts(counts) {
  var unique = 0;
  var hasPair = false;
  for (var j = 0; j < ORPHAN_INDICES.length; j++) {
    if (counts[ORPHAN_INDICES[j]] > 0) unique++;
    if (counts[ORPHAN_INDICES[j]] >= 2) hasPair = true;
  }
  return Math.max(-1, 13 - unique - (hasPair ? 1 : 0));
}

// 14 张入口：先检查完整和牌，再枚举切牌取最低向听
function calcKokushiShanten14FromCounts(counts) {
  // 先检查 14 张已和牌
  var unique14 = 0;
  var hasPair14 = false;
  for (var j = 0; j < ORPHAN_INDICES.length; j++) {
    if (counts[ORPHAN_INDICES[j]] > 0) unique14++;
    if (counts[ORPHAN_INDICES[j]] >= 2) hasPair14 = true;
  }
  if (unique14 === 13 && hasPair14) return -1;

  // 枚举每张候选切牌，用 13 张公式计算
  var minShanten = 8;
  for (var i = 0; i < 34; i++) {
    if (counts[i] > 0) {
      counts[i]--;
      var u = 0;
      var p = false;
      for (var k = 0; k < ORPHAN_INDICES.length; k++) {
        if (counts[ORPHAN_INDICES[k]] > 0) u++;
        if (counts[ORPHAN_INDICES[k]] >= 2) p = true;
      }
      minShanten = Math.min(minShanten, 13 - u - (p ? 1 : 0));
      counts[i]++;
    }
  }

  return Math.max(-1, minShanten);
}

// =========================================================================
// 公共入口
// =========================================================================

// 输入 34 位 counts 数组
function calcStandardShanten(counts) {
  return calcStandardShantenFromCounts(counts);
}

function calcChiitoitsuShanten(counts) {
  return calcChiitoitsuShantenFromCounts(counts);
}

function calcKokushiShanten(counts) {
  return calcKokushiShanten14FromCounts(counts);
}

function calcKokushiShanten13(counts) {
  return calcKokushiShanten13FromCounts(counts);
}

// 从 tile 数组计算综合向听（返回三阶向听 + 综合最低）
function calcShanten(tiles) {
  var counts = mt.tilesToCounts(tiles);
  var std = calcStandardShantenFromCounts(counts.slice());
  var chi = calcChiitoitsuShantenFromCounts(counts.slice());
  var kok = calcKokushiShanten14FromCounts(counts.slice());
  return {
    standard: std,
    chiitoitsu: chi,
    kokushi: kok,
    best: Math.min(std, chi, kok),
  };
}

// 综合最低向听
function calcMinShanten(tiles) {
  var counts = mt.tilesToCounts(tiles);
  var values = [
    calcStandardShantenFromCounts(counts.slice()),
    calcChiitoitsuShantenFromCounts(counts.slice()),
    calcKokushiShanten14FromCounts(counts.slice()),
  ];
  return Math.min.apply(null, values);
}

module.exports = {
  calcStandardShanten: calcStandardShanten,
  calcChiitoitsuShanten: calcChiitoitsuShanten,
  calcKokushiShanten: calcKokushiShanten,
  calcKokushiShanten13: calcKokushiShanten13,
  calcShanten: calcShanten,
  calcMinShanten: calcMinShanten,
};
