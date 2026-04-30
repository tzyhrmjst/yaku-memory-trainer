const statsEngine = require('../../utils/statsEngine');

Page({
  data: {
    stats: {},
    mastery: [],
    weeklyTrend: [],
    barHeight: 0
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const stats = statsEngine.getOverallStats();
    const mastery = statsEngine.getYakuMastery();
    const weeklyTrend = statsEngine.getWeeklyTrend();

    // 计算柱状图最大值
    const maxAnswered = Math.max(...weeklyTrend.map(d => d.answered), 1);

    const trend = weeklyTrend.map(d => ({
      ...d,
      barHeight: Math.round(d.answered / maxAnswered * 100),
      dayLabel: d.date.slice(5) // MM-DD
    }));

    this.setData({
      stats,
      mastery,
      weeklyTrend: trend,
      maxAnswered
    });
  },

  onYakuTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/yaku-detail/index?id=' + id });
  }
});
