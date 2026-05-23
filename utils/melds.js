// 副露工具模块 — 统一副露数据模型、格式转换、校验、展示标签

function suitOf(tile) {
  return normalizeTile(tile)[1];
}

function numOf(tile) {
  return parseInt(normalizeTile(tile)[0], 10);
}

function normalizeTile(tile) {
  if (!tile || tile.length < 2) return tile;
  return tile[0] === '0' ? '5' + tile[1] : tile;
}

function isHonor(tile) {
  return suitOf(tile) === 'z';
}

var MELD_LABEL = {
  chi: '吃',
  pon: '碰',
  kan: '明杠',
  ankan: '暗杠'
};

/**
 * 将一组牌判断为副露类型
 * @param {string[]} group - 3-4张牌的数组
 * @returns {string|null} 'chi' | 'pon' | 'kan' | null
 */
function meldTypeFromGroup(group) {
  if (!group || group.length < 3 || group.length > 4) return null;

  if (group.length === 4) {
    // 4张相同 → 杠
    if (group[0] === group[1] && group[1] === group[2] && group[2] === group[3]) {
      return 'kan';
    }
    return null;
  }

  // 3张
  if (group[0] === group[1] && group[1] === group[2]) {
    return 'pon';
  }

  // 3张顺子: 同花连续数字
  if (!isHonor(group[0])) {
    var sorted = group.slice().sort(function(a, b) {
      if (suitOf(a) !== suitOf(b)) return suitOf(a).localeCompare(suitOf(b));
      return numOf(a) - numOf(b);
    });
    var s = suitOf(sorted[0]);
    if (suitOf(sorted[1]) === s && suitOf(sorted[2]) === s) {
      var n0 = numOf(sorted[0]);
      var n1 = numOf(sorted[1]);
      var n2 = numOf(sorted[2]);
      if (n1 === n0 + 1 && n2 === n1 + 1) {
        return 'chi';
      }
    }
  }

  return null;
}

/**
 * 将生成器的 groups + pair 转换为展示用的 { tiles, concealedTiles, melds, pair }
 * @param {string[][]} groups - 4个面子数组（每个3-4张牌）
 * @param {string[]} pair - 雀头（2张相同牌）
 * @param {boolean} hasOpenMeld - 是否有明副露
 * @returns {{ tiles: string[], concealedTiles: string[], melds: Object[], pair: string[] }}
 */
function normalizeHandShape(groups, pair, hasOpenMeld) {
  var allTiles = [];
  if (groups) {
    for (var g = 0; g < groups.length; g++) {
      for (var t = 0; t < groups[g].length; t++) {
        allTiles.push(groups[g][t]);
      }
    }
  }
  if (pair) {
    for (var p = 0; p < pair.length; p++) {
      allTiles.push(pair[p]);
    }
  }

  if (!hasOpenMeld || !groups) {
    return {
      tiles: allTiles,
      concealedTiles: allTiles.slice(),
      melds: [],
      pair: pair || null
    };
  }

  // 有副露：所有 groups 都转为 meld
  var melds = [];
  var concealedTiles = [];
  var usedTiles = {};

  for (var g = 0; g < groups.length; g++) {
    var group = groups[g];
    var type = meldTypeFromGroup(group);
    if (!type) {
      // 无法分类的 group 放回暗牌
      for (var t = 0; t < group.length; t++) {
        concealedTiles.push(group[t]);
      }
      continue;
    }

    var meld = {
      type: type,
      label: MELD_LABEL[type] || type,
      tiles: group.slice(),
      open: type !== 'ankan',
      calledTile: group[0],
      from: 'left'
    };
    for (var t = 0; t < group.length; t++) {
      usedTiles[group[t]] = (usedTiles[group[t]] || 0) + 1;
    }
    melds.push(meld);
  }

  // 暗牌 = pair + 未归类的 groups
  if (pair) {
    for (var p = 0; p < pair.length; p++) {
      concealedTiles.push(pair[p]);
    }
  }
  // 按牌种排序
  concealedTiles.sort(function(a, b) {
    if (suitOf(a) !== suitOf(b)) return suitOf(a).localeCompare(suitOf(b));
    return numOf(a) - numOf(b);
  });

  return {
    tiles: allTiles,
    concealedTiles: concealedTiles,
    melds: melds,
    pair: pair || null
  };
}

/**
 * 将展示 melds 转换为 fuCalculator 的 explicitMelds 格式
 * @param {Object[]} melds - 展示副露数组
 * @param {string} pairTile - 雀头牌代码（如 '6s'）
 * @returns {{ explicitMelds: Object[], explicitPair: string }}
 */
function toExplicitMelds(melds, pairTile) {
  var explicitMelds = [];
  for (var i = 0; i < melds.length; i++) {
    var m = melds[i];
    if (m.type === 'chi') {
      var sorted = m.tiles.slice().sort(function(a, b) {
        return numOf(a) - numOf(b);
      });
      explicitMelds.push({
        type: 'sequence',
        suit: suitOf(sorted[0]),
        startNum: numOf(sorted[0]),
        open: m.open !== false
      });
    } else if (m.type === 'pon') {
      explicitMelds.push({
        type: 'triplet',
        tile: normalizeTile(m.tiles[0]),
        open: m.open !== false
      });
    } else if (m.type === 'kan' || m.type === 'ankan') {
      explicitMelds.push({
        type: 'kan',
        tile: normalizeTile(m.tiles[0]),
        open: m.open !== false
      });
    }
  }

  return {
    explicitMelds: explicitMelds,
    explicitPair: pairTile || ''
  };
}

/**
 * 返回副露的中文标签
 * @param {Object} meld
 * @returns {string}
 */
function formatMeldLabel(meld) {
  if (!meld || !meld.type) return '';
  if (meld.type === 'kan' && meld.open === false) return MELD_LABEL.ankan;
  return MELD_LABEL[meld.type] || meld.type;
}

/**
 * 校验 melds 合法性
 * @param {Object[]} melds - 副露数组
 * @param {string[]} allTiles - 完整14张手牌
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateMelds(melds, allTiles) {
  var errors = [];
  if (!melds || melds.length === 0) return { valid: true, errors: [] };

  if (melds.length > 4) {
    errors.push('副露组数不能超过4');
    return { valid: false, errors: errors };
  }

  // 统计所有牌的出现次数
  var totalCounts = {};
  for (var i = 0; i < allTiles.length; i++) {
    totalCounts[allTiles[i]] = (totalCounts[allTiles[i]] || 0) + 1;
  }

  var meldTileCounts = {};
  for (var i = 0; i < melds.length; i++) {
    var m = melds[i];

    // 校验类型
    if (!m.type || !['chi', 'pon', 'kan', 'ankan'].concat(Object.keys(MELD_LABEL)).filter(function(v, idx, arr) { return arr.indexOf(v) === idx; }).indexOf(m.type) === -1) {
      // Simple check: is type valid?
    }
    if (['chi', 'pon', 'kan', 'ankan'].indexOf(m.type) === -1) {
      errors.push('第' + (i + 1) + '组: 无效的副露类型 "' + m.type + '"');
      continue;
    }

    if (!m.tiles || m.tiles.length < 3) {
      errors.push('第' + (i + 1) + '组: 牌数不足');
      continue;
    }

    // 校验牌与实际类型匹配
    var actualType = meldTypeFromGroup(m.tiles);
    if (m.type === 'chi' && actualType !== 'chi') {
      errors.push('第' + (i + 1) + '组: 不是合法的吃（需同花连续3张）');
    }
    if (m.type === 'pon' && actualType !== 'pon') {
      errors.push('第' + (i + 1) + '组: 不是合法的碰（需3张相同）');
    }
    if ((m.type === 'kan' || m.type === 'ankan') && actualType !== 'kan') {
      errors.push('第' + (i + 1) + '组: 不是合法的杠（需4张相同）');
    }

    // 统计副露中的每张牌
    for (var t = 0; t < m.tiles.length; t++) {
      var tile = m.tiles[t];
      meldTileCounts[tile] = (meldTileCounts[tile] || 0) + 1;
    }
  }

  // 校验副露牌不超出总量
  for (var tile in meldTileCounts) {
    if (meldTileCounts.hasOwnProperty(tile)) {
      if (meldTileCounts[tile] > (totalCounts[tile] || 0)) {
        errors.push('牌 ' + tile + ' 在副露中出现 ' + meldTileCounts[tile] + ' 次，但手牌只有 ' + (totalCounts[tile] || 0) + ' 张');
      }
    }
  }

  return { valid: errors.length === 0, errors: errors };
}

module.exports = {
  meldTypeFromGroup: meldTypeFromGroup,
  normalizeHandShape: normalizeHandShape,
  toExplicitMelds: toExplicitMelds,
  formatMeldLabel: formatMeldLabel,
  validateMelds: validateMelds,
  normalizeTile: normalizeTile,
  MELD_LABEL: MELD_LABEL
};
