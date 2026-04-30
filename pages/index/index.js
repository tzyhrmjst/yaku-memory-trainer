const statsEngine = require('../../utils/statsEngine');

Page({
  data: {
    loading: true,
    stats: {},
    wrongCount: 0
  },

  onShow() {
    this.refreshData();
  },

  refreshData() {
    const stats = statsEngine.getOverallStats();
    const wrongCount = stats.wrongCount;

    this.setData({
      loading: false,
      stats,
      wrongCount
    });
  },

  // 导航
  goCatalog() {
    wx.navigateTo({ url: '/pages/catalog/index' });
  },

  goQuiz() {
    wx.navigateTo({ url: '/pages/quiz/index' });
  },

  goWrongBook() {
    wx.navigateTo({ url: '/pages/wrongbook/index' });
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/profile/index' });
  },

  onShareAppMessage() {
    return {
      title: '日麻役种记忆训练',
      path: '/pages/index/index',
      imageUrl: '/assets/images/mahjong-header.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: '日麻役种记忆训练',
      query: '',
      imageUrl: '/assets/images/mahjong-header.jpg'
    };
  }
});
