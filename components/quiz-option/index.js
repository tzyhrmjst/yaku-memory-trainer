// quiz-option: 答题选项按钮
// states: normal | selected | correct | wrong | disabled
const PREFIXES = ['A', 'B', 'C', 'D'];

Component({
  properties: {
    index: { type: Number, value: 0 },
    text: { type: String, value: '' },
    state: {
      type: String,
      value: 'normal'
    }
  },

  observers: {
    'state, index'(state, idx) {
      const prefix = PREFIXES[idx] || String(idx);
      const showIcon = state === 'correct' || state === 'wrong';
      this.setData({
        prefix,
        stateClass: 'option-' + state,
        showIcon
      });
    }
  },

  methods: {
    onTap() {
      if (this.data.state === 'normal') {
        this.triggerEvent('select', { index: this.data.index });
      }
    }
  }
});
