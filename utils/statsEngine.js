// 统计引擎
const storage = require('./storage');
const yakus = require('../data/yakus');
const levels = require('../data/levels');

/** 总体学习统计 */
function getOverallStats() {
  const agg = storage.getOverallAggregates();
  const wrongBook = storage.getWrongBook();
  const allProgress = storage.getAllDailyProgress();
  const today = storage.getDailyProgress();

  const totalAnswered = agg.totalAnswered;
  const totalCorrect = agg.totalCorrect;
  const accuracy = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0;

  // 学习天数 & 连续天数：用 dailyProgress keys（不会被裁剪，比 records 更可靠）
  const dates = Object.keys(allProgress);
  const studyDays = dates.length;
  const streak = calcStreak(dates);

  return {
    totalAnswered,
    totalCorrect,
    accuracy,
    studyDays,
    streak,
    wrongCount: wrongBook.length,
    todayAnswered: today.answered || 0,
    todayCorrect: today.correct || 0,
    todayAccuracy: today.answered > 0 ? Math.round(today.correct / today.answered * 100) : 0
  };
}

/** 各役种掌握度统计 */
function getYakuMastery() {
  const yakuAggs = storage.getYakuAggregates();
  const wrongBook = storage.getWrongBook();
  const threshold = levels.statsConfig.yakuMasteryThreshold;

  return yakus.map(yaku => {
    const agg = yakuAggs[yaku.id] || { totalAnswered: 0, totalCorrect: 0 };
    const total = agg.totalAnswered;
    const correct = agg.totalCorrect;
    const accuracy = total > 0 ? correct / total : 0;

    const yakuWrong = wrongBook.filter(w => w.yakuId === yaku.id);

    return {
      yakuId: yaku.id,
      name: yaku.name,
      han: yaku.han,
      category: yaku.category,
      totalAnswered: total,
      correct,
      accuracy: Math.round(accuracy * 100),
      masteryLevel: accuracy >= threshold ? 'mastered' : accuracy >= 0.4 ? 'learning' : 'new',
      wrongRemaining: yakuWrong.length
    };
  });
}

/** 近7天学习趋势 */
function getWeeklyTrend() {
  const progress = storage.getAllDailyProgress();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const dayData = progress[dateStr] || { answered: 0, correct: 0, date: dateStr };
    days.push({
      date: dateStr,
      answered: dayData.answered || 0,
      correct: dayData.correct || 0,
      accuracy: dayData.answered > 0 ? Math.round(dayData.correct / dayData.answered * 100) : 0
    });
  }

  return days;
}

/** 计算连续学习天数 */
function calcStreak(dates) {
  if (dates.length === 0) return 0;

  const sortedDates = dates.map(d => new Date(d)).sort((a, b) => b - a);
  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastStudy = new Date(sortedDates[0]);
  lastStudy.setHours(0, 0, 0, 0);

  // 最近一次学习必须是今天或昨天
  const diffDays = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  for (let i = 1; i < sortedDates.length; i++) {
    const current = new Date(sortedDates[i - 1]);
    const previous = new Date(sortedDates[i]);
    const diff = Math.floor((current - previous) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

module.exports = {
  getOverallStats,
  getYakuMastery,
  getWeeklyTrend
};
