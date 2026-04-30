// 格式化工具

/** 日期格式化 yyyy-MM-dd */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

/** 日期格式化 yyyy年MM月dd日 */
function formatDateCN(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return y + '年' + m + '月' + d + '日';
}

/** 数字百分比 */
function formatPercent(value, decimals) {
  if (decimals === undefined) decimals = 0;
  return (value * 100).toFixed(decimals) + '%';
}

/** 番数显示 */
function formatHan(han) {
  return han + '翻';
}

/** 牌面文字翻译 */
const TILE_NAMES = {
  // 万子
  '1m': '一', '2m': '二', '3m': '三', '4m': '四', '5m': '五',
  '6m': '六', '7m': '七', '8m': '八', '9m': '九', '0m': '赤五',
  // 索子
  '1s': '①', '2s': '②', '3s': '③', '4s': '④', '5s': '⑤',
  '6s': '⑥', '7s': '⑦', '8s': '⑧', '9s': '⑨', '0s': '赤⑤',
  // 饼子
  '1p': '①', '2p': '②', '3p': '③', '4p': '④', '5p': '⑤',
  '6p': '⑥', '7p': '⑦', '8p': '⑧', '9p': '⑨', '0p': '赤⑤',
  // 字牌 (numeric codes for image filenames)
  '1z': '東', '2z': '南', '3z': '西', '4z': '北',
  '5z': '白', '6z': '發', '7z': '中',
  // 字牌 (Chinese chars - backwards compat for data files using old format)
  '东': '東', '南': '南', '西': '西', '北': '北',
  '白': '白', '发': '發', '中': '中'
};

function getTileDisplay(tile) {
  return TILE_NAMES[tile] || tile;
}

/** 获取牌的类型（用于样式） */
function getTileType(tile) {
  if (tile.endsWith('m')) return 'man';    // 万
  if (tile.endsWith('p')) return 'pin';    // 饼
  if (tile.endsWith('s')) return 'sou';    // 索
  if (tile.endsWith('z')) return 'ji';     // 字 (numeric code)
  if (['东', '南', '西', '北', '白', '发', '中'].includes(tile)) return 'ji'; // 字 (Chinese)
  return 'unknown';
}

/** 获取牌的颜色 */
function getTileColor(tile) {
  const t = getTileType(tile);
  switch (t) {
    case 'man': return '#c62828';
    case 'pin': return '#1565c0';
    case 'sou': return '#2e7d32';
    case 'ji': return '#616161';
    default: return '#333';
  }
}

module.exports = {
  formatDate,
  formatDateCN,
  formatPercent,
  formatHan,
  getTileDisplay,
  getTileType,
  getTileColor
};
