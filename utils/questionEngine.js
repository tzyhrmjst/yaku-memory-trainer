// 出题引擎 — 筛选、随机、去重、打乱选项
const manualQuestions = require('../data/questions');
const yakus = require('../data/yakus');
const levels = require('../data/levels');
const storage = require('./storage');
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

/** 计算各役种弱项权重 */
function _calcWeaknessWeights() {
  const wrongBook = storage.getWrongBook();
  const yakuAggs = storage.getYakuAggregates();

  // 统计每个役种的错题数
  const wrongCounts = {};
  wrongBook.forEach(w => {
    wrongCounts[w.yakuId] = (wrongCounts[w.yakuId] || 0) + 1;
  });

  const marks = storage.getYakuMarks();

  const weights = {};
  yakus.forEach(y => {
    const agg = yakuAggs[y.id] || { totalAnswered: 0, totalCorrect: 0 };
    const accuracy = agg.totalAnswered > 0 ? agg.totalCorrect / agg.totalAnswered : 0;
    const wrong = wrongCounts[y.id] || 0;
    // 基础分：错题多 + 正确率低 = 权重高，新役种给 0.5 基础分
    let weight = wrong + (1 - accuracy) * 5 + 0.5;
    // 手动标记加成
    if (marks[y.id] === 'review') weight *= 3;
    if (marks[y.id] === 'mastered') weight *= 0.1;
    weights[y.id] = weight;
  });

  return weights;
}

/** 加权随机采样 */
function _weightedSample(pool, count, weights) {
  const available = pool.filter(q => weights[q.yakuId] > 0);
  if (available.length === 0) return shuffle([...pool]).slice(0, count);

  const result = [];
  const remaining = [...available];
  let remainingWeights = remaining.map(q => weights[q.yakuId]);

  for (let k = 0; k < count && remaining.length > 0; k++) {
    const totalWeight = remainingWeights.reduce((s, w) => s + w, 0);
    let rand = Math.random() * totalWeight;
    let idx = 0;
    for (; idx < remainingWeights.length; idx++) {
      rand -= remainingWeights[idx];
      if (rand <= 0) break;
    }
    idx = Math.min(idx, remaining.length - 1);
    result.push(remaining[idx]);
    // 移除已选，避免重复
    remaining.splice(idx, 1);
    remainingWeights.splice(idx, 1);
  }

  return result;
}

/** 按弱项出题：提高薄弱役种的出现概率 */
function buildWeaknessQuizSet(count, excludeIds) {
  const config = levels.quizConfig;
  const fullPool = getFullPool();
  const weights = _calcWeaknessWeights();

  // 排除已做过的
  let pool = fullPool;
  if (excludeIds && excludeIds.length > 0) {
    pool = pool.filter(q => !excludeIds.includes(q.id));
  }
  // 如果排除后不够，回退到全量
  if (pool.length < (count || config.defaultCount)) {
    pool = [...fullPool];
  }

  const questions = _weightedSample(pool, count || config.defaultCount, weights);
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
  buildWeaknessQuizSet,
  buildReviewSet,
  getYakuById
};
