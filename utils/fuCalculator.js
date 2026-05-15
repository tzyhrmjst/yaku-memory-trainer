// 符数计算引擎 — 从手牌 + 对局条件自动拆解符数
// 采用高点法：当手牌有多种拆分方式时，选择符数最高的解释

var yc = require('./yakuChecker');
var mt = require('./mahjongTiles');

function isHonor(t) { return t[1] === 'z'; }
function isTerminal(t) { return !isHonor(t) && (t[0] === '1' || t[0] === '9'); }
function isTerminalOrHonor(t) { return isHonor(t) || isTerminal(t); }

var DRAGON_SET = { '5z': true, '6z': true, '7z': true };
var WIND_SET = { '1z': true, '2z': true, '3z': true, '4z': true };

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
 * @param {boolean} context.hasOpenMeld - 是否有副露
 * @param {string} context.roundWind - 场风
 * @param {string} context.seatWind - 自风
 * @returns {{ fu: number, fuSubtotal: number, fuDetails: Array }}
 */
function calculateFu(tiles, context) {
  context = context || {};
  var winMethod = context.winMethod || 'ron';
  var winTile = context.winTile || '';
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
  var winTile = context.winTile || '';
  var hasOpenMeld = context.hasOpenMeld || false;
  var isMenzen = !hasOpenMeld;

  var melds = partition.melds;
  var pair = partition.pair;

  var details = [];
  var subtotal = 20; // 副底
  details.push({ name: '副底', fu: 20 });

  // 门清/副露荣和/自摸
  if (winMethod === 'ron') {
    if (isMenzen) {
      subtotal += 10;
      details.push({ name: '门前荣和', fu: 10 });
    } else {
      subtotal += 2;
      details.push({ name: '食下荣和', fu: 2 });
    }
  } else {
    // 自摸 — 检查此拆分是否满足平和形
    var sequenceCount = melds.filter(function(m) { return m.type === 'sequence'; }).length;
    var isPinfuShape = sequenceCount === 4 && !isYakuhaiPair(pair.tile, context) && isRyanmenWaitWin(melds, winTile);

    if (isPinfuShape && isMenzen) {
      // 平和自摸 → 固定20符（但仍需比较其他拆分，调用方会选最高符数）
      return {
        fu: 20, fuSubtotal: 20,
        fuDetails: [{ name: '副底（平和自摸固定20符）', fu: 20 }]
      };
    }

    subtotal += 2;
    details.push({ name: '自摸', fu: 2 });
  }

  // 面子符
  for (var i = 0; i < melds.length; i++) {
    var m = melds[i];
    if (m.type === 'sequence') continue;

    var t = m.tile;
    var isYao = isTerminalOrHonor(t);
    var fuValue;

    if (m.type === 'kan') {
      fuValue = hasOpenMeld ? (isYao ? 16 : 8) : (isYao ? 32 : 16);
    } else {
      fuValue = hasOpenMeld ? (isYao ? 4 : 2) : (isYao ? 8 : 4);
    }

    var typeLabel = isYao ? '幺九' : '中张';
    subtotal += fuValue;
    details.push({ name: typeLabel + (m.type === 'kan' ? (hasOpenMeld ? '明杠' : '暗杠') : (hasOpenMeld ? '明刻' : '暗刻')), fu: fuValue });
  }

  // 雀头符
  if (isDoubleWind(pair.tile, context)) {
    subtotal += 4;
    details.push({ name: '连风雀头', fu: 4 });
  } else if (isYakuhaiPair(pair.tile, context)) {
    subtotal += 2;
    details.push({ name: '役牌雀头', fu: 2 });
  }

  // 听牌形符
  if (winMethod === 'ron' && winTile) {
    var waitType = getWaitType(melds, pair, winTile);
    if (waitType === 'kanchan' || waitType === 'penchan' || waitType === 'tanki') {
      subtotal += 2;
      var waitName = waitType === 'kanchan' ? '坎张待' : waitType === 'penchan' ? '边张待' : '单骑待';
      details.push({ name: waitName, fu: 2 });
    }
  }

  // 进位到十位
  var fu = Math.ceil(subtotal / 10) * 10;

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

function isRyanmenWaitWin(melds, winTile) {
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
  var winSuit = winTile[1];
  var winNum = parseInt(winTile[0], 10);

  // 単骑: 和了牌就是雀头
  if (winTile === pair.tile) return 'tanki';

  for (var i = 0; i < melds.length; i++) {
    var m = melds[i];
    if (m.type !== 'sequence' || m.suit !== winSuit) continue;

    if (winNum === m.startNum + 1) return 'kanchan';
    if (winNum === m.startNum && m.startNum === 1) return 'penchan';
    if (winNum === m.startNum + 2 && m.startNum === 7) return 'penchan';
  }

  return 'ryanmen';
}

module.exports = {
  calculateFu: calculateFu
};
