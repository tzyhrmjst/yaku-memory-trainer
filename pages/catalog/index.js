const yakus = require('../../data/yakus');
const statsEngine = require('../../utils/statsEngine');

Page({
  data: {
    allYakus: [],
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
    this.setData({
      allYakus: list,
      yakus: this.filterYakus(list, this.data.filter)
    });
  },

  onFilterTap(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      filter,
      yakus: this.filterYakus(this.data.allYakus, filter)
    });
  },

  filterYakus(list, filter) {
    if (filter === 'all') return list;
    return list.filter(item => item.category === filter);
  },

  onYakuTap(e) {
    const { yakuId } = e.detail;
    wx.navigateTo({ url: '/pages/yaku-detail/index?id=' + yakuId });
  }
});
