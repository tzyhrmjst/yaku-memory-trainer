// 手牌分析器测试脚本
// 用法: node scripts/test-hand-analyzer.js

var mt = require('../utils/mahjongTiles');
var sc = require('../utils/shantenCalculator');
var uc = require('../utils/ukeireCalculator');
var ya = require('../utils/yakuAdvisor');
var ha = require('../utils/handAnalyzer');

var passed = 0;
var failed = 0;
var tests = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (e) {
    failed++;
    console.log('  FAIL: ' + name);
    console.log('    ' + e.message);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || '') + ' expected ' + expected + ' but got ' + actual);
  }
}

function assertArrayEqual(actual, expected, msg) {
  if (actual.length !== expected.length) {
    throw new Error((msg || '') + ' length mismatch: ' + actual.length + ' vs ' + expected.length);
  }
  for (var i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error((msg || '') + ' at index ' + i + ': expected ' + expected[i] + ' but got ' + actual[i]);
    }
  }
}

// =========================================================================
// mahjongTiles 测试
// =========================================================================

console.log('\n=== mahjongTiles ===');

test('ALL_TILES has 34 entries', function () {
  assertEqual(mt.ALL_TILES.length, 34);
});

test('tileIndex maps correctly', function () {
  assertEqual(mt.tileIndex('1m'), 0);
  assertEqual(mt.tileIndex('9m'), 8);
  assertEqual(mt.tileIndex('1p'), 9);
  assertEqual(mt.tileIndex('1s'), 18);
  assertEqual(mt.tileIndex('1z'), 27);
  assertEqual(mt.tileIndex('7z'), 33);
});

test('sortTiles sorts correctly', function () {
  var sorted = mt.sortTiles(['5m', '1m', '1z', '9m', '1p']);
  assertArrayEqual(sorted, ['1m', '5m', '9m', '1p', '1z']);
});

test('tilesToCounts and countsToTiles roundtrip', function () {
  var tiles = ['1m', '2m', '3m', '1p', '1p', '1z'];
  var counts = mt.tilesToCounts(tiles);
  var restored = mt.countsToTiles(counts);
  assertArrayEqual(mt.sortTiles(tiles), restored);
});

test('validateTiles accepts valid 14-tile hand', function () {
  var tiles = ['1m', '2m', '3m', '2p', '3p', '4p', '3s', '4s', '5s', '6s', '7s', '8s', '5m', '5m'];
  var errors = mt.validateTiles(tiles);
  assertEqual(errors.length, 0, 'should have no errors, got: ' + JSON.stringify(errors));
});

test('validateTiles rejects non-14 hand', function () {
  var errors = mt.validateTiles(['1m', '2m', '3m']);
  assertEqual(errors.length > 0, true, 'should have errors');
});

test('validateTiles rejects >4 copies', function () {
  var tiles = ['1m', '1m', '1m', '1m', '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1p'];
  var errors = mt.validateTiles(tiles);
  assertEqual(
    errors.some(function (e) {
      return e.indexOf('不能超过 4 张') >= 0;
    }),
    true,
  );
});

test('validateTiles rejects unknown encoding', function () {
  var errors = mt.validateTiles(['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1p', '2p', '3p', '4p', '東']);
  assertEqual(
    errors.some(function (e) {
      return e.indexOf('未知牌') >= 0;
    }),
    true,
  );
});

test('tileDisplay returns Chinese name for honors', function () {
  assertEqual(mt.tileDisplay('1z'), '東');
  assertEqual(mt.tileDisplay('5z'), '白');
  assertEqual(mt.tileDisplay('3m'), '三万');
  assertEqual(mt.tileDisplay('5p'), '五筒');
  assertEqual(mt.tileDisplay('9s'), '九索');
});

test('isOrphan identifies orphans correctly', function () {
  assertEqual(mt.isOrphan('1m'), true);
  assertEqual(mt.isOrphan('9s'), true);
  assertEqual(mt.isOrphan('1z'), true);
  assertEqual(mt.isOrphan('7z'), true);
  assertEqual(mt.isOrphan('5m'), false);
  assertEqual(mt.isOrphan('4p'), false);
});

test('buildTileGroups returns 4 groups', function () {
  var groups = mt.buildTileGroups();
  assertEqual(groups.length, 4);
  assertEqual(groups[0].title, '万子');
  assertEqual(groups[3].title, '字牌');
  assertEqual(groups[0].tiles.length, 9);
  assertEqual(groups[3].tiles.length, 7);
});

// =========================================================================
// shantenCalculator 测试
// =========================================================================

console.log('\n=== shantenCalculator ===');

// 和牌标准形
test('standard shanten -1 for complete hand', function () {
  var tiles = ['1m', '2m', '3m', '2p', '3p', '4p', '3s', '4s', '5s', '6s', '7s', '8s', '5m', '5m'];
  var counts = mt.tilesToCounts(tiles);
  assertEqual(sc.calcStandardShanten(counts), -1);
  assertEqual(sc.calcMinShanten(tiles), -1);
});

// 听牌标准形（13 张内部测试）
test('standard shanten 0 for tenpai (13 tiles)', function () {
  var tiles = ['1m', '2m', '3m', '2p', '3p', '4p', '3s', '4s', '5s', '6s', '7s', '8s', '5m'];
  var counts = mt.tilesToCounts(tiles);
  assertEqual(sc.calcStandardShanten(counts), 0);
});

// 一向听标准形
test('standard shanten 1 for iishanten', function () {
  // 3 组顺子 + 1 组搭子 + 无雀头 = 1 向听
  var tiles = ['1m', '2m', '3m', '2p', '3p', '4p', '3s', '4s', '5s', '6s', '7s', '9s', '5m', '1z'];
  var counts = mt.tilesToCounts(tiles);
  assertEqual(sc.calcStandardShanten(counts), 1);
});

// 七对子和牌
test('chiitoitsu shanten -1 for complete hand', function () {
  var tiles = ['1m', '1m', '3m', '3m', '5p', '5p', '7p', '7p', '2s', '2s', '9s', '9s', '5z', '5z'];
  var counts = mt.tilesToCounts(tiles);
  assertEqual(sc.calcChiitoitsuShanten(counts), -1);
});

// 七对子一向听
test('chiitoitsu shanten 1 for 5 pairs with enough unique', function () {
  var tiles = ['1m', '1m', '3m', '3m', '5p', '5p', '7p', '7p', '2s', '2s', '9s', '4z', '5z', '6z'];
  var counts = mt.tilesToCounts(tiles);
  assertEqual(sc.calcChiitoitsuShanten(counts), 1);
});

// 四张同牌在七对子中只算一对
test('chiitoitsu handles 4 copies correctly', function () {
  var tiles = ['1m', '1m', '1m', '1m', '3m', '3m', '5p', '5p', '7p', '7p', '2s', '2s', '9s', '9s'];
  var counts = mt.tilesToCounts(tiles);
  // 1m×4 = 1 pair, plus 5 other pairs = 6 pairs
  // unique = 6 (1m,3m,5p,7p,2s,9s)
  // shanten = 6 - 6 + max(0, 7-6) = 0 + 1 = 1
  assertEqual(sc.calcChiitoitsuShanten(counts), 1);
});

// 国士和牌
test('kokushi shanten -1 for complete hand', function () {
  var tiles = ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z', '7z'];
  var counts = mt.tilesToCounts(tiles);
  assertEqual(sc.calcKokushiShanten(counts), -1);
});

// 国士 13 面听（14 张含 13 种幺九 + 1 张多余非幺九）
test('kokushi shanten 0 for 13 orphans + 1 junk (tenpai)', function () {
  var tiles = ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z', '5m'];
  var counts = mt.tilesToCounts(tiles);
  // 13 unique orphans + 1 non-orphan → discard non-orphan → tenpai
  assertEqual(sc.calcKokushiShanten(counts), 0);
});

// 国士听牌（12种幺九+对子+1张杂牌，切杂牌后单骑听牌）
test('kokushi shanten 0 for 12 orphans + pair + 1 junk', function () {
  var tiles = ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '6z', '5m'];
  var counts = mt.tilesToCounts(tiles);
  // 12 unique orphans (missing 7z), 6z paired, 5m junk
  // Discard 5m → 12 unique + pair → shanten 0 (tenpai, waiting for 7z)
  assertEqual(sc.calcKokushiShanten(counts), 0);
});

// 无效：5 张相同牌（在 validateTiles 层拦截）
test('validateTiles catches 5 copies', function () {
  var tiles = ['1m', '1m', '1m', '1m', '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1p'];
  var errors = mt.validateTiles(tiles);
  assertEqual(errors.length > 0, true);
});

// 综合向听取三路最低
test('calcShanten returns all three shanten values', function () {
  var tiles = ['1m', '2m', '3m', '2p', '3p', '4p', '3s', '4s', '5s', '6s', '7s', '8s', '5m', '5m'];
  var result = sc.calcShanten(tiles);
  assertEqual(result.standard, -1);
  assertEqual(typeof result.chiitoitsu, 'number');
  assertEqual(typeof result.kokushi, 'number');
});

// 边张/嵌张向听正确
test('standard shanten handles penchan and kanchan', function () {
  // 12 + 89 边张：需要 3 来形成顺子
  var tiles = ['1m', '2m', '8m', '9m', '2p', '3p', '4p', '3s', '4s', '5s', '6s', '7s', '5m', '5m'];
  var counts = mt.tilesToCounts(tiles);
  // 1m,2m (penchan), 8m,9m (penchan), 2p-3p-4p (seq), 3s-4s-5s (seq), 6s-7s (ryanmen), 5m×2 (pair)
  // melds: 2p-3p-4p (meld1), 3s-4s-5s (meld2) = 2 melds
  // taatsu: 加 1m-2m (penchan), 8m-9m (penchan), 6s-7s (ryanmen) = 3 taatsu, capped at 4-2=2
  // pair: 5m-5m
  // score = 2*2 + 2 + 1 = 7, shanten = 8 - 7 = 1
  assertEqual(sc.calcStandardShanten(counts), 1);
});

// =========================================================================
// 切牌建议稳定性测试
// =========================================================================

console.log('\n=== 切牌稳定性 ===');

test('discard should prefer isolated tile over completed sequence', function () {
  // 手牌: 2m-3m-4m (seq), 3p-4p-5p (seq), 4s-5s-6s (seq), 7s-8s (ryanmen waiting), 3z×2 (pair) + 9m (isolated)
  var tiles = ['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7s', '8s', '3z', '3z', '9m'];
  var counts = mt.tilesToCounts(tiles);

  // 切 9m 后向听
  var afterDiscard9m = counts.slice();
  afterDiscard9m[mt.tileIndex('9m')]--;
  var shanten9m = sc.calcStandardShanten(afterDiscard9m);
  assertEqual(shanten9m, 0, '切 9m 后应为听牌');

  // 切 2m（顺子核心牌）后向听
  var afterDiscard2m = counts.slice();
  afterDiscard2m[mt.tileIndex('2m')]--;
  var shanten2m = sc.calcStandardShanten(afterDiscard2m);
  // 切顺子核心牌应该不减或增加向听
  assertEqual(shanten2m >= shanten9m, true, '切核心牌不应比切孤立牌更优');
});

// =========================================================================
// ukeireCalculator 测试
// =========================================================================

console.log('\n=== ukeireCalculator ===');

test('ukeire reduces shanten for proper discard', function () {
  var tiles = ['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7s', '8s', '3z', '3z', '9m'];
  var counts = mt.tilesToCounts(tiles);
  var results = uc.calcAllUkeire(counts, null);

  // 应该返回多个切牌候选
  assertEqual(results.length > 0, true, '应有切牌候选');

  // 切 9m（孤立牌）应返回有效进张
  var discard9m = results.filter(function (r) {
    return r.discardTile === '9m';
  })[0];
  assertEqual(discard9m !== undefined, true, '应有切 9m 的候选');
  assertEqual(discard9m.shantenAfterDiscard, 0, '切 9m 后应为听牌');
  assertEqual(discard9m.ukeireKinds > 0, true, '切 9m 后应有有效进张');
});

test('ukeire skips tiles with 4 copies already used', function () {
  var tiles = ['1m', '1m', '1m', '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '1p', '2p'];
  var counts = mt.tilesToCounts(tiles);
  var results = uc.calcAllUkeire(counts, null);

  // 1m 已经 4 张，不应出现在任何有效进张中
  for (var i = 0; i < results.length; i++) {
    assertEqual(
      results[i].ukeireTiles.indexOf('1m'),
      -1,
      '切 ' + results[i].discardTile + ' 的有效牌不应含 1m（已满 4 张）',
    );
  }
});

test('ukeire respects visibleTiles', function () {
  var tiles = ['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7s', '8s', '3z', '3z', '9m'];
  var counts = mt.tilesToCounts(tiles);
  var visibleCounts = mt.tilesToCounts(['1m', '1m', '1m', '1m']); // 1m 已全部可见

  var results = uc.calcAllUkeire(counts, visibleCounts);
  for (var i = 0; i < results.length; i++) {
    assertEqual(results[i].ukeireTiles.indexOf('1m'), -1, '有效牌不应含已全部可见的 1m');
  }
});

// =========================================================================
// yakuAdvisor 测试
// =========================================================================

console.log('\n=== yakuAdvisor ===');

test('yakuAdvisor returns top 3 yaku', function () {
  var tiles = ['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7s', '8s', '5m', '5m', '1z'];
  var counts = mt.tilesToCounts(tiles);
  var results = ya.evaluateYaku(counts);

  assertEqual(results.length, 3, '应返回前 3 个役种');
  assertEqual(typeof results[0].id, 'string');
  assertEqual(typeof results[0].name, 'string');
  assertEqual(typeof results[0].score, 'number');
  assertEqual(results[0].score > 0, true, '最高分应大于 0');
});

test('tanyao scores high for all 2-8 tiles', function () {
  var tiles = ['2m', '3m', '4m', '2p', '3p', '4p', '3s', '4s', '5s', '6s', '7s', '8s', '5m', '5m'];
  var counts = mt.tilesToCounts(tiles);
  var results = ya.evaluateYaku(counts);

  var tanyao = results.filter(function (r) {
    return r.id === 'tanyao';
  })[0];
  assertEqual(tanyao !== undefined, true, '应包含断幺九评估');
  assertEqual(tanyao.score >= 90, true, '纯 2-8 手牌断幺分应很高');
});

test('kokushi scores high for many orphans', function () {
  var tiles = ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z', '5m'];
  var counts = mt.tilesToCounts(tiles);
  var results = ya.evaluateYaku(counts);

  var kokushi = results.filter(function (r) {
    return r.id === 'kokushi_musou';
  })[0];
  assertEqual(kokushi !== undefined, true, '应包含国士无双评估');
  assertEqual(kokushi.score >= 70, true, '13 种幺九应有高分');
});

// =========================================================================
// handAnalyzer 集成测试
// =========================================================================

console.log('\n=== handAnalyzer 集成 ===');

test('analyzeHand rejects invalid input', function () {
  var result = ha.analyzeHand({ tiles: ['1m', '2m'] });
  assertEqual(result.valid, false);
  assertEqual(result.errors.length > 0, true);
});

test('analyzeHand accepts valid 14-tile hand', function () {
  var tiles = ['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7s', '8s', '3z', '3z', '9m'];
  var result = ha.analyzeHand({ tiles: tiles });

  assertEqual(result.valid, true);
  assertEqual(result.summary.tileCount, 14);
  assertEqual(typeof result.summary.shanten, 'number');
  assertEqual(result.discards.length > 0, true);
  assertEqual(result.closestYaku.length, 3);
});

test('analyzeHand recommends discarding isolated tile', function () {
  var tiles = ['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7s', '8s', '3z', '3z', '9m'];
  var result = ha.analyzeHand({ tiles: tiles });

  // 推荐切牌应该是 9m（孤立牌）而不是顺子核心牌
  var top = result.discards[0];
  assertEqual(top.recommended, true);
  assertEqual(top.tile === '9m' || top.tile === '3z', true, '推荐切牌应为孤立牌 9m 或客风 3z，实际: ' + top.tile);
});

test('analyzeHand complete hand shows shanten -1', function () {
  var tiles = ['1m', '2m', '3m', '2p', '3p', '4p', '3s', '4s', '5s', '6s', '7s', '8s', '5m', '5m'];
  var result = ha.analyzeHand({ tiles: tiles });

  assertEqual(result.valid, true);
  assertEqual(result.summary.shanten, -1);
});

test('analyzeHand summary text is generated', function () {
  var tiles = ['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7s', '8s', '3z', '3z', '9m'];
  var result = ha.analyzeHand({ tiles: tiles });

  assertEqual(typeof result.summary.text, 'string');
  assertEqual(result.summary.text.length > 0, true);
});

test('analyzeHand discards have no duplicate candidates', function () {
  var tiles = ['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '7s', '8s', '3z', '3z', '9m'];
  var result = ha.analyzeHand({ tiles: tiles });

  var seen = {};
  for (var i = 0; i < result.discards.length; i++) {
    var t = result.discards[i].tile;
    assertEqual(!!seen[t], false, '切牌 ' + t + ' 重复出现');
    seen[t] = true;
  }
});

// =========================================================================
// 结果
// =========================================================================

console.log('\n=== 结果 ===');
console.log('通过: ' + passed);
console.log('失败: ' + failed);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n全部测试通过！');
}
