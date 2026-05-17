// 算分引擎测试
var sc = require('../utils/scoreCalculator');

var passed = 0;
var failed = 0;

function test(name, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    failed++;
    console.log('  FAIL: ' + name);
    console.log('    expected:', JSON.stringify(expected));
    console.log('    actual:  ', JSON.stringify(actual));
  }
}

function testPoints(input, expected) {
  var result = sc.calculatePoints(input);
  test(
    input.han + '番' + input.fu + '符 ' + (input.isDealer ? '庄家' : '子家') + (input.winMethod === 'tsumo' ? '自摸' : '荣和'),
    { limit: result.limit, totalPoints: result.totalPoints, pointText: result.pointText, payments: result.payments },
    expected
  );
}

console.log('=== 子家荣和 ===');
testPoints({ han: 1, fu: 30, winMethod: 'ron', isDealer: false }, { limit: null, totalPoints: 1000, pointText: '1000', payments: { ron: 1000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 1, fu: 40, winMethod: 'ron', isDealer: false }, { limit: null, totalPoints: 1300, pointText: '1300', payments: { ron: 1300, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 2, fu: 30, winMethod: 'ron', isDealer: false }, { limit: null, totalPoints: 2000, pointText: '2000', payments: { ron: 2000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 2, fu: 40, winMethod: 'ron', isDealer: false }, { limit: null, totalPoints: 2600, pointText: '2600', payments: { ron: 2600, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 3, fu: 40, winMethod: 'ron', isDealer: false }, { limit: null, totalPoints: 5200, pointText: '5200', payments: { ron: 5200, dealerTsumo: 0, childTsumo: 0 } });

console.log('=== 子家自摸 ===');
testPoints({ han: 2, fu: 30, winMethod: 'tsumo', isDealer: false }, { limit: null, totalPoints: 2000, pointText: '500 / 1000', payments: { ron: null, dealerTsumo: 1000, childTsumo: 500 } });
testPoints({ han: 3, fu: 30, winMethod: 'tsumo', isDealer: false }, { limit: null, totalPoints: 4000, pointText: '1000 / 2000', payments: { ron: null, dealerTsumo: 2000, childTsumo: 1000 } });
testPoints({ han: 4, fu: 20, winMethod: 'tsumo', isDealer: false }, { limit: null, totalPoints: 5200, pointText: '1300 / 2600', payments: { ron: null, dealerTsumo: 2600, childTsumo: 1300 } });

console.log('=== 庄家荣和 ===');
testPoints({ han: 2, fu: 30, winMethod: 'ron', isDealer: true }, { limit: null, totalPoints: 2900, pointText: '2900', payments: { ron: 2900, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 3, fu: 40, winMethod: 'ron', isDealer: true }, { limit: null, totalPoints: 7700, pointText: '7700', payments: { ron: 7700, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 4, fu: 30, winMethod: 'ron', isDealer: true }, { limit: null, totalPoints: 11600, pointText: '11600', payments: { ron: 11600, dealerTsumo: 0, childTsumo: 0 } });

console.log('=== 庄家自摸 ===');
testPoints({ han: 3, fu: 25, winMethod: 'tsumo', isDealer: true }, { limit: null, totalPoints: 4800, pointText: '1600 all', payments: { ron: null, dealerTsumo: 1600, childTsumo: 1600 } });
testPoints({ han: 3, fu: 40, winMethod: 'tsumo', isDealer: true }, { limit: null, totalPoints: 7800, pointText: '2600 all', payments: { ron: null, dealerTsumo: 2600, childTsumo: 2600 } });
testPoints({ han: 4, fu: 30, winMethod: 'tsumo', isDealer: true }, { limit: null, totalPoints: 11700, pointText: '3900 all', payments: { ron: null, dealerTsumo: 3900, childTsumo: 3900 } });

console.log('=== 满贯 ===');
testPoints({ han: 4, fu: 40, winMethod: 'ron', isDealer: false }, { limit: { name: '满贯', basePoints: 2000 }, totalPoints: 8000, pointText: '8000', payments: { ron: 8000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 4, fu: 40, winMethod: 'ron', isDealer: true }, { limit: { name: '满贯', basePoints: 2000 }, totalPoints: 12000, pointText: '12000', payments: { ron: 12000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 5, fu: 20, winMethod: 'ron', isDealer: false }, { limit: { name: '满贯', basePoints: 2000 }, totalPoints: 8000, pointText: '8000', payments: { ron: 8000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 5, fu: 30, winMethod: 'tsumo', isDealer: false }, { limit: { name: '满贯', basePoints: 2000 }, totalPoints: 8000, pointText: '2000 / 4000', payments: { ron: null, dealerTsumo: 4000, childTsumo: 2000 } });
testPoints({ han: 5, fu: 30, winMethod: 'tsumo', isDealer: true }, { limit: { name: '满贯', basePoints: 2000 }, totalPoints: 12000, pointText: '4000 all', payments: { ron: null, dealerTsumo: 4000, childTsumo: 4000 } });

console.log('=== 满贯边界 ===');
testPoints({ han: 3, fu: 60, winMethod: 'ron', isDealer: false }, { limit: null, totalPoints: 7700, pointText: '7700', payments: { ron: 7700, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 3, fu: 70, winMethod: 'ron', isDealer: false }, { limit: { name: '满贯', basePoints: 2000 }, totalPoints: 8000, pointText: '8000', payments: { ron: 8000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 4, fu: 30, winMethod: 'ron', isDealer: false }, { limit: null, totalPoints: 7700, pointText: '7700', payments: { ron: 7700, dealerTsumo: 0, childTsumo: 0 } });

console.log('=== 跳满 ===');
testPoints({ han: 6, fu: 30, winMethod: 'ron', isDealer: false }, { limit: { name: '跳满', basePoints: 3000 }, totalPoints: 12000, pointText: '12000', payments: { ron: 12000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 7, fu: 30, winMethod: 'ron', isDealer: true }, { limit: { name: '跳满', basePoints: 3000 }, totalPoints: 18000, pointText: '18000', payments: { ron: 18000, dealerTsumo: 0, childTsumo: 0 } });

console.log('=== 倍满 ===');
testPoints({ han: 8, fu: 30, winMethod: 'ron', isDealer: false }, { limit: { name: '倍满', basePoints: 4000 }, totalPoints: 16000, pointText: '16000', payments: { ron: 16000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 9, fu: 50, winMethod: 'ron', isDealer: true }, { limit: { name: '倍满', basePoints: 4000 }, totalPoints: 24000, pointText: '24000', payments: { ron: 24000, dealerTsumo: 0, childTsumo: 0 } });

console.log('=== 三倍满 ===');
testPoints({ han: 11, fu: 30, winMethod: 'ron', isDealer: false }, { limit: { name: '三倍满', basePoints: 6000 }, totalPoints: 24000, pointText: '24000', payments: { ron: 24000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ han: 12, fu: 30, winMethod: 'tsumo', isDealer: true }, { limit: { name: '三倍满', basePoints: 6000 }, totalPoints: 36000, pointText: '12000 all', payments: { ron: null, dealerTsumo: 12000, childTsumo: 12000 } });

console.log('=== 役满 ===');
testPoints({ han: 13, fu: 30, winMethod: 'ron', isDealer: false }, { limit: { name: '役满', basePoints: 8000 }, totalPoints: 32000, pointText: '32000', payments: { ron: 32000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ yakumanCount: 1, winMethod: 'ron', isDealer: false }, { limit: { name: '役满', basePoints: 8000 }, totalPoints: 32000, pointText: '32000', payments: { ron: 32000, dealerTsumo: 0, childTsumo: 0 } });
testPoints({ yakumanCount: 2, winMethod: 'ron', isDealer: false }, { limit: { name: '役满', basePoints: 16000 }, totalPoints: 64000, pointText: '64000', payments: { ron: 64000, dealerTsumo: 0, childTsumo: 0 } });

console.log('=== 平和自摸 ===');
testPoints({ han: 1, fu: 20, winMethod: 'tsumo', isDealer: false }, { limit: null, totalPoints: 800, pointText: '200 / 400', payments: { ron: null, dealerTsumo: 400, childTsumo: 200 } });

console.log('=== 七对子 ===');
testPoints({ han: 2, fu: 25, winMethod: 'ron', isDealer: false }, { limit: null, totalPoints: 1600, pointText: '1600', payments: { ron: 1600, dealerTsumo: 0, childTsumo: 0 } });

console.log('');
console.log('通过: ' + passed + ', 失败: ' + failed);
if (failed > 0) process.exit(1);
