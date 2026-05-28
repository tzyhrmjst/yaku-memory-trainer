// 符数计算引擎 — 从手牌 + 对局条件自动拆解符数
// 采用高点法：当手牌有多种拆分方式时，选择符数最高的解释

var yc = require('./yakuChecker');
var mt = require('./mahjongTiles');

function isHonor(t) { return t[1] === 'z'; }
function isTerminal(t) { return !isHonor(t) && (t[0] === '1' || t[0] === '9'); }
function isTerminalOrHonor(t) { return isHonor(t) || isTerminal(t); }

var DRAGON_SET = { '5z': true, '6z': true, '7z': true };
var WIND_SET = { '1z': true, '2z': true, '3z': true, '4z': true };
var WIND_NAME = { '1z': '东', '2z': '南', '3z': '西', '4z': '北' };
var DRAGON_NAME = { '5z': '白', '6z': '发', '7z': '中' };

function pairName(tile, context) {
  if (DRAGON_SET[tile]) return '役牌雀头（' + DRAGON_NAME[tile] + '）';
  if (WIND_SET[tile] && context.roundWind === tile && context.seatWind === tile) return '连风雀头（' + WIND_NAME[tile] + '）';
  if (WIND_SET[tile] && context.roundWind === tile) return '役牌雀头（场风' + WIND_NAME[tile] + '）';
  if (WIND_SET[tile] && context.seatWind === tile) return '役牌雀头（自风' + WIND_NAME[tile] + '）';
  return null;
}

function isYakuhaiPair(tile, context) {
  if (DRAGON_SET[tile]) return true;
  if (!WIND_SET[tile]) return false;
  return context.roundWind === tile || context.seatWind === tile;
}

function isDoubleWind(tile, context) {
  return WIND_SET[tile] && context.roundWind === tile && context.seatWind === tile;
}

/**
 * 从手牌和条件计算符数（高点法：遍历所有合法拆分，选符数最高者）
 * @param {string[]} tiles - 14张牌
 * @param {Object} context
 * @param {string} context.winMethod - 'ron' | 'tsumo'
 * @param {string} context.winTile - 和牌牌
 * @param {boolean} context.hasOpenMeld - 是否有副露（无 meldOpenFlags 时的全局标记）
 * @param {string} context.roundWind - 场风
 * @param {string} context.seatWind - 自风
 * @param {string} [context.waitType] - 听牌形 'tanki'|'shanpon'|'ryanmen'|'kanchan'|'penchan'（可选，覆盖自动检测）
 * @param {boolean[]} [context.meldOpenFlags] - 每个面子的明/暗标记，与分区 melds 顺序对应（可选）
 * @param {Object[]} [context.explicitMelds] - 结构化面子数组（可选，直接指定面子及其明暗）
 * @param {string} [context.explicitPair] - explicitMelds 对应的雀头牌（可选）
 * @returns {{ fu: number, fuSubtotal: number, fuDetails: Array }}
 */
function calculateFu(tiles, context) {
  context = context || {};
  var winMethod = context.winMethod || 'ron';
  context.winTile = normalizeWinTile(context.winTile || '');
  var hasOpenMeld = context.hasOpenMeld || false;

  var counts = buildCounts(tiles);

  // 国士无双 → 役满，不计算符
  if (yc.checkKokushiMusou(counts)) {
    return { fu: 0, fuSubtotal: 0, fuDetails: [] };
  }

  // 七对子 → 固定25符
  if (yc.checkChiitoitsu(counts)) {
    return {
      fu: 25, fuSubtotal: 25,
      fuDetails: [{ name: '七对子固定符', fu: 25 }]
    };
  }

  // 若提供了显式面子，直接使用而不再做分区分析
  if (context.explicitMelds && context.explicitMelds.length === 4) {
    var partition = {
      melds: context.explicitMelds.map(function(m) {
        if (m.type === 'sequence') return { type: 'sequence', suit: m.suit, startNum: m.startNum };
        return { type: m.type || 'triplet', tile: m.tile };
      }),
      pair: { type: 'pair', tile: context.explicitPair || '' }
    };
    return calculateFuForPartition(partition, context);
  }

  // 标准形 — 找所有合法拆分，用高点法选符数最高的
  var partitions = yc.findAllPartitions(counts);
  if (partitions.length === 0) {
    return {
      fu: 30, fuSubtotal: 30,
      fuDetails: [{ name: '副底', fu: 20 }, { name: '（无法精确拆解，按30符计）', fu: 10 }]
    };
  }

  var bestResult = null;
  var bestFu = -1;

  for (var i = 0; i < partitions.length; i++) {
    var result = calculateFuForPartition(partitions[i], context);
    if (result.fu > bestFu) {
      bestFu = result.fu;
      bestResult = result;
    }
  }

  return bestResult;
}

/**
 * 对单个面子拆分计算符数
 */
function calculateFuForPartition(partition, context) {
  var winMethod = context.winMethod || 'ron';
  var winTile = normalizeWinTile(context.winTile || '');
  var hasOpenMeld = context.hasOpenMeld || false;
  var meldOpenFlags = context.meldOpenFlags || null;
  var explicitMelds = context.explicitMelds || null;

  var melds = partition.melds;
  var pair = partition.pair;
  var isMenzen = (!hasOpenMeld && !meldOpenFlags && !explicitMelds) ||
                 (meldOpenFlags && meldOpenFlags.every(function(f) { return !f; })) ||
                 (explicitMelds && explicitMelds.every(function(m) { return !m.open; }));

  var details = [];
  var subtotal = 20; // 副底
  details.push({ name: '副底', fu: 20 });

  // 确定听牌形
  var waitType = context.waitType || getWaitType(melds, pair, winTile);

  // 门清荣和 +10 符；副露荣和无额外加符
  if (winMethod === 'ron') {
    if (isMenzen) {
      subtotal += 10;
      details.push({ name: '门前荣和', fu: 10 });
    }
  } else {
    // 自摸 — 检查此拆分是否满足平和形
    var sequenceCount = melds.filter(function(m) { return m.type === 'sequence'; }).length;
    var isPinfuShape = sequenceCount === 4 && !isYakuhaiPair(pair.tile, context) && isRyanmenWaitWin(melds, winTile);

    if (isPinfuShape && isMenzen) {
      return {
        fu: 20, fuSubtotal: 20,
        fuDetails: [{ name: '副底（平和自摸固定20符）', fu: 20 }]
      };
    }

    subtotal += 2;
    details.push({ name: '自摸', fu: 2 });
  }

  // 面子符 — 按 meldOpenFlags / explicitMelds / hasOpenMeld 决定明暗
  for (var i = 0; i < melds.length; i++) {
    var m = melds[i];
    if (m.type === 'sequence') continue;

    var t = m.tile;
    var isYao = isTerminalOrHonor(t);
    var fuValue;

    // 确定该面子的明暗状态
    var meldIsOpen = hasOpenMeld;
    if (explicitMelds && i < explicitMelds.length && explicitMelds[i].open !== undefined) {
      meldIsOpen = explicitMelds[i].open;
    } else if (meldOpenFlags && i < meldOpenFlags.length) {
      meldIsOpen = meldOpenFlags[i];
    }
    // 双碰荣和：荣和张完成的那组刻子按明刻处理
    if (winMethod === 'ron' && waitType === 'shanpon' && m.type === 'triplet' && m.tile === winTile) {
      meldIsOpen = true;
    }

    if (m.type === 'kan') {
      fuValue = meldIsOpen ? (isYao ? 16 : 8) : (isYao ? 32 : 16);
    } else {
      fuValue = meldIsOpen ? (isYao ? 4 : 2) : (isYao ? 8 : 4);
    }

    var typeLabel = isYao ? '幺九' : '中张';
    var detailName;
    if (m.type === 'kan') {
      detailName = typeLabel + (meldIsOpen ? '明杠' : '暗杠');
    } else {
      detailName = typeLabel + (meldIsOpen ? '明刻' : '暗刻');
    }
    // 双碰荣和时标注该刻子因荣和按明刻
    if (winMethod === 'ron' && waitType === 'shanpon' && m.type === 'triplet' && m.tile === winTile) {
      detailName += '（双碰荣和按明刻）';
    }
    subtotal += fuValue;
    details.push({ name: detailName, fu: fuValue });
  }

  // 雀头符
  if (isDoubleWind(pair.tile, context)) {
    subtotal += 4;
    details.push({ name: pairName(pair.tile, context) || '连风雀头', fu: 4 });
  } else if (isYakuhaiPair(pair.tile, context)) {
    subtotal += 2;
    details.push({ name: pairName(pair.tile, context) || '役牌雀头', fu: 2 });
  }

  // 听牌形符与荣和/自摸无关；平和自摸已在上方提前返回固定20符。
  if (winTile && (waitType === 'kanchan' || waitType === 'penchan' || waitType === 'tanki')) {
    subtotal += 2;
    var waitName = waitType === 'kanchan' ? '嵌张待' : waitType === 'penchan' ? '边张待' : '单骑待';
    details.push({ name: waitName, fu: 2 });
  }

  // 进位到十位
  var fu = Math.ceil(subtotal / 10) * 10;

  // 副露平和形荣和最低 30 符：荣和且无其他加符时按 30 符处理
  if (fu === 20 && winMethod === 'ron') {
    fu = 30;
    details.push({ name: '副露平和形荣和最低30符', fu: 0 });
  }

  return { fu: fu, fuSubtotal: subtotal, fuDetails: details };
}

function buildCounts(tiles) {
  var c = {};
  for (var i = 0; i < tiles.length; i++) {
    var t = tiles[i];
    c[t] = (c[t] || 0) + 1;
  }
  return c;
}

function normalizeWinTile(t) {
  if (!t || t.length < 2) return t;
  return t[0] === '0' ? '5' + t[1] : t;
}

function isRyanmenWaitWin(melds, winTile) {
  winTile = normalizeWinTile(winTile);
  if (!winTile || isHonor(winTile)) return false;
  var winNum = parseInt(winTile[0], 10);
  var winSuit = winTile[1];

  for (var i = 0; i < melds.length; i++) {
    var m = melds[i];
    if (m.type !== 'sequence' || m.suit !== winSuit) continue;
    if (winNum === m.startNum && m.startNum <= 6) return true;
    if (winNum === m.startNum + 2 && m.startNum >= 2) return true;
  }
  return false;
}

function getWaitType(melds, pair, winTile) {
  if (!winTile) return 'unknown';
  winTile = normalizeWinTile(winTile);
  var winSuit = winTile[1];
  var winNum = parseInt(winTile[0], 10);

  // 単骑: 和了牌就是雀头
  if (winTile === pair.tile) return 'tanki';

  // 双碰: 和了牌属于某个刻子（非雀头）
  for (var i = 0; i < melds.length; i++) {
    var m = melds[i];
    if ((m.type === 'triplet' || m.type === 'kan') && m.tile === winTile) {
      return 'shanpon';
    }
  }

  for (var i = 0; i < melds.length; i++) {
    var m2 = melds[i];
    if (m2.type !== 'sequence' || m2.suit !== winSuit) continue;

    if (winNum === m2.startNum + 1) return 'kanchan';
    if (winNum === m2.startNum + 2 && m2.startNum === 1) return 'penchan';
    if (winNum === m2.startNum && m2.startNum === 7) return 'penchan';
  }

  return 'ryanmen';
}

module.exports = {
  calculateFu: calculateFu
};
