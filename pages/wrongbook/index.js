const storage = require('../../utils/storage');
const { getYakuById } = require('../../utils/questionEngine');

Page({
  data: {
    list: [],
    empty: true
  },

  onShow() {
    this.loadWrongBook();
  },

  loadWrongBook() {
    const wrongBook = storage.getWrongBook();
    if (wrongBook.length === 0) {
      this.setData({ list: [], empty: true });
      return;
    }

    const list = wrongBook.map(w => {
      const yaku = getYakuById(w.yakuId);
      const accuracy = w.reviewCount > 0
        ? Math.round(w.correctCount / w.reviewCount * 100)
        : 0;
      return {
        ...w,
        yakuName: yaku ? yaku.name : '未知',
        yakuCategory: yaku ? yaku.category : 'basic',
        accuracy,
        addedDate: formatDate(new Date(w.addedAt))
      };
    });

    // 最新添加的在前
    list.sort((a, b) => b.addedAt - a.addedAt);

    this.setData({ list, empty: false });
  },

  goReview() {
    wx.navigateTo({ url: '/pages/review/index' });
  },

  goQuiz() {
    wx.navigateTo({ url: '/pages/quiz/index' });
  }
});

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}
