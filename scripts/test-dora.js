var dora = require('../utils/dora');

var passed = 0;
var failed = 0;

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    failed += 1;
    console.error('FAIL:', message, 'expected:', expected, 'actual:', actual);
    return;
  }
  passed += 1;
}

assertEqual(dora.nextDora('1m'), '2m', 'number dora advances within suit');
assertEqual(dora.nextDora('9p'), '1p', 'number dora wraps 9 to 1');
assertEqual(dora.nextDora('4z'), '1z', 'wind dora wraps north to east');
assertEqual(dora.nextDora('7z'), '5z', 'dragon dora wraps red to white');

assertEqual(dora.indicatorForDora('1s'), '9s', 'inverse number dora wraps 1 to 9');
assertEqual(dora.indicatorForDora('1z'), '4z', 'inverse wind dora wraps east to north');
assertEqual(dora.indicatorForDora('5z'), '7z', 'inverse dragon dora wraps white to red');

assertEqual(
  dora.countDora(['1m', '2m', '0p', '5p'], ['4p'], true),
  3,
  'indicator dora and red five are both counted'
);

var indicators = dora.makeIndicatorsForCount(
  ['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'],
  3
);
assertEqual(
  dora.countDora(['2m','3m','4m','5m','6m','7m','3p','4p','5p','2s','3s','4s','8s','8s'], indicators, true),
  3,
  'generated indicators match desired dora count'
);

var displays = dora.buildIndicatorDisplays(['1m', '9s']);
assertEqual(displays[0].dora, '2m', 'indicator display includes actual manzu dora');
assertEqual(displays[1].dora, '1s', 'indicator display includes wrapped souzu dora');

console.log('通过:', passed, '失败:', failed);
if (failed > 0) process.exit(1);
