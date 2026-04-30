// 出题引擎 — 筛选、随机、去重、打乱选项
const manualQuestions = require('../data/questions');
const yakus = require('../data/yakus');
const levels = require('../data/levels');
const { generateAllQuestions } = require('./questionGenerator');

/** 合并手动题 + 自动生成题 */
function getFullPool() {
  const autoQuestions = generateAllQuestions();
  return [...manualQuestions, ...autoQuestions];
}

/** 从全部题库中挑选题目 */
function pickQuestions(count, options = {}) {
  const {
    yakuIds = null,     // 限定役种
    excludeIds = [],    // 排除最近做过的题
    questionTypes = null // 限定题型
  } = options;

  const fullPool = getFullPool();
  let pool = [...fullPool];

  // 按役种筛选
  if (yakuIds && yakuIds.length > 0) {
    pool = pool.filter(q => yakuIds.includes(q.yakuId));
  }

  // 按题型筛选
  if (questionTypes && questionTypes.length > 0) {
    pool = pool.filter(q => questionTypes.includes(q.type));
  }

  const scopedPool = [...pool];

  // 排除已答过的
  if (excludeIds.length > 0) {
    pool = pool.filter(q => !excludeIds.includes(q.id));
  }

  // 如果不够，允许在当前筛选范围内重复（但优先用没排除的）
  const available = pool.length;

  if (available === 0) {
    pool = scopedPool;
  }

  const pickCount = Math.min(count, pool.length);

  // Fisher-Yates 洗牌后取前 N
  const shuffled = shuffle([...pool]);
  return shuffled.slice(0, pickCount);
}

/** 打乱选项顺序 */
function shuffleOptions(question) {
  // 创建索引数组并打乱
  const indices = question.options.map((_, i) => i);
  const shuffled = shuffle(indices);
  return {
    ...question,
    originalAnswer: question.answer,
    answer: shuffled.indexOf(question.answer),
    options: shuffled.map(i => question.options[i])
  };
}

/** Fisher-Yates 洗牌 */
function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 生成一次练习的题单 */
function buildQuizSet(count, excludeIds, yakuIds) {
  const config = levels.quizConfig;
  const questions = pickQuestions(count || config.defaultCount, {
    yakuIds,
    excludeIds
  });
  return questions.map(q => shuffleOptions(q));
}

/** 根据错题本生成复习题单 */
function buildReviewSet(wrongBook, maxCount) {
  const config = levels.reviewConfig;
  const max = maxCount || config.dailyReviewMax;

  // 按复习次数升序、上次复习时间升序排列（优先复习没复习过或很久没复习的）
  const sorted = [...wrongBook].sort((a, b) => {
    if (a.reviewCount !== b.reviewCount) return a.reviewCount - b.reviewCount;
    return (a.lastReviewed || 0) - (b.lastReviewed || 0);
  });

  const selectedIds = sorted.slice(0, max).map(w => w.questionId);
  const fullPool = getFullPool();

  // 从题库中取出对应题目并打乱选项
  return selectedIds
    .map(id => fullPool.find(q => q.id === id))
    .filter(Boolean)
    .map(q => shuffleOptions(q));
}

/** 获取役种信息 */
function getYakuById(id) {
  return yakus.find(y => y.id === id);
}

module.exports = {
  getFullPool,
  pickQuestions,
  shuffleOptions,
  buildQuizSet,
  buildReviewSet,
  getYakuById
};
