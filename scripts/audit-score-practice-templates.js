// 算分练习模板审计脚本
// 校验: A) 役种番数匹配规则表  B) answer.han = 役种番数合计  C) 点数与scoreCalculator一致  D) 硬规则漏役扫描

var sc = require('../utils/scoreCalculator');
var { YAKU_HAN } = require('../utils/yakuChecker');

// 静态模板（与 scoreQuestionGenerator 保持同步的手动快照）
var TEMPLATES = [
  {
    id: 'tpl-basic-01', difficulty: 'basic',
    tiles: ['2m','3m','4m','3p','4p','5p','6p','7p','8p','2s','3s','4s','6s','6s'],
    winTile: '6s',
    context: { winMethod:'ron', isDealer:false, isMenzen:false, hasOpenMeld:true, roundWind:'1z', seatWind:'2z', riichi:false, doraCount:0 },
    answer: { han:1, fu:30, fuSubtotal:24, pointText:'1000', totalPoints:1000,
      yaku:[{id:'tanyao',name:'断幺九',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'食下荣和',fu:2},{name:'単骑待',fu:2}],
      explanation:'1番30符，子家荣和1000。断幺九，食下荣和+2符，単骑+2符。' }
  },
  {
    id: 'tpl-basic-02', difficulty: 'basic',
    tiles: ['2m','3m','4m','3p','4p','5p','6s','7s','8s','2s','3s','4s','5z','5z'],
    winTile: '5z',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:0 },
    answer: { han:1, fu:40, fuSubtotal:34, pointText:'1300', totalPoints:1300,
      yaku:[{id:'riichi',name:'立直',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10},{name:'役牌雀头',fu:2},{name:'単骑待',fu:2}],
      explanation:'1番40符，子家荣和1300。立直1番，白雀头+2符，単骑+2符。' }
  },
  {
    id: 'tpl-basic-03', difficulty: 'basic',
    tiles: ['2m','3m','4m','3p','4p','5p','6s','7s','8s','5z','5z','5z','2s','2s'],
    winTile: '2s',
    context: { winMethod:'ron', isDealer:true, isMenzen:false, hasOpenMeld:true, roundWind:'1z', seatWind:'1z', riichi:false, doraCount:0 },
    answer: { han:1, fu:30, fuSubtotal:28, pointText:'1500', totalPoints:1500,
      yaku:[{id:'yakuhai',name:'役牌',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'食下荣和',fu:2},{name:'幺九明刻',fu:4},{name:'単骑待',fu:2}],
      explanation:'1番30符，庄家荣和1500。白刻子是役牌1番，幺九明刻+4符。' }
  },
  {
    id: 'tpl-basic-04', difficulty: 'basic',
    tiles: ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','1s','1s'],
    winTile: '4s',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:0 },
    answer: { han:2, fu:30, fuSubtotal:30, pointText:'2000', totalPoints:2000,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'pinfu',name:'平和',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10}],
      explanation:'2番30符，子家荣和2000。立直+平和，雀头非役牌，両面待。' }
  },
  {
    id: 'tpl-basic-05', difficulty: 'basic',
    tiles: ['2m','3m','4m','3p','4p','5p','6s','7s','8s','2s','2s','2s','6m','6m'],
    winTile: '6m',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:0 },
    answer: { han:2, fu:40, fuSubtotal:36, pointText:'2600', totalPoints:2600,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'tanyao',name:'断幺九',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10},{name:'中张暗刻',fu:4},{name:'単骑待',fu:2}],
      explanation:'2番40符，子家荣和2600。立直+断幺九，2s暗刻+4符，単骑+2符。' }
  },
  {
    id: 'tpl-basic-06', difficulty: 'basic',
    tiles: ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
    winTile: '4s',
    context: { winMethod:'tsumo', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:0 },
    answer: { han:4, fu:20, fuSubtotal:20, pointText:'1300 / 2600', totalPoints:5200,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'pinfu',name:'平和',han:1},{id:'mentsumo',name:'门前清自摸和',han:1},{id:'tanyao',name:'断幺九',han:1}],
      fuDetails:[{name:'副底（平和自摸固定20符）',fu:20}],
      explanation:'4番20符（平和自摸固定20符），子家自摸1300/2600。立直+平和+门前清自摸和+断幺九。' }
  },
  {
    id: 'tpl-basic-07', difficulty: 'basic',
    tiles: ['2m','2m','4m','4m','6m','6m','3p','3p','5p','5p','7s','7s','5z','5z'],
    winTile: '5z',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:0 },
    answer: { han:3, fu:25, fuSubtotal:25, pointText:'3200', totalPoints:3200,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'chiitoitsu',name:'七对子',han:2}],
      fuDetails:[{name:'七对子固定符',fu:25}],
      explanation:'3番25符，子家荣和3200。七对子固定25符，七对子2番+立直1番。' }
  },
  {
    id: 'tpl-basic-08', difficulty: 'basic',
    tiles: ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
    winTile: '4s',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:0 },
    answer: { han:3, fu:30, fuSubtotal:30, pointText:'3900', totalPoints:3900,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'pinfu',name:'平和',han:1},{id:'tanyao',name:'断幺九',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10}],
      explanation:'3番30符，子家荣和3900。立直+平和+断幺九，全2-8牌，両面待。' }
  },
  {
    id: 'tpl-basic-09', difficulty: 'basic',
    tiles: ['2m','3m','4m','3p','4p','5p','6s','6s','6s','7s','7s','7s','8s','8s'],
    winTile: '8s',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:1 },
    answer: { han:3, fu:40, fuSubtotal:40, pointText:'5200', totalPoints:5200,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'dora',name:'宝牌',han:1},{id:'tanyao',name:'断幺九',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10},{name:'中张暗刻',fu:4},{name:'中张暗刻',fu:4},{name:'単骑待',fu:2}],
      explanation:'3番40符，子家荣和5200。立直+宝牌+断幺九，2暗刻+単骑=40符。' }
  },
  {
    id: 'tpl-basic-10', difficulty: 'basic',
    tiles: ['2m','3m','4m','3p','4p','5p','6s','7s','8s','5z','5z','5z','3s','3s'],
    winTile: '3s',
    context: { winMethod:'ron', isDealer:false, isMenzen:false, hasOpenMeld:true, roundWind:'1z', seatWind:'2z', riichi:false, doraCount:1 },
    answer: { han:2, fu:30, fuSubtotal:28, pointText:'2000', totalPoints:2000,
      yaku:[{id:'yakuhai',name:'役牌',han:1},{id:'dora',name:'宝牌',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'食下荣和',fu:2},{name:'幺九明刻',fu:4},{name:'単骑待',fu:2}],
      explanation:'2番30符，子家荣和2000。白刻子役牌+宝牌1，幺九明刻+4符+単骑+2符。' }
  },
  {
    id: 'tpl-adv-01', difficulty: 'advanced',
    tiles: ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
    winTile: '4s',
    context: { winMethod:'ron', isDealer:true, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'1z', riichi:true, doraCount:0 },
    answer: { han:3, fu:30, fuSubtotal:30, pointText:'5800', totalPoints:5800,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'pinfu',name:'平和',han:1},{id:'tanyao',name:'断幺九',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10}],
      explanation:'3番30符，庄家荣和5800。立直+平和+断幺九。' }
  },
  {
    id: 'tpl-adv-02', difficulty: 'advanced',
    tiles: ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
    winTile: '4s',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:2 },
    answer: { han:5, fu:30, fuSubtotal:30, limit:{name:'满贯',basePoints:2000}, pointText:'8000', totalPoints:8000,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'pinfu',name:'平和',han:1},{id:'tanyao',name:'断幺九',han:1},{id:'dora',name:'宝牌',han:2}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10}],
      explanation:'5番满贯，子家荣和8000。5番及以上强制满贯封顶。' }
  },
  {
    id: 'tpl-adv-03', difficulty: 'advanced',
    tiles: ['2m','3m','4m','3p','4p','5p','2s','3s','4s','6m','6m','6m','8s','8s'],
    winTile: '8s',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:2 },
    answer: { han:4, fu:40, fuSubtotal:36, limit:{name:'满贯',basePoints:2000}, pointText:'8000', totalPoints:8000,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'tanyao',name:'断幺九',han:1},{id:'dora',name:'宝牌',han:2}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10},{name:'中张暗刻',fu:4},{name:'単骑待',fu:2}],
      explanation:'4番40符满贯，子家荣和8000。4番40符以上为满贯。' }
  },
  {
    id: 'tpl-adv-04', difficulty: 'advanced',
    tiles: ['2m','3m','4m','6m','7m','8m','9m','9m','9m','1m','1m','1m','5z','5z'],
    winTile: '5z',
    context: { winMethod:'ron', isDealer:false, isMenzen:false, hasOpenMeld:true, roundWind:'1z', seatWind:'2z', riichi:false, doraCount:0 },
    answer: { han:2, fu:40, fuSubtotal:36, pointText:'2600', totalPoints:2600,
      yaku:[{id:'honitsu',name:'混一色',han:2}],
      fuDetails:[{name:'副底',fu:20},{name:'食下荣和',fu:2},{name:'幺九明刻',fu:4},{name:'幺九明刻',fu:4},{name:'役牌雀头',fu:2},{name:'単骑待',fu:2}],
      explanation:'2番40符，子家荣和2600。混一色食下降为2番，两个幺九明刻+役牌雀头+単骑=36→进位40符。' }
  },
  {
    id: 'tpl-adv-05', difficulty: 'advanced',
    tiles: ['2m','2m','2m','5z','5z','5z','7s','7s','7s','8p','8p','8p','3m','3m'],
    winTile: '3m',
    context: { winMethod:'ron', isDealer:false, isMenzen:false, hasOpenMeld:true, roundWind:'1z', seatWind:'2z', riichi:false, doraCount:0 },
    answer: { han:3, fu:40, fuSubtotal:34, pointText:'5200', totalPoints:5200,
      yaku:[{id:'toitoiho',name:'对对和',han:2},{id:'yakuhai',name:'役牌',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'食下荣和',fu:2},{name:'中张明刻',fu:2},{name:'中张明刻',fu:2},{name:'幺九明刻',fu:4},{name:'中张明刻',fu:2},{name:'単骑待',fu:2}],
      explanation:'3番40符，子家荣和5200。对对和2番+役牌白1番，4明刻+単骑=34→进位40符。' }
  },
  {
    id: 'tpl-adv-06', difficulty: 'advanced',
    tiles: ['2m','3m','4m','6m','7m','8m','9m','9m','9m','1m','1m','1m','5z','5z'],
    winTile: '5z',
    context: { winMethod:'ron', isDealer:true, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'1z', riichi:false, doraCount:1 },
    answer: { han:4, fu:50, fuSubtotal:50, limit:{name:'满贯',basePoints:2000}, pointText:'12000', totalPoints:12000,
      yaku:[{id:'honitsu',name:'混一色',han:3},{id:'dora',name:'宝牌',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10},{name:'幺九暗刻',fu:8},{name:'幺九暗刻',fu:8},{name:'役牌雀头',fu:2},{name:'単骑待',fu:2}],
      explanation:'4番50符满贯，庄家荣和12000。混一色门清3番+宝牌1番，50符→满贯。' }
  },
  {
    id: 'tpl-adv-07', difficulty: 'advanced',
    tiles: ['2m','3m','4m','3p','4p','5p','6s','7s','8s','2s','2s','2s','6m','6m'],
    winTile: '6m',
    context: { winMethod:'tsumo', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:0 },
    answer: { han:3, fu:30, fuSubtotal:26, pointText:'1000 / 2000', totalPoints:4000,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'tanyao',name:'断幺九',han:1},{id:'mentsumo',name:'门前清自摸和',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'自摸',fu:2},{name:'中张暗刻',fu:4}],
      explanation:'3番30符，子家自摸1000/2000。副底20+自摸2+暗刻4=26→进位30符。' }
  },
  {
    id: 'tpl-adv-08', difficulty: 'advanced',
    tiles: ['2m','2m','4m','4m','6m','6m','3p','3p','0p','5p','7s','7s','5z','5z'],
    winTile: '5z',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:1 },
    answer: { han:4, fu:25, fuSubtotal:25, pointText:'6400', totalPoints:6400,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'chiitoitsu',name:'七对子',han:2},{id:'dora',name:'宝牌',han:1}],
      fuDetails:[{name:'七对子固定符',fu:25}],
      explanation:'4番25符，子家荣和6400。七对子固定25符，七对子2番+立直1番+宝牌1番=4番。' }
  },
  {
    id: 'tpl-mix-01', difficulty: 'mixed',
    tiles: ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
    winTile: '4s',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:3 },
    answer: { han:6, fu:30, fuSubtotal:30, limit:{name:'跳满',basePoints:3000}, pointText:'12000', totalPoints:12000,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'pinfu',name:'平和',han:1},{id:'tanyao',name:'断幺九',han:1},{id:'dora',name:'宝牌',han:3}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10}],
      explanation:'6番跳满，子家荣和12000。立直+平和+断幺九+宝牌3=6番。' }
  },
  {
    id: 'tpl-mix-02', difficulty: 'mixed',
    tiles: ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
    winTile: '4s',
    context: { winMethod:'ron', isDealer:true, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'1z', riichi:true, doraCount:5 },
    answer: { han:8, fu:30, fuSubtotal:30, limit:{name:'倍满',basePoints:4000}, pointText:'24000', totalPoints:24000,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'pinfu',name:'平和',han:1},{id:'tanyao',name:'断幺九',han:1},{id:'dora',name:'宝牌',han:5}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10}],
      explanation:'8番倍满，庄家荣和24000。立直+平和+断幺九+宝牌5=8番。' }
  },
  {
    id: 'tpl-mix-03', difficulty: 'mixed',
    tiles: ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
    winTile: '4s',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:8 },
    answer: { han:11, fu:30, fuSubtotal:30, limit:{name:'三倍满',basePoints:6000}, pointText:'24000', totalPoints:24000,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'pinfu',name:'平和',han:1},{id:'tanyao',name:'断幺九',han:1},{id:'dora',name:'宝牌',han:8}],
      fuDetails:[{name:'副底',fu:20},{name:'门前荣和',fu:10}],
      explanation:'11番三倍满，子家荣和24000。三倍满封顶。' }
  },
  {
    id: 'tpl-mix-04', difficulty: 'mixed',
    tiles: ['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z','1m'],
    winTile: '1m',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:false, doraCount:0 },
    answer: { han:13, fu:0, fuSubtotal:0, limit:{name:'役满',basePoints:8000}, pointText:'32000', totalPoints:32000,
      yaku:[{id:'kokushi_musou',name:'国士无双',han:13}],
      fuDetails:[],
      explanation:'役满，子家荣和32000。国士无双，役满不计符数。' }
  }
];

// 食下役种表（门清→副露番数）
var KUISAGARI = {
  sanshoku_doujun: [2, 1],
  ittsuu: [2, 1],
  honchantaiyaochuu: [2, 1],
  honitsu: [3, 2],
  junchan_taiyaochuu: [3, 2],
  chinitsu: [6, 5]
};

function getExpectedHan(yakuId, hasOpenMeld) {
  if (yakuId === 'dora') return null; // 宝牌由模板自己控制
  if (yakuId === 'riichi') return YAKU_HAN.riichi;
  if (yakuId === 'double_riichi') return YAKU_HAN.double_riichi;
  if (yakuId === 'ippatsu') return YAKU_HAN.ippatsu;
  if (KUISAGARI[yakuId]) {
    return hasOpenMeld ? KUISAGARI[yakuId][1] : KUISAGARI[yakuId][0];
  }
  var han = YAKU_HAN[yakuId];
  return han !== undefined ? han : null;
}

// ===== 校验 A：模板役种番数必须匹配规则表 =====
console.log('=== 校验 A：役种番数一致性 ===');
var issueCountA = 0;
TEMPLATES.forEach(function(tpl) {
  var hasOpenMeld = tpl.context.hasOpenMeld;
  tpl.answer.yaku.forEach(function(y) {
    var expected = getExpectedHan(y.id, hasOpenMeld);
    if (expected !== null && y.han !== expected) {
      console.log('[HAN_MISMATCH] ' + tpl.id + ' ' + y.id + ': template=' + y.han + ', expected=' + expected);
      issueCountA++;
    }
  });
});
if (issueCountA === 0) console.log('  OK — 无番数不一致');

// ===== 校验 B：answer.han 等于役种番数合计 =====
console.log('\n=== 校验 B：总番数一致性 ===');
var issueCountB = 0;
TEMPLATES.forEach(function(tpl) {
  var sum = tpl.answer.yaku.reduce(function(acc, y) { return acc + y.han; }, 0);
  if (sum !== tpl.answer.han) {
    console.log('[HAN_SUM_MISMATCH] ' + tpl.id + ': sum=' + sum + ', answer.han=' + tpl.answer.han);
    issueCountB++;
  }
});
if (issueCountB === 0) console.log('  OK — 总番数无不一致');

// ===== 校验 C：模板点数必须与 scoreCalculator 一致 =====
console.log('\n=== 校验 C：点数一致性 ===');
var issueCountC = 0;
TEMPLATES.forEach(function(tpl) {
  var ctx = tpl.context;
  try {
    var r = sc.calculatePoints({
      han: tpl.answer.han,
      fu: tpl.answer.fu,
      winMethod: ctx.winMethod,
      isDealer: ctx.isDealer
    });
    if (r.pointText !== tpl.answer.pointText) {
      console.log('[POINT_TEXT_MISMATCH] ' + tpl.id + ': template=' + tpl.answer.pointText + ', calculated=' + r.pointText);
      issueCountC++;
    }
    if (r.totalPoints !== tpl.answer.totalPoints) {
      console.log('[TOTAL_POINTS_MISMATCH] ' + tpl.id + ': template=' + tpl.answer.totalPoints + ', calculated=' + r.totalPoints);
      issueCountC++;
    }
  } catch(e) {
    console.log('[CALC_ERROR] ' + tpl.id + ': ' + e.message);
    issueCountC++;
  }
});
if (issueCountC === 0) console.log('  OK — 点数无不一致');

// ===== 校验 D：硬规则漏役扫描 =====
console.log('\n=== 校验 D：硬规则漏役扫描 ===');
var issueCountD = 0;

function hasTileOutside28(tiles) {
  return tiles.some(function(t) {
    var num = parseInt(t[0], 10);
    var suit = t[1];
    return suit === 'z' || num === 1 || num === 9;
  });
}

function countTripletsAndKans(tiles) {
  var counts = {};
  tiles.forEach(function(t) { counts[t] = (counts[t] || 0) + 1; });
  return Object.values(counts).filter(function(c) { return c >= 3; }).length;
}

function hasYakumanYaku(yakuList) {
  return yakuList.some(function(y) {
    return ['kokushi_musou', 'kokushi_musou_13men', 'suuankou', 'suuankou_tanki',
            'daisangen', 'shousuushii', 'daisuushii', 'tsuuiisou', 'ryuuiisou',
            'chinroutou', 'chuuren_poutou', 'junsei_chuuren_poutou',
            'tenhou', 'chiihou', 'suukantsu'].indexOf(y.id) !== -1;
  });
}

TEMPLATES.forEach(function(tpl) {
  var yakuIds = tpl.answer.yaku.map(function(y) { return y.id; });

  // 1. 全部牌为 2～8 数牌 => 必须包含 tanyao
  if (!hasTileOutside28(tpl.tiles) && yakuIds.indexOf('tanyao') === -1 && !hasYakumanYaku(tpl.answer.yaku)) {
    console.log('[MISSING_TANYAO] ' + tpl.id + ': all tiles 2-8 but tanyao not listed');
    issueCountD++;
  }

  // 2. riichi = true => 必须包含 riichi
  if (tpl.context.riichi && yakuIds.indexOf('riichi') === -1 && yakuIds.indexOf('double_riichi') === -1) {
    console.log('[MISSING_RIICHI] ' + tpl.id + ': context.riichi=true but riichi not listed');
    issueCountD++;
  }

  // 3. 门前清自摸 => 必须包含 mentsumo
  if (tpl.context.winMethod === 'tsumo' && tpl.context.isMenzen && !tpl.context.riichi && yakuIds.indexOf('mentsumo') === -1 && !hasYakumanYaku(tpl.answer.yaku)) {
    console.log('[MISSING_MENTSUMO] ' + tpl.id + ': menzen tsumo but mentsumo not listed');
    issueCountD++;
  }

  // 4. 4 刻子结构 => 必须包含 toitoiho
  if (countTripletsAndKans(tpl.tiles) >= 4 && yakuIds.indexOf('toitoiho') === -1 && !hasYakumanYaku(tpl.answer.yaku)) {
    console.log('[MISSING_TOITOI] ' + tpl.id + ': 4+ triplets but toitoiho not listed');
    issueCountD++;
  }

  // 5. doraCount > 0 => 必须包含 dora
  if (tpl.context.doraCount > 0 && yakuIds.indexOf('dora') === -1) {
    console.log('[MISSING_DORA] ' + tpl.id + ': doraCount=' + tpl.context.doraCount + ' but dora not listed');
    issueCountD++;
  }

  // 6. doraCount 必须匹配 yaku 中 dora 的番数
  var doraYaku = tpl.answer.yaku.filter(function(y) { return y.id === 'dora'; });
  if (doraYaku.length > 0 && tpl.context.doraCount > 0) {
    var doraHan = doraYaku[0].han;
    if (doraHan !== tpl.context.doraCount) {
      console.log('[DORA_HAN_MISMATCH] ' + tpl.id + ': doraCount=' + tpl.context.doraCount + ' but dora han=' + doraHan);
      issueCountD++;
    }
  }
});
if (issueCountD === 0) console.log('  OK — 无漏役告警');

// ===== 汇总 =====
var totalIssues = issueCountA + issueCountB + issueCountC + issueCountD;
console.log('\n===== 审计结果 =====');
console.log('校验 A (番数一致性): ' + issueCountA + ' 问题');
console.log('校验 B (总番数一致性): ' + issueCountB + ' 问题');
console.log('校验 C (点数一致性): ' + issueCountC + ' 问题');
console.log('校验 D (漏役扫描): ' + issueCountD + ' 问题');
console.log('总问题数: ' + totalIssues);

if (totalIssues > 0) process.exit(1);
console.log('全部通过!');
