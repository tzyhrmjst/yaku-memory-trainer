var format = require('../../utils/format');
var melds = require('../../utils/melds');

function tileToDisplay(tile) {
  return {
    text: format.getTileDisplay(tile),
    type: format.getTileType(tile),
    color: format.getTileColor(tile),
    src: '/assets/tiles/' + tile + '.png',
    code: tile
  };
}

Component({
  properties: {
    tiles: { type: Array, value: [] },
    winTile: { type: String, value: '' },
    useImages: { type: Boolean, value: true },
    concealedTiles: { type: Array, value: [] },
    melds: { type: Array, value: [] }
  },

  lifetimes: {
    attached() {
      this._renderTiles();
    }
  },

  observers: {
    'tiles, winTile, concealedTiles, melds'() {
      this._renderTiles();
    }
  },

  methods: {
    _renderTiles: function() {
      var tiles = this.properties.tiles;
      var winTile = this.properties.winTile;
      var concealedTiles = this.properties.concealedTiles;
      var meldObjs = this.properties.melds;

      var hasMelds = (concealedTiles && concealedTiles.length > 0) || (meldObjs && meldObjs.length > 0);

      var winCode = '';
      if (winTile) {
        winCode = winTile.split('（')[0].split('或')[0].trim();
      }

      if (hasMelds) {
        // === 分组渲染 ===
        var concealedDisplay = (concealedTiles || []).map(tileToDisplay);
        var meldGroupDisplays = (meldObjs || []).map(function(meld) {
          return {
            tiles: (meld.tiles || []).map(tileToDisplay),
            label: melds.formatMeldLabel(meld)
          };
        });

        // 标记和了牌：检查是否在暗牌区或副露组中
        var winTileInMeld = false;
        var winTileIndex = -1;
        if (winCode) {
          for (var i = 0; i < concealedDisplay.length; i++) {
            if (concealedDisplay[i].code === winCode) {
              concealedDisplay[i].isWinTile = true;
              break;
            }
          }
          for (var g = 0; g < meldGroupDisplays.length; g++) {
            for (var t = 0; t < meldGroupDisplays[g].tiles.length; t++) {
              if (meldGroupDisplays[g].tiles[t].code === winCode) {
                meldGroupDisplays[g].tiles[t].isWinTile = true;
                meldGroupDisplays[g].hasWinTile = true;
                winTileInMeld = true;
                break;
              }
            }
            if (winTileInMeld) break;
          }
        }

        var winTileDisplay = winCode ? tileToDisplay(winCode) : null;

        this.setData({
          hasMelds: true,
          concealedDisplay: concealedDisplay,
          meldGroupDisplays: meldGroupDisplays,
          winTileDisplay: winTileDisplay,
          winTileInMeld: winTileInMeld,
          displayTiles: [],
          winTileDisplayOld: null
        });
      } else {
        // === 旧 flat 渲染 ===
        if (!tiles || tiles.length === 0) return;

        var displayTiles = tiles.map(tileToDisplay);

        var winTileDisplay = null;
        if (winCode) {
          winTileDisplay = tileToDisplay(winCode);
        }

        this.setData({
          hasMelds: false,
          displayTiles: displayTiles,
          winTileDisplayOld: winTileDisplay,
          concealedDisplay: [],
          meldGroupDisplays: [],
          winTileDisplay: null,
          winTileInMeld: false
        });
      }
    },

    onImgError: function(e) {
      var idx = e.currentTarget.dataset.index;
      wx.showToast({ title: '图片加载失败: ' + idx, icon: 'none' });
    }
  }
});
