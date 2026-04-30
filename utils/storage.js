// 本地存储统一封装
const PREFIX = 'mahjong_yaku_';

const KEYS = {
  records: PREFIX + 'records',
  wrongBook: PREFIX + 'wrong_book',
  dailyProgress: PREFIX + 'daily_progress',
  settings: PREFIX + 'settings'
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
  set(KEYS.records, records);
  return records;
}

function getRecordsByYakuId(yakuId) {
  return getRecords().filter(r => r.yakuId === yakuId);
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
    if (isCorrect) entry.correctCount++;
    entry.lastReviewed = Date.now();
    // 连续答对3次则移除
    if (entry.correctCount >= 3) {
      return removeWrongQuestion(questionId);
    }
    set(KEYS.wrongBook, book);
  }
  return book;
}

// ---- 每日进度 ----

function getDailyProgress(dateStr) {
  const progress = get(KEYS.dailyProgress) || {};
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
  getRecordsByYakuId,
  getWrongBook,
  addWrongQuestion,
  removeWrongQuestion,
  updateWrongReview,
  getDailyProgress,
  updateDailyProgress,
  getSettings,
  updateSettings
};
