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
      this.updateDisplay(this.data.han, val);
    },
    han(val) {
      this.updateDisplay(val, this.data.category);
    }
  },

  lifetimes: {
    attached() {
      this.updateDisplay(this.data.han, this.data.category);
    }
  },

  methods: {
    updateDisplay(han, category) {
      const info = categoryMap[category] || categoryMap.basic;
      this.setData({
        hanDisplay: formatHanDisplay(han),
        categoryName: info.name,
        categoryTheme: info.theme
      });
    },

    onTap() {
      this.triggerEvent('tap', { yakuId: this.data.yakuId });
    }
  }
});
