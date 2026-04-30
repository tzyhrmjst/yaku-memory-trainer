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

Component({
  properties: {
    yakuId: { type: String, value: '' },
    name: { type: String, value: '' },
    nameJa: { type: String, value: '' },
    han: { type: Number, value: 1 },
    category: { type: String, value: 'basic' },
    description: { type: String, value: '' }
  },

  observers: {
    category(val) {
      const info = categoryMap[val] || categoryMap.basic;
      this.setData({
        categoryName: info.name,
        categoryTheme: info.theme
      });
    },
    han(val) {
      this.setData({ hanDisplay: formatHanDisplay(val) });
    }
  },

  lifetimes: {
    attached() {
      this.setData({ hanDisplay: formatHanDisplay(this.data.han) });
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { yakuId: this.data.yakuId });
    }
  }
});
