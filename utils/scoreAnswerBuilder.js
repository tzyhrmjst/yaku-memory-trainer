// 算分答案构建器 — 从手牌+上下文自动生成标准答案
// 用于随机题和模板题的答案一致性保证

var yc = require('./yakuChecker');
var fc = require('./fuCalculator');
var sc = require('./scoreCalculator');
var dora = require('./dora');

// 食下役种表：门清番数 → 副露番数
var KUISAGARI = {
  sanshoku_doujun: [2, 1],
  ittsuu: [2, 1],
  honchantaiyaochuu: [2, 1],
  honitsu: [3, 2],
  junchan_taiyaochuu: [3, 2],
  chinitsu: [6, 5]
};

// 役种日文名
var YAKU_NAME_JA = {
  tanyao: 'タンヤオ', yakuhai: '役牌', pinfu: 'ピンフ', riichi: 'リーチ',
  mentsumo: '門前清自摸和', ippatsu: '一発', iipeikou: '一盃口',
  rinshan_kaihou: '嶺上開花', chankan: '搶槓', haitei: '海底摸月',
  houtei: '河底撈魚', sanshoku_doujun: '三色同順', chiitoitsu: '七対子',
  toitoiho: '対々和', ittsuu: '一気通貫', honchantaiyaochuu: '混全帯么九',
  sanankou: '三暗刻', double_riichi: 'ダブルリーチ', shousangen: '小三元',
  honroutou: '混老頭', sanshoku_doukou: '三色同刻', sankantsu: '三槓子',
  honitsu: '混一色', junchan_taiyaochuu: '純全帯么九', ryanpeikou: '二盃口',
  nagashi_mangan: '流し満貫', chinitsu: '清一色', suuankou: '四暗刻',
  kokushi_musou: '国士無双', daisangen: '大三元', shousuushii: '小四喜',
  tsuuiisou: '字一色', ryuuiisou: '緑一色', chinroutou: '清老頭',
  chuuren_poutou: '九蓮宝灯', tenhou: '天和', chiihou: '地和',
  suukantsu: '四槓子', daisuushii: '大四喜', suuankou_tanki: '四暗刻単騎',
  kokushi_musou_13men: '国士無双十三面待ち', junsei_chuuren_poutou: '純正九蓮宝灯'
};

/**
 * 构建 contextHint 字符串供 yakuChecker 解析
 */
function buildContextHint(context) {
  var parts = [];
  if (context.hasOpenMeld) parts.push('已副露');
  if (context.riichi) parts.push('已宣言立直');
  else if (context.isMenzen) parts.push('未立直');
  if (context.winMethod === 'tsumo') parts.push('自摸和牌');
  else parts.push('荣和');
  return parts.join('，');
}

/**
 * 从 tiles + context 构建完整答案
 * @param {string[]} tiles - 14张手牌（可含 0m/0p/0s 赤五）
 * @param {Object} context - { winMethod, isDealer, isMenzen, hasOpenMeld, roundWind, seatWind, riichi, doraIndicators, winTile }
 * @returns {{ valid: boolean, answer?: Object, error?: string }}
 */
function buildAnswer(tiles, context) {
  context = context || {};
  var winMethod = context.winMethod || 'ron';
  var isDealer = context.isDealer || false;
  var isMenzen = context.isMenzen !== undefined ? context.isMenzen : !context.hasOpenMeld;
  var hasOpenMeld = context.hasOpenMeld || false;
  var roundWind = context.roundWind || '1z';
  var seatWind = context.seatWind || '2z';
  var riichi = context.riichi || false;
  var doraIndicators = context.doraIndicators || [];
  var winTile = context.winTile || '';

  // 1. 归一化牌（赤五 → 普通五）用于判役和算符
  var normalizedTiles = tiles.map(dora.normalizeTile);

  // 2. 判役
  var contextHint = buildContextHint(context);
  var yakuIds = yc.checkAllYaku(normalizedTiles, {
    winTile: winTile,
    contextHint: contextHint
  });

  // 3. 过滤门清专用役（副露时排除）
  if (hasOpenMeld) {
    yakuIds = yakuIds.filter(function (id) {
      return !yc.MENZEN_ONLY_YAKU.has(id);
    });
  }

  // 4. 应用食下番数
  var yakuList = [];
  var baseYakuHan = 0;
  var isYakuman = false;
  var yakuhaiNames = getYakuhaiSpecificNames(normalizedTiles, { roundWind: roundWind, seatWind: seatWind });
  var yakuhaiIdx = 0;

  yakuIds.forEach(function (id) {
    var han;
    if (KUISAGARI[id] && hasOpenMeld) {
      han = KUISAGARI[id][1];
    } else {
      han = yc.YAKU_HAN[id];
    }
    if (!han) return;

    var name;
    if (id === 'yakuhai') {
      name = yakuhaiNames[yakuhaiIdx] || getYakuName(id);
      yakuhaiIdx++;
    } else {
      name = getYakuName(id);
    }

    yakuList.push({ id: id, name: name, han: han });
    baseYakuHan += han;

    if (han >= 13) isYakuman = true;
  });

  // 5. 宝牌统计
  var doraCount = dora.countDora(tiles, doraIndicators, true);
  if (doraCount > 0) {
    yakuList.push({ id: 'dora', name: '宝牌', han: doraCount });
  }
  var totalHan = baseYakuHan + doraCount;

  // 6. 验证必须有非宝牌役
  if (baseYakuHan === 0) {
    return { valid: false, error: 'no_non_dora_yaku' };
  }

  // 7. 算符 — 役满不计符
  var fuResult;
  if (isYakuman) {
    fuResult = { fu: 0, fuSubtotal: 0, fuDetails: [] };
  } else {
    fuResult = fc.calculateFu(normalizedTiles, {
      winMethod: winMethod,
      winTile: winTile,
      hasOpenMeld: hasOpenMeld,
      roundWind: roundWind,
      seatWind: seatWind
    });
  }

  // 8. 算点
  var pointResult = sc.calculatePoints({
    han: totalHan,
    fu: fuResult.fu,
    winMethod: winMethod,
    isDealer: isDealer
  });

  // 9. 生成解释
  var explanation = buildExplanation(
    yakuList, fuResult, pointResult, isDealer, winMethod
  );

  // 10. doraDisplays
  var doraDisplays = dora.buildIndicatorDisplays(doraIndicators);

  return {
    valid: true,
    answer: {
      han: totalHan,
      fu: fuResult.fu,
      fuSubtotal: fuResult.fuSubtotal,
      limit: pointResult.limit || undefined,
      pointText: pointResult.pointText,
      totalPoints: pointResult.totalPoints,
      yaku: yakuList,
      fuDetails: fuResult.fuDetails,
      explanation: explanation,
      baseYakuHan: baseYakuHan,
      doraCount: doraCount
    },
    doraDisplays: doraDisplays
  };
}

function getYakuName(id) {
  var nameMap = {
    tanyao: '断幺九', yakuhai: '役牌', pinfu: '平和', riichi: '立直',
    mentsumo: '门前清自摸和', ippatsu: '一发', iipeikou: '一杯口',
    rinshan_kaihou: '岭上开花', chankan: '抢槓', haitei: '海底摸月',
    houtei: '河底捞鱼', sanshoku_doujun: '三色同顺', chiitoitsu: '七对子',
    toitoiho: '对对和', ittsuu: '一气通贯', honchantaiyaochuu: '混全带幺九',
    sanankou: '三暗刻', double_riichi: '两立直', shousangen: '小三元',
    honroutou: '混老头', sanshoku_doukou: '三色同刻', sankantsu: '三槓子',
    honitsu: '混一色', junchan_taiyaochuu: '纯全带幺九', ryanpeikou: '二杯口',
    nagashi_mangan: '流局满贯', chinitsu: '清一色', suuankou: '四暗刻',
    kokushi_musou: '国士无双', daisangen: '大三元', shousuushii: '小四喜',
    tsuuiisou: '字一色', ryuuiisou: '绿一色', chinroutou: '清老头',
    chuuren_poutou: '九莲宝灯', tenhou: '天和', chiihou: '地和',
    suukantsu: '四槓子', daisuushii: '大四喜', suuankou_tanki: '四暗刻单骑',
    kokushi_musou_13men: '国士无双十三面听', junsei_chuuren_poutou: '纯正九莲宝灯'
  };
  return nameMap[id] || id;
}

// 根据牌面生成具体的役牌名称（役牌·白、役牌·发、役牌·东 等）
function getYakuhaiSpecificNames(tiles, context) {
  var counts = {};
  tiles.forEach(function(t) { counts[t] = (counts[t] || 0) + 1; });
  var names = [];
  var dragonNames = { '5z': '役牌·白', '6z': '役牌·发', '7z': '役牌·中' };
  var windNames = { '1z': '役牌·东', '2z': '役牌·南', '3z': '役牌·西', '4z': '役牌·北' };

  ['5z', '6z', '7z'].forEach(function(t) {
    if ((counts[t] || 0) >= 3) names.push(dragonNames[t]);
  });
  ['1z', '2z', '3z', '4z'].forEach(function(t) {
    if ((counts[t] || 0) >= 3 && (t === context.roundWind || t === context.seatWind)) {
      names.push(windNames[t]);
    }
  });
  return names;
}

function buildExplanation(yakuList, fuResult, pointResult, isDealer, winMethod) {
  var parts = [];
  var dealerLabel = isDealer ? '庄家' : '子家';
  var winLabel = winMethod === 'tsumo' ? '自摸' : '荣和';

  parts.push(pointResult.limit
    ? (pointResult.limit.name + '，' + dealerLabel + winLabel + pointResult.pointText)
    : (yakuList.reduce(function (s, y) { return s + y.han; }, 0) + '番' + fuResult.fu + '符，' + dealerLabel + winLabel + pointResult.pointText)
  );

  var yakuNames = yakuList.map(function (y) { return y.name + (y.han > 1 ? ' ' + y.han + '番' : ''); });
  parts.push(yakuNames.join('+'));

  if (fuResult.fuDetails && fuResult.fuDetails.length > 0) {
    var fuNames = fuResult.fuDetails.map(function (d) { return d.name + '+' + d.fu + '符'; });
    parts.push(fuNames.join('，'));
  }

  return parts.join('。');
}

module.exports = {
  buildAnswer: buildAnswer,
  buildContextHint: buildContextHint
};
