const reviewEngine = require('../../utils/reviewEngine');
const { buildReviewSet, getYakuById } = require('../../utils/questionEngine');
const storage = require('../../utils/storage');

Page({
  data: {
    loading: true,
    empty: false,
    completed: false,
    quizSet: [],
    currentIndex: 0,
    currentQuestion: null,
    totalQuestions: 0,
    progress: 0,

    // 答题状态
    answered: false,
    selectedIndex: -1,
    isCorrect: false,
    explanation: '',

    // 结算
    correctCount: 0
  },

  onShow() {
    this.loadReviewSet();
  },

  loadReviewSet() {
    const wrongBook = storage.getWrongBook();
    if (wrongBook.length === 0) {
      this.setData({ loading: false, empty: true });
      return;
    }

    const quizSet = buildReviewSet(wrongBook);
    if (quizSet.length === 0) {
      this.setData({ loading: false, empty: true });
      return;
    }

    this.setData({
      quizSet,
      totalQuestions: quizSet.length,
      loading: false,
      empty: false
    });

    this.showQuestion(0);
  },

  showQuestion(index) {
    const question = this.data.quizSet[index];
    if (!question) return;

    this.setData({
      currentIndex: index,
      currentQuestion: question,
      progress: (index / this.data.totalQuestions) * 100,
      answered: false,
      selectedIndex: -1,
      isCorrect: false,
      explanation: ''
    });
  },

  onOptionSelect(e) {
    if (this.data.answered) return;

    const selectedIndex = e.detail.index;
    const question = this.data.currentQuestion;
    const isCorrect = selectedIndex === question.answer;

    // 更新选项状态
    question.options = question.options.map((opt, i) => {
      if (i === question.answer) return { text: opt, state: 'correct' };
      if (i === selectedIndex && !isCorrect) return { text: opt, state: 'wrong' };
      return { text: opt, state: 'disabled' };
    });

    // 记录
    storage.addRecord({
      questionId: question.id,
      yakuId: question.yakuId,
      selectedIndex,
      isCorrect
    });

    // 更新错题本（答对可能移除）
    storage.updateWrongReview(question.id, isCorrect);

    // 更新每日进度
    storage.updateDailyProgress(isCorrect, true);

    this.setData({
      answered: true,
      selectedIndex,
      isCorrect,
      explanation: question.explanation,
      currentQuestion: question,
      correctCount: this.data.correctCount + (isCorrect ? 1 : 0)
    });
  },

  onNext() {
    const nextIndex = this.data.currentIndex + 1;
    if (nextIndex >= this.data.totalQuestions) {
      this.setData({ completed: true, progress: 100 });
    } else {
      this.showQuestion(nextIndex);
    }
  },

  onRetry() {
    this.setData({ loading: true, completed: false });
    this.loadReviewSet();
  },

  onGoHome() {
    wx.navigateBack();
  }
});
