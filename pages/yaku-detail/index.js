const yakus = require('../../data/yakus');
const statsEngine = require('../../utils/statsEngine');
const storage = require('../../utils/storage');

const categoryMap = {
  basic: { name: '基础', theme: 'success' },
  advanced: { name: '进阶', theme: 'warning' },
  yakuman: { name: '役满', theme: 'danger' }
};

const MARK_LABELS = {
  review: '重点复习',
  mastered: '我已掌握'
};

function formatHanDisplay(han) {
  if (han === 26) return '双倍役满';
  if (han === 13) return '役满';
  if (han === 5) return '满贯';
  return han + '翻';
}

Page({
  data: {
    loading: true,
    yaku: null,
    masteryInfo: null,
    mark: '' // '' | 'review' | 'mastered'
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.navigateBack();
      return;
    }

    try {
      const yaku = yakus.find(y => y.id === id);
      if (!yaku) {
        wx.navigateBack();
        return;
      }

      const categoryInfo = categoryMap[yaku.category] || categoryMap.basic;
      const mastery = statsEngine.getYakuMastery();
      const masteryInfo = mastery.find(m => m.yakuId === id);
      const marks = storage.getYakuMarks();

      this.setData({
        loading: false,
        yaku: {
          ...yaku,
          categoryName: categoryInfo.name,
          categoryTheme: categoryInfo.theme,
          hanDisplay: formatHanDisplay(yaku.han)
        },
        masteryInfo: masteryInfo || { accuracy: 0, totalAnswered: 0, masteryLevel: 'new' },
        mark: marks[id] || ''
      });
    } catch (e) {
      console.error('yaku-detail onLoad error:', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
      wx.navigateBack();
    }
  },

  onToggleMark(e) {
    const newMark = e.currentTarget.dataset.mark;
    const yakuId = this.data.yaku.id;
    // 再次点击同一标记则取消
    const nextMark = this.data.mark === newMark ? '' : newMark;
    storage.setYakuMark(yakuId, nextMark);
    this.setData({ mark: nextMark });
  },

  goQuiz() {
    wx.navigateTo({ url: '/pages/quiz/index?yakuId=' + this.data.yaku.id });
  }
});
