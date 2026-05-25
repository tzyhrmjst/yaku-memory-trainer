// 役种判定引擎 — 给定手牌+上下文，返回所有成立的役种
//
// 分五层判定：
//   Layer 1 — 特殊牌形（国士、七对、九莲）：直接从牌种分布判定，无需面子拆分
//   Layer 2 — 牌种组成（断幺、清一色、混一色等）：从牌种统计判定
//   Layer 3 — 面子拆分：递归回溯找出 4 面子 + 1 雀头的所有合法拆分
//   Layer 4 — 牌型结构（对对和、平和、一杯口等）& 役牌系：基于拆分结果判定
//   Layer 5 — 上下文役（立直、一发、海底等）：从 contextHint 解析

// =========================================================================
// Constants
// =========================================================================

const MAN_TILES   = ['1m','2m','3m','4m','5m','6m','7m','8m','9m'];
const PIN_TILES   = ['1p','2p','3p','4p','5p','6p','7p','8p','9p'];
const SOU_TILES   = ['1s','2s','3s','4s','5s','6s','7s','8s','9s'];
const HONOR_TILES = ['1z','2z','3z','4z','5z','6z','7z'];

const TANYAO_TILES = new Set([].concat(
  MAN_TILES.slice(1, 8), PIN_TILES.slice(1, 8), SOU_TILES.slice(1, 8)
));
const TERMINAL_SET = new Set(['1m','9m','1p','9p','1s','9s']);
const DRAGON_SET   = new Set(['5z','6z','7z']);
const WIND_SET     = new Set(['1z','2z','3z','4z']);
const GREEN_SET    = new Set(['2s','3s','4s','6s','8s','6z']);
const ORPHAN_SET   = new Set(['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z']);

const SUITS = ['m', 'p', 's'];

const MENZEN_ONLY_YAKU = new Set([
  'riichi',
  'double_riichi',
  'ippatsu',
  'mentsumo',
  'pinfu',
  'iipeikou',
  'chiitoitsu',
  'ryanpeikou',
  'suuankou',
  'suuankou_tanki',
  'kokushi_musou',
  'kokushi_musou_13men',
  'chuuren_poutou',
  'junsei_chuuren_poutou',
  'tenhou',
  'chiihou'
]);

// =========================================================================
// Helpers
// =========================================================================

function normalizeTile(t) {
  if (!t || t.length < 2) return t;
  return t[0] === '0' ? '5' + t[1] : t;
}

function suitOf(t) { return normalizeTile(t)[1]; }
function numOf(t)  {
  const n = parseInt(normalizeTile(t)[0], 10);
  return n === 0 ? 5 : n;
}
function isHonor(t) { return suitOf(t) === 'z'; }
function isTerminal(t) { return !isHonor(t) && (numOf(t) === 1 || numOf(t) === 9); }
function isDragon(t) { return isHonor(t) && numOf(t) >= 5; }
function isWind(t) { return isHonor(t) && numOf(t) <= 4; }

function buildCounts(tiles) {
  const c = {};
  for (const t of tiles) {
    const normalized = normalizeTile(t);
    c[normalized] = (c[normalized] || 0) + 1;
  }
  return c;
}

function countsClone(c) {
  const out = {};
  for (const k in c) out[k] = c[k];
  return out;
}

// =========================================================================
// Layer 1: Special patterns
// =========================================================================

function checkKokushiMusou(counts) {
  // 全部13种幺九牌各至少1张，其中一种有2张
  const orphans = ['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z'];
  let pairCount = 0;
  for (const o of orphans) {
    const c = counts[o] || 0;
    if (c === 0) return false;
    if (c >= 2) pairCount++;
  }
  return pairCount === 1;
}

function checkKokushiMusou13men(counts) {
  // 全部13种幺九牌各恰好1张 → 听第14种（任意幺九都可和）
  const orphans = ['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z'];
  for (const o of orphans) {
    if ((counts[o] || 0) !== 1) return false;
  }
  return true;
  // 注意：13面听只有13张牌（不含和了牌），14张时说明已和牌
  // 这里check的是14张已和牌的情况，13面听的已和牌形同国士无双
}

function checkChiitoitsu(counts) {
  // 7组不同的对子
  const kinds = Object.keys(counts);
  if (kinds.length !== 7) return false;
  for (const k of kinds) {
    if (counts[k] !== 2) return false;
  }
  return true;
}

function checkChuurenPoutou(counts) {
  // 同种数牌组成1112345678999 + 任意一张该花色
  for (const s of SUITS) {
    const needed = [3,1,1,1,1,1,1,1,3]; // 1-9每个数字需要的张数(不含extra)
    let extra = -1;
    let valid = true;
    for (let n = 1; n <= 9; n++) {
      const t = String(n) + s;
      const c = counts[t] || 0;
      if (c < needed[n - 1]) { valid = false; break; }
      if (c > needed[n - 1]) {
        if (extra !== -1) { valid = false; break; } // 只能有一个数字多1张
        extra = n;
        if (c !== needed[n - 1] + 1) { valid = false; break; }
      }
    }
    if (!valid) continue;
    // 检查无其他花色和字牌
    let otherCount = 0;
    for (const t in counts) {
      if (suitOf(t) !== s) otherCount += counts[t];
    }
    if (otherCount > 0) continue;
    return true;
  }
  return false;
}

function checkJunseiChuurenPoutou(counts) {
  // 纯正九莲：1112345678999 恰好13张 + 等待任意1张同花色
  // 在14张已和牌中：1112345678999 + 任意一张 = 同九莲宝灯
  // 无法从14张牌区分九莲和纯正九莲，这里标记为九莲成立时同时检查
  // 纯正判断需9面听，从和了牌角度无法在14张已和牌中区分
  if (!checkChuurenPoutou(counts)) return false;
  // 从14张已和牌看，九莲必然成立；纯正需要9面听
  // 在quiz场景，无法从14张牌判定听牌形态，保守返回false
  return false;
}

// =========================================================================
// Layer 2: Composition checks (tile-level, no partition needed)
// =========================================================================

function checkCompositionYaku(counts) {
  const ids = [];

  const allTiles = Object.keys(counts);
  let hasHonor = false, hasTerminal = false, hasSimple = false;
  const suits = new Set();
  let hasNonGreen = false;

  for (const t of allTiles) {
    if (isHonor(t)) {
      hasHonor = true;
    } else {
      suits.add(suitOf(t));
      const n = numOf(t);
      if (n === 1 || n === 9) hasTerminal = true;
      else hasSimple = true;
    }
    if (!GREEN_SET.has(t)) hasNonGreen = true;
  }

  // 断幺九: 全是2-8数牌
  if (!hasHonor && hasSimple && !hasTerminal) ids.push('tanyao');

  // 清一色: 单花色数牌，无字牌
  if (!hasHonor && suits.size === 1) ids.push('chinitsu');

  // 混一色: 单花色数牌 + 字牌
  if (hasHonor && suits.size === 1) ids.push('honitsu');

  // 字一色: 全是字牌
  if (hasHonor && suits.size === 0) ids.push('tsuuiisou');

  // 绿一色
  if (!hasNonGreen) ids.push('ryuuiisou');

  // 清老头: 只有老头牌(1/9)，无字牌
  if (!hasHonor && !hasSimple && hasTerminal) ids.push('chinroutou');

  // 混老头: 只有幺九牌(1/9+字牌)
  if (!hasSimple && (hasTerminal || hasHonor)) ids.push('honroutou');

  return ids;
}

// =========================================================================
// Layer 3: Find all valid meld+pair partitions
// =========================================================================

// 标准排序：万→饼→索→字，同花色内数字升序
const ALL_TILES_SORTED = [].concat(
  MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES
);

function findFirstTile(counts) {
  for (let i = 0; i < ALL_TILES_SORTED.length; i++) {
    if (counts[ALL_TILES_SORTED[i]] > 0) return ALL_TILES_SORTED[i];
  }
  return null;
}

function findAllPartitions(counts) {
  const partitions = [];
  const c = countsClone(counts);

  for (const tile of Object.keys(c)) {
    if (c[tile] >= 2) {
      c[tile] -= 2;
      const melds = [];
      findMelds(c, melds, { type: 'pair', tile: tile }, partitions);
      c[tile] += 2;
    }
  }

  return partitions;
}

function findMelds(counts, melds, pair, partitions) {
  if (melds.length === 4) {
    // 检查所有牌已用完
    if (Object.values(counts).every(c => c === 0)) {
      partitions.push({ melds: [...melds], pair });
    }
    return;
  }

  const firstTile = findFirstTile(counts);
  if (!firstTile) return;

  const s = suitOf(firstTile);
  const n = numOf(firstTile);

  // 尝试槓子（4张相同牌，1面子用4张）
  if (counts[firstTile] >= 4) {
    counts[firstTile] -= 4;
    melds.push({ type: 'kan', tile: firstTile });
    findMelds(counts, melds, pair, partitions);
    melds.pop();
    counts[firstTile] += 4;
  }

  // 尝试刻子
  if (counts[firstTile] >= 3) {
    counts[firstTile] -= 3;
    melds.push({ type: 'triplet', tile: firstTile });
    findMelds(counts, melds, pair, partitions);
    melds.pop();
    counts[firstTile] += 3;
  }

  // 尝试顺子（仅数牌，且起始数≤7）
  if (s !== 'z' && n <= 7) {
    const t2 = String(n + 1) + s;
    const t3 = String(n + 2) + s;
    if ((counts[t2] || 0) > 0 && (counts[t3] || 0) > 0) {
      counts[firstTile]--;
      counts[t2]--;
      counts[t3]--;
      melds.push({ type: 'sequence', suit: s, startNum: n });
      findMelds(counts, melds, pair, partitions);
      melds.pop();
      counts[firstTile]++;
      counts[t2]++;
      counts[t3]++;
    }
  }
}

// =========================================================================
// Layer 4: Structure & honor yaku (partition-dependent)
// =========================================================================

function checkStructureYaku(partition, context, winTile) {
  const { melds, pair } = partition;
  const ids = [];

  const tripletCount = melds.filter(m => m.type === 'triplet' || m.type === 'kan').length;
  const sequenceCount = melds.filter(m => m.type === 'sequence').length;
  const isMenzen = !context.hasFuro;
  const normalizedWinTile = normalizeTile(winTile);
  const tankiWin = normalizedWinTile && pair.tile === normalizedWinTile;
  const concealedTripletCount = countConcealedTriplets(melds, context, normalizedWinTile);

  // ---- 对对和: 4刻子 ----
  if (tripletCount === 4) {
    ids.push('toitoiho');
  }

  // ---- 四暗刻: 4暗刻 + 门前清；荣和时只有单骑成立 ----
  if (tripletCount === 4 && isMenzen && concealedTripletCount === 4) {
    ids.push('suuankou');
    if (tankiWin) {
      ids.push('suuankou_tanki');
    }
  }

  // ---- 三暗刻: 3组暗刻 ----
  if (concealedTripletCount >= 3) {
    ids.push('sanankou');
  }

  // ---- 平和: 4顺子 + 门前清 + 非役牌雀头 + 两面听 ----
  if (sequenceCount === 4 && isMenzen && !isYakuhaiPair(pair.tile, context) && isRyanmenWait(melds, normalizedWinTile)) {
    ids.push('pinfu');
  }

  // ---- 一杯口: 两组完全相同顺子 + 门前清 ----
  if (isMenzen) {
    const seqKeys = {};
    for (const m of melds) {
      if (m.type === 'sequence') {
        const key = m.suit + '_' + m.startNum;
        seqKeys[key] = (seqKeys[key] || 0) + 1;
      }
    }
    // 二杯口: 两组一杯口
    const doublePairs = Object.values(seqKeys).filter(c => c >= 2).length;
    if (doublePairs >= 2) {
      ids.push('ryanpeikou');
    } else if (Object.values(seqKeys).some(c => c >= 2)) {
      ids.push('iipeikou');
    }
  }

  // ---- 一气通贯: 同花色123+456+789 ----
  const seqBySuit = {};
  for (const m of melds) {
    if (m.type === 'sequence') {
      if (!seqBySuit[m.suit]) seqBySuit[m.suit] = new Set();
      seqBySuit[m.suit].add(m.startNum);
    }
  }
  for (const s of SUITS) {
    const set = seqBySuit[s];
    if (set && set.has(1) && set.has(4) && set.has(7)) {
      ids.push('ittsuu');
      break;
    }
  }

  // ---- 三色同顺: 万饼索各有相同数字的顺子 ----
  const seqSuitsByNum = {};
  for (const m of melds) {
    if (m.type === 'sequence') {
      if (!seqSuitsByNum[m.startNum]) seqSuitsByNum[m.startNum] = new Set();
      seqSuitsByNum[m.startNum].add(m.suit);
    }
  }
  for (const num of Object.keys(seqSuitsByNum)) {
    if (seqSuitsByNum[num].size >= 3) {
      ids.push('sanshoku_doujun');
      break;
    }
  }

  // ---- 三色同刻: 万饼索各有相同数字的刻子 ----
  const tripNumsBySuit = {};
  for (const m of melds) {
    if ((m.type === 'triplet' || m.type === 'kan') && !isHonor(m.tile)) {
      const s = suitOf(m.tile);
      const n = numOf(m.tile);
      if (!tripNumsBySuit[n]) tripNumsBySuit[n] = new Set();
      tripNumsBySuit[n].add(s);
    }
  }
  for (const n of Object.keys(tripNumsBySuit)) {
    if (tripNumsBySuit[n].size >= 3) {
      ids.push('sanshoku_doukou');
      break;
    }
  }

  // ---- 混全带幺九: 每个面子都含幺九牌，且必须含顺子 ----
  if (sequenceCount > 0 && everyMeldHasOrphan(melds) && isTerminalOrHonor(pair.tile)) {
    ids.push('honchantaiyaochuu');
  }

  // ---- 纯全带幺九: 每个面子都含老头牌 + 无字牌，且必须含顺子 ----
  if (sequenceCount > 0 && everyMeldHasTerminal(melds) && isTerminal(pair.tile)) {
    let hasHonorInHand = false;
    for (const m of melds) {
      for (const t of ((m.type === 'triplet' || m.type === 'kan') ? [m.tile] : [String(m.startNum)+m.suit, String(m.startNum+1)+m.suit, String(m.startNum+2)+m.suit])) {
        if (isHonor(t)) hasHonorInHand = true;
      }
    }
    if (isHonor(pair.tile)) hasHonorInHand = true;
    if (!hasHonorInHand) {
      ids.push('junchan_taiyaochuu');
    }
  }

  return ids;
}

function checkHonorYaku(partition, context) {
  const { melds, pair } = partition;
  const ids = [];

  // 统计三元牌和风牌的刻子/雀头
  const dragonTriplets = [];
  const windTriplets = [];
  let dragonPair = null;
  let windPair = null;

  for (const m of melds) {
    if (m.type === 'triplet' || m.type === 'kan') {
      if (DRAGON_SET.has(m.tile)) dragonTriplets.push(m.tile);
      if (WIND_SET.has(m.tile)) windTriplets.push(m.tile);
    }
  }
  if (DRAGON_SET.has(pair.tile)) dragonPair = pair.tile;
  if (WIND_SET.has(pair.tile)) windPair = pair.tile;

  // 役牌: 三元牌每刻1番，风牌每刻按场风/自风分别计番（连风计2番）
  var valueCount = dragonTriplets.length;
  windTriplets.forEach(function(t) {
    valueCount += valueWindHanCount(t, context);
  });

  for (let i = 0; i < valueCount; i++) {
    ids.push('yakuhai');
  }

  // 小三元: 2种三元刻子 + 1种三元雀头
  if (dragonTriplets.length === 2 && dragonPair) {
    ids.push('shousangen');
  }

  // 大三元: 3种三元刻子
  if (dragonTriplets.length === 3) {
    ids.push('daisangen');
  }

  // 小四喜: 3种风牌刻子 + 1种风牌雀头
  if (windTriplets.length === 3 && windPair) {
    ids.push('shousuushii');
  }

  // 大四喜: 4种风牌刻子
  if (windTriplets.length === 4) {
    ids.push('daisuushii');
  }

  return ids;
}

function countConcealedTriplets(melds, context, winTile) {
  return melds.filter(m => {
    if (m.type !== 'triplet' && m.type !== 'kan') return false;

    var explicitMelds = context.explicitMelds || [];
    if (explicitMelds.length > 0) {
      for (var i = 0; i < explicitMelds.length; i++) {
        var em = explicitMelds[i];
        if ((em.type === 'triplet' || em.type === 'kan') && em.tile === m.tile) {
          if (em.open) return false;
          break;
        }
      }
    } else if (context.hasFuro && !context.furoKeepsTripletsConcealed && !context.explicitSanankou) {
      return false;
    }

    if (context.ron && winTile === m.tile) {
      return false;
    }
    return true;
  }).length;
}

function isRyanmenWait(melds, winTile) {
  if (!winTile || isHonor(winTile)) return false;
  const winNum = numOf(winTile);

  return melds.some(m => {
    if (m.type !== 'sequence' || m.suit !== suitOf(winTile)) return false;
    if (winNum === m.startNum) {
      return m.startNum <= 6;
    }
    if (winNum === m.startNum + 2) {
      return m.startNum >= 2;
    }
    return false;
  });
}

function everyMeldHasOrphan(melds) {
  return melds.every(m => {
    if (m.type === 'triplet' || m.type === 'kan') {
      return isTerminalOrHonor(m.tile);
    }
    return m.startNum === 1 || m.startNum === 7;
  });
}

function everyMeldHasTerminal(melds) {
  return melds.every(m => {
    if (m.type === 'triplet' || m.type === 'kan') {
      return isTerminal(m.tile);
    }
    return m.startNum === 1 || m.startNum === 7;
  });
}

function isTerminalOrHonor(t) {
  return isHonor(t) || isTerminal(t);
}

function isValueWind(tile, context) {
  if (!WIND_SET.has(tile)) return false;
  return context.roundWind === tile || context.seatWind === tile;
}

function valueWindHanCount(tile, context) {
  if (!WIND_SET.has(tile)) return 0;
  var n = 0;
  if (context.roundWind === tile) n++;
  if (context.seatWind === tile) n++;
  return n;
}

function isYakuhaiPair(tile, context) {
  return DRAGON_SET.has(tile) || isValueWind(tile, context || {});
}

// =========================================================================
// Layer 5: Context-dependent yaku
// =========================================================================

function parseContext(contextHint) {
  if (!contextHint) return {};
  const roundWind = parseWindFromContext(contextHint, ['场风', '场']);
  const seatWind = parseWindFromContext(contextHint, ['自风', '门风']);

  return {
    hasFuro: /已副露/.test(contextHint),
    doubleRiichi: /第一巡.*立直|两立直|両立直/.test(contextHint),
    riichi: /已宣言立直|已立直|宣言立直/.test(contextHint) && !/未立直/.test(contextHint) && !/两立直|両立直/.test(contextHint),
    ippatsu: /一巡内/.test(contextHint),
    tsumo: /自摸/.test(contextHint),
    ron: /荣和/.test(contextHint),
    rinshan: /岭上/.test(contextHint),
    chankan: /抢槓/.test(contextHint),
    haitei: /海底/.test(contextHint),
    houtei: /河底/.test(contextHint),
    tenhou: /天和/.test(contextHint),
    chiihou: /地和/.test(contextHint),
    sankantsu: /开3次槓/.test(contextHint),
    suukantsu: /开4次槓/.test(contextHint),
    nagashi: /流局/.test(contextHint),
    kokushi13: /13面听|十三面/.test(contextHint),
    chuuren9: /9面听|九面/.test(contextHint),
    roundWind,
    seatWind,
    furoKeepsTripletsConcealed: /明顺子|副露.*顺子|吃/.test(contextHint) && !/明刻|碰/.test(contextHint),
    explicitSanankou: /三暗刻|暗刻/.test(contextHint)
  };
}

function parseWindFromContext(contextHint, labels) {
  const windMap = {
    '东': '1z',
    '東': '1z',
    '南': '2z',
    '西': '3z',
    '北': '4z'
  };

  for (const label of labels) {
    for (const text in windMap) {
      const afterLabel = new RegExp(label + '[：:为是]?\\s*' + text);
      const beforeLabel = new RegExp(text + '\\s*' + label);
      if (afterLabel.test(contextHint) || beforeLabel.test(contextHint)) return windMap[text];
    }
  }
  return null;
}

function checkContextYaku(context) {
  const ids = [];

  if (context.doubleRiichi && !context.hasFuro) ids.push('double_riichi');
  if (context.riichi && !context.hasFuro) ids.push('riichi');
  if (context.ippatsu && (context.riichi || context.doubleRiichi)) ids.push('ippatsu');
  if (context.tsumo && !context.hasFuro && !context.tenhou && !context.chiihou) {
    ids.push('mentsumo');
  }
  if (context.rinshan) ids.push('rinshan_kaihou');
  if (context.chankan) ids.push('chankan');
  if (context.haitei) ids.push('haitei');
  if (context.houtei) ids.push('houtei');
  if (context.tenhou) ids.push('tenhou');
  if (context.chiihou) ids.push('chiihou');
  if (context.sankantsu) ids.push('sankantsu');
  if (context.suukantsu) ids.push('suukantsu');
  if (context.nagashi) ids.push('nagashi_mangan');

  return ids;
}

// =========================================================================
// Main entry point
// =========================================================================

/**
 * 判定一手牌成立的全部役种
 * @param {string[]} tiles - 14张牌
 * @param {Object} options - { winTile, contextHint }
 * @returns {string[]} 成立的役种ID列表，yakuhai 按三元牌/场风自风刻子组数可重复出现
 */
function checkAllYaku(tiles, options) {
  const opts = options || {};
  const context = Object.assign(parseContext(opts.contextHint || ''), opts.context || {});
  const winTile = opts.winTile || '';
  const counts = buildCounts(tiles);
  const results = new Set();

  // Layer 1: Special patterns
  const isMenzen = !context.hasFuro;

  if (isMenzen && checkKokushiMusou(counts)) {
    results.add('kokushi_musou');
    // 13面听需从上下文判定（13张+等1张 vs 14张已和）
    if (context.kokushi13) results.add('kokushi_musou_13men');
  }

  if (isMenzen && checkChiitoitsu(counts)) {
    results.add('chiitoitsu');
  }

  if (isMenzen && checkChuurenPoutou(counts)) {
    results.add('chuuren_poutou');
    if (context.chuuren9) results.add('junsei_chuuren_poutou');
  }

  // Layer 2: Composition
  for (const id of checkCompositionYaku(counts)) {
    results.add(id);
  }

  // Layer 3+4: Partitions + structure/honor
  const partitions = findAllPartitions(counts);

  let yakuhaiCount = 0;

  if (partitions.length > 0) {
    // 收集所有分区中出现的役种（yakuhai 可重复，单独计数）
    const structureIds = new Set();
    const honorOtherIds = new Set();

    for (const p of partitions) {
      for (const id of checkStructureYaku(p, context, winTile)) {
        structureIds.add(id);
      }
      let partitionYakuhai = 0;
      for (const id of checkHonorYaku(p, context)) {
        if (id === 'yakuhai') {
          partitionYakuhai++;
        } else {
          honorOtherIds.add(id);
        }
      }
      if (partitionYakuhai > yakuhaiCount) yakuhaiCount = partitionYakuhai;
    }

    for (const id of structureIds) results.add(id);
    for (const id of honorOtherIds) results.add(id);

    // 混老头必然复合对对和或七对子
    if (results.has('honroutou')) {
      if (results.has('chiitoitsu')) {
        // 七对子形
      } else {
        results.add('toitoiho');
      }
    }

    // 清老头必然复合对对和
    if (results.has('chinroutou')) {
      results.add('toitoiho');
    }

    // 绿一色必然复合混一色（因为含发字牌）或清一色
    if (results.has('ryuuiisou')) {
      if (results.has('tsuuiisou')) {
        // 全字牌 → 字一色
      } else if (results.has('chinitsu')) {
        // 全索子 → 清一色
      } else {
        results.add('honitsu'); // 含发+索子 → 混一色
      }
    }

    // 字一色必然复合对对和（常规）, 混老头
    if (results.has('tsuuiisou')) {
      results.add('honroutou');
      if (!results.has('chiitoitsu')) results.add('toitoiho');
    }
  }

  if (partitions.length === 0 && !results.has('chiitoitsu')) {
    results.delete('honroutou');
    results.delete('chinroutou');
    results.delete('tsuuiisou');
  }

  if (results.has('junchan_taiyaochuu')) {
    results.delete('honchantaiyaochuu');
  }

  // Layer 5: Context
  for (const id of checkContextYaku(context)) {
    results.add(id);
  }

  // 战术补充：槓子系役种需验证牌面确实有对应数量的四归一
  const quadCount = Object.values(counts).filter(c => c >= 4).length;
  if (results.has('sankantsu') && quadCount < 3) {
    results.delete('sankantsu');
  }
  if (results.has('suukantsu') && quadCount < 4) {
    results.delete('suukantsu');
  }

  // 统一兜底：副露时移除所有门清限定役
  if (context.hasFuro) {
    for (const id of [...results]) {
      if (MENZEN_ONLY_YAKU.has(id)) {
        results.delete(id);
      }
    }
  }

  // 排序：按番数从低到高，yakuhai 按实际组数插入
  const sorted = sortByHan([...results]);
  if (yakuhaiCount > 0) {
    const yakuhaiHan = YAKU_HAN['yakuhai'] || 1;
    let insertIdx = 0;
    for (let i = 0; i < sorted.length; i++) {
      if ((YAKU_HAN[sorted[i]] || 0) <= yakuhaiHan) {
        insertIdx = i + 1;
      }
    }
    for (let i = 0; i < yakuhaiCount; i++) {
      sorted.splice(insertIdx, 0, 'yakuhai');
      insertIdx++;
    }
  }
  return sorted;
}

// =========================================================================
// Sort by han (low to high)
// =========================================================================

const YAKU_HAN = {
  'tanyao': 1, 'yakuhai': 1, 'pinfu': 1, 'riichi': 1, 'mentsumo': 1,
  'ippatsu': 1, 'iipeikou': 1, 'rinshan_kaihou': 1, 'chankan': 1,
  'haitei': 1, 'houtei': 1,
  'sanshoku_doujun': 2, 'chiitoitsu': 2, 'toitoiho': 2, 'ittsuu': 2,
  'honchantaiyaochuu': 2, 'sanankou': 2, 'double_riichi': 2,
  'shousangen': 2, 'honroutou': 2, 'sanshoku_doukou': 2, 'sankantsu': 2,
  'honitsu': 3, 'junchan_taiyaochuu': 3, 'ryanpeikou': 3,
  'nagashi_mangan': 5,
  'chinitsu': 6,
  'suuankou': 13, 'kokushi_musou': 13, 'daisangen': 13,
  'shousuushii': 13, 'tsuuiisou': 13, 'ryuuiisou': 13,
  'chinroutou': 13, 'chuuren_poutou': 13,
  'tenhou': 13, 'chiihou': 13, 'suukantsu': 13,
  'daisuushii': 26, 'suuankou_tanki': 26,
  'kokushi_musou_13men': 26, 'junsei_chuuren_poutou': 26
};

function sortByHan(ids) {
  return ids.sort((a, b) => (YAKU_HAN[a] || 0) - (YAKU_HAN[b] || 0));
}

// =========================================================================
// Yaku normalization: yakuman exclusion & double yakuman mutual exclusion
// =========================================================================

/**
 * 规范化役种结果：处理役满排他、双倍役满互斥、yakumanCount 计算
 * @param {string[]} ids - checkAllYaku 返回的役种 ID 列表
 * @param {Object} [ruleOptions] - 规则开关
 * @param {boolean} [ruleOptions.doubleYakuman] - 是否采用双倍役满（默认 true）
 * @returns {{ ids: string[], yakumanCount: number }}
 */
function normalizeYakuResult(ids, ruleOptions) {
  ruleOptions = ruleOptions || {};
  var doubleYakuman = ruleOptions.doubleYakuman !== false;

  // 分离役满和非役满
  var yakumanIds = [];
  var nonYakumanIds = [];
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if ((YAKU_HAN[id] || 0) >= 13) {
      yakumanIds.push(id);
    } else {
      nonYakumanIds.push(id);
    }
  }

  // 没有役满时，原样返回
  if (yakumanIds.length === 0) {
    return { ids: ids, yakumanCount: 0 };
  }

  // 双倍役满互斥：高阶出现时移除低阶
  var exclusionPairs = [
    ['suuankou_tanki', 'suuankou'],
    ['daisuushii', 'shousuushii'],
    ['kokushi_musou_13men', 'kokushi_musou'],
    ['junsei_chuuren_poutou', 'chuuren_poutou']
  ];

  var removeSet = {};
  for (var e = 0; e < exclusionPairs.length; e++) {
    var higher = exclusionPairs[e][0];
    var lower = exclusionPairs[e][1];
    if (yakumanIds.indexOf(higher) !== -1) {
      removeSet[lower] = true;
    }
  }

  // 过滤：只保留役满类，移除被高阶覆盖的低阶役满
  var normalizedIds = [];
  for (var j = 0; j < yakumanIds.length; j++) {
    if (!removeSet[yakumanIds[j]]) {
      normalizedIds.push(yakumanIds[j]);
    }
  }

  // 计算 yakumanCount
  var yakumanCount = 0;
  for (var k = 0; k < normalizedIds.length; k++) {
    var hanVal = YAKU_HAN[normalizedIds[k]] || 0;
    if (hanVal >= 13) {
      var multiplier = doubleYakuman ? (hanVal / 13) : 1;
      yakumanCount += multiplier;
    }
  }

  return { ids: normalizedIds, yakumanCount: yakumanCount };
}

// =========================================================================
// Exports
// =========================================================================

module.exports = {
  checkAllYaku,
  normalizeYakuResult,
  // 暴露内部函数便于测试
  checkKokushiMusou,
  checkKokushiMusou13men,
  checkChiitoitsu,
  checkChuurenPoutou,
  checkJunseiChuurenPoutou,
  checkCompositionYaku,
  findAllPartitions,
  checkStructureYaku,
  checkHonorYaku,
  parseContext,
  checkContextYaku,
  YAKU_HAN,
  MENZEN_ONLY_YAKU
};
