// 算分题目生成器 — 基于精简模板动态生成题目与干扰项
// 模板中的答案经过数据引擎 yakuChecker + fuCalculator + scoreCalculator 交叉验证

var sc = require('./scoreCalculator');

// 题目模板：仅包含手牌+条件+正确答案，选项由生成器自动推算
var TEMPLATES = [
  // ============================
  // 入门 — 1~3番常见局面
  // ============================

  // 1番30符：断幺九 + 副露荣和（含単骑+2符）
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

  // 1番40符：立直 + 役牌雀头 + 単骑（白雀头+2符，単骑+2符）
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

  // 1番30符：役牌白刻子 + 副露栄和 + 庄家 → 1500
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

  // 2番30符：立直+平和（4顺子，非役牌雀头，両面待）→ 2000
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

  // 2番40符：立直+断幺九 + 中张暗刻 + 単骑 → 2600
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

  // 3番20符：立直+平和+门前自摸（平和自摸固定20符）→ 700/1300
  {
    id: 'tpl-basic-06', difficulty: 'basic',
    tiles: ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
    winTile: '4s',
    context: { winMethod:'tsumo', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:0 },
    answer: { han:3, fu:20, fuSubtotal:20, pointText:'700 / 1300', totalPoints:2700,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'pinfu',name:'平和',han:1},{id:'mentsumo',name:'门前清自摸和',han:1}],
      fuDetails:[{name:'副底（平和自摸固定20符）',fu:20}],
      explanation:'3番20符（平和自摸固定20符），子家自摸700/1300。' }
  },

  // 3番25符：立直+七对子（七对子2番+立直1番）→ 3200
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

  // 3番30符：立直+平和+断幺九（pinhu形 + 全2-8牌）→ 3900
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

  // 3番40符：立直+宝牌+断幺九+2暗刻+単骑 → 5200
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

  // 2番30符：役牌+宝牌 + 副露 + 幺九明刻+単骑 → 2000
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

  // ============================
  // 进阶 — 满贯、食下、对々和、七对子+宝牌
  // ============================

  // 3番30符：立直+平和+断幺九 + 庄家 → 5800
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

  // 5番满贯：立直+平和+断幺九+宝牌2 → 8000
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

  // 4番40符满贯：立直+断幺九+宝牌2 + 2暗刻 + 単骑 → 8000
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

  // 2番40符：混一色食下 + 幺九暗刻×2 + 役牌雀头 + 単骑 → 2600
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

  // 2番40符：対々和+役牌 + 副露 + 単骑 → 2600
  {
    id: 'tpl-adv-05', difficulty: 'advanced',
    tiles: ['2m','2m','2m','5z','5z','5z','7s','7s','7s','8p','8p','8p','3m','3m'],
    winTile: '3m',
    context: { winMethod:'ron', isDealer:false, isMenzen:false, hasOpenMeld:true, roundWind:'1z', seatWind:'2z', riichi:false, doraCount:0 },
    answer: { han:2, fu:40, fuSubtotal:34, pointText:'2600', totalPoints:2600,
      yaku:[{id:'toitoiho',name:'对对和',han:1},{id:'yakuhai',name:'役牌',han:1}],
      fuDetails:[{name:'副底',fu:20},{name:'食下荣和',fu:2},{name:'中张明刻',fu:2},{name:'中张明刻',fu:2},{name:'幺九明刻',fu:4},{name:'中张明刻',fu:2},{name:'単骑待',fu:2}],
      explanation:'2番40符，子家荣和2600。对对和+役牌白，4明刻+単骑=34→进位40符。' }
  },

  // 4番50符满贯：混一色门清+宝牌+幺九暗刻×2+役牌雀头+単骑 + 庄家 → 12000
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

  // 3番30符：立直+断幺九+门前自摸+中张暗刻 → 1000/2000
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

  // 3番25符：立直+七对子（2番）+宝牌1 → 3200
  {
    id: 'tpl-adv-08', difficulty: 'advanced',
    tiles: ['2m','2m','4m','4m','6m','6m','3p','3p','5p','5p','7s','7s','5z','5z'],
    winTile: '5z',
    context: { winMethod:'ron', isDealer:false, isMenzen:true, hasOpenMeld:false, roundWind:'1z', seatWind:'2z', riichi:true, doraCount:1 },
    answer: { han:4, fu:25, fuSubtotal:25, pointText:'6400', totalPoints:6400,
      yaku:[{id:'riichi',name:'立直',han:1},{id:'chiitoitsu',name:'七对子',han:2},{id:'dora',name:'宝牌',han:1}],
      fuDetails:[{name:'七对子固定符',fu:25}],
      explanation:'4番25符，子家荣和6400。七对子固定25符，七对子2番+立直1番+宝牌1番=4番。' }
  },

  // ============================
  // 综合 — 跳满、倍满、三倍满、役满
  // ============================
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

// 番数选项生成
function makeHanOptions(correctHan, limitName) {
  var pool;
  if (limitName === '满贯') {
    pool = [1, 2, 3, 4, 5];
  } else if (limitName === '跳满') {
    pool = [4, 5, 6, 7, 8];
  } else if (limitName === '倍满') {
    pool = [6, 8, 10, 11, 13];
  } else if (limitName === '三倍满') {
    pool = [8, 10, 11, 12, 13];
  } else if (limitName === '役满') {
    pool = [11, 12, 13, 26, 39];
  } else {
    pool = [1, 2, 3, 4, 5];
  }
  if (pool.indexOf(correctHan) === -1) {
    pool.push(correctHan);
  }
  return pool.sort(function(a, b) { return a - b; });
}

// 符数选项生成
function makeFuOptions(correctFu) {
  var pool = [20, 25, 30, 40, 50];
  if (pool.indexOf(correctFu) === -1) {
    pool.push(correctFu);
  }
  return pool.sort(function(a, b) { return a - b; });
}

// 点数选项生成 — 从正确答案的相邻番符组合生成干扰项
function makePointOptions(answer, context) {
  var correct = answer.pointText;

  var candidates = [];
  var baseFu = answer.fu;
  var baseHan = answer.han;

  // 同番不同符
  var altFus = [20, 25, 30, 40, 50].filter(function(f) { return f !== baseFu; });
  altFus.forEach(function(f) {
    try {
      var r = sc.calculatePoints({ han: baseHan, fu: f, winMethod: context.winMethod, isDealer: context.isDealer });
      if (r.pointText !== correct && candidates.indexOf(r.pointText) === -1) {
        candidates.push(r.pointText);
      }
    } catch(e) {}
  });

  // 差1番同符
  [baseHan - 1, baseHan + 1].forEach(function(h) {
    if (h <= 0) return;
    try {
      var r = sc.calculatePoints({ han: h, fu: baseFu, winMethod: context.winMethod, isDealer: context.isDealer });
      if (r.pointText !== correct && candidates.indexOf(r.pointText) === -1) {
        candidates.push(r.pointText);
      }
    } catch(e) {}
  });

  var distractors = candidates.slice(0, 3);
  var options = [correct].concat(distractors);
  var seen = {};
  options = options.filter(function(o) {
    if (seen[o]) return false;
    seen[o] = true;
    return true;
  });
  while (options.length < 4) {
    options.push(correct);
  }
  shuffle(options);
  return options;
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

/**
 * 生成一轮算分练习题
 * @param {number} count - 题目数量（默认10）
 * @param {Object} opts
 * @param {'basic'|'advanced'|'mixed'} [opts.difficulty] - 难度筛选，不传则混合
 * @returns {Array} 题目数组
 */
function buildScorePracticeSet(count, opts) {
  count = count || 10;
  opts = opts || {};

  var pool = TEMPLATES;
  if (opts.difficulty) {
    pool = TEMPLATES.filter(function(t) { return t.difficulty === opts.difficulty; });
    if (pool.length < count) pool = TEMPLATES;
  }

  var questions = [];
  for (var i = 0; i < count; i++) {
    var tpl = pool[Math.floor(Math.random() * pool.length)];
    var answer = JSON.parse(JSON.stringify(tpl.answer));

    var options = {
      han: makeHanOptions(answer.han, answer.limit ? answer.limit.name : null),
      fu: makeFuOptions(answer.fu),
      points: makePointOptions(answer, tpl.context)
    };

    questions.push({
      id: tpl.id + '-' + (i + 1),
      difficulty: tpl.difficulty,
      tiles: tpl.tiles.slice(),
      winTile: tpl.winTile,
      context: JSON.parse(JSON.stringify(tpl.context)),
      answer: answer,
      options: options
    });
  }

  return questions;
}

module.exports = {
  buildScorePracticeSet: buildScorePracticeSet
};
