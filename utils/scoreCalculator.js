// 算分引擎 — 番符点数计算
// 输入番数、符数、和牌方式、庄闲，返回点数与支付分配

function ceil100(n) {
  return Math.ceil(n / 100) * 100;
}

function getLimit(han, fu, yakumanCount) {
  if (yakumanCount >= 1) {
    return { name: '役满', basePoints: 8000 * yakumanCount };
  }
  if (han >= 13) {
    return { name: '役满', basePoints: 8000 };
  }
  if (han >= 11) {
    return { name: '三倍满', basePoints: 6000 };
  }
  if (han >= 8) {
    return { name: '倍满', basePoints: 4000 };
  }
  if (han >= 6) {
    return { name: '跳满', basePoints: 3000 };
  }
  if (han >= 5) {
    return { name: '满贯', basePoints: 2000 };
  }

  var base = fu * Math.pow(2, han + 2);
  if (base >= 2000) {
    return { name: '满贯', basePoints: 2000 };
  }

  return null;
}

/**
 * 计算点数
 * @param {Object} input
 * @param {number} input.han - 番数
 * @param {number} input.fu - 符数
 * @param {'ron'|'tsumo'} input.winMethod - 荣和/自摸
 * @param {boolean} input.isDealer - 是否庄家
 * @param {number} [input.yakumanCount] - 役满倍数
 * @returns {{ limit: {name:string, basePoints:number}|null, basePoints: number, totalPoints: number, pointText: string, payments: { ron: number|null, dealerTsumo: number, childTsumo: number } }}
 */
function calculatePoints(input) {
  var han = input.han || 0;
  var fu = input.fu || 20;
  var winMethod = input.winMethod || 'ron';
  var isDealer = input.isDealer || false;
  var yakumanCount = input.yakumanCount || 0;

  var limit = getLimit(han, fu, yakumanCount);
  var basePoints;

  if (limit) {
    basePoints = limit.basePoints;
  } else {
    basePoints = fu * Math.pow(2, han + 2);
  }

  var payments = { ron: null, dealerTsumo: 0, childTsumo: 0 };
  var totalPoints;
  var pointText;

  if (winMethod === 'ron') {
    var ronPoints = ceil100(basePoints * (isDealer ? 6 : 4));
    payments.ron = ronPoints;
    totalPoints = ronPoints;
    pointText = String(ronPoints);
  } else {
    // 自摸
    if (isDealer) {
      var eachPay = ceil100(basePoints * 2);
      payments.dealerTsumo = eachPay;
      payments.childTsumo = eachPay;
      totalPoints = eachPay * 3;
      pointText = eachPay + ' all';
    } else {
      var dealerPay = ceil100(basePoints * 2);
      var childPay = ceil100(basePoints);
      payments.dealerTsumo = dealerPay;
      payments.childTsumo = childPay;
      totalPoints = dealerPay + childPay * 2;
      pointText = childPay + ' / ' + dealerPay;
    }
  }

  return {
    limit: limit,
    basePoints: basePoints,
    totalPoints: totalPoints,
    pointText: pointText,
    payments: payments
  };
}

module.exports = {
  calculatePoints: calculatePoints,
  ceil100: ceil100,
  getLimit: getLimit
};
