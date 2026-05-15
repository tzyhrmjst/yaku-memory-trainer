const statsEngine = require('../../utils/statsEngine');

Page({
  data: {
    loading: true,
    stats: {},
    wrongCount: 0,
    navBarHeight: 0,
    statusBarHeight: 0,
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    const menu = wx.getMenuButtonBoundingClientRect();
    const statusBarHeight = sys.statusBarHeight;
    const navContentHeight = (menu.top - statusBarHeight) * 2 + menu.height;
    this.setData({
      statusBarHeight,
      navBarHeight: statusBarHeight + navContentHeight,
    });
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
      wrongCount,
    });
  },

  // 导航
  goCatalog() {
    wx.navigateTo({ url: '/pages/catalog/index' });
  },

  goQuiz() {
    wx.navigateTo({ url: '/pages/quiz/index' });
  },

  goWeaknessQuiz() {
    wx.navigateTo({ url: '/pages/quiz/index?mode=weakness' });
  },

  goWrongBook() {
    wx.navigateTo({ url: '/pages/wrongbook/index' });
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/profile/index' });
  },

  goAnalyzer() {
    wx.navigateTo({ url: '/pages/analyzer/index' });
  },

  goScorePractice() {
    wx.navigateTo({ url: '/pages/score-practice/index' });
  },

  onShareAppMessage() {
    return {
      title: '日麻役种牌型记忆助手',
      path: '/pages/index/index',
      imageUrl: '/assets/images/mahjong-header.jpg',
    };
  },

  onShareTimeline() {
    return {
      title: '日麻役种牌型记忆助手',
      query: '',
      imageUrl: '/assets/images/mahjong-header.jpg',
    };
  },
});
