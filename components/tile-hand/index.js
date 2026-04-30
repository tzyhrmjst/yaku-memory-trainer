const { getTileDisplay, getTileType, getTileColor } = require('../../utils/format');

Component({
  properties: {
    tiles: { type: Array, value: [] },
    winTile: { type: String, value: '' },
    useImages: { type: Boolean, value: true }
  },

  observers: {
    'tiles, winTile'(tiles, winTile) {
      if (!tiles || tiles.length === 0) return;

      const displayTiles = tiles.map(tile => ({
        text: getTileDisplay(tile),
        type: getTileType(tile),
        color: getTileColor(tile),
        src: '/assets/tiles/' + tile + '.png'
      }));

      let winTileDisplay = null;
      if (winTile) {
        // 和了牌可能有说明文字（如 "5m（自摸）"），只取牌代码部分
        const winCode = winTile.split('（')[0].split('或')[0].trim();
        winTileDisplay = {
          text: getTileDisplay(winCode),
          type: getTileType(winCode),
          color: getTileColor(winCode),
          src: '/assets/tiles/' + winCode + '.png'
        };
      }

      this.setData({ displayTiles, winTileDisplay });
    }
  }
});
