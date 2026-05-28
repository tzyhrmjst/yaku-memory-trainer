// 算分答案构建器 — 从手牌+上下文自动生成标准答案
// 用于随机题和模板题的答案一致性保证

var yc = require('./yakuChecker');
var fc = require('./fuCalculator');
var sc = require('./scoreCalculator');
var dora = require('./dora');
var meldsUtil = require('./melds');

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

var WIND_LABEL = {
  '1z': '东',
  '2z': '南',
  '3z': '西',
  '4z': '北'
};

/**
 * 构建 contextHint 字符串供 yakuChecker 解析
 */
function buildContextHint(context) {
  var parts = [];
  if (context.hasOpenMeld) parts.push('已副露');
  if (context.doubleRiichi) parts.push('两立直');
  if (context.riichi) parts.push('已宣言立直');
  else if (!context.doubleRiichi && context.isMenzen) parts.push('未立直');
  if (context.ippatsu) parts.push('一巡内');
  if (context.winMethod === 'tsumo') parts.push('自摸和牌');
  else parts.push('荣和');
  if (context.roundWind) parts.push('场风' + WIND_LABEL[context.roundWind]);
  if (context.seatWind) parts.push('自风' + WIND_LABEL[context.seatWind]);
  if (context.rinshan) parts.push('岭上');
  if (context.chankan) parts.push('抢槓');
  if (context.haitei) parts.push('海底');
  if (context.houtei) parts.push('河底');
  return parts.join('，');
}

/**
 * 从 tiles + context 构建完整答案
 * @param {string[]} tiles - 14张手牌（可含 0m/0p/0s 赤五）
 * @param {Object} context - { winMethod, isDealer, isMenzen, hasOpenMeld, roundWind, seatWind, riichi, doraIndicators, uraDoraIndicators, doraCountOverride, uraDoraCountOverride, winTile }
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
  var uraDoraIndicators = riichi ? (context.uraDoraIndicators || []) : [];
  var winTile = context.winTile || '';

  // 1. 归一化牌（赤五 → 普通五）用于判役和算符
  var normalizedTiles = tiles.map(dora.normalizeTile);
  var normalizedWinTile = dora.normalizeTile(winTile);

  // 2. 判役
  var contextHint = buildContextHint(context);
  var yakuContext = {};
  if (context.melds && context.melds.length > 0) {
    yakuContext.explicitMelds = meldsUtil.toExplicitMelds(context.melds, '').explicitMelds;
  }
  var yakuIds = yc.checkAllYaku(normalizedTiles, {
    winTile: normalizedWinTile,
    contextHint: contextHint,
    context: yakuContext
  });

  // 3. 过滤门清专用役（副露时排除）
  if (hasOpenMeld) {
    yakuIds = yakuIds.filter(function (id) {
      return !yc.MENZEN_ONLY_YAKU.has(id);
    });
  }

  // 4. 役满规范化：上位排他、双倍互斥
  var normalization = yc.normalizeYakuResult(yakuIds);
  yakuIds = normalization.ids;
  var yakumanCount = normalization.yakumanCount;

  // 5. 应用食下番数
  var yakuList = [];
  var baseYakuHan = 0;
  var isYakuman = yakumanCount > 0;
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
  });

  // 6. 宝牌统计 — 役满时不加宝牌
  var normalDoraCount = 0;
  var uraDoraCount = 0;
  if (!isYakuman) {
    if (typeof context.doraCountOverride === 'number') {
      normalDoraCount = context.doraCountOverride;
    } else {
      normalDoraCount = dora.countDora(tiles, doraIndicators, true);
    }
    if (riichi) {
      if (typeof context.uraDoraCountOverride === 'number') {
        uraDoraCount = context.uraDoraCountOverride;
      } else {
        uraDoraCount = dora.countDora(tiles, uraDoraIndicators, false);
      }
    }
    if (normalDoraCount > 0) {
      yakuList.push({ id: 'dora', name: '宝牌', han: normalDoraCount });
    }
    if (uraDoraCount > 0) {
      yakuList.push({ id: 'ura_dora', name: '里宝牌', han: uraDoraCount });
    }
  }
  var doraCount = normalDoraCount + uraDoraCount;
  var totalHan = baseYakuHan + doraCount;

  // 7. 验证必须有非宝牌役
  if (baseYakuHan === 0) {
    return { valid: false, error: 'no_non_dora_yaku' };
  }

  // 8. 算符 — 役满不计符
  var fuResult;
  if (isYakuman) {
    fuResult = { fu: 0, fuSubtotal: 0, fuDetails: [] };
  } else {
    var fuContext = {
      winMethod: winMethod,
      winTile: normalizedWinTile,
      hasOpenMeld: hasOpenMeld,
      roundWind: roundWind,
      seatWind: seatWind
    };

    // 如果有完整副露信息，传递 explicitMelds 以提高明暗判定精度
    if (context.melds && context.melds.length > 0) {
      var concealed = context.concealedTiles || [];
      // 从暗牌中找雀头（出现2次的牌）
      var pairCounts = {};
      for (var ci = 0; ci < concealed.length; ci++) {
        pairCounts[concealed[ci]] = (pairCounts[concealed[ci]] || 0) + 1;
      }
      var pairTile = '';
      for (var pt in pairCounts) {
        if (pairCounts.hasOwnProperty(pt) && pairCounts[pt] >= 2) {
          pairTile = pt;
          break;
        }
      }
      var explicitData = meldsUtil.toExplicitMelds(context.melds, pairTile);
      // 只有当 able to build complete 4 meld + 1 pair 时才使用 bypass
      if (explicitData.explicitMelds.length === 4) {
        fuContext.explicitMelds = explicitData.explicitMelds;
        fuContext.explicitPair = explicitData.explicitPair;
      }
    }

    fuResult = fc.calculateFu(normalizedTiles, fuContext);
  }

  // 9. 算点 — 役满使用 yakumanCount，否则使用 han/fu
  var pointResult = sc.calculatePoints({
    han: totalHan,
    fu: fuResult.fu,
    winMethod: winMethod,
    isDealer: isDealer,
    yakumanCount: yakumanCount
  });

  // 9. 生成解释
  var explanation = buildExplanation(
    yakuList, fuResult, pointResult, isDealer, winMethod
  );

  // 10. doraDisplays
  var doraDisplays = dora.buildIndicatorDisplays(doraIndicators);
  var uraDoraDisplays = dora.buildIndicatorDisplays(uraDoraIndicators);

  return {
    valid: true,
    answer: {
      han: totalHan,
      fu: fuResult.fu,
      fuSubtotal: fuResult.fuSubtotal,
      limit: pointResult.limit || undefined,
      pointText: pointResult.pointText,
      totalPoints: pointResult.totalPoints,
      payments: pointResult.payments,
      yaku: yakuList,
      fuDetails: fuResult.fuDetails,
      explanation: explanation,
      baseYakuHan: baseYakuHan,
      doraCount: doraCount,
      normalDoraCount: normalDoraCount,
      uraDoraCount: uraDoraCount,
      yakumanCount: yakumanCount
    },
    doraDisplays: doraDisplays,
    uraDoraDisplays: uraDoraDisplays
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
    if ((counts[t] || 0) >= 3) {
      if (t === context.roundWind) names.push(windNames[t] + '（场风）');
      if (t === context.seatWind) names.push(windNames[t] + '（自风）');
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
