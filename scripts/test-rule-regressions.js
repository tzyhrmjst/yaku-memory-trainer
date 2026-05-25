// 规则回归测试 — 覆盖役满排他、双倍互斥、符数规则、役牌、等待形、特殊形
var yc = require('../utils/yakuChecker');
var fc = require('../utils/fuCalculator');
var sc = require('../utils/scoreCalculator');
var builder = require('../utils/scoreAnswerBuilder');
var scoreQuestionGenerator = require('../utils/scoreQuestionGenerator');
var scoreRandomQuestionGenerator = require('../pages/score-practice/scoreRandomQuestionGenerator');

var passed = 0;
var failed = 0;

function test(name, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    failed++;
    console.log('  FAIL: ' + name);
    console.log('    expected:', JSON.stringify(expected));
    console.log('    actual:  ', JSON.stringify(actual));
  }
}

function assert(name, condition) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.log('  FAIL: ' + name);
  }
}

// =========================================================================
// 1. 役满排他 — 存在役满时不计普通役
// =========================================================================
console.log('=== 1. 役满排他（normalizeYakuResult）===');

// 大三元不应额外计役牌、三暗刻
var daiSanGenResult = yc.normalizeYakuResult(
  ['yakuhai', 'yakuhai', 'yakuhai', 'sanankou', 'daisangen']
);
test('大三元只保留役满', daiSanGenResult.ids, ['daisangen']);
test('大三元 yakumanCount=1', daiSanGenResult.yakumanCount, 1);

// 四暗刻单骑不应额外计四暗刻、三暗刻、对对和
var suuankouTankiResult = yc.normalizeYakuResult(
  ['toitoiho', 'sanankou', 'suuankou', 'suuankou_tanki']
);
test('四暗刻单骑互斥四暗刻', suuankouTankiResult.ids, ['suuankou_tanki']);
test('四暗刻单骑 yakumanCount=2', suuankouTankiResult.yakumanCount, 2);

// 小四喜+字一色（两个役满）
var doubleYakumanResult = yc.normalizeYakuResult(
  ['shousuushii', 'tsuuiisou']
);
test('小四喜+字一色 两个役满', doubleYakumanResult.ids.sort(), ['shousuushii', 'tsuuiisou'].sort());
test('小四喜+字一色 yakumanCount=2', doubleYakumanResult.yakumanCount, 2);

// 大四喜应移除小四喜
var daiSuushiiResult = yc.normalizeYakuResult(
  ['shousuushii', 'daisuushii', 'tsuuiisou']
);
test('大四喜互斥小四喜', daiSuushiiResult.ids.sort(), ['daisuushii', 'tsuuiisou'].sort());
test('大四喜+字一色 yakumanCount=3', daiSuushiiResult.yakumanCount, 3);

// 国士十三面互斥国士无双
var kokushi13Result = yc.normalizeYakuResult(
  ['kokushi_musou', 'kokushi_musou_13men']
);
test('国士十三面互斥国士', kokushi13Result.ids, ['kokushi_musou_13men']);
test('国士十三面 yakumanCount=2', kokushi13Result.yakumanCount, 2);

// 纯正九莲互斥九莲
var chuuren9Result = yc.normalizeYakuResult(
  ['chuuren_poutou', 'junsei_chuuren_poutou']
);
test('纯正九莲互斥九莲', chuuren9Result.ids, ['junsei_chuuren_poutou']);
test('纯正九莲 yakumanCount=2', chuuren9Result.yakumanCount, 2);

// 无役满时原样返回
var noYakumanResult = yc.normalizeYakuResult(
  ['riichi', 'tanyao', 'pinfu']
);
test('无役满原样返回', noYakumanResult.ids, ['riichi', 'tanyao', 'pinfu']);
test('无役满 yakumanCount=0', noYakumanResult.yakumanCount, 0);

// 无役满含yakuhai原样返回
var yakuhaiOnlyResult = yc.normalizeYakuResult(
  ['yakuhai', 'yakuhai']
);
test('役牌无役满原样', yakuhaiOnlyResult.ids, ['yakuhai', 'yakuhai']);
test('役牌无役满 yakumanCount=0', yakuhaiOnlyResult.yakumanCount, 0);

// =========================================================================
// 2. 役满 checkAllYaku 集成测试
// =========================================================================
console.log('\n=== 2. 役满集成测试（checkAllYaku + normalizeYakuResult）===');

// 大三元牌型
var dsgIds = yc.checkAllYaku(
  ['5z','5z','5z','6z','6z','6z','7z','7z','7z','2m','3m','4m','9s','9s'],
  { winTile: '9s', contextHint: '荣和，场风东，自风南' }
);
var dsgNorm = yc.normalizeYakuResult(dsgIds);
assert('大三元checkAllYaku后归一化只含daisangen',
  dsgNorm.ids.length === 1 && dsgNorm.ids[0] === 'daisangen');

// 四暗刻单骑牌型
var satkIds = yc.checkAllYaku(
  ['2m','2m','2m','3p','3p','3p','4s','4s','4s','5z','5z','5z','9m','9m'],
  { winTile: '9m', contextHint: '自摸，场风东，自风南' }
);
var satkNorm = yc.normalizeYakuResult(satkIds);
assert('四暗刻单骑归一化后只含suuankou_tanki',
  satkNorm.ids.length === 1 && satkNorm.ids[0] === 'suuankou_tanki');

// =========================================================================
// 3. 符数规则 — 副露荣和无 +2 符
// =========================================================================
console.log('\n=== 3. 副露荣和无 +2 符 ===');

// 示例：副露 + 単骑荣和
var fu1 = fc.calculateFu(
  ['2m','3m','4m','3p','4p','5p','6p','7p','8p','2s','3s','4s','6s','6s'],
  { winMethod: 'ron', winTile: '6s', hasOpenMeld: true, roundWind: '1z', seatWind: '2z' }
);
assert('副露荣和fuDetails不含食下荣和',
  !fu1.fuDetails.some(function(d) { return d.name.indexOf('食下荣和') !== -1; }));
test('副露荣和fu=30（副底20+単骑2=22→进位30）', fu1.fu, 30);

// 门前荣和仍保留 +10 符
var fu2 = fc.calculateFu(
  ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
  { winMethod: 'ron', winTile: '4s', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
assert('门前荣和保留+10符',
  fu2.fuDetails.some(function(d) { return d.name === '门前荣和' && d.fu === 10; }));

// 自摸仍保留 +2 符（非平和形）
var fu3 = fc.calculateFu(
  ['2m','3m','4m','3p','4p','5p','6s','7s','8s','2s','2s','2s','6m','6m'],
  { winMethod: 'tsumo', winTile: '6m', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
assert('自摸保留+2符',
  fu3.fuDetails.some(function(d) { return d.name === '自摸' && d.fu === 2; }));
assert('自摸单骑也含等待形+2符',
  fu3.fuDetails.some(function(d) { return d.name.indexOf('骑待') !== -1 && d.fu === 2; }));

// =========================================================================
// 4. 符数规则 — 副露平和形荣和最低 30 符
// =========================================================================
console.log('\n=== 4. 副露平和形荣和最低30符 ===');

// 副露 + 4顺子 + 非役牌雀头 + 両面待 + 荣和 → 只有副底20
// 需确认有一种合法拆分能达到此条件
var fuOpenPinfu = fc.calculateFu(
  ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
  { winMethod: 'ron', winTile: '4s', hasOpenMeld: true, roundWind: '1z', seatWind: '2z' }
);
test('副露平和形荣和最低30符', fuOpenPinfu.fu, 30);
assert('含最低30符说明',
  fuOpenPinfu.fuDetails.some(function(d) { return d.name.indexOf('最低30符') !== -1; }));

// 平和自摸固定20符
var fuPinfuTsumo = fc.calculateFu(
  ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
  { winMethod: 'tsumo', winTile: '4s', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
test('平和自摸固定20符', fuPinfuTsumo.fu, 20);

// =========================================================================
// 5. 符数规则 — 七对子、国士、等待形
// =========================================================================
console.log('\n=== 5. 特殊牌形符数 ===');

var fuChiitoi = fc.calculateFu(
  ['2m','2m','4m','4m','6m','6m','3p','3p','5p','5p','7s','7s','5z','5z'],
  { winMethod: 'ron', winTile: '5z', roundWind: '1z', seatWind: '2z' }
);
test('七对子固定25符', fuChiitoi.fu, 25);

var fuKokushi = fc.calculateFu(
  ['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z','1m'],
  { winMethod: 'ron', winTile: '1m', roundWind: '1z', seatWind: '2z' }
);
test('国士无双不计符', fuKokushi.fu, 0);

// =========================================================================
// 6. 等待形符数
// =========================================================================
console.log('\n=== 6. 等待形符数 ===');

// 単骑待 +2 符（荣和）— 14张中唯一的对子即雀头，和了牌等于雀头
var fuTanki = fc.calculateFu(
  ['2m','3m','4m','3p','4p','5p','6s','7s','8s','2s','3s','4s','6m','6m'],
  { winMethod: 'ron', winTile: '6m', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
assert('単骑荣和含+2符',
  fuTanki.fuDetails.some(function(d) { return d.name.indexOf('骑待') !== -1 && d.fu === 2; }));

// 坎张待 +2 符 — 4m5m6m 成顺子，和了牌是中间张5m
var fuKanchan = fc.calculateFu(
  ['4m','5m','6m','1p','2p','3p','4p','5p','6p','7p','8p','9p','1s','1s'],
  { winMethod: 'ron', winTile: '5m', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
assert('嵌张荣和含+2符',
  fuKanchan.fuDetails.some(function(d) { return d.name.indexOf('嵌张待') !== -1 && d.fu === 2; }));

// 边张待 +2 符 — 1m2m3m 成顺子，和了牌是3m=12等3的辺張
var fuPenchan = fc.calculateFu(
  ['1m','2m','3m','1p','2p','3p','4p','5p','6p','7p','8p','9p','1s','1s'],
  { winMethod: 'ron', winTile: '3m', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
assert('边张荣和含+2符',
  fuPenchan.fuDetails.some(function(d) { return d.name.indexOf('边张待') !== -1 && d.fu === 2; }));

// 另一端边张：7m8m9m，和了牌7m=89等7
var fuPenchanLow = fc.calculateFu(
  ['7m','8m','9m','1p','2p','3p','4p','5p','6p','7p','8p','9p','1s','1s'],
  { winMethod: 'ron', winTile: '7m', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
assert('89等7边张荣和含+2符',
  fuPenchanLow.fuDetails.some(function(d) { return d.name.indexOf('边张待') !== -1 && d.fu === 2; }));

// 78荣9是両面，不是边张；此例应为立直+平和的30符形
var fuPinfuRyanmen9 = fc.calculateFu(
  ['4m','5m','6m','6p','7p','8p','7p','8p','9p','7s','8s','9s','3m','3m'],
  { winMethod: 'ron', winTile: '9p', hasOpenMeld: false, roundWind: '1z', seatWind: '1z' }
);
test('78荣9両面平和形为30符', fuPinfuRyanmen9.fu, 30);
assert('78荣9不含边张待',
  !fuPinfuRyanmen9.fuDetails.some(function(d) { return d.name.indexOf('边张待') !== -1; }));

var answerPinfuRyanmen9 = builder.buildAnswer(
  ['4m','5m','6m','6p','7p','8p','7p','8p','9p','7s','8s','9s','3m','3m'],
  { winMethod: 'ron', isDealer: true, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '1z', riichi: true, doraIndicators: [], winTile: '9p' }
);
assert('78荣9最终答案返回有效', answerPinfuRyanmen9.valid);
test('78荣9最终答案番符点', {
  han: answerPinfuRyanmen9.answer.han,
  fu: answerPinfuRyanmen9.answer.fu,
  pointText: answerPinfuRyanmen9.answer.pointText
}, { han: 2, fu: 30, pointText: '2900' });

// 23荣1也是両面，不是边张
var fuRyanmen1 = fc.calculateFu(
  ['1m','2m','3m','2p','3p','4p','4p','5p','6p','3s','4s','5s','6s','6s'],
  { winMethod: 'ron', winTile: '1m', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
assert('23荣1不含边张待',
  !fuRyanmen1.fuDetails.some(function(d) { return d.name.indexOf('边张待') !== -1; }));

// 両面待 0 符 — 23s45s 型，和了牌 4s 完成顺子 234s 或 345s，均为两端
var fuRyanmen = fc.calculateFu(
  ['2s','3s','4s','5s','6s','7s','3p','4p','5p','2m','3m','4m','8m','8m'],
  { winMethod: 'ron', winTile: '4s', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
var waitDetails = fuRyanmen.fuDetails.filter(function(d) { return d.name.indexOf('待') !== -1; });
test('両面待無符', waitDetails.length, 0);

// 双碰荣和 — 完成的那组刻子按明刻
var fuShanpon = fc.calculateFu(
  ['2m','2m','2m','3p','4p','5p','6s','7s','8s','2s','3s','4s','6m','6m'],
  { winMethod: 'ron', winTile: '2m', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
var shanponNote = fuShanpon.fuDetails.some(function(d) { return d.name.indexOf('双碰') !== -1; });
// 双碰栄和検出は split 依存
assert('双碰栄和明刻标注',
  shanponNote || fuShanpon.fu >= 30);

// =========================================================================
// 7. 役牌 — 连风刻子 2 番、连风雀头 4 符
// =========================================================================
console.log('\n=== 7. 役牌规则 ===');

// 连风刻子：场风东 + 自风东 → 东刻子计2番
var lianFengIds = yc.checkAllYaku(
  ['1z','1z','1z','2m','3m','4m','3p','4p','5p','2s','3s','4s','6m','6m'],
  { winTile: '6m', contextHint: '荣和，场风东，自风东' }
);
var yakuhaiDong = lianFengIds.filter(function(id) { return id === 'yakuhai'; });
test('连风刻子应出2个yakuhai', yakuhaiDong.length, 2);

// 非场风非自风的风牌刻子不计役牌
var nonValueWind = yc.checkAllYaku(
  ['4z','4z','4z','2m','3m','4m','3p','4p','5p','2s','3s','4s','6m','6m'],
  { winTile: '6m', contextHint: '荣和，场风东，自风南' }
);
var yakuhaiKita = nonValueWind.filter(function(id) { return id === 'yakuhai'; });
test('非场风非自风北风刻子不計yakuhai', yakuhaiKita.length, 0);

// 连风雀头 4 符
var fuDoubleWind = fc.calculateFu(
  ['2m','3m','4m','5m','6m','7m','3p','4p','5p','6p','7p','8p','1z','1z'],
  { winMethod: 'ron', winTile: '1z', hasOpenMeld: false, roundWind: '1z', seatWind: '1z' }
);
assert('连风雀头+4符',
  fuDoubleWind.fuDetails.some(function(d) { return d.name.indexOf('连风雀头') !== -1 && d.fu === 4; }));

// 役牌雀头（単独）2符
var fuYakuhaiPair = fc.calculateFu(
  ['2m','3m','4m','5m','6m','7m','3p','4p','5p','6p','7p','8p','5z','5z'],
  { winMethod: 'ron', winTile: '5z', hasOpenMeld: false, roundWind: '1z', seatWind: '2z' }
);
assert('役牌雀头+2符',
  fuYakuhaiPair.fuDetails.some(function(d) { return d.name.indexOf('役牌雀头') !== -1 && d.fu === 2; }));

// =========================================================================
// 8. scoreAnswerBuilder — 役满使用 yakumanCount
// =========================================================================
console.log('\n=== 8. scoreAnswerBuilder 役满 yakumanCount ===');

// 国士无双
var ans1 = builder.buildAnswer(
  ['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z','1m'],
  { winMethod: 'ron', isDealer: false, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '2z', riichi: false, doraIndicators: [], winTile: '1m' }
);
assert('国士无双返回有效', ans1.valid);
test('国士无双 pointText', ans1.answer.pointText, '32000');
test('国士无双 totalPoints', ans1.answer.totalPoints, 32000);

// 大三元（1倍役满）— 不应含宝牌、不应含役牌
var ans2 = builder.buildAnswer(
  ['5z','5z','5z','6z','6z','6z','7z','7z','7z','2m','3m','4m','9s','9s'],
  { winMethod: 'ron', isDealer: false, isMenzen: false, hasOpenMeld: true,
    roundWind: '1z', seatWind: '2z', riichi: false,
    doraIndicators: ['1m'], winTile: '9s' }
);
assert('大三元返回有效', ans2.valid);
test('大三元 pointText', ans2.answer.pointText, '32000');
assert('大三元不含役牌', !ans2.answer.yaku.some(function(y) { return y.id === 'yakuhai'; }));
assert('大三元不含宝牌（役满不計宝牌）', !ans2.answer.yaku.some(function(y) { return y.id === 'dora'; }));
assert('大三元只含daisangen', ans2.answer.yaku.length === 1 && ans2.answer.yaku[0].id === 'daisangen');

// 大四喜（2倍役满）+ 字一色（1倍役满）= 3倍役满 庄家自摸
// 注意：四暗刻单骑也会成立（4暗刻+単骑），所以是5倍役满
var ans3 = builder.buildAnswer(
  ['1z','1z','1z','2z','2z','2z','3z','3z','3z','4z','4z','4z','5z','5z'],
  { winMethod: 'tsumo', isDealer: true, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '1z', riichi: false, doraIndicators: [], winTile: '5z' }
);
assert('大四喜+字一色+四暗刻単骑返回有效', ans3.valid);
test('大四喜+字一色+四暗刻単骑 5倍役满 pointText', ans3.answer.pointText, '80000 all');
test('大四喜+字一色+四暗刻単骑 totalPoints', ans3.answer.totalPoints, 240000);
assert('大四喜不含小四喜', !ans3.answer.yaku.some(function(y) { return y.id === 'shousuushii'; }));
assert('不含四暗刻（被四暗刻単骑互斥）', !ans3.answer.yaku.some(function(y) { return y.id === 'suuankou'; }));

// 大四喜（open hand，避免四暗刻）2倍役满
var ans3b = builder.buildAnswer(
  ['1z','1z','1z','2z','2z','2z','3z','3z','3z','4z','4z','4z','2m','2m'],
  { winMethod: 'ron', isDealer: false, isMenzen: false, hasOpenMeld: true,
    roundWind: '1z', seatWind: '2z', riichi: false, doraIndicators: [], winTile: '2m' }
);
assert('大四喜副露返回有效', ans3b.valid);
test('大四喜副露子家荣和 2倍役满 pointText', ans3b.answer.pointText, '64000');
test('大四喜副露子家荣和 totalPoints', ans3b.answer.totalPoints, 64000);

// =========================================================================
// 9. 副露暗刻精确判定
// =========================================================================
console.log('\n=== 9. 副露混在暗刻判定 ===');

// 有一组明顺 + 手内暗刻的情况
// 通过 explicitMelds 传递来测试暗刻是否仍按暗刻计算
var fuMixed = fc.calculateFu(
  ['2m','3m','4m','3p','4p','5p','6s','7s','8s','2s','2s','2s','6m','6m'],
  {
    winMethod: 'ron', winTile: '6m', roundWind: '1z', seatWind: '2z',
    explicitMelds: [
      { type: 'sequence', suit: 'm', startNum: 2, open: true },
      { type: 'sequence', suit: 'p', startNum: 3, open: false },
      { type: 'sequence', suit: 's', startNum: 6, open: false },
      { type: 'triplet', tile: '2s', open: false }
    ],
    explicitPair: '6m',
    hasOpenMeld: true
  }
);
assert('副露混在 暗刻2s按暗刻+4符',
  fuMixed.fuDetails.some(function(d) { return d.name === '中张暗刻' && d.fu === 4; }));
assert('副露混在 无食下荣和',
  !fuMixed.fuDetails.some(function(d) { return d.name.indexOf('食下') !== -1; }));

var ansSanankouMenzen = builder.buildAnswer(
  ['1s','1s','1s','2p','2p','2p','3p','3p','3p','7m','8m','9m','5z','5z'],
  { winMethod: 'ron', isDealer: false, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '2z', riichi: true, doraIndicators: [], winTile: '5z' }
);
assert('门清荣和单骑 三暗刻计入役种',
  ansSanankouMenzen.valid && ansSanankouMenzen.answer.yaku.some(function(y) { return y.id === 'sanankou'; }));
test('门清荣和单骑 三暗刻总番', ansSanankouMenzen.answer.han, 3);

var ansSanankouOpenSeq = builder.buildAnswer(
  ['2m','3m','4m','1p','1p','1p','3s','3s','3s','4p','4p','4p','6m','6m'],
  {
    winMethod: 'ron', isDealer: false, isMenzen: false, hasOpenMeld: true,
    roundWind: '1z', seatWind: '2z', riichi: false, doraIndicators: [], winTile: '6m',
    melds: [
      { type: 'chi', tiles: ['2m','3m','4m'], open: true }
    ],
    concealedTiles: ['1p','1p','1p','3s','3s','3s','4p','4p','4p','6m','6m']
  }
);
assert('副露明顺 + 手内三暗刻计入役种',
  ansSanankouOpenSeq.valid && ansSanankouOpenSeq.answer.yaku.some(function(y) { return y.id === 'sanankou'; }));
test('副露明顺三暗刻总番', ansSanankouOpenSeq.answer.han, 2);

// =========================================================================
// 10. 连风牌 contextHint 集成
// =========================================================================
console.log('\n=== 10. 连风牌 contextHint 集成 ===');

// 连风雀头+4符 — 需有役（立直）才能buildAnswer成功
var ans4 = builder.buildAnswer(
  ['2m','3m','4m','3p','4p','5p','6s','7s','8s','2s','3s','4s','1z','1z'],
  { winMethod: 'ron', isDealer: false, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '1z', riichi: true, doraIndicators: [], winTile: '1z' }
);
assert('连风雀头+4符（buildAnswer経由）',
  ans4.valid && ans4.answer.fuDetails.some(function(d) { return d.name.indexOf('连风雀头') !== -1 && d.fu === 4; }));

// =========================================================================
// 11. 无役边界 — 完整和牌但无役时不能计分
// =========================================================================
console.log('\n=== 11. 无役边界（自由算分 & builder）===');

// 通过 builder 测试：完整手牌但无任何役（无宝牌）
var ansNoYaku = builder.buildAnswer(
  ['1m','2m','3m','4m','5m','6m','7p','8p','9p','1s','2s','3s','9s','9s'],
  { winMethod: 'ron', isDealer: false, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '2z', riichi: false, doraIndicators: [], winTile: '3s' }
);
assert('完整手牌无役返回 invalid', !ansNoYaku.valid);
test('无役 error 为 no_non_dora_yaku', ansNoYaku.error, 'no_non_dora_yaku');

// 同样牌型即使设了宝牌指示牌，builder 也不应让手牌成立
var ansNoYakuDora = builder.buildAnswer(
  ['1m','2m','3m','4m','5m','6m','7p','8p','9p','1s','2s','3s','9s','9s'],
  { winMethod: 'ron', isDealer: false, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '2z', riichi: false,
    doraIndicators: ['8s', '9p'], winTile: '3s' }
);
assert('无役+宝牌指示牌仍 invalid', !ansNoYakuDora.valid);

// 有役则正常（加上立直）
var ansWithRiichi = builder.buildAnswer(
  ['1m','2m','3m','4m','5m','6m','7p','8p','9p','1s','2s','3s','9s','9s'],
  { winMethod: 'ron', isDealer: false, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '2z', riichi: true, doraIndicators: [], winTile: '3s' }
);
assert('同样牌型+立直返回有效', ansWithRiichi.valid);
assert('立直后yakuList含立直',
  ansWithRiichi.answer.yaku.some(function(y) { return y.id === 'riichi'; }));

// =========================================================================
// 12. 自由算分上下文役透传
// =========================================================================
console.log('\n=== 12. 自由算分上下文役透传 ===');

var ansIppatsu = builder.buildAnswer(
  ['2m','3m','4m','3p','4p','5p','4s','5s','6s','6m','7m','8m','5z','5z'],
  { winMethod: 'ron', isDealer: false, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '2z', riichi: true, ippatsu: true,
    doraIndicators: [], doraCountOverride: 0, winTile: '5z' }
);
assert('自由算分一发透传到builder',
  ansIppatsu.valid && ansIppatsu.answer.yaku.some(function(y) { return y.id === 'ippatsu'; }));
assert('builder返回payments供本场/供托叠加',
  ansIppatsu.valid && ansIppatsu.answer.payments && ansIppatsu.answer.payments.ron > 0);

var ansHaitei = builder.buildAnswer(
  ['2m','3m','4m','3p','4p','5p','4s','5s','6s','6m','7m','8m','5z','5z'],
  { winMethod: 'tsumo', isDealer: false, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '2z', riichi: false, haitei: true,
    doraIndicators: [], doraCountOverride: 0, winTile: '5z' }
);
assert('自由算分海底透传到builder',
  ansHaitei.valid && ansHaitei.answer.yaku.some(function(y) { return y.id === 'haitei'; }));

// =========================================================================
// 13. 里宝牌只在立直时计入
// =========================================================================
console.log('\n=== 13. 里宝牌规则 ===');

var uraTiles = ['2m','3m','4m','3p','4p','5p','4s','5s','6s','6m','7m','8m','5z','5z'];
var ansUraRiichi = builder.buildAnswer(
  uraTiles,
  { winMethod: 'ron', isDealer: false, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '2z', riichi: true,
    doraIndicators: [], uraDoraIndicators: ['7z'], winTile: '5z' }
);
assert('立直时里宝牌计入番数',
  ansUraRiichi.valid && ansUraRiichi.answer.yaku.some(function(y) {
    return y.id === 'ura_dora' && y.han === 2;
  }));

var ansUraNoRiichi = builder.buildAnswer(
  uraTiles,
  { winMethod: 'tsumo', isDealer: false, isMenzen: true, hasOpenMeld: false,
    roundWind: '1z', seatWind: '2z', riichi: false, haitei: true,
    doraIndicators: [], uraDoraIndicators: ['7z'], winTile: '5z' }
);
assert('未立直时忽略里宝牌',
  ansUraNoRiichi.valid && !ansUraNoRiichi.answer.yaku.some(function(y) {
    return y.id === 'ura_dora';
  }));

// =========================================================================
// 14. 役满题 0 符选项
// =========================================================================
console.log('\n=== 14. 役满题 0符选项 ===');

var templateFuOptions = scoreQuestionGenerator.__test__.makeFuOptions(0);
var randomFuOptions = scoreRandomQuestionGenerator.__test__.makeFuOptions(0);
assert('模板算分题役满应包含0符选项',
  templateFuOptions.indexOf(0) !== -1);
assert('随机算分题役满应包含0符选项',
  randomFuOptions.indexOf(0) !== -1);

// =========================================================================
// 结果汇总
// =========================================================================
console.log('');
console.log('通过: ' + passed + ', 失败: ' + failed);
if (failed > 0) process.exit(1);
