// 有效进张统计器
// 对每张候选切牌，枚举 34 种摸牌，统计向听前进的有效牌

var mt = require('./mahjongTiles');
var sc = require('./shantenCalculator');

// 计算单张切牌后的有效进张
function calcUkeire(counts14, discardIdx, visibleCounts) {
  var counts13 = counts14.slice();
  counts13[discardIdx]--;

  var currentShanten = sc.calcStandardShanten(counts13);
  // 也取综合最低向听作为参考（国士用 13 张公式）
  var currentMinShanten = Math.min(
    currentShanten,
    sc.calcChiitoitsuShanten(counts13),
    sc.calcKokushiShanten13(counts13),
  );

  var effectiveTiles = [];
  var totalRemaining = 0;

  for (var drawIdx = 0; drawIdx < 34; drawIdx++) {
    // 该牌已用满 4 张则跳过
    var usedCount = counts14[drawIdx] + (visibleCounts ? visibleCounts[drawIdx] || 0 : 0);
    if (usedCount >= 4) continue;

    // 摸入后计算向听
    counts13[drawIdx]++;
    var newShanten = Math.min(
      sc.calcStandardShanten(counts13),
      sc.calcChiitoitsuShanten(counts13),
      sc.calcKokushiShanten13(counts13),
    );
    counts13[drawIdx]--;

    if (newShanten < currentMinShanten) {
      var remaining = 4 - usedCount;
      effectiveTiles.push({
        tile: mt.ALL_TILES[drawIdx],
        remaining: remaining,
      });
      totalRemaining += remaining;
    }
  }

  // 按向听改善程度排序有效牌（同名牌仍按索引）
  return {
    discardTile: mt.ALL_TILES[discardIdx],
    shantenAfterDiscard: currentMinShanten,
    ukeireKinds: effectiveTiles.length,
    ukeireCount: totalRemaining,
    ukeireTiles: effectiveTiles.map(function (e) {
      return e.tile;
    }),
    ukeireTilesDetail: effectiveTiles,
  };
}

// 对 14 张手牌计算所有候选切牌的进张统计
// 相同牌只计算一次（切哪张都一样）
function calcAllUkeire(counts14, visibleCounts) {
  var results = [];
  var seen = {};

  for (var i = 0; i < 34; i++) {
    if (counts14[i] > 0 && !seen[i]) {
      seen[i] = true;
      var info = calcUkeire(counts14, i, visibleCounts);
      results.push(info);
    }
  }

  return results;
}

module.exports = {
  calcUkeire: calcUkeire,
  calcAllUkeire: calcAllUkeire,
};
