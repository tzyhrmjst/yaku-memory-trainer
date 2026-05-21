var mt = require('../../utils/mahjongTiles');
var sg = require('../../utils/scoreQuestionGenerator');
var srg = require('./scoreRandomQuestionGenerator');
var meldsUtil = require('../../utils/melds');
var storage = require('../../utils/storage');
var shantenCalc = require('../../utils/shantenCalculator');
var scoreAnswerBuilder = require('../../utils/scoreAnswerBuilder');

var USE_RANDOM_SCORE_QUESTIONS = true;

var WINDS = [
  { code: '1z', label: '东' },
  { code: '2z', label: '南' },
  { code: '3z', label: '西' },
  { code: '4z', label: '北' }
];

var EVENT_YAKU_OPTIONS = [
  { key: 'ippatsu', label: '一发' },
  { key: 'rinshan', label: '岭上' },
  { key: 'chankan', label: '抢杠' },
  { key: 'haitei', label: '海底' },
  { key: 'houtei', label: '河底' }
];

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
    freeRoundWind: '1z',
    freeSeatWind: '2z',
    freeHonbaCount: 0,
    freeRiichiSticks: 0,
    freeEventYaku: {},
    windOptions: WINDS,
    eventYakuOptions: EVENT_YAKU_OPTIONS,
    freeHasOpenMeld: false,
    freeRiichi: false,
    freeDoraCount: 0,
    freeResult: null,
    freeCalculated: false,
    // 副露编辑器
    freeMelds: [],
    freeMeldEditOpen: false,
    freeMeldSelectedIndices: [],
    freeMeldSelectedFlags: {},
    freeMeldTempType: '',
    // 和了牌选择
    freeWinTile: null,
    freeWinTileIndex: null,
    freeSelectingWinTile: false
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
      freeCalculated: false,
      freeWinTile: null,
      freeWinTileIndex: null,
      freeSelectingWinTile: false
    });
    if (mode === 'quiz') {
      this.startPractice();
    }
  },

  // ========================
  // 出题模式
  // ========================
  _buildNextScoreQuestion: function (diff) {
    var q = null;
    try {
      if (USE_RANDOM_SCORE_QUESTIONS) {
        q = srg.buildRandomScoreQuestion({ difficulty: diff, maxAttempts: 20 });
      }
    } catch (e) {
      console.error('build random score question error:', e);
      q = null;
    }

    if (!q) {
      try {
        var fallback = sg.buildScorePracticeSet(1, { difficulty: diff });
        q = fallback[0];
      } catch (e2) {
        console.error('build fallback score question error:', e2);
      }
    }

    return q;
  },

  startPractice: function () {
    var diff = this.data.difficulty;
    this.setData({ loading: true, stopped: false, totalAnswered: 0, correctCount: 0 });

    var q = this._buildNextScoreQuestion(diff);
    this.setData({
      loading: false,
      currentQuestion: q,
      selectedHan: null,
      selectedFu: null,
      selectedPoint: '',
      answered: false,
      isCorrect: false
    });

    if (!q) {
      wx.showToast({ title: '题目生成失败，请重试', icon: 'none', duration: 1500 });
    }
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

    var question = this.data.currentQuestion;
    var answer = question.answer;
    var hanCorrect = this.data.selectedHan === answer.han;
    var fuCorrect = this.data.selectedFu === answer.fu;
    var pointCorrect = this.data.selectedPoint === answer.pointText;
    var isCorrect = hanCorrect && fuCorrect && pointCorrect;
    var newCorrectCount = this.data.correctCount + (isCorrect ? 1 : 0);
    var newTotal = this.data.totalAnswered + 1;

    // 纳入全局统计
    storage.addRecord({
      questionId: question.id,
      yakuId: '_score',
      selectedIndex: 0,
      isCorrect: isCorrect
    });
    storage.updateDailyProgress(isCorrect, false);

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
    var diff = this.data.difficulty;
    this.setData({ loading: true });

    var q = this._buildNextScoreQuestion(diff);
    this.setData({
      loading: false,
      currentQuestion: q,
      selectedHan: null,
      selectedFu: null,
      selectedPoint: '',
      answered: false,
      isCorrect: false
    });

    if (!q) {
      wx.showToast({ title: '题目生成失败，请重试', icon: 'none', duration: 1500 });
    }
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
      freeCalculated: false,
      freeMeldSelectedIndices: [],
      freeMeldSelectedFlags: {},
      freeWinTile: null,
      freeWinTileIndex: null,
      freeSelectingWinTile: false
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
        freeCalculated: false,
        freeWinTile: null,
        freeWinTileIndex: null,
        freeSelectingWinTile: false
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
      freeCalculated: false,
      freeMelds: [],
      freeMeldEditOpen: false,
      freeMeldSelectedIndices: [],
      freeMeldSelectedFlags: {},
      freeWinTile: null,
      freeWinTileIndex: null,
      freeSelectingWinTile: false
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
    this._rebuildFreeDisplay();
  },

  // ========================
  // 自由模式 — 副露编辑器
  // ========================
  onToggleMeldEditor: function () {
    var open = !this.data.freeMeldEditOpen;
    this.setData({
      freeMeldEditOpen: open,
      freeMeldSelectedIndices: [],
      freeMeldSelectedFlags: {},
      freeMeldTempType: ''
    });
  },

  // ========================
  // 自由模式 — 和了牌选择
  // ========================
  onToggleWinTileSelect: function () {
    this.setData({
      freeSelectingWinTile: !this.data.freeSelectingWinTile,
      freeWinTile: null,
      freeWinTileIndex: null
    });
  },

  _onSelectWinTile: function (e) {
    var tile = e.currentTarget.dataset.tile;
    var index = Number(e.currentTarget.dataset.index);
    this.setData({
      freeWinTile: tile,
      freeWinTileIndex: index,
      freeSelectingWinTile: false
    });
  },

  // 手牌点击统一入口：根据编辑模式分发
  onFreeHandTileTap: function (e) {
    if (this.data.freeMeldEditOpen) {
      this._onFreeSelectMeldTile(e);
    } else if (this.data.freeSelectingWinTile) {
      this._onSelectWinTile(e);
    } else {
      this.onFreeRemoveTile(e);
    }
  },

  // 在编辑模式下手牌点击切换选中
  _onFreeSelectMeldTile: function (e) {
    var idx = e.currentTarget.dataset.index;
    var selected = this.data.freeMeldSelectedIndices.slice();
    var pos = selected.indexOf(idx);
    if (pos >= 0) {
      selected.splice(pos, 1);
    } else {
      if (selected.length >= 4) {
        wx.showToast({ title: '最多选4张', icon: 'none', duration: 1000 });
        return;
      }
      selected.push(idx);
    }
    // 构建 flags 供 WXML 渲染
    var flags = {};
    for (var i = 0; i < selected.length; i++) {
      flags[selected[i]] = true;
    }
    this.setData({
      freeMeldSelectedIndices: selected,
      freeMeldSelectedFlags: flags,
      freeMeldTempType: ''
    });
  },

  // 设定副露类型并创建
  onFreeSetMeldType: function (e) {
    var type = e.currentTarget.dataset.type;
    var indices = this.data.freeMeldSelectedIndices.slice().sort(function (a, b) { return a - b; });
    if (indices.length === 0) return;
    if ((type === 'chi' || type === 'pon') && indices.length !== 3) {
      wx.showToast({ title: '请先选择 3 张牌', icon: 'none', duration: 1500 });
      return;
    }
    if (type === 'kan' && indices.length !== 4) {
      wx.showToast({ title: '请先选择 4 张牌', icon: 'none', duration: 1500 });
      return;
    }

    var display = this.data.selectedDisplay;
    var selected = indices.map(function (i) { return display[i].code; });

    // 校验
    var valid = false;
    if (type === 'chi') {
      valid = this._validateChi(selected);
    } else if (type === 'pon') {
      valid = selected.length === 3 && selected[0] === selected[1] && selected[1] === selected[2];
    } else if (type === 'kan') {
      valid = selected.length === 4 && selected[0] === selected[1] && selected[1] === selected[2] && selected[2] === selected[3];
    }
    if (!valid) {
      wx.showToast({ title: '牌型不符合' + (type === 'chi' ? '吃' : type === 'pon' ? '碰' : '杠') + '的要求', icon: 'none', duration: 1500 });
      return;
    }

    // 最多4组面子
    if (this.data.freeMelds.length >= 4) {
      wx.showToast({ title: '最多4组副露', icon: 'none', duration: 1500 });
      return;
    }

    var melds = this.data.freeMelds.slice();
    melds.push({
      type: type,
      label: meldsUtil.MELD_LABEL[type],
      tiles: selected.slice()
    });

    this.setData({
      freeMelds: melds,
      freeMeldSelectedIndices: [],
      freeMeldSelectedFlags: {},
      freeMeldTempType: '',
      freeWinTile: null,
      freeWinTileIndex: null,
      freeSelectingWinTile: false,
      freeCalculated: false
    });
    this._rebuildFreeDisplay();
  },

  _validateChi: function (tiles) {
    if (tiles.length !== 3) return false;
    var sorted = tiles.slice().sort();
    var s = sorted[0][1];
    if (s === 'z') return false; // 字牌不能吃
    if (sorted[1][1] !== s || sorted[2][1] !== s) return false;
    var n0 = parseInt(sorted[0][0], 10);
    var n1 = parseInt(sorted[1][0], 10);
    var n2 = parseInt(sorted[2][0], 10);
    return n1 === n0 + 1 && n2 === n1 + 1;
  },

  onFreeRemoveMeld: function (e) {
    var idx = e.currentTarget.dataset.index;
    var melds = this.data.freeMelds.slice();
    melds.splice(idx, 1);
    this.setData({
      freeMelds: melds,
      freeCalculated: false,
      freeWinTile: null,
      freeWinTileIndex: null,
      freeSelectingWinTile: false
    });
    this._rebuildFreeDisplay();
  },

  // 获取已被副露消耗的牌
  _getConsumedTiles: function () {
    var consumed = [];
    var melds = this.data.freeMelds;
    for (var m = 0; m < melds.length; m++) {
      var tiles = melds[m].tiles;
      for (var t = 0; t < tiles.length; t++) {
        consumed.push(tiles[t]);
      }
    }
    return consumed;
  },

  // 重建手牌展示（排除已被副露消耗的牌）
  _rebuildFreeDisplay: function () {
    var tiles = this.data.selectedTiles.slice();
    var consumed = this._getConsumedTiles();
    // 从 tiles 中逐张移除 consumed
    for (var c = 0; c < consumed.length; c++) {
      var pos = tiles.indexOf(consumed[c]);
      if (pos >= 0) tiles.splice(pos, 1);
    }
    tiles = mt.sortTiles(tiles);
    var display = tiles.map(function (t) {
      return { code: t, src: '/assets/tiles/' + t + '.png' };
    });
    // empty slots: remaining tiles + consumed = total hand, always 14 slots
    var totalVisible = tiles.length + consumed.length;
    var emptySlots = [];
    for (var i = totalVisible; i < 14; i++) { emptySlots.push(i); }
    this.setData({ selectedDisplay: display, emptySlots: emptySlots });
  },

  // ========================
  // 自由模式 — 条件变更
  // ========================
  onFreeWinMethodChange: function (e) {
    var value = e.currentTarget.dataset.value;
    var eventYaku = this._normalizeEventYaku(this.data.freeEventYaku, value);
    this.setData({ freeWinMethod: value, freeEventYaku: eventYaku, freeCalculated: false });
  },
  onFreeWindChange: function (e) {
    var type = e.currentTarget.dataset.type;
    var value = e.currentTarget.dataset.value;
    var data = { freeCalculated: false };
    if (type === 'round') data.freeRoundWind = value;
    if (type === 'seat') data.freeSeatWind = value;
    this.setData(data);
  },
  onFreeOpenMeldChange: function (e) {
    var open = e.detail.value;
    var data = { freeHasOpenMeld: open, freeCalculated: false };
    if (open) {
      data.freeRiichi = false;
      data.freeEventYaku = this._normalizeEventYaku(this.data.freeEventYaku, this.data.freeWinMethod, true);
    } else {
      data.freeMelds = [];
      data.freeMeldEditOpen = false;
      data.freeMeldSelectedIndices = [];
      data.freeMeldSelectedFlags = {};
      data.freeWinTile = null;
      data.freeWinTileIndex = null;
      data.freeSelectingWinTile = false;
    }
    this.setData(data);
  },
  onFreeRiichiChange: function (e) {
    if (this.data.freeHasOpenMeld && e.detail.value) {
      wx.showToast({ title: '副露后不能立直', icon: 'none', duration: 1500 });
      this.setData({ freeRiichi: false, freeCalculated: false });
      return;
    }
    var eventYaku = this._normalizeEventYaku(this.data.freeEventYaku, this.data.freeWinMethod, this.data.freeHasOpenMeld, e.detail.value);
    this.setData({ freeRiichi: e.detail.value, freeEventYaku: eventYaku, freeCalculated: false });
  },
  onFreeDoraCountChange: function (e) {
    var value = Number(e.currentTarget.dataset.value);
    if (Number.isNaN(value)) value = 0;
    value = Math.max(0, Math.min(10, value));
    this.setData({ freeDoraCount: value, freeCalculated: false });
  },
  onFreeCounterChange: function (e) {
    var type = e.currentTarget.dataset.type;
    var value = Number(e.currentTarget.dataset.value);
    if (Number.isNaN(value)) value = 0;
    value = Math.max(0, Math.min(99, value));
    var data = { freeCalculated: false };
    if (type === 'honba') data.freeHonbaCount = value;
    if (type === 'riichi') data.freeRiichiSticks = value;
    this.setData(data);
  },
  onFreeEventYakuToggle: function (e) {
    var key = e.currentTarget.dataset.key;
    var current = this.data.freeEventYaku || {};
    if (!this._canToggleEventYaku(key)) return;
    var next = {};
    var keys = Object.keys(current);
    for (var i = 0; i < keys.length; i++) next[keys[i]] = current[keys[i]];
    next[key] = !next[key];
    next = this._normalizeEventYaku(next, this.data.freeWinMethod, this.data.freeHasOpenMeld, this.data.freeRiichi);
    this.setData({ freeEventYaku: next, freeCalculated: false });
  },
  _canToggleEventYaku: function (key) {
    if (key === 'ippatsu' && (this.data.freeHasOpenMeld || !this.data.freeRiichi)) {
      wx.showToast({ title: '一发需要门清立直', icon: 'none', duration: 1500 });
      return false;
    }
    if ((key === 'rinshan' || key === 'haitei') && this.data.freeWinMethod !== 'tsumo') {
      wx.showToast({ title: '该役需要自摸', icon: 'none', duration: 1500 });
      return false;
    }
    if ((key === 'chankan' || key === 'houtei') && this.data.freeWinMethod !== 'ron') {
      wx.showToast({ title: '该役需要荣和', icon: 'none', duration: 1500 });
      return false;
    }
    return true;
  },
  _normalizeEventYaku: function (eventYaku, winMethod, hasOpenMeld, riichi) {
    var normalized = {};
    var source = eventYaku || {};
    var method = winMethod || this.data.freeWinMethod;
    var open = hasOpenMeld !== undefined ? hasOpenMeld : this.data.freeHasOpenMeld;
    var hasRiichi = riichi !== undefined ? riichi : this.data.freeRiichi;

    normalized.ippatsu = !!source.ippatsu && hasRiichi && !open;
    normalized.rinshan = !!source.rinshan && method === 'tsumo';
    normalized.chankan = !!source.chankan && method === 'ron';
    normalized.haitei = !!source.haitei && method === 'tsumo';
    normalized.houtei = !!source.houtei && method === 'ron';
    return normalized;
  },

  // ========================
  // 自由模式 — 计算
  // ========================
  onFreeCalculate: function () {
    var tiles = this.data.selectedTiles;
    if (tiles.length !== 14) {
      wx.showToast({ title: '请先选满 14 张牌', icon: 'none', duration: 1500 });
      return;
    }
    if (!this.data.freeWinTile) {
      wx.showToast({ title: '请先选择和了牌', icon: 'none', duration: 1500 });
      return;
    }

    try {
      var result = this._doCalculate(tiles);
      this.setData({ freeResult: result, freeCalculated: true });
    } catch (e) {
      console.error('free score calculate error:', e);
      this.setData({
        freeResult: {
          tiles: tiles,
          totalHan: 0,
          fu: 0,
          fuSubtotal: 0,
          fuDetails: [],
          winMethod: this.data.freeWinMethod,
          childResult: { pointText: '—' },
          dealerResult: { pointText: '—' },
          yakuList: [],
          limit: null,
          yakumanCount: 0,
          error: 'calculate_error',
          errorMessage: '计算超时或失败，请减少副露编辑复杂度后重试。'
        },
        freeCalculated: true
      });
    }
  },

  _doCalculate: function (tiles) {
    var winTile = this.data.freeWinTile;
    var hasOpenMeld = this.data.freeHasOpenMeld;
    var winMethod = this.data.freeWinMethod;
    var isDealer = this.data.freeSeatWind === '1z';
    var eventYaku = this._normalizeEventYaku(
      this.data.freeEventYaku,
      winMethod,
      hasOpenMeld,
      this.data.freeRiichi
    );

    // 验证手牌是否构成完整的和了形
    var shanten = shantenCalc.calcMinShanten(tiles);
    if (shanten > -1) {
      return {
        tiles: tiles,
        totalHan: 0,
        fu: 0,
        fuSubtotal: 0,
        fuDetails: [],
        winMethod: winMethod,
        childResult: { pointText: '—' },
        dealerResult: { pointText: '—' },
        yakuList: [],
        limit: null,
        yakumanCount: 0,
        error: 'not_complete',
        errorMessage: '手牌未构成完整的和了形（需4面子+1雀头或特殊牌形），无法计分'
      };
    }

    var consumed = this._getConsumedTiles();
    var concealedTiles = tiles.slice();
    for (var i = 0; i < consumed.length; i++) {
      var pos = concealedTiles.indexOf(consumed[i]);
      if (pos >= 0) concealedTiles.splice(pos, 1);
    }

    var baseContext = {
      winMethod: winMethod,
      isDealer: isDealer,
      isMenzen: !hasOpenMeld,
      hasOpenMeld: hasOpenMeld,
      roundWind: this.data.freeRoundWind,
      seatWind: this.data.freeSeatWind,
      riichi: this.data.freeRiichi,
      ippatsu: eventYaku.ippatsu,
      rinshan: eventYaku.rinshan,
      chankan: eventYaku.chankan,
      haitei: eventYaku.haitei,
      houtei: eventYaku.houtei,
      doraIndicators: [],
      doraCountOverride: this.data.freeDoraCount,
      winTile: winTile,
      melds: this.data.freeMelds,
      concealedTiles: concealedTiles
    };

    var answerResult = scoreAnswerBuilder.buildAnswer(tiles, baseContext);

    if (!answerResult.valid) {
      return {
        tiles: tiles,
        totalHan: 0,
        fu: 0,
        fuSubtotal: 0,
        fuDetails: [],
        winMethod: winMethod,
        childResult: { pointText: '—' },
        dealerResult: { pointText: '—' },
        yakuList: [],
        limit: null,
        yakumanCount: 0,
        error: answerResult.error === 'no_non_dora_yaku' ? 'no_yaku' : answerResult.error,
        errorMessage: answerResult.error === 'no_non_dora_yaku'
          ? '未检测到可和牌役种。宝牌不能单独作为役，当前手牌无法计分。'
          : '当前手牌无法计分，请检查和牌条件。'
      };
    }

    var scoreResult = answerResult.answer;
    var playerResult = this._applyScoreCounters(
      scoreResult,
      isDealer,
      winMethod,
      this.data.freeHonbaCount,
      this.data.freeRiichiSticks
    );

    return {
      tiles: tiles,
      totalHan: scoreResult.han,
      fu: scoreResult.fu,
      fuSubtotal: scoreResult.fuSubtotal,
      fuDetails: scoreResult.fuDetails,
      winMethod: winMethod,
      isDealer: isDealer,
      roundWind: this.data.freeRoundWind,
      seatWind: this.data.freeSeatWind,
      honbaCount: this.data.freeHonbaCount,
      riichiSticks: this.data.freeRiichiSticks,
      playerResult: playerResult,
      childResult: playerResult,
      dealerResult: playerResult,
      yakuList: scoreResult.yaku,
      limit: scoreResult.limit || null,
      yakumanCount: scoreResult.yakumanCount || 0
    };
  },

  _applyScoreCounters: function (answer, isDealer, winMethod, honbaCount, riichiSticks) {
    var honba = Math.max(0, Number(honbaCount) || 0);
    var sticks = Math.max(0, Number(riichiSticks) || 0);
    var payments = answer.payments || {};
    var stickPoints = sticks * 1000;
    var pointText;
    var totalPoints;

    if (winMethod === 'ron') {
      var ronPoints = (payments.ron || answer.totalPoints || 0) + honba * 300;
      totalPoints = ronPoints + stickPoints;
      pointText = String(ronPoints);
    } else if (isDealer) {
      var eachPay = (payments.dealerTsumo || payments.childTsumo || 0) + honba * 100;
      totalPoints = eachPay * 3 + stickPoints;
      pointText = eachPay + ' all';
    } else {
      var childPay = (payments.childTsumo || 0) + honba * 100;
      var dealerPay = (payments.dealerTsumo || 0) + honba * 100;
      totalPoints = dealerPay + childPay * 2 + stickPoints;
      pointText = childPay + ' / ' + dealerPay;
    }

    return {
      pointText: pointText,
      totalPoints: totalPoints,
      basePointText: answer.pointText,
      baseTotalPoints: answer.totalPoints,
      limit: answer.limit,
      bonusText: this._buildScoreBonusText(honba, sticks)
    };
  },

  _buildScoreBonusText: function (honbaCount, riichiSticks) {
    var parts = [];
    if (honbaCount > 0) parts.push(honbaCount + '本场');
    if (riichiSticks > 0) parts.push('供托' + (riichiSticks * 1000) + '点');
    return parts.join('，');
  },

  onGoHome: function () {
    wx.navigateBack();
  }
});
