const yakus = require('../../data/yakus');

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'basic', label: '基础' },
  { value: 'advanced', label: '进阶' },
  { value: 'yakuman', label: '役满' }
];

const categoryMap = {
  basic: { name: '基础', theme: 'success' },
  advanced: { name: '进阶', theme: 'warning' },
  yakuman: { name: '役满', theme: 'danger' }
};

function formatHanDisplay(han) {
  if (han === 26) return '双倍役满';
  if (han === 13) return '役满';
  if (han === 5) return '满贯';
  return han + '翻';
}

function createCatalogItem(yaku) {
  const categoryInfo = categoryMap[yaku.category] || categoryMap.basic;
  return {
    id: yaku.id,
    name: yaku.name,
    nameJa: yaku.nameJa,
    hanDisplay: formatHanDisplay(yaku.han),
    category: yaku.category,
    categoryName: categoryInfo.name,
    categoryTagClass: 'tag tag-' + categoryInfo.theme,
    description: yaku.description
  };
}

Page({
  data: {
    filters: FILTERS,
    allYakus: [],
    yakus: [],
    filter: 'all'
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const list = yakus.map(yaku => createCatalogItem(yaku));
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
    const { yakuId } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/yaku-detail/index?id=' + yakuId });
  }
});
