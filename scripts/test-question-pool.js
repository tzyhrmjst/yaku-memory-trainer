// 普通题库规则一致性检查

const questionEngine = require('../utils/questionEngine');
const yakuChecker = require('../utils/yakuChecker');

const KAN_YAKU = new Set(['rinshan_kaihou', 'sankantsu', 'suukantsu']);

let passed = 0;
let failed = 0;

function assert(name, condition, detail) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.log('  FAIL: ' + name);
    if (detail) console.log('    ' + detail);
  }
}

const pool = questionEngine.getFullPool();
const ids = {};

console.log('=== 普通题库规则一致性 ===');
console.log('题目总数: ' + pool.length);

pool.forEach(function(q) {
  assert(q.id + ' has id', !!q.id);
  assert(q.id + ' id unique', !ids[q.id]);
  ids[q.id] = true;

  assert(q.id + ' has 4 options', Array.isArray(q.options) && q.options.length === 4);
  assert(q.id + ' options unique',
    Array.isArray(q.options) && new Set(q.options).size === q.options.length);
  assert(q.id + ' answer index valid',
    Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length);

  if (q.type === 'tiles-to-yaku') {
    const raw = yakuChecker.checkAllYaku(q.tiles || [], {
      winTile: q.winTile || '',
      contextHint: q.context || ''
    });
    const normalized = yakuChecker.normalizeYakuResult(raw).ids;
    const allowsKanTileCount = KAN_YAKU.has(q.yakuId);

    assert(q.id + ' tile count valid',
      Array.isArray(q.tiles) && (allowsKanTileCount || q.tiles.length === 14),
      'len=' + (q.tiles && q.tiles.length));
    assert(q.id + ' target yaku satisfied',
      raw.indexOf(q.yakuId) !== -1,
      'target=' + q.yakuId + ', raw=' + raw.join(','));
    assert(q.id + ' target yaku survives normalization',
      normalized.indexOf(q.yakuId) !== -1,
      'target=' + q.yakuId + ', normalized=' + normalized.join(','));
  }

  if (q.type === 'def-to-condition') {
    assert(q.id + ' condition answer appears in explanation',
      q.explanation && q.explanation.indexOf(q.options[q.answer]) !== -1);
  }
});

console.log('');
console.log('通过: ' + passed + ', 失败: ' + failed);
if (failed > 0) process.exit(1);
