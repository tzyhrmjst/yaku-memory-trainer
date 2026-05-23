// 宝牌工具 — 指示牌换算、宝牌枚数统计、模板题指示牌生成

var NUMBER_SUITS = ['m', 'p', 's'];

function normalizeTile(tile) {
  if (!tile || tile.length < 2) return tile;
  return tile[0] === '0' ? '5' + tile[1] : tile;
}

function suitOf(tile) {
  return normalizeTile(tile)[1];
}

function numOf(tile) {
  return parseInt(normalizeTile(tile)[0], 10);
}

function isRedFive(tile) {
  return tile && tile[0] === '0' && NUMBER_SUITS.indexOf(tile[1]) !== -1;
}

function nextDora(indicator) {
  var tile = normalizeTile(indicator);
  var suit = suitOf(tile);
  var num = numOf(tile);

  if (NUMBER_SUITS.indexOf(suit) !== -1) {
    return (num === 9 ? '1' : String(num + 1)) + suit;
  }

  // 風牌: 東→南→西→北→東
  if (num >= 1 && num <= 4) {
    return (num === 4 ? '1' : String(num + 1)) + 'z';
  }

  // 三元牌: 白→發→中→白
  if (num >= 5 && num <= 7) {
    return (num === 7 ? '5' : String(num + 1)) + 'z';
  }

  return tile;
}

function indicatorForDora(doraTile) {
  var tile = normalizeTile(doraTile);
  var suit = suitOf(tile);
  var num = numOf(tile);

  if (NUMBER_SUITS.indexOf(suit) !== -1) {
    return (num === 1 ? '9' : String(num - 1)) + suit;
  }

  if (num >= 1 && num <= 4) {
    return (num === 1 ? '4' : String(num - 1)) + 'z';
  }

  if (num >= 5 && num <= 7) {
    return (num === 5 ? '7' : String(num - 1)) + 'z';
  }

  return tile;
}

function buildCounts(tiles) {
  var counts = {};
  tiles.forEach(function (tile) {
    var normalized = normalizeTile(tile);
    counts[normalized] = (counts[normalized] || 0) + 1;
  });
  return counts;
}

function countDora(tiles, indicators, includeRed) {
  indicators = indicators || [];
  var counts = buildCounts(tiles);
  var total = 0;

  indicators.forEach(function (indicator) {
    var dora = nextDora(indicator);
    total += counts[dora] || 0;
  });

  if (includeRed) {
    tiles.forEach(function (tile) {
      if (isRedFive(tile)) total += 1;
    });
  }

  return total;
}

function findIndicatorPlan(candidates, desired, idx, current, best) {
  if (desired === 0) {
    if (!best.plan || current.length < best.plan.length) {
      best.plan = current.slice();
    }
    return;
  }
  if (idx >= candidates.length) return;
  if (best.plan && current.length >= best.plan.length) return;

  var candidate = candidates[idx];
  var maxRepeat = Math.min(1, Math.floor(desired / candidate.count));
  for (var repeat = maxRepeat; repeat >= 0; repeat--) {
    var next = current.slice();
    for (var i = 0; i < repeat; i++) {
      next.push(candidate.indicator);
    }
    findIndicatorPlan(candidates, desired - repeat * candidate.count, idx + 1, next, best);
  }
}

function makeIndicatorsForCount(tiles, desiredCount, includeRed) {
  if (includeRed !== false) {
    var redCount = tiles.filter(isRedFive).length;
    desiredCount -= redCount;
  }
  if (!desiredCount || desiredCount <= 0) return [];

  var counts = buildCounts(tiles);
  var candidates = Object.keys(counts)
    .filter(function (tile) { return counts[tile] > 0 && counts[tile] <= desiredCount; })
    .map(function (tile) {
      return { tile: tile, count: counts[tile], indicator: indicatorForDora(tile) };
    })
    .sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.tile < b.tile ? -1 : 1;
    });

  var best = { plan: null };
  findIndicatorPlan(candidates, desiredCount, 0, [], best);
  return best.plan || [];
}

function makeSingleIndicatorForCount(tiles, desiredCount, includeRed) {
  if (includeRed !== false) {
    var redCount = tiles.filter(isRedFive).length;
    desiredCount -= redCount;
  }
  if (!desiredCount || desiredCount <= 0) return [];

  var counts = buildCounts(tiles);
  var candidates = Object.keys(counts)
    .map(function (tile) {
      return { tile: tile, count: counts[tile], indicator: indicatorForDora(tile) };
    })
    .filter(function (candidate) { return candidate.count > 0; })
    .sort(function (a, b) {
      var aOver = a.count > desiredCount;
      var bOver = b.count > desiredCount;
      if (aOver !== bOver) return aOver ? 1 : -1;
      var aDistance = Math.abs(desiredCount - a.count);
      var bDistance = Math.abs(desiredCount - b.count);
      if (aDistance !== bDistance) return aDistance - bDistance;
      if (b.count !== a.count) return b.count - a.count;
      return a.tile < b.tile ? -1 : 1;
    });

  return candidates.length > 0 ? [candidates[0].indicator] : [];
}

function tileImage(tile) {
  return '/assets/tiles/' + tile + '.png';
}

function buildIndicatorDisplays(indicators) {
  return (indicators || []).map(function (tile) {
    var doraTile = nextDora(tile);
    return {
      code: tile,
      src: tileImage(tile),
      dora: doraTile,
      doraSrc: tileImage(doraTile)
    };
  });
}

module.exports = {
  normalizeTile: normalizeTile,
  isRedFive: isRedFive,
  nextDora: nextDora,
  indicatorForDora: indicatorForDora,
  countDora: countDora,
  makeIndicatorsForCount: makeIndicatorsForCount,
  makeSingleIndicatorForCount: makeSingleIndicatorForCount,
  buildIndicatorDisplays: buildIndicatorDisplays
};
