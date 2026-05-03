const { buildQuizSet, buildWeaknessQuizSet, getYakuById } = require('../../utils/questionEngine');
const storage = require('../../utils/storage');

Page({
  data: {
    loading: true,
    completed: false,
    quizSet: [],
    currentIndex: 0,
    currentQuestion: null,
    totalQuestions: 0,
    progress: 0,
    mode: 'random', // 'random' | 'weakness'

    // 答题状态
    answered: false,
    selectedIndex: -1,
    isCorrect: false,
    explanation: '',
    optionStates: [],

    // 结算
    score: 0,
    correctCount: 0,
    results: []
  },

  // 生命周期
  onLoad(options) {
    const yakuId = options.yakuId || null;
    const yakuIds = yakuId ? [yakuId] : null;
    const mode = options.mode === 'weakness' ? 'weakness' : 'random';

    // 获取已做过的题目ID，避免重复
    const records = storage.getRecords();
    const excludeIds = records.map(r => r.questionId);

    const quizSet = mode === 'weakness'
      ? buildWeaknessQuizSet(10, excludeIds)
      : buildQuizSet(10, excludeIds, yakuIds);

    if (quizSet.length === 0) {
      wx.showToast({ title: '暂无题目', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({
      mode,
      quizSet,
      totalQuestions: quizSet.length,
      loading: false
    });

    this.showQuestion(0);
  },

  // 展示题目
  showQuestion(index) {
    const question = this.data.quizSet[index];
    if (!question) return;

    // 如果是看牌猜役，获取役种信息作为补充
    let yakuInfo = null;
    if (question.type === 'tiles-to-yaku') {
      yakuInfo = getYakuById(question.yakuId);
    }

    const optionStates = (question.options || []).map(text => ({
      text,
      state: 'normal'
    }));

    this.setData({
      currentIndex: index,
      currentQuestion: question,
      progress: (index / this.data.totalQuestions) * 100,
      answered: false,
      selectedIndex: -1,
      isCorrect: false,
      explanation: '',
      optionStates,
      yakuInfo
    });
  },

  // 选择选项
  onOptionSelect(e) {
    if (this.data.answered) return;

    const selectedIndex = e.detail.index;
    const question = this.data.currentQuestion;
    const isCorrect = selectedIndex === question.answer;
    const explanation = question.explanation;

    // 生成选项展示状态，不污染原始题目数据
    const optionStates = this.data.optionStates.map((opt, i) => {
      if (i === question.answer) return { ...opt, state: 'correct' };
      if (i === selectedIndex) return { ...opt, state: 'wrong' };
      return { ...opt, state: 'disabled' };
    });

    // 记录结果
    const results = this.data.results;
    results.push({
      questionId: question.id,
      yakuId: question.yakuId,
      selectedIndex,
      isCorrect
    });

    storage.addRecord({
      questionId: question.id,
      yakuId: question.yakuId,
      selectedIndex,
      isCorrect
    });

    storage.updateDailyProgress(isCorrect, false);

    if (!isCorrect) {
      storage.addWrongQuestion(question.id, question.yakuId);
    }

    this.setData({
      answered: true,
      selectedIndex,
      isCorrect,
      explanation,
      optionStates,
      correctCount: this.data.correctCount + (isCorrect ? 1 : 0),
      results
    });
  },

  // 下一题
  onNext() {
    const nextIndex = this.data.currentIndex + 1;
    if (nextIndex >= this.data.totalQuestions) {
      // 完成
      this.setData({
        completed: true,
        progress: 100,
        score: Math.round(this.data.correctCount / this.data.totalQuestions * 100)
      });
    } else {
      this.showQuestion(nextIndex);
    }
  },

  // 再练一次
  onRetry() {
    const quizSet = this.data.mode === 'weakness'
      ? buildWeaknessQuizSet(10)
      : buildQuizSet(10);
    this.setData({
      loading: false,
      completed: false,
      quizSet,
      currentIndex: 0,
      totalQuestions: quizSet.length,
      progress: 0,
      answered: false,
      selectedIndex: -1,
      isCorrect: false,
      explanation: '',
      score: 0,
      correctCount: 0,
      results: []
    });
    this.showQuestion(0);
  },

  // 返回首页
  onGoHome() {
    wx.navigateBack();
  }
});
