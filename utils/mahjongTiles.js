// 麻将牌基础工具 — 常量、排序、计数、校验、显示名
// 沿用项目现有 34 种牌编码，CommonJS 风格

const MAN_TILES = ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m'];
const PIN_TILES = ['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p'];
const SOU_TILES = ['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s'];
const HONOR_TILES = ['1z', '2z', '3z', '4z', '5z', '6z', '7z'];
const ALL_TILES = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);

const TILE_INDEX = {};
ALL_TILES.forEach(function (t, i) {
  TILE_INDEX[t] = i;
});

// 中文显示名（用于切牌建议/理由文案）
const MAN_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const PIN_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const SOU_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

const TILE_DISPLAY = {};
MAN_TILES.forEach(function (t, i) {
  TILE_DISPLAY[t] = MAN_NAMES[i] + '万';
});
PIN_TILES.forEach(function (t, i) {
  TILE_DISPLAY[t] = PIN_NAMES[i] + '筒';
});
SOU_TILES.forEach(function (t, i) {
  TILE_DISPLAY[t] = SOU_NAMES[i] + '索';
});
TILE_DISPLAY['1z'] = '東';
TILE_DISPLAY['2z'] = '南';
TILE_DISPLAY['3z'] = '西';
TILE_DISPLAY['4z'] = '北';
TILE_DISPLAY['5z'] = '白';
TILE_DISPLAY['6z'] = '發';
TILE_DISPLAY['7z'] = '中';

// 幺九牌集合（国士相关）
const ORPHAN_TILES = ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z'];
const ORPHAN_INDICES = ORPHAN_TILES.map(function (t) {
  return TILE_INDEX[t];
});
const ORPHAN_SET = {};
ORPHAN_TILES.forEach(function (t) {
  ORPHAN_SET[t] = true;
});

// 牌池分组（万子 / 筒子 / 索子 / 字牌）
const TILE_GROUPS = [
  { suit: 'm', title: '万子', tiles: MAN_TILES },
  { suit: 'p', title: '筒子', tiles: PIN_TILES },
  { suit: 's', title: '索子', tiles: SOU_TILES },
  { suit: 'z', title: '字牌', tiles: HONOR_TILES },
];

function tileIndex(tile) {
  return TILE_INDEX[tile];
}

function tileDisplay(tile) {
  return TILE_DISPLAY[tile] || tile;
}

function isOrphan(tile) {
  return !!ORPHAN_SET[tile];
}

function suitOf(tile) {
  return tile[1];
}

function numOf(tile) {
  return parseInt(tile[0], 10);
}

// 按 万→筒→索→字，同花色数字升序 排序
function sortTiles(tiles) {
  return tiles.slice().sort(function (a, b) {
    return tileIndex(a) - tileIndex(b);
  });
}

// 转为 34 位计数数组
function tilesToCounts(tiles) {
  var counts = new Array(34).fill(0);
  for (var i = 0; i < tiles.length; i++) {
    var idx = tileIndex(tiles[i]);
    if (idx !== undefined) counts[idx]++;
  }
  return counts;
}

// 从计数数组恢复牌列表（已排序）
function countsToTiles(counts) {
  var tiles = [];
  for (var i = 0; i < 34; i++) {
    for (var j = 0; j < counts[i]; j++) {
      tiles.push(ALL_TILES[i]);
    }
  }
  return tiles;
}

// 深拷贝计数数组
function cloneCounts(counts) {
  return counts.slice();
}

// 校验手牌合法性，返回错误信息数组
function validateTiles(tiles) {
  var errors = [];
  if (!Array.isArray(tiles)) return ['输入必须是数组'];
  if (tiles.length !== 14) {
    errors.push('请选择 14 张牌');
    // 仍继续校验已有牌
  }
  var counts = new Array(34).fill(0);
  for (var i = 0; i < tiles.length; i++) {
    var t = tiles[i];
    var idx = tileIndex(t);
    if (idx === undefined) {
      errors.push('未知牌编码：' + t);
      continue;
    }
    counts[idx]++;
    if (counts[idx] > 4) {
      errors.push('同一种牌不能超过 4 张：' + t);
    }
  }
  return errors;
}

// 构建 tileGroups（供页面牌池渲染）
function buildTileGroups() {
  return TILE_GROUPS.map(function (group) {
    return {
      title: group.title,
      suit: group.suit,
      tiles: group.tiles.map(function (code) {
        return {
          code: code,
          src: '/assets/tiles/' + code + '.png',
          display: tileDisplay(code),
        };
      }),
    };
  });
}

module.exports = {
  MAN_TILES: MAN_TILES,
  PIN_TILES: PIN_TILES,
  SOU_TILES: SOU_TILES,
  HONOR_TILES: HONOR_TILES,
  ALL_TILES: ALL_TILES,
  TILE_INDEX: TILE_INDEX,
  TILE_DISPLAY: TILE_DISPLAY,
  ORPHAN_TILES: ORPHAN_TILES,
  ORPHAN_INDICES: ORPHAN_INDICES,
  ORPHAN_SET: ORPHAN_SET,
  TILE_GROUPS: TILE_GROUPS,

  tileIndex: tileIndex,
  tileDisplay: tileDisplay,
  isOrphan: isOrphan,
  suitOf: suitOf,
  numOf: numOf,
  sortTiles: sortTiles,
  tilesToCounts: tilesToCounts,
  countsToTiles: countsToTiles,
  cloneCounts: cloneCounts,
  validateTiles: validateTiles,
  buildTileGroups: buildTileGroups,
};
