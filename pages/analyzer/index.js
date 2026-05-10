var mt = require('../../utils/mahjongTiles');
var ha = require('../../utils/handAnalyzer');

// 牌型通俗名称
var YAKU_FRIENDLY = {
  tanyao: { label: '断幺九', emoji: '🔢', tip: '只用2~8的数字牌' },
  pinfu: { label: '平和', emoji: '🌊', tip: '全是顺子，平稳和牌' },
  yakuhai: { label: '役牌', emoji: '🐉', tip: '有役牌刻子就给分' },
  chiitoitsu: { label: '七对子', emoji: '👯', tip: '凑齐7组对子' },
  toitoiho: { label: '对对和', emoji: '🪨', tip: '全是刻子，碰出来的' },
  honitsu: { label: '混一色', emoji: '🎨', tip: '一个花色加字牌' },
  chinitsu: { label: '清一色', emoji: '🌈', tip: '全是一个花色' },
  kokushi_musou: { label: '国士无双', emoji: '👑', tip: '集齐13种幺九牌' },
  sanshoku_doujun: { label: '三色同顺', emoji: '🔴🟢🔵', tip: '万筒索同一数字的顺子' },
  ittsuu: { label: '一气通贯', emoji: '🚀', tip: '同花色123·456·789' },
  honchantaiyaochuu: { label: '混全带幺九', emoji: '🧩', tip: '每个面子都有幺九牌' },
  junchan_taiyaochuu: { label: '纯全带幺九', emoji: '🧩', tip: '每面都有老头牌，无字' },
};

Page({
  data: {
    selectedTiles: [],
    allPoolTiles: [],
    selectedCount: 0,
    selectedDisplay: [],
    emptySlots: [],
    analysis: null,
  },

  onLoad: function () {
    this.initTileGroups();
  },

  initTileGroups: function () {
    var groups = mt.buildTileGroups();
    var flat = [];
    groups.forEach(function (group) {
      group.tiles.forEach(function (tile) {
        flat.push({ code: tile.code, src: tile.src, count: 0 });
      });
    });
    this.setData({ allPoolTiles: flat });
    this._updateHandDisplay();
  },

  onAddTile: function (e) {
    var tile = e.currentTarget.dataset.tile;
    var selectedTiles = this.data.selectedTiles;

    var count = selectedTiles.filter(function (t) {
      return t === tile;
    }).length;
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
    });
    this._updateCounts(selectedTiles);
    this._updateHandDisplay();

    if (selectedTiles.length === 14) {
      this.runAnalysis();
    } else {
      this.setData({ analysis: null });
    }
  },

  onRemoveTile: function (e) {
    var tile = e.currentTarget.dataset.tile;
    var selectedTiles = this.data.selectedTiles.slice();
    var idx = selectedTiles.indexOf(tile);
    if (idx >= 0) {
      selectedTiles.splice(idx, 1);
      this.setData({
        selectedTiles: selectedTiles,
        selectedCount: selectedTiles.length,
      });
      this._updateCounts(selectedTiles);
      this._updateHandDisplay();

      if (selectedTiles.length < 14) {
        this.setData({ analysis: null });
      } else {
        this.runAnalysis();
      }
    }
  },

  onClear: function () {
    this.setData({
      selectedTiles: [],
      selectedCount: 0,
      selectedDisplay: [],
      emptySlots: [],
      analysis: null,
    });
    this._updateCounts([]);
  },

  runAnalysis: function () {
    var self = this;
    var tiles = this.data.selectedTiles;
    if (tiles.length !== 14) return;

    setTimeout(function () {
      var result = ha.analyzeHand({ tiles: tiles });
      self._enrichAnalysis(result);
      self.setData({ analysis: result });
    }, 50);
  },

  // 给分析结果补充图片路径和通俗标签
  _enrichAnalysis: function (result) {
    if (!result || !result.valid) return;

    // 切牌建议加图片
    result.discards.forEach(function (d) {
      d.tileSrc = '/assets/tiles/' + d.tile + '.png';
      d.ukeireImages = d.ukeireTiles.map(function (t) {
        return { code: t, src: '/assets/tiles/' + t + '.png' };
      });
    });

    // 役种方向加通俗标签
    result.closestYaku.forEach(function (y) {
      var info = YAKU_FRIENDLY[y.id];
      if (info) {
        y.emoji = info.emoji;
        y.tip = info.tip;
      } else {
        y.emoji = '🀄';
        y.tip = '';
      }
    });

    // 向听可视化文案
    var shanten = result.summary.shanten;
    if (shanten <= -1) {
      result.summary.stepsText = '已经和牌！';
    } else if (shanten === 0) {
      result.summary.stepsText = '已经听牌，等一张就能和！';
    } else {
      result.summary.stepsText = '还需 ' + shanten + ' 步就能听牌';
    }
  },

  _buildCountMap: function (tiles) {
    var map = {};
    tiles.forEach(function (t) {
      map[t] = (map[t] || 0) + 1;
    });
    return map;
  },

  _updateCounts: function (tiles) {
    var counts = this._buildCountMap(tiles);
    var poolTiles = this.data.allPoolTiles;

    poolTiles.forEach(function (tile) {
      tile.count = counts[tile.code] || 0;
    });

    this.setData({ allPoolTiles: poolTiles });
  },

  _updateHandDisplay: function () {
    var tiles = this.data.selectedTiles;
    var display = tiles.map(function (t) {
      return {
        code: t,
        src: '/assets/tiles/' + t + '.png',
      };
    });

    var emptySlots = [];
    for (var i = tiles.length; i < 14; i++) {
      emptySlots.push(i);
    }

    this.setData({
      selectedDisplay: display,
      emptySlots: emptySlots,
    });
  },
});
