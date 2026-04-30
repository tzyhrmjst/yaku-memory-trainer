// 复习引擎 — 复习优先级计算 & 今日复习题单生成
const storage = require('./storage');
const { buildReviewSet } = require('./questionEngine');

/** 获取今日应复习的题单 */
function getTodayReviewList() {
  const wrongBook = storage.getWrongBook();
  if (wrongBook.length === 0) return [];

  // 按昨日最快（最近添加的先复习）
  return buildReviewSet(wrongBook);
}

/** 获取复习优先级排序的错题列表 */
function getReviewPriorityList() {
  const wrongBook = storage.getWrongBook();
  if (wrongBook.length === 0) return [];

  return [...wrongBook].sort((a, b) => {
    // 优先级 = 未复习过的 > 答错次数多的 > 很久没复习的
    const aScore = getPriorityScore(a);
    const bScore = getPriorityScore(b);
    return bScore - aScore; // 降序
  });
}

function getPriorityScore(entry) {
  let score = 0;
  // 没复习过的加分
  if (entry.reviewCount === 0) score += 100;
  // 错误率高的加分
  const errorRate = entry.reviewCount > 0
    ? 1 - entry.correctCount / entry.reviewCount
    : 1;
  score += errorRate * 50;
  // 最近未复习的加分（按小时计）
  if (entry.lastReviewed) {
    const hoursSinceReview = (Date.now() - entry.lastReviewed) / (1000 * 60 * 60);
    score += Math.min(hoursSinceReview / 24 * 10, 50); // 最多加50
  } else {
    score += 50; // 从未复习过
  }
  return score;
}

/** 统计今日复习情况 */
function getTodayReviewStats() {
  const today = storage.getDailyProgress();
  return {
    totalReviewed: today.reviewed || 0,
    totalAnswered: today.answered || 0,
    correct: today.correct || 0,
    accuracy: today.answered > 0 ? Math.round(today.correct / today.answered * 100) : 0
  };
}

/** 获取剩余待复习数量 */
function getRemainingReviewCount() {
  const wrongBook = storage.getWrongBook();
  return wrongBook.length;
}

module.exports = {
  getTodayReviewList,
  getReviewPriorityList,
  getTodayReviewStats,
  getRemainingReviewCount
};
