// 本地存储统一封装
const PREFIX = 'mahjong_yaku_';
const MAX_RECORDS = 500;

const KEYS = {
  records: PREFIX + 'records',
  wrongBook: PREFIX + 'wrong_book',
  dailyProgress: PREFIX + 'daily_progress',
  settings: PREFIX + 'settings',
  statsOverall: PREFIX + 'stats_overall',
  statsYaku: PREFIX + 'stats_yaku',
  yakuMarks: PREFIX + 'yaku_marks'
};

function get(key) {
  try {
    const raw = wx.getStorageSync(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function set(key, value) {
  try {
    wx.setStorageSync(key, JSON.stringify(value));
  } catch (e) {
    console.error('storage set error:', e);
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key);
  } catch (e) {
    console.error('storage remove error:', e);
  }
}

/** 初始化存储（首次使用时创建空结构） */
function init() {
  if (!get(KEYS.records)) set(KEYS.records, []);
  if (!get(KEYS.wrongBook)) set(KEYS.wrongBook, []);
  if (!get(KEYS.dailyProgress)) set(KEYS.dailyProgress, {});
  if (!get(KEYS.settings)) set(KEYS.settings, { dailyGoal: 10, reviewEnabled: true });
}

// ---- 学习记录 ----

function getRecords() {
  return get(KEYS.records) || [];
}

function addRecord(record) {
  const records = getRecords();
  records.push({
    ...record,
    timestamp: Date.now(),
    date: formatDate(new Date())
  });

  // 裁剪：只保留最近 N 条
  if (records.length > MAX_RECORDS) {
    records.splice(0, records.length - MAX_RECORDS);
  }
  set(KEYS.records, records);

  // 增量更新聚合统计
  _updateAggregates(record);

  return records;
}

// ---- 聚合统计 ----

function _ensureAggregates() {
  let overall = get(KEYS.statsOverall);
  let yaku = get(KEYS.statsYaku);

  if (!overall || !yaku) {
    // 懒构建：从已有 records 计算聚合（兼容老用户）
    const records = getRecords();
    overall = { totalAnswered: 0, totalCorrect: 0 };
    yaku = {};

    records.forEach(r => {
      overall.totalAnswered++;
      if (r.isCorrect) overall.totalCorrect++;
      if (!yaku[r.yakuId]) yaku[r.yakuId] = { totalAnswered: 0, totalCorrect: 0 };
      yaku[r.yakuId].totalAnswered++;
      if (r.isCorrect) yaku[r.yakuId].totalCorrect++;
    });

    set(KEYS.statsOverall, overall);
    set(KEYS.statsYaku, yaku);
  }

  return { overall, yaku };
}

function _updateAggregates(record) {
  let overall = get(KEYS.statsOverall);
  let yaku = get(KEYS.statsYaku);

  // 存量用户首次答题时初始化聚合
  if (!overall) {
    _ensureAggregates();
    overall = get(KEYS.statsOverall);
    yaku = get(KEYS.statsYaku);
  }

  overall.totalAnswered++;
  if (record.isCorrect) overall.totalCorrect++;
  set(KEYS.statsOverall, overall);

  if (!yaku[record.yakuId]) yaku[record.yakuId] = { totalAnswered: 0, totalCorrect: 0 };
  yaku[record.yakuId].totalAnswered++;
  if (record.isCorrect) yaku[record.yakuId].totalCorrect++;
  set(KEYS.statsYaku, yaku);
}

function getOverallAggregates() {
  return _ensureAggregates().overall;
}

function getYakuAggregates(yakuId) {
  const yaku = _ensureAggregates().yaku;
  return yakuId ? (yaku[yakuId] || { totalAnswered: 0, totalCorrect: 0 }) : yaku;
}

// ---- 错题本 ----

function getWrongBook() {
  return get(KEYS.wrongBook) || [];
}

function addWrongQuestion(questionId, yakuId) {
  const book = getWrongBook();
  // 避免重复添加
  if (!book.find(w => w.questionId === questionId)) {
    book.push({
      questionId,
      yakuId,
      addedAt: Date.now(),
      reviewCount: 0,
      correctCount: 0,
      consecutiveCorrect: 0,
      lastReviewed: null
    });
    set(KEYS.wrongBook, book);
  }
  return book;
}

function removeWrongQuestion(questionId) {
  const book = getWrongBook().filter(w => w.questionId !== questionId);
  set(KEYS.wrongBook, book);
  return book;
}

function updateWrongReview(questionId, isCorrect) {
  const book = getWrongBook();
  const entry = book.find(w => w.questionId === questionId);
  if (entry) {
    entry.reviewCount++;
    entry.lastReviewed = Date.now();

    if (isCorrect) {
      entry.correctCount++;
      entry.consecutiveCorrect = (entry.consecutiveCorrect || 0) + 1;
    } else {
      entry.consecutiveCorrect = 0;
    }

    // 连续答对3次则移除
    if (entry.consecutiveCorrect >= 3) {
      return removeWrongQuestion(questionId);
    }
    set(KEYS.wrongBook, book);
  }
  return book;
}

// ---- 每日进度 ----

function getAllDailyProgress() {
  return get(KEYS.dailyProgress) || {};
}

function getDailyProgress(dateStr) {
  const progress = getAllDailyProgress();
  if (!dateStr) dateStr = formatDate(new Date());
  return progress[dateStr] || { answered: 0, correct: 0, reviewed: 0, date: dateStr };
}

function updateDailyProgress(isCorrect, isReview) {
  const dateStr = formatDate(new Date());
  const progress = get(KEYS.dailyProgress) || {};
  const today = progress[dateStr] || { answered: 0, correct: 0, reviewed: 0, date: dateStr };
  today.answered++;
  if (isCorrect) today.correct++;
  if (isReview) today.reviewed++;
  progress[dateStr] = today;
  set(KEYS.dailyProgress, progress);
  return today;
}

// ---- 设置 ----

function getSettings() {
  return get(KEYS.settings) || { dailyGoal: 10, reviewEnabled: true };
}

function updateSettings(newSettings) {
  const settings = { ...getSettings(), ...newSettings };
  set(KEYS.settings, settings);
  return settings;
}

// ---- 役种标记 ----

/** 获取所有役种标记 { yakuId: 'review' | 'mastered' } */
function getYakuMarks() {
  return get(KEYS.yakuMarks) || {};
}

/** 设置/清除某个役种的标记 */
function setYakuMark(yakuId, mark) {
  const marks = getYakuMarks();
  if (mark) {
    marks[yakuId] = mark;
  } else {
    delete marks[yakuId];
  }
  set(KEYS.yakuMarks, marks);
  return marks;
}

// ---- 工具 ----

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

module.exports = {
  init,
  getRecords,
  addRecord,
  getOverallAggregates,
  getYakuAggregates,
  getWrongBook,
  addWrongQuestion,
  removeWrongQuestion,
  updateWrongReview,
  getAllDailyProgress,
  getDailyProgress,
  updateDailyProgress,
  getSettings,
  updateSettings,
  getYakuMarks,
  setYakuMark
};
