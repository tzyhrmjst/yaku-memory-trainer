const { getTileDisplay, getTileType, getTileColor } = require('../../utils/format');

Component({
  properties: {
    tiles: { type: Array, value: [] },
    winTile: { type: String, value: '' },
    useImages: { type: Boolean, value: true }
  },

  lifetimes: {
    attached() {
      this._renderTiles();
    }
  },

  observers: {
    'tiles, winTile'() {
      this._renderTiles();
    }
  },

  methods: {
    _renderTiles() {
      const { tiles, winTile } = this.properties;
      if (!tiles || tiles.length === 0) return;

      const displayTiles = tiles.map(tile => ({
        text: getTileDisplay(tile),
        type: getTileType(tile),
        color: getTileColor(tile),
        src: '/assets/tiles/' + tile + '.png'
      }));

      let winTileDisplay = null;
      if (winTile) {
        const winCode = winTile.split('（')[0].split('或')[0].trim();
        winTileDisplay = {
          text: getTileDisplay(winCode),
          type: getTileType(winCode),
          color: getTileColor(winCode),
          src: '/assets/tiles/' + winCode + '.png'
        };
      }

      this.setData({ displayTiles, winTileDisplay });
    },

    onImgError(e) {
      const idx = e.currentTarget.dataset.index;
      wx.showToast({ title: '图片加载失败: ' + idx, icon: 'none' });
    }
  }
});
