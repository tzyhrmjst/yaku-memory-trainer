// 手牌算法生成器 — 根据役种条件实时构造合法手牌
const yakus = require('../data/yakus');

// =========================================================================
// Layer 1: 牌种常量与工具函数
// =========================================================================

const MAN_TILES   = ['1m','2m','3m','4m','5m','6m','7m','8m','9m'];
const PIN_TILES   = ['1p','2p','3p','4p','5p','6p','7p','8p','9p'];
const SOU_TILES   = ['1s','2s','3s','4s','5s','6s','7s','8s','9s'];
const HONOR_TILES = ['1z','2z','3z','4z','5z','6z','7z'];
const SUITS = ['m', 'p', 's'];

const TANYAO_POOL     = [].concat(MAN_TILES.slice(1, 8), PIN_TILES.slice(1, 8), SOU_TILES.slice(1, 8));
const TERMINAL_POOL   = ['1m','9m','1p','9p','1s','9s'];
const GREEN_POOL      = ['2s','3s','4s','6s','8s','6z'];
const ORPHAN_POOL     = ['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z'];
const DRAGON_POOL     = ['5z','6z','7z'];
const WIND_POOL       = ['1z','2z','3z','4z'];

function suitOf(tile) {
  return tile[1];
}

function numOf(tile) {
  return parseInt(tile[0], 10);
}

function isHonor(tile) {
  return suitOf(tile) === 'z';
}

function isTerminal(tile) {
  if (isHonor(tile)) return false;
  var n = numOf(tile);
  return n === 1 || n === 9;
}

function isDragon(tile) {
  return isHonor(tile) && numOf(tile) >= 5;
}

function isWind(tile) {
  return isHonor(tile) && numOf(tile) <= 4;
}

function tileKey(suit, num) {
  return String(num) + suit;
}

function shuffle(arr) {
  var result = arr.slice();
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

// =========================================================================
// Layer 2: 面子/雀头构造函数
// =========================================================================

function makeSequence(suit, startNum) {
  return [tileKey(suit, startNum), tileKey(suit, startNum + 1), tileKey(suit, startNum + 2)];
}

function makeTriplet(kind) {
  return [kind, kind, kind];
}

function makePair(kind) {
  return [kind, kind];
}

// =========================================================================
// Layer 3: 用量追踪 + 随机选取
// =========================================================================

function createUsageTracker() {
  var counts = {};

  function key(k) {
    return k;
  }

  return {
    count: function(k) {
      return counts[key(k)] || 0;
    },
    canAdd: function(k, need) {
      return (counts[key(k)] || 0) + need <= 4;
    },
    add: function(k, need) {
      var kk = key(k);
      counts[kk] = (counts[kk] || 0) + need;
    },
    clone: function() {
      var c = createUsageTracker();
      for (var kk in counts) {
        if (counts.hasOwnProperty(kk)) {
          c.add(kk, counts[kk]);
        }
      }
      return c;
    },
    getCounts: function() {
      return counts;
    }
  };
}

function randomPair(allowedKinds, usage) {
  var available = allowedKinds.filter(function(k) {
    return usage.canAdd(k, 2);
  });
  if (available.length === 0) return null;

  var kind = available[Math.floor(Math.random() * available.length)];
  usage.add(kind, 2);
  return makePair(kind);
}

function randomTriplet(allowedKinds, usage) {
  var available = allowedKinds.filter(function(k) {
    return usage.canAdd(k, 3);
  });
  if (available.length === 0) return null;

  var kind = available[Math.floor(Math.random() * available.length)];
  usage.add(kind, 3);
  return makeTriplet(kind);
}

function randomSequence(allowedSuits, allowedStartNums, usage, allowedPool) {
  if (!allowedStartNums || allowedStartNums.length === 0) {
    allowedStartNums = [1, 2, 3, 4, 5, 6, 7];
  }
  if (!allowedSuits || allowedSuits.length === 0) {
    allowedSuits = SUITS;
  }

  var candidates = [];
  for (var s = 0; s < allowedSuits.length; s++) {
    for (var n = 0; n < allowedStartNums.length; n++) {
      var tiles = makeSequence(allowedSuits[s], allowedStartNums[n]);
      var ok = true;
      var needed = {};
      for (var t = 0; t < tiles.length; t++) {
        var tile = tiles[t];
        // 若指定了牌池，则顺子的每一张牌都必须在池中
        if (allowedPool && allowedPool.indexOf(tile) === -1) {
          ok = false;
          break;
        }
        needed[tile] = (needed[tile] || 0) + 1;
      }
      if (!ok) continue;
      for (var tile in needed) {
        if (needed.hasOwnProperty(tile) && !usage.canAdd(tile, needed[tile])) {
          ok = false;
          break;
        }
      }
      if (ok) {
        candidates.push(tiles);
      }
    }
  }

  if (candidates.length === 0) return null;

  var picked = candidates[Math.floor(Math.random() * candidates.length)];
  for (var i = 0; i < picked.length; i++) {
    usage.add(picked[i], 1);
  }
  return picked;
}

// =========================================================================
// Layer 4: 通用手牌构建工具
// =========================================================================

function buildHand(groups, pair) {
  var tiles = [];
  for (var g = 0; g < groups.length; g++) {
    for (var t = 0; t < groups[g].length; t++) {
      tiles.push(groups[g][t]);
    }
  }
  for (var p = 0; p < pair.length; p++) {
    tiles.push(pair[p]);
  }
  return tiles;
}

function pickWinTile(groups, pair, forcePair) {
  // 随机选最后完成的一组面子或雀头中的一张作为和了牌
  var candidates;
  if (forcePair) {
    // 四杠子等特殊役种：只能荣和/自摸雀头
    candidates = pair;
  } else if (Math.random() < 0.4 && pair.length > 0) {
    candidates = pair;
  } else if (groups.length > 0) {
    var g = groups[Math.floor(Math.random() * groups.length)];
    candidates = g;
  } else {
    candidates = pair;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickPinfuWinTile(groups) {
  var candidates = [];
  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    if (group.length !== 3) continue;
    if (suitOf(group[0]) === 'z') continue;

    var nums = group.map(numOf).sort(function(a, b) { return a - b; });
    if (nums[1] !== nums[0] + 1 || nums[2] !== nums[1] + 1) continue;

    if (nums[0] <= 6) candidates.push(tileKey(suitOf(group[0]), nums[0]));
    if (nums[0] >= 2) candidates.push(tileKey(suitOf(group[0]), nums[2]));
  }
  if (candidates.length === 0) return pickWinTile(groups, []);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function isSequenceGroup(group) {
  if (!group || group.length !== 3) return false;
  if (suitOf(group[0]) === 'z') return false;
  var nums = group.map(numOf).sort(function(a, b) { return a - b; });
  return nums[1] === nums[0] + 1 && nums[2] === nums[1] + 1;
}

function sequenceKey(group) {
  if (!isSequenceGroup(group)) return null;
  var nums = group.map(numOf).sort(function(a, b) { return a - b; });
  return suitOf(group[0]) + '_' + nums[0];
}

function hasHonorTile(groups, pair) {
  var allGroups = groups.concat([pair]);
  for (var g = 0; g < allGroups.length; g++) {
    for (var t = 0; t < allGroups[g].length; t++) {
      if (isHonor(allGroups[g][t])) return true;
    }
  }
  return false;
}

// 从牌池随机构建4组面子+1雀头的手牌
function generateRestrictedHand(pool, options) {
  options = options || {};
  var allowSequences = options.allowSequences !== false;
  var allowTriplets = options.allowTriplets !== false;
  var allowedSuits = options.allowedSuits || SUITS;
  var allowedSeqStartNums = options.allowedSeqStartNums || null;
  var pairPool = options.pairPool || pool;
  var tripletPool = options.tripletPool || pool;

  for (var attempt = 0; attempt < 50; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    for (var g = 0; g < 4; g++) {
      var group = null;
      if (allowSequences && allowTriplets) {
        if (Math.random() < 0.6) {
          group = randomSequence(allowedSuits, allowedSeqStartNums, usage, pool);
        }
        if (!group) {
          group = randomTriplet(tripletPool, usage);
        }
        if (!group && allowSequences) {
          group = randomSequence(allowedSuits, allowedSeqStartNums, usage, pool);
        }
      } else if (allowTriplets) {
        group = randomTriplet(tripletPool, usage);
      } else if (allowSequences) {
        group = randomSequence(allowedSuits, allowedSeqStartNums, usage, pool);
      }

      if (!group) break;
      groups.push(group);
    }

    if (groups.length < 4) continue;

    var pair = randomPair(pairPool, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return { tiles: tiles, winTile: pickWinTile(groups, pair), groups: groups, pair: pair, usage: usage };
  }

  return null;
}

// 通用手牌（无役种约束，用于时机型）
function generateGenericHand() {
  // 时机役只需要一副普通和牌形，避免随机出到四暗刻等役满导致题目答案被覆盖。
  return {
    tiles: ['2m','3m','4m','5p','6p','7p','3s','4s','5s','6s','7s','8s','9s','9s'],
    winTile: '9s',
    groups: [
      makeSequence('m', 2),
      makeSequence('p', 5),
      makeSequence('s', 3),
      makeSequence('s', 6)
    ],
    pair: makePair('9s')
  };
}

// =========================================================================
// Layer 5: 分类生成器
// =========================================================================

// ---- D类: 特殊形状 ----

function generateChiitoitsu() {
  var usage = createUsageTracker();
  var usedKinds = {};
  var pairs = [];

  var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);

  for (var i = 0; i < 7; i++) {
    var available = allKinds.filter(function(k) {
      return !usedKinds[k] && usage.canAdd(k, 2);
    });
    if (available.length === 0) return null;

    var kind = available[Math.floor(Math.random() * available.length)];
    usedKinds[kind] = true;
    usage.add(kind, 2);
    pairs.push(makePair(kind));
  }

  var tiles = [];
  for (var p = 0; p < pairs.length; p++) {
    tiles.push(pairs[p][0]);
    tiles.push(pairs[p][1]);
  }
  tiles = shuffle(tiles);

  return {
    tiles: tiles,
    winTile: pairs[6][0],
    contextHint: '该手牌门前清，七对子形',
    groups: null,
    pair: null
  };
}

function generateKokushiMusou() {
  var base = ORPHAN_POOL.slice();
  var extra = base[Math.floor(Math.random() * base.length)];
  var tiles = base.concat([extra]);
  return {
    tiles: shuffle(tiles),
    winTile: extra,
    contextHint: '该手牌门前清，国士无双形',
    groups: null,
    pair: null
  };
}

function generateChuurenPoutou() {
  var suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  var base = [
    tileKey(suit, 1), tileKey(suit, 1), tileKey(suit, 1),
    tileKey(suit, 2), tileKey(suit, 3), tileKey(suit, 4),
    tileKey(suit, 5), tileKey(suit, 6), tileKey(suit, 7),
    tileKey(suit, 8), tileKey(suit, 9), tileKey(suit, 9), tileKey(suit, 9)
  ];
  var extra = tileKey(suit, Math.floor(Math.random() * 9) + 1);
  var tiles = base.concat([extra]);
  return {
    tiles: shuffle(tiles),
    winTile: extra,
    contextHint: '该手牌门前清，九莲宝灯形',
    groups: null,
    pair: null
  };
}

// ---- A类: 牌种限制 ----

function generateTanyao() {
  var result = generateRestrictedHand(TANYAO_POOL, {
    allowSequences: true,
    allowTriplets: true
  });
  if (!result) return null;
  result.contextHint = Math.random() < 0.5 ? '该手牌已副露（食替）' : '该手牌门前清';
  return result;
}

function generateHonitsu() {
  var suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  var suitTiles = (suit === 'm') ? MAN_TILES : (suit === 'p') ? PIN_TILES : SOU_TILES;
  var pool = suitTiles.concat(HONOR_TILES);

  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 随机决定荣誉牌组数(0-4)
    var honorGroups = Math.floor(Math.random() * 3) + 1;
    for (var h = 0; h < honorGroups && groups.length < 4; h++) {
      var triplet = randomTriplet(HONOR_TILES, usage);
      if (!triplet) break;
      groups.push(triplet);
    }

    // 剩余组用花色牌填充
    while (groups.length < 4) {
      var seq = null;
      if (Math.random() < 0.6) {
        seq = randomSequence([suit], null, usage);
      }
      if (!seq) {
        seq = randomTriplet(suitTiles, usage);
      }
      if (!seq) {
        seq = randomSequence([suit], null, usage);
      }
      if (!seq) break;
      groups.push(seq);
    }

    if (groups.length < 4) continue;

    // 雀头可以是荣誉牌或花色牌
    var pair = randomPair(pool, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateChinitsu() {
  var suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  var suitTiles = (suit === 'm') ? MAN_TILES : (suit === 'p') ? PIN_TILES : SOU_TILES;

  var result = generateRestrictedHand(suitTiles, {
    allowSequences: true,
    allowTriplets: true,
    allowedSuits: [suit]
  });
  if (!result) return null;
  result.contextHint = Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清';
  return result;
}

function generateTsuuiisou() {
  var result = generateRestrictedHand(HONOR_TILES, {
    allowSequences: false,
    allowTriplets: true
  });
  if (!result) return null;
  result.contextHint = Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清';
  return result;
}

function generateRyuuiisou() {
  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 必须使用绿一色牌池(2s3s4s6s8s6z)
    // 索子部分可以有序子或刻子；6z只能刻子
    while (groups.length < 4) {
      var group = null;
      // 50%概率尝试索子序子
      if (Math.random() < 0.5) {
        // 绿一色索子: 2s,3s,4s,6s,8s — 序子只有234
        group = randomSequence(['s'], [2], usage);
      }
      if (!group) {
        group = randomTriplet(GREEN_POOL, usage);
      }
      if (!group) {
        group = randomSequence(['s'], [2], usage);
      }
      if (!group) break;
      groups.push(group);
    }

    if (groups.length < 4) continue;

    var pair = randomPair(GREEN_POOL, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateChinroutou() {
  var result = generateRestrictedHand(TERMINAL_POOL, {
    allowSequences: false,
    allowTriplets: true
  });
  if (!result) return null;
  result.contextHint = Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清';
  return result;
}

function generateHonroutou() {
  var pool = TERMINAL_POOL.concat(HONOR_TILES);
  var result = generateRestrictedHand(pool, {
    allowSequences: false,
    allowTriplets: true
  });
  if (!result) return null;
  // 全刻子混老头若门清可能同时成为四暗刻，教学题中会被役满排他盖掉。
  result.contextHint = '该手牌已副露';
  return result;
}

function generateHonchantaiyaochuu() {
  // 每个面子必须包含至少1张幺九牌
  // 序子只允许1-2-3或7-8-9；刻子必须是幺九牌或字牌
  var seqStarts = [1, 7];
  var tripletPool = TERMINAL_POOL.concat(HONOR_TILES);

  for (var attempt = 0; attempt < 50; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    while (groups.length < 4) {
      var group = null;
      if (Math.random() < 0.5) {
        group = randomSequence(SUITS, seqStarts, usage);
      }
      if (!group) {
        group = randomTriplet(tripletPool, usage);
      }
      if (!group) {
        group = randomSequence(SUITS, seqStarts, usage);
      }
      if (!group) break;
      groups.push(group);
    }

    if (groups.length < 4) continue;
    if (!groups.some(isSequenceGroup)) continue;

    var pair = randomPair(tripletPool, usage);
    if (!pair) continue;
    if (!hasHonorTile(groups, pair)) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateJunchanTaiyaochuu() {
  // 和honchantaiyaochuu一样但无字牌
  var seqStarts = [1, 7];
  var tripletPool = TERMINAL_POOL;

  for (var attempt = 0; attempt < 50; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    while (groups.length < 4) {
      var group = null;
      if (Math.random() < 0.5) {
        group = randomSequence(SUITS, seqStarts, usage);
      }
      if (!group) {
        group = randomTriplet(tripletPool, usage);
      }
      if (!group) {
        group = randomSequence(SUITS, seqStarts, usage);
      }
      if (!group) break;
      groups.push(group);
    }

    if (groups.length < 4) continue;
    if (!groups.some(isSequenceGroup)) continue;

    var pair = randomPair(TERMINAL_POOL, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

// ---- C类: 役牌型 ----

function generateYakuhai() {
  var honor = shuffle(DRAGON_POOL)[0];

  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 必需的荣誉牌刻子
    var honorGroup = makeTriplet(honor);
    for (var i = 0; i < 3; i++) usage.add(honor, 1);
    groups.push(honorGroup);

    // 剩余3组随机
    var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);
    while (groups.length < 4) {
      var group = null;
      if (Math.random() < 0.6) {
        group = randomSequence(SUITS, null, usage);
      }
      if (!group) {
        group = randomTriplet(allKinds, usage);
      }
      if (!group) {
        group = randomSequence(SUITS, null, usage);
      }
      if (!group) break;
      groups.push(group);
    }

    if (groups.length < 4) continue;

    var pair = randomPair(allKinds, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: '该手牌已副露，含三元牌刻子',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateShousangen() {
  var dragons = shuffle(DRAGON_POOL);
  var tripletDragons = dragons.slice(0, 2);
  var pairDragon = dragons[2];

  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 2组三元牌刻子
    for (var d = 0; d < 2; d++) {
      var tg = makeTriplet(tripletDragons[d]);
      for (var i = 0; i < 3; i++) usage.add(tripletDragons[d], 1);
      groups.push(tg);
    }

    // 剩余2组随机
    var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);
    while (groups.length < 4) {
      var group = null;
      if (Math.random() < 0.6) {
        group = randomSequence(SUITS, null, usage);
      }
      if (!group) {
        group = randomTriplet(allKinds, usage);
      }
      if (!group) {
        group = randomSequence(SUITS, null, usage);
      }
      if (!group) break;
      groups.push(group);
    }

    if (groups.length < 4) continue;

    var pair = makePair(pairDragon);
    if (!usage.canAdd(pairDragon, 2)) continue;
    usage.add(pairDragon, 2);

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateDaisangen() {
  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 3组三元牌刻子
    for (var d = 0; d < 3; d++) {
      var dg = makeTriplet(DRAGON_POOL[d]);
      for (var i = 0; i < 3; i++) usage.add(DRAGON_POOL[d], 1);
      groups.push(dg);
    }

    // 剩余1组随机
    var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES);
    var group = randomSequence(SUITS, null, usage);
    if (!group) {
      group = randomTriplet(allKinds, usage);
    }
    if (!group) continue;
    groups.push(group);

    var pair = randomPair(allKinds, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateShousuushii() {
  var winds = shuffle(WIND_POOL);
  var tripletWinds = winds.slice(0, 3);
  var pairWind = winds[3];

  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 3组风牌刻子
    for (var w = 0; w < 3; w++) {
      var tw = makeTriplet(tripletWinds[w]);
      for (var i = 0; i < 3; i++) usage.add(tripletWinds[w], 1);
      groups.push(tw);
    }

    // 剩余1组随机
    var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES);
    var group = randomSequence(SUITS, null, usage);
    if (!group) {
      group = randomTriplet(allKinds, usage);
    }
    if (!group) continue;
    groups.push(group);

    var pair = makePair(pairWind);
    if (!usage.canAdd(pairWind, 2)) continue;
    usage.add(pairWind, 2);

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateDaisuushii() {
  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 4组风牌刻子
    for (var w = 0; w < 4; w++) {
      var tw = makeTriplet(WIND_POOL[w]);
      for (var i = 0; i < 3; i++) usage.add(WIND_POOL[w], 1);
      groups.push(tw);
    }

    // 雀头不能是风牌（已用尽）
    var nonWindKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, DRAGON_POOL);
    var pair = randomPair(nonWindKinds, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

// ---- B类: 牌型结构 ----

function generatePinfu() {
  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 4组顺子
    while (groups.length < 4) {
      var seq = randomSequence(SUITS, null, usage);
      if (!seq) break;
      groups.push(seq);
    }

    if (groups.length < 4) continue;

    // 雀头不能是三元牌/场风/自风，简化为: 用2-8数牌
    var pair = randomPair(TANYAO_POOL, usage);
    if (!pair) {
      // 兜底: 用任意非风非三元牌
      var nonYakuPairPool = [].concat(
        MAN_TILES, PIN_TILES, SOU_TILES
      );
      pair = randomPair(nonYakuPairPool, usage);
    }
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickPinfuWinTile(groups),
      contextHint: '该手牌门前清，以荣和方式获胜（未立直）',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateToitoiho() {
  var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);
  var result = generateRestrictedHand(allKinds, {
    allowSequences: false,
    allowTriplets: true
  });
  if (!result) return null;
  result.contextHint = '该手牌已副露';
  return result;
}

function generateIipeikou() {
  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 2组完全相同的顺子
    var suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    var startNum = Math.floor(Math.random() * 7) + 1;
    var seq1 = makeSequence(suit, startNum);

    // 检查各牌是否可用(需要2张)
    var canUse = true;
    for (var i = 0; i < seq1.length; i++) {
      if (!usage.canAdd(seq1[i], 2)) { canUse = false; break; }
    }
    if (!canUse) continue;

    for (var i = 0; i < seq1.length; i++) usage.add(seq1[i], 2);
    groups.push(seq1);
    groups.push(seq1.slice());

    // 剩余2组随机顺子(保持门前清)
    while (groups.length < 4) {
      var seq = randomSequence(SUITS, null, usage);
      if (seq && sequenceKey(seq) === (suit + '_' + startNum)) {
        for (var st = 0; st < seq.length; st++) {
          usage.add(seq[st], -1);
        }
        seq = null;
      }
      if (!seq) {
        // 如果序子不够，用刻子
        var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);
        seq = randomTriplet(allKinds, usage);
      }
      if (!seq) break;
      groups.push(seq);
    }

    if (groups.length < 4) continue;
    var seqCounts = {};
    for (var sg = 0; sg < groups.length; sg++) {
      var key = sequenceKey(groups[sg]);
      if (key) seqCounts[key] = (seqCounts[key] || 0) + 1;
    }
    var pairLikeSeqCount = Object.values(seqCounts).filter(function(c) { return c >= 2; }).length;
    if (pairLikeSeqCount !== 1) continue;

    var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);
    var pair = randomPair(allKinds, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: '该手牌门前清，未立直',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateRyanpeikou() {
  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 2对不同顺子(每组2个)
    var usedPatterns = {};
    for (var p = 0; p < 2; p++) {
      var suit, startNum, key;
      var tries = 0;
      do {
        suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        startNum = Math.floor(Math.random() * 7) + 1;
        key = suit + '_' + startNum;
        tries++;
      } while (usedPatterns[key] && tries < 50);

      if (usedPatterns[key]) break;
      usedPatterns[key] = true;

      var seq = makeSequence(suit, startNum);
      var canUse = true;
      for (var i = 0; i < seq.length; i++) {
        if (!usage.canAdd(seq[i], 2)) { canUse = false; break; }
      }
      if (!canUse) break;

      for (var i = 0; i < seq.length; i++) usage.add(seq[i], 2);
      groups.push(seq);
      groups.push(seq.slice());
    }

    if (groups.length < 4) continue;

    var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);
    var pair = randomPair(allKinds, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: '该手牌门前清，含两组一杯口',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateSanshokuDoujun() {
  var startNum = Math.floor(Math.random() * 7) + 1;

  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 万/饼/索各有相同数字的顺子
    var seqM = makeSequence('m', startNum);
    var seqP = makeSequence('p', startNum);
    var seqS = makeSequence('s', startNum);

    // 检查可用性(每种牌1张即可)
    var allSeqTiles = seqM.concat(seqP, seqS);
    var canUse = true;
    for (var i = 0; i < allSeqTiles.length; i++) {
      if (!usage.canAdd(allSeqTiles[i], 1)) { canUse = false; break; }
    }
    if (!canUse) continue;

    for (var i = 0; i < allSeqTiles.length; i++) usage.add(allSeqTiles[i], 1);
    groups.push(seqM);
    groups.push(seqP);
    groups.push(seqS);

    // 剩余1组随机
    var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);
    var lastGroup = randomSequence(SUITS, null, usage);
    if (!lastGroup) {
      lastGroup = randomTriplet(allKinds, usage);
    }
    if (!lastGroup) continue;
    groups.push(lastGroup);

    var pair = randomPair(allKinds, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateIttsuu() {
  var suit = SUITS[Math.floor(Math.random() * SUITS.length)];

  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 123+456+789同种
    var seq1 = makeSequence(suit, 1);
    var seq4 = makeSequence(suit, 4);
    var seq7 = makeSequence(suit, 7);

    var allSeqTiles = seq1.concat(seq4, seq7);
    var canUse = true;
    for (var i = 0; i < allSeqTiles.length; i++) {
      if (!usage.canAdd(allSeqTiles[i], 1)) { canUse = false; break; }
    }
    if (!canUse) continue;

    for (var i = 0; i < allSeqTiles.length; i++) usage.add(allSeqTiles[i], 1);
    groups.push(seq1);
    groups.push(seq4);
    groups.push(seq7);

    // 剩余1组(不能再用同花色以避免超4张)
    var otherSuits = SUITS.filter(function(s) { return s !== suit; });
    var lastGroup = randomSequence(otherSuits, null, usage);
    if (!lastGroup) {
      var otherPool = [];
      for (var s = 0; s < otherSuits.length; s++) {
        if (otherSuits[s] === 'm') otherPool = otherPool.concat(MAN_TILES);
        if (otherSuits[s] === 'p') otherPool = otherPool.concat(PIN_TILES);
        if (otherSuits[s] === 's') otherPool = otherPool.concat(SOU_TILES);
      }
      otherPool = otherPool.concat(HONOR_TILES);
      lastGroup = randomTriplet(otherPool, usage);
    }
    if (!lastGroup) continue;
    groups.push(lastGroup);

    var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);
    var pair = randomPair(allKinds, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateSanankou() {
  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 3组刻子
    var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);
    while (groups.length < 3) {
      var trip = randomTriplet(allKinds, usage);
      if (!trip) break;
      groups.push(trip);
    }

    if (groups.length < 3) continue;

    // 第4组可以是顺子或明刻
    var lastGroup = randomSequence(SUITS, null, usage);
    if (!lastGroup) {
      lastGroup = randomTriplet(allKinds, usage);
    }
    if (!lastGroup) continue;
    groups.push(lastGroup);

    var pair = randomPair(allKinds, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露（明顺子）' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

function generateSuuankou() {
  var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);
  var result = generateRestrictedHand(allKinds, {
    allowSequences: false,
    allowTriplets: true
  });
  if (!result) return null;
  result.contextHint = '该手牌门前清，自摸和牌';
  result.winTile = pickWinTile(result.groups, result.pair, false);
  if (result.winTile === result.pair[0]) {
    result.winTile = result.groups[0][0];
  }
  return result;
}

function generateSanshokuDoukou() {
  var num = Math.floor(Math.random() * 9) + 1;

  for (var attempt = 0; attempt < 30; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // 万/饼/索各一同数刻子
    var tripM = makeTriplet(tileKey('m', num));
    var tripP = makeTriplet(tileKey('p', num));
    var tripS = makeTriplet(tileKey('s', num));

    // 检查可用性(每刻用3张同种牌)
    if (!usage.canAdd(tileKey('m', num), 3) ||
        !usage.canAdd(tileKey('p', num), 3) ||
        !usage.canAdd(tileKey('s', num), 3)) continue;

    usage.add(tileKey('m', num), 3);
    usage.add(tileKey('p', num), 3);
    usage.add(tileKey('s', num), 3);
    groups.push(tripM);
    groups.push(tripP);
    groups.push(tripS);

    // 剩余1组(不能再用同数字的牌)
    var restrictedPool = [];
    for (var n = 1; n <= 9; n++) {
      if (n !== num) {
        restrictedPool.push(tileKey('m', n));
        restrictedPool.push(tileKey('p', n));
        restrictedPool.push(tileKey('s', n));
      }
    }
    restrictedPool = restrictedPool.concat(HONOR_TILES);

    var lastGroup = randomSequence(SUITS, [].concat(
      (num <= 7 && num >= 3) ? [] : [1,2,3,4,5,6,7].filter(function(x) {
        // 避免序子包含num
        return x !== num && x+1 !== num && x+2 !== num;
      })
    ), usage);
    // 简化: 直接用随机序子
    if (!lastGroup || lastGroup.length === 0) {
      lastGroup = randomSequence(SUITS, null, usage);
    }
    if (!lastGroup) {
      lastGroup = randomTriplet(restrictedPool, usage);
    }
    if (!lastGroup) continue;
    groups.push(lastGroup);

    var pair = randomPair(restrictedPool, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);
    return {
      tiles: tiles,
      winTile: pickWinTile(groups, pair),
      contextHint: Math.random() < 0.5 ? '该手牌已副露' : '该手牌门前清',
      groups: groups,
      pair: pair
    };
  }
  return null;
}

// ---- E类子: 槓子型 ----
// 生成含 N 组槓子的完整手牌（N∈[1,4]）
// 1槓=15张, 2槓=16张, 3槓=17张, 4槓=18张
function generateKanHand(numKans) {
  var allKinds = [].concat(MAN_TILES, PIN_TILES, SOU_TILES, HONOR_TILES);

  for (var attempt = 0; attempt < 50; attempt++) {
    var usage = createUsageTracker();
    var groups = [];

    // N 组槓子（每组 4 张相同牌）
    var shuffled = shuffle(allKinds);
    for (var k = 0; k < numKans; k++) {
      var kind = shuffled[k];
      if (!usage.canAdd(kind, 4)) { groups = null; break; }
      usage.add(kind, 4);
      groups.push([kind, kind, kind, kind]);
    }
    if (!groups || groups.length < numKans) continue;

    // 补足普通面子（3 张一组）至总共 4 组
    while (groups.length < 4) {
      var group = null;
      if (Math.random() < 0.6) {
        group = randomSequence(SUITS, null, usage);
      }
      if (!group) {
        group = randomTriplet(allKinds, usage);
      }
      if (!group) {
        group = randomSequence(SUITS, null, usage);
      }
      if (!group) break;
      groups.push(group);
    }
    if (groups.length < 4) continue;

    // 雀头
    var remaining = allKinds.filter(function(k) { return usage.canAdd(k, 2); });
    var pair = randomPair(remaining, usage);
    if (!pair) continue;

    var tiles = buildHand(groups, pair);

    // 验证：非槓子牌种不应出现4张（可能因刻子+顺子叠到4张）
    var quadKinds = 0;
    var kindCounts = {};
    for (var ti = 0; ti < tiles.length; ti++) {
      kindCounts[tiles[ti]] = (kindCounts[tiles[ti]] || 0) + 1;
    }
    for (var k in kindCounts) {
      if (kindCounts[k] >= 4) quadKinds++;
    }
    if (quadKinds !== numKans) continue;

    // 四杠子必须荣和/自摸雀头，不能从杠子里补牌
    var forcePairWin = numKans >= 4;
    return { tiles: tiles, winTile: pickWinTile(groups, pair, forcePairWin), groups: groups, pair: pair };
  }
  return null;
}

function generateRinshanKaihou() {
  var result = generateKanHand(1);
  if (!result) return null;
  result.contextHint = '该手牌已副露，开槓后以岭上牌自摸和牌';
  return result;
}

function generateSankantsu() {
  var result = generateKanHand(3);
  if (!result) return null;
  result.contextHint = '该玩家已副露，已开3次槓';
  return result;
}

function generateSuukantsu() {
  var result = generateKanHand(4);
  if (!result) return null;
  result.contextHint = '该玩家已副露，已开4次槓';
  return result;
}

// ---- E类: 时机型（通用手牌 + 特定contextHint） ----

var PROCEDURAL_HINTS = {
  'riichi': '该玩家已宣言立直，以荣和方式获胜',
  'mentsumo': '该手牌门前清，自摸和牌（未立直）',
  'rinshan_kaihou': '该手牌已副露，开槓后以岭上牌自摸和牌',
  'chankan': '该手牌已副露，抢槓荣和（别家加槓时和了该牌）',
  'haitei': '该手牌已副露，以海底牌（最后一张牌）自摸和牌',
  'houtei': '该手牌已副露，以河底牌（最后一张打出的牌）荣和'
};

function generateProcedural(yakuId) {
  var hand = generateGenericHand();
  if (!hand) return null;
  hand.contextHint = PROCEDURAL_HINTS[yakuId] || '';
  if (!hand.groups) hand.groups = null;
  if (!hand.pair) hand.pair = null;
  return hand;
}

// =========================================================================
// Layer 6: 主入口 + 容错
// =========================================================================

var GENERATORS = {
  // D类
  'chiitoitsu': generateChiitoitsu,
  'kokushi_musou': generateKokushiMusou,
  'chuuren_poutou': generateChuurenPoutou,
  // A类
  'tanyao': generateTanyao,
  'honitsu': generateHonitsu,
  'chinitsu': generateChinitsu,
  'tsuuiisou': generateTsuuiisou,
  'ryuuiisou': generateRyuuiisou,
  'chinroutou': generateChinroutou,
  'honroutou': generateHonroutou,
  'honchantaiyaochuu': generateHonchantaiyaochuu,
  'junchan_taiyaochuu': generateJunchanTaiyaochuu,
  // C类
  'yakuhai': generateYakuhai,
  'shousangen': generateShousangen,
  'daisangen': generateDaisangen,
  'shousuushii': generateShousuushii,
  'daisuushii': generateDaisuushii,
  // B类
  'pinfu': generatePinfu,
  'toitoiho': generateToitoiho,
  'iipeikou': generateIipeikou,
  'ryanpeikou': generateRyanpeikou,
  'sanshoku_doujun': generateSanshokuDoujun,
  'ittsuu': generateIttsuu,
  'sanshoku_doukou': generateSanshokuDoukou,
  'sanankou': generateSanankou,
  'suuankou': generateSuuankou,
  // E类
  'riichi': generateProcedural,
  'mentsumo': generateProcedural,
  'rinshan_kaihou': generateRinshanKaihou,
  'chankan': generateProcedural,
  'haitei': generateProcedural,
  'houtei': generateProcedural,
  'sankantsu': generateSankantsu,
  'suukantsu': generateSuukantsu
};

// 静态 fallback 表
var FALLBACK_TILES = {};
for (var i = 0; i < yakus.length; i++) {
  var y = yakus[i];
  if (y.exampleTiles && y.exampleTiles.length > 0) {
    FALLBACK_TILES[y.id] = y;
  }
}

function generateHand(yakuId, variant) {
  var generator = GENERATORS[yakuId];
  if (!generator) return null;

  // 尝试算法生成
  for (var attempt = 0; attempt < 3; attempt++) {
    try {
      var result = generator(yakuId, variant);
      if (result && result.tiles && result.tiles.length >= 14) {
      var hasOpen = (result.contextHint || '').indexOf('已副露') !== -1;
      return {
        tiles: result.tiles,
        winTile: result.winTile || '',
        contextHint: result.contextHint || '',
        excludeOptionIds: result.excludeOptionIds || [],
        groups: result.groups || null,
        pair: result.pair || null,
        hasOpenMeld: hasOpen
      };
      }
    } catch (e) {
      // 重试
    }
  }

  // Fallback 到静态数据
  var fallback = FALLBACK_TILES[yakuId];
  if (fallback) {
    return {
      tiles: fallback.exampleTiles,
      winTile: fallback.winTile || '',
      contextHint: fallback.contextHint || '',
      excludeOptionIds: fallback.excludeOptionIds || [],
      groups: null,
      pair: null,
      hasOpenMeld: false
    };
  }

  return null;
}

module.exports = {
  generateHand,
  // 暴露细粒度函数便于测试
  makeSequence,
  makeTriplet,
  makePair,
  createUsageTracker,
  randomPair,
  randomTriplet,
  randomSequence,
  generateRestrictedHand,
  generateGenericHand,
  // 常量
  TANYAO_POOL,
  TERMINAL_POOL,
  HONOR_TILES,
  GREEN_POOL,
  ORPHAN_POOL,
  DRAGON_POOL,
  WIND_POOL
};
