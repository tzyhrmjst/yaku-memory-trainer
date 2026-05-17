// 算分随机生成器测试 — 批量生成并校验
var srg = require('../utils/scoreRandomQuestionGenerator');
var sc = require('../utils/scoreCalculator');
var dora = require('../utils/dora');

var passed = 0;
var failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.log('  FAIL: ' + msg); }
}

function testBatch(label, difficulty, count) {
  console.log('\n=== ' + label + ' (' + difficulty + ' x' + count + ') ===');
  var batchPassed = 0;
  var batchFailed = 0;
  var doraQuestions = 0;
  var totalBaseHan = 0;

  for (var i = 0; i < count; i++) {
    var q = srg.buildRandomScoreQuestion({ difficulty: difficulty, maxAttempts: 80 });
    if (!q) {
      console.log('  SKIP: question ' + i + ' returned null (template fallback would be used)');
      continue;
    }

    var ok = true;
    var a = q.answer;
    var ctx = q.context;

    // 1. 同种牌不超过4张
    var tileCounts = {};
    q.tiles.forEach(function (t) {
      var n = dora.normalizeTile(t);
      tileCounts[n] = (tileCounts[n] || 0) + 1;
    });
    for (var t in tileCounts) {
      if (tileCounts[t] > 4) {
        assert(false, q.id + ': tile ' + t + ' count=' + tileCounts[t] + ' > 4');
        ok = false;
      }
    }

    // 2. 赤五与普通五合计不超过4
    var fiveCounts = {};
    q.tiles.forEach(function (t) {
      var n = dora.normalizeTile(t);
      if (n === '5m' || n === '5p' || n === '5s') {
        fiveCounts[n] = (fiveCounts[n] || 0) + 1;
      }
    });
    for (var t in fiveCounts) {
      if (fiveCounts[t] > 4) {
        assert(false, q.id + ': five ' + t + ' total=' + fiveCounts[t] + ' > 4');
        ok = false;
      }
    }

    // 3. 至少有一个非宝牌役 (baseYakuHan > 0)
    assert(a.yaku.filter(function (y) { return y.id !== 'dora'; }).length > 0,
      q.id + ': no non-dora yaku');

    // 4. answer.han = 非宝牌役番 + 宝牌番
    var yakuHanSum = a.yaku.reduce(function (s, y) { return s + y.han; }, 0);
    assert(yakuHanSum === a.han, q.id + ': yaku han sum=' + yakuHanSum + ' !== answer.han=' + a.han);

    // 5. answer.pointText 与 scoreCalculator 一致
    try {
      var calcResult = sc.calculatePoints({
        han: a.han, fu: a.fu,
        winMethod: ctx.winMethod, isDealer: ctx.isDealer
      });
      assert(calcResult.pointText === a.pointText,
        q.id + ': pointText mismatch template=' + a.pointText + ' calc=' + calcResult.pointText);
    } catch (e) {
      assert(false, q.id + ': scoreCalculator error: ' + e.message);
      ok = false;
    }

    // 6. doraDisplays 与 doraIndicators 数量一致
    if (ctx.doraDisplays) {
      assert(ctx.doraDisplays.length === ctx.doraIndicators.length,
        q.id + ': doraDisplays=' + ctx.doraDisplays.length + ' !== indicators=' + ctx.doraIndicators.length);
    }

    // 7. 宝牌计数一致性
    if (ctx.doraIndicators && ctx.doraIndicators.length > 0) {
      var actualDora = dora.countDora(q.tiles, ctx.doraIndicators, true);
      assert(actualDora === ctx.doraCount,
        q.id + ': dora count mismatch actual=' + actualDora + ' context=' + ctx.doraCount);
    }

    // 8. fuDetails 非空（非役满时）
    var isYakuman = a.han >= 13;
    if (!isYakuman) {
      assert(a.fuDetails && a.fuDetails.length > 0, q.id + ': fuDetails empty for non-yakuman');
    }

    // 统计
    if (ctx.doraCount > 0) doraQuestions++;
    totalBaseHan += a.han - ctx.doraCount;

    if (ok) batchPassed++;
    else batchFailed++;
  }

  var total = batchPassed + batchFailed;
  var doraRate = total > 0 ? (doraQuestions / total * 100).toFixed(1) : 'N/A';
  console.log('  result: ' + batchPassed + '/' + total + ' passed');
  console.log('  dora questions: ' + doraQuestions + '/' + total + ' (' + doraRate + '%)');

  return { passed: batchPassed, failed: batchFailed, doraQuestions: doraQuestions, total: total };
}

console.log('=== 算分随机生成器测试 ===');

var totalPassed = 0;
var totalFailed = 0;

// 测试入门 500 题
var r1 = testBatch('入门批量', 'basic', 500);
totalPassed += r1.passed;
totalFailed += r1.failed;

// 测试进阶 500 题
var r2 = testBatch('进阶批量', 'advanced', 500);
totalPassed += r2.passed;
totalFailed += r2.failed;

// 宝牌占比校验
console.log('\n=== 宝牌占比校验 ===');
var basicDoraRate = r1.total > 0 ? r1.doraQuestions / r1.total : 0;
var advDoraRate = r2.total > 0 ? r2.doraQuestions / r2.total : 0;

console.log('basic dora rate: ' + (basicDoraRate * 100).toFixed(1) + '% (expected 15~55%)');
console.log('advanced dora rate: ' + (advDoraRate * 100).toFixed(1) + '% (expected 30~85%)');

assert(basicDoraRate >= 0.15 && basicDoraRate <= 0.55,
  'basic dora rate ' + (basicDoraRate * 100).toFixed(1) + '% out of range [15%, 55%]');
assert(advDoraRate >= 0.30 && advDoraRate <= 0.85,
  'advanced dora rate ' + (advDoraRate * 100).toFixed(1) + '% out of range [30%, 85%]');

console.log('\n===== 总计 =====');
console.log('总通过: ' + (totalPassed + passed) + ', 总失败: ' + (totalFailed + failed));
if (totalFailed + failed > 0) process.exit(1);
