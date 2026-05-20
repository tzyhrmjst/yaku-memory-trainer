var mt = require('../../utils/mahjongTiles');
var sg = require('../../utils/scoreQuestionGenerator');
var srg = require('../../utils/scoreRandomQuestionGenerator');
var sc = require('../../utils/scoreCalculator');
var yc = require('../../utils/yakuChecker');
var fc = require('../../utils/fuCalculator');

var USE_RANDOM_SCORE_QUESTIONS = true;

var YAKU_FRIENDLY = {
  tanyao: '断幺九', pinfu: '平和', yakuhai: '役牌', chiitoitsu: '七对子',
  toitoiho: '对对和', honitsu: '混一色', chinitsu: '清一色', kokushi_musou: '国士无双',
  sanshoku_doujun: '三色同顺', ittsuu: '一气通贯', honchantaiyaochuu: '混全带幺九',
  junchan_taiyaochuu: '纯全带幺九', riichi: '立直', mentsumo: '门前清自摸和',
  ippatsu: '一发', double_riichi: '两立直', ryanpeikou: '二杯口',
  iipeikou: '一杯口', sanankou: '三暗刻', honroutou: '混老头',
  sanshoku_doukou: '三色同刻', shousangen: '小三元', daisangen: '大三元',
  shousuushii: '小四喜', daisuushii: '大四喜', tsuuiisou: '字一色',
  ryuuiisou: '绿一色', chinroutou: '清老头', chuuren_poutou: '九莲宝灯',
  suuankou: '四暗刻', suuankou_tanki: '四暗刻单骑',
  kokushi_musou_13men: '国士无双十三面', junsei_chuuren_poutou: '纯正九莲宝灯',
  tenhou: '天和', chiihou: '地和', rinshan_kaihou: '岭上开花',
  chankan: '抢杠', haitei: '海底摸月', houtei: '河底捞鱼',
  sankantsu: '三杠子', suukantsu: '四杠子', nagashi_mangan: '流局满贯'
};

Page({
  data: {
    // 模式: 'quiz' 出题练习, 'free' 自由练习
    mode: 'quiz',

    // ===== 出题模式 =====
    loading: false,
    difficulty: 'basic',
    currentQuestion: null,
    selectedHan: null,
    selectedFu: null,
    selectedPoint: '',
    answered: false,
    isCorrect: false,
    totalAnswered: 0,
    correctCount: 0,
    stopped: false,
    sessionAccuracy: 0,

    // ===== 自由模式 =====
    allPoolTiles: [],
    selectedTiles: [],
    selectedCount: 0,
    selectedDisplay: [],
    emptySlots: [],
    freeWinMethod: 'tsumo',
    freeHasOpenMeld: false,
    freeRiichi: false,
    freeDoraCount: 0,
    freeResult: null,
    freeCalculated: false
  },

  onLoad: function (options) {
    var mode = options.mode || 'quiz';
    this.setData({ mode: mode });
    this.initTileGroups();

    if (mode === 'quiz') {
      this.startPractice();
    } else {
      this.setData({ loading: false });
    }
  },

  // ========================
  // 共用 — 牌池初始化
  // ========================
  initTileGroups: function () {
    var groups = mt.buildTileGroups();
    var flat = [];
    groups.forEach(function (group) {
      group.tiles.forEach(function (tile) {
        flat.push({ code: tile.code, src: tile.src, count: 0 });
      });
    });
    this.setData({ allPoolTiles: flat });
    this._updateFreeHandDisplay();
  },

  // ========================
  // 模式切换
  // ========================
  onModeChange: function (e) {
    var mode = e.currentTarget.dataset.value;
    if (mode === this.data.mode) return;
    this.setData({
      mode: mode,
      stopped: false,
      freeResult: null,
      freeCalculated: false
    });
    if (mode === 'quiz') {
      this.startPractice();
    }
  },

  // ========================
  // 出题模式
  // ========================
  startPractice: function () {
    var self = this;
    var diff = this.data.difficulty;
    this.setData({ loading: true, stopped: false, totalAnswered: 0, correctCount: 0 });

    setTimeout(function () {
      var q;
      if (USE_RANDOM_SCORE_QUESTIONS) {
        q = srg.buildRandomScoreQuestion({ difficulty: diff });
      }
      if (!q) {
        var fallback = sg.buildScorePracticeSet(1, { difficulty: diff });
        q = fallback[0];
      }
      self.setData({
        loading: false,
        currentQuestion: q,
        selectedHan: null,
        selectedFu: null,
        selectedPoint: '',
        answered: false,
        isCorrect: false
      });
    }, 100);
  },

  onDifficultyChange: function (e) {
    var diff = e.currentTarget.dataset.value;
    if (diff === this.data.difficulty) return;
    this.setData({ difficulty: diff });
    this.startPractice();
  },

  onSelectHan: function (e) {
    if (this.data.answered) return;
    this.setData({ selectedHan: e.currentTarget.dataset.value });
  },

  onSelectFu: function (e) {
    if (this.data.answered) return;
    this.setData({ selectedFu: e.currentTarget.dataset.value });
  },

  onSelectPoint: function (e) {
    if (this.data.answered) return;
    this.setData({ selectedPoint: e.currentTarget.dataset.value });
  },

  onSubmit: function () {
    if (!this.data.currentQuestion || this.data.answered) return;
    if (!this.data.selectedHan || !this.data.selectedFu || !this.data.selectedPoint) return;

    var answer = this.data.currentQuestion.answer;
    var hanCorrect = this.data.selectedHan === answer.han;
    var fuCorrect = this.data.selectedFu === answer.fu;
    var pointCorrect = this.data.selectedPoint === answer.pointText;
    var isCorrect = hanCorrect && fuCorrect && pointCorrect;
    var newCorrectCount = this.data.correctCount + (isCorrect ? 1 : 0);
    var newTotal = this.data.totalAnswered + 1;

    this.setData({
      answered: true,
      isCorrect: isCorrect,
      correctCount: newCorrectCount,
      totalAnswered: newTotal
    });
  },

  onPrimaryAction: function () {
    if (this.data.answered) {
      this.onNext();
      return;
    }
    this.onSubmit();
  },

  onNext: function () {
    var self = this;
    var diff = this.data.difficulty;
    this.setData({ loading: true });

    setTimeout(function () {
      var q;
      if (USE_RANDOM_SCORE_QUESTIONS) {
        q = srg.buildRandomScoreQuestion({ difficulty: diff });
      }
      if (!q) {
        var fallback = sg.buildScorePracticeSet(1, { difficulty: diff });
        q = fallback[0];
      }
      self.setData({
        loading: false,
        currentQuestion: q,
        selectedHan: null,
        selectedFu: null,
        selectedPoint: '',
        answered: false,
        isCorrect: false
      });
    }, 100);
  },

  onEndSession: function () {
    var total = this.data.totalAnswered;
    var correct = this.data.correctCount;
    var accuracy = total > 0 ? Math.round(correct / total * 100) : 0;
    this.setData({ stopped: true, sessionAccuracy: accuracy });
  },

  onRetry: function () {
    this.startPractice();
  },

  // ========================
  // 自由模式 — 牌选择
  // ========================
  onFreeAddTile: function (e) {
    var tile = e.currentTarget.dataset.tile;
    var selectedTiles = this.data.selectedTiles;

    var count = selectedTiles.filter(function (t) { return t === tile; }).length;
    if (count >= 4) {
      wx.showToast({ title: '同一种牌最多 4 张', icon: 'none', duration: 1500 });
      return;
    }
    if (selectedTiles.length >= 14) {
      wx.showToast({ title: '已选满 14 张', icon: 'none', duration: 1500 });
      return;
    }

    selectedTiles.push(tile);
    selectedTiles = mt.sortTiles(selectedTiles);

    this.setData({
      selectedTiles: selectedTiles,
      selectedCount: selectedTiles.length,
      freeCalculated: false
    });
    this._updateFreePoolCounts(selectedTiles);
    this._updateFreeHandDisplay();
  },

  onFreeRemoveTile: function (e) {
    var tile = e.currentTarget.dataset.tile;
    var selectedTiles = this.data.selectedTiles.slice();
    var idx = selectedTiles.indexOf(tile);
    if (idx >= 0) {
      selectedTiles.splice(idx, 1);
      this.setData({
        selectedTiles: selectedTiles,
        selectedCount: selectedTiles.length,
        freeCalculated: false
      });
      this._updateFreePoolCounts(selectedTiles);
      this._updateFreeHandDisplay();
    }
  },

  onFreeClear: function () {
    this.setData({
      selectedTiles: [],
      selectedCount: 0,
      selectedDisplay: [],
      emptySlots: [],
      freeResult: null,
      freeCalculated: false
    });
    this._updateFreePoolCounts([]);
  },

  _buildCountMap: function (tiles) {
    var map = {};
    tiles.forEach(function (t) { map[t] = (map[t] || 0) + 1; });
    return map;
  },

  _updateFreePoolCounts: function (tiles) {
    var counts = this._buildCountMap(tiles);
    var poolTiles = this.data.allPoolTiles;
    poolTiles.forEach(function (tile) { tile.count = counts[tile.code] || 0; });
    this.setData({ allPoolTiles: poolTiles });
  },

  _updateFreeHandDisplay: function () {
    var tiles = this.data.selectedTiles;
    var display = tiles.map(function (t) {
      return { code: t, src: '/assets/tiles/' + t + '.png' };
    });
    var emptySlots = [];
    for (var i = tiles.length; i < 14; i++) { emptySlots.push(i); }
    this.setData({ selectedDisplay: display, emptySlots: emptySlots });
  },

  // ========================
  // 自由模式 — 条件变更
  // ========================
  onFreeWinMethodChange: function (e) {
    this.setData({ freeWinMethod: e.currentTarget.dataset.value, freeCalculated: false });
  },
  onFreeOpenMeldChange: function (e) {
    this.setData({ freeHasOpenMeld: e.detail.value, freeCalculated: false });
  },
  onFreeRiichiChange: function (e) {
    this.setData({ freeRiichi: e.detail.value, freeCalculated: false });
  },
  onFreeDoraCountChange: function (e) {
    this.setData({ freeDoraCount: Number(e.currentTarget.dataset.value), freeCalculated: false });
  },

  // ========================
  // 自由模式 — 计算
  // ========================
  onFreeCalculate: function () {
    var tiles = this.data.selectedTiles;
    if (tiles.length !== 14) return;

    var self = this;
    setTimeout(function () {
      var result = self._doCalculate(tiles);
      self.setData({ freeResult: result, freeCalculated: true });
    }, 50);
  },

  _doCalculate: function (tiles) {
    var contextHint = [];
    contextHint.push(this.data.freeHasOpenMeld ? '已副露' : '门前清');
    contextHint.push(this.data.freeWinMethod === 'tsumo' ? '自摸' : '荣和');
    if (this.data.freeRiichi) contextHint.push('已宣言立直');
    // 自由练习默认东场南家
    contextHint.push('场风东');
    contextHint.push('自风南');

    // 枚举每张牌作为和牌张，找最优结果
    var seenTiles = {};
    var allYakuIds = {};
    var hasOpenMeld = this.data.freeHasOpenMeld;
    var winMethod = this.data.freeWinMethod;

    // 枚举每张不同的牌作为和牌张
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (seenTiles[t]) continue;
      seenTiles[t] = true;
      var result = yc.checkAllYaku(tiles, { winTile: t, contextHint: contextHint.join('，') });
      result.forEach(function (id) { allYakuIds[id] = true; });
    }

    // 添加上下文役种
    if (this.data.freeRiichi) allYakuIds['riichi'] = true;
    if (winMethod === 'tsumo' && !hasOpenMeld) allYakuIds['mentsumo'] = true;

    // 计算总番数
    var totalHan = 0;
    var yakuList = [];
    var ids = Object.keys(allYakuIds);

    // 食下役番数
    var KUISAGARI = {
      sanshoku_doujun: [2, 1], ittsuu: [2, 1], honchantaiyaochuu: [2, 1],
      junchan_taiyaochuu: [3, 2], honitsu: [3, 2], chinitsu: [6, 5]
    };

    for (var j = 0; j < ids.length; j++) {
      var id = ids[j];
      var han;
      if (KUISAGARI[id]) {
        han = hasOpenMeld ? KUISAGARI[id][1] : KUISAGARI[id][0];
      } else {
        han = yc.YAKU_HAN[id] || 0;
      }
      if (han > 0) {
        totalHan += han;
        yakuList.push({ id: id, name: YAKU_FRIENDLY[id] || id, han: han });
      }
    }

    // 加宝牌（仅在存在非宝牌役时累加）
    if (this.data.freeDoraCount > 0 && yakuList.length > 0) {
      totalHan += this.data.freeDoraCount;
    }

    // 计算符数 — 枚举每张牌作为和牌张，取符数最高的（高点法）
    var bestFuResult = null;
    var bestFu = -1;
    var seenForFu = {};
    for (var k = 0; k < tiles.length; k++) {
      var wt = tiles[k];
      if (seenForFu[wt]) continue;
      seenForFu[wt] = true;
      var fuR = fc.calculateFu(tiles, {
        winMethod: winMethod,
        winTile: wt,
        hasOpenMeld: hasOpenMeld,
        roundWind: '1z',
        seatWind: '2z'
      });
      if (fuR.fu > bestFu) {
        bestFu = fuR.fu;
        bestFuResult = fuR;
      }
    }

    // 计算点数 — 同时计算庄家/子家两种结果
    var childPoints = sc.calculatePoints({
      han: totalHan,
      fu: bestFuResult.fu,
      winMethod: winMethod,
      isDealer: false
    });
    var dealerPoints = sc.calculatePoints({
      han: totalHan,
      fu: bestFuResult.fu,
      winMethod: winMethod,
      isDealer: true
    });

    return {
      tiles: tiles,
      totalHan: totalHan,
      fu: bestFuResult.fu,
      fuSubtotal: bestFuResult.fuSubtotal,
      fuDetails: bestFuResult.fuDetails,
      winMethod: winMethod,
      childResult: childPoints,
      dealerResult: dealerPoints,
      yakuList: yakuList,
      limit: childPoints.limit || dealerPoints.limit
    };
  },

  onGoHome: function () {
    wx.navigateBack();
  }
});
