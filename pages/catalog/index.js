const yakus = require('../../data/yakus');
const statsEngine = require('../../utils/statsEngine');

Page({
  data: {
    yakus: [],
    filter: 'all'
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const mastery = statsEngine.getYakuMastery();
    const list = yakus.map(yaku => {
      const m = mastery.find(item => item.yakuId === yaku.id);
      return {
        ...yaku,
        masteryLevel: m ? m.masteryLevel : 'new',
        accuracy: m ? m.accuracy : 0
      };
    });
    this.setData({ yakus: list });
  },

  onFilterTap(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter });
  },

  onYakuTap(e) {
    const { yakuId } = e.detail;
    wx.navigateTo({ url: '/pages/yaku-detail/index?id=' + yakuId });
  }
});
