// 役种数据 — 日麻标准役种（雀魂规则）
// type: 'tiles-to-yaku' — 看牌猜役（附带 context 排除歧义）
// type: 'def-to-condition' — 看定义选条件
//
// skipTileQuestion: true 表示不为此役种自动生成看牌猜役题
//   （通常是纯时机役种、或与基础役种牌型几乎相同的复合/上位役种）

const yakus = [

  // ===================================================================
  // 1番 (basic) — 基础役种
  // ===================================================================

  {
    id: 'tanyao',
    name: '断幺九',
    nameJa: 'タンヤオ',
    han: 1,
    category: 'basic',
    description: '由数牌2～8组成，不含任何幺九牌（1、9、字牌）的和牌。可副露。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '所有牌都是数牌2～8（万/饼/索）',
      '不能包含1、9和字牌',
      '可副露，不影响番数'
    ],
    exampleTiles: ['2m', '3m', '4m', '5m', '5m', '5m', '6m', '7m', '8m', '4p', '5p', '6p', '2s', '2s'],
    winTile: '2s',
    contextHint: '该手牌已副露（食替）'
  },

  {
    id: 'yakuhai',
    name: '役牌',
    nameJa: '役牌（やくはい）',
    han: 1,
    category: 'basic',
    description: '三元牌（白·发·中）或当前场风牌、自风牌的刻子/槓子，每个刻子计1番。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '三元牌（白/发/中）的刻子或槓子，各计1番',
      '当前场风牌的刻子或槓子计1番',
      '当前自风牌的刻子或槓子计1番',
      '可副露，不影响番数'
    ],
    exampleTiles: ['1m', '2m', '3m', '4p', '5p', '6p', '7s', '8s', '9s', '7z', '7z', '7z', '1z', '1z'],
    winTile: '1z',
    contextHint: '该手牌已副露'
  },

  {
    id: 'pinfu',
    name: '平和',
    nameJa: 'ピンフ',
    han: 1,
    category: 'basic',
    description: '由4组顺子和1对雀头组成，必须门前清，听牌为两面听。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '手牌全部由顺子（4组）组成',
      '雀头不能是场风/自风/三元牌',
      '必须门前清（不能副露）',
      '听牌必须是两面听（如45听36）',
      '和牌方式无要求（荣和/自摸均可）'
    ],
    exampleTiles: ['2m', '3m', '4m', '4p', '5p', '6p', '2s', '3s', '4s', '6s', '7s', '8s', '5m', '5m'],
    winTile: '4m',
    contextHint: '该手牌门前清，以荣和方式获胜（未立直）'
  },

  {
    id: 'riichi',
    name: '立直',
    nameJa: 'リーチ',
    han: 1,
    category: 'basic',
    description: '门前清状态下听牌时，宣言立直（支付1000点立直棒）并和牌。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '手牌必须门前清（不能副露）',
      '处于听牌状态',
      '宣言「立直」时支付1000点（立直棒）',
      '立直宣言后手牌不能再改变'
    ],
    exampleTiles: ['3m', '4m', '5m', '2p', '3p', '4p', '6s', '7s', '8s', '9s', '9s', '1m', '2m'],
    winTile: '3m',
    contextHint: '该玩家已宣言立直，以荣和方式获胜'
  },

  {
    id: 'mentsumo',
    name: '门前清自摸和',
    nameJa: '門前清自摸和（メンゼンチンツモホー）',
    han: 1,
    category: 'basic',
    description: '门前清状态下，以自摸方式（从牌山摸牌）和牌。',
    facts: { winMethods: ['tsumo'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '手牌必须门前清（不能副露）',
      '必须自摸和牌（自己摸到和了牌）',
      '不能是荣和（打出的牌和牌不算）'
    ],
    exampleTiles: ['2m', '3m', '4m', '5m', '5m', '5m', '6p', '7p', '8p', '1s', '2s', '3s', '7s', '7s'],
    winTile: '7s',
    contextHint: '该手牌门前清，自摸和牌（未立直）'
  },

  {
    id: 'ippatsu',
    name: '一发',
    nameJa: '一発（イッパツ）',
    han: 1,
    category: 'basic',
    description: '立直宣言后，在无人鸣牌的情况下，一巡内和牌。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '必须先宣言立直',
      '立直后一巡内和牌',
      '期间无人鸣牌（吃/碰/槓）',
      '自摸或荣和均可'
    ],
    exampleTiles: ['2m', '3m', '4m', '3p', '4p', '5p', '4s', '5s', '6s', '8s', '8s', '3s', '3s'],
    winTile: '3s',
    contextHint: '该玩家已立直，且在一巡内和牌',
    skipTileQuestion: true  // 必然与立直复合，用条件题区分
  },

  {
    id: 'iipeikou',
    name: '一杯口',
    nameJa: '一盃口（イーペーコー）',
    han: 1,
    category: 'basic',
    description: '手牌中包含两组完全相同的顺子。必须门前清。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '包含两组数字完全相同的顺子（如123m+123m）',
      '必须门前清（不能副露）',
      '门清状态下成立'
    ],
    exampleTiles: ['1m', '2m', '3m', '1m', '2m', '3m', '4p', '5p', '6p', '5s', '6s', '7s', '8s', '8s'],
    winTile: '8s',
    contextHint: '该手牌门前清，未立直'
  },

  {
    id: 'rinshan_kaihou',
    name: '岭上开花',
    nameJa: '嶺上開花（リンシャンカイホウ）',
    han: 1,
    category: 'basic',
    description: '开槓后从岭上（王牌区）摸牌，以摸到的岭上牌和牌。',
    facts: { winMethods: ['tsumo'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '以摸到的岭上牌（槓之后从王牌区摸的牌）和牌',
      '开槓后立即成立（槓→岭上摸牌→和牌）',
      '自摸方式（摸岭上牌属于自摸）'
    ],
    exampleTiles: ['4m', '5m', '6m', '3p', '4p', '5p', '1s', '2s', '3s', '7s', '7s', '7s', '8s'],
    winTile: '8s',
    contextHint: '该手牌已副露，开槓后以岭上牌自摸和牌'
  },

  {
    id: 'chankan',
    name: '抢槓',
    nameJa: '搶槓（チャンカン）',
    han: 1,
    category: 'basic',
    description: '别家进行加槓（从碰→槓）时，以荣和方式胡那张加槓牌。',
    facts: { winMethods: ['ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '别家进行加槓时荣和',
      '以正在加槓的那张牌和牌',
      '国士无双可抢暗槓（特殊规则）'
    ],
    exampleTiles: ['2m', '3m', '4m', '6p', '7p', '8p', '4s', '5s', '6s', '7s', '7s', '2s', '2s'],
    winTile: '2s',
    contextHint: '该手牌已副露，抢槓荣和（别家加槓时和了该牌）'
  },

  {
    id: 'haitei',
    name: '海底摸月',
    nameJa: '海底摸月（ハイテイモーユエ）',
    han: 1,
    category: 'basic',
    description: '以牌山的最后一张牌（海底牌）自摸和牌。',
    facts: { winMethods: ['tsumo'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '牌山只剩下最后一张牌',
      '摸到最后一张牌时和牌',
      '自摸方式（自己摸海底牌）'
    ],
    exampleTiles: ['1m', '2m', '3m', '5p', '6p', '7p', '2s', '3s', '4s', '6s', '7s', '8s', '5m', '5m'],
    winTile: '5m',
    contextHint: '该手牌已副露，以海底牌（最后一张牌）自摸和牌'
  },

  {
    id: 'houtei',
    name: '河底捞鱼',
    nameJa: '河底撈魚（ホウテイラオユイ）',
    han: 1,
    category: 'basic',
    description: '以别家打出的最后一张牌（河底牌）荣和。',
    facts: { winMethods: ['ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '牌山已无牌可摸',
      '以别家打出的最后一张牌（河底牌）荣和',
      '荣和方式'
    ],
    exampleTiles: ['3m', '4m', '5m', '2p', '3p', '4p', '5s', '6s', '7s', '9s', '9s', '1s', '2s'],
    winTile: '3s',
    contextHint: '该手牌已副露，以河底牌（最后一张打出的牌）荣和'
  },

  // ===================================================================
  // 2番 (advanced)
  // ===================================================================

  {
    id: 'sanshoku_doujun',
    name: '三色同顺',
    nameJa: '三色同順（サンショクドウジュン）',
    han: 2,
    category: 'advanced',
    description: '万、饼、索三种花色各有相同数字的顺子。副露后降为1番。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: true },
    conditions: [
      '万/饼/索三种花色都有同一数字的顺子（如234m+234p+234s）',
      '副露后降为1番（食下）',
      '不要求门前清'
    ],
    exampleTiles: ['2m', '3m', '4m', '2p', '3p', '4p', '2s', '3s', '4s', '5m', '6m', '7m', '8m', '8m'],
    winTile: '8m',
    contextHint: '该手牌已副露'
  },

  {
    id: 'chiitoitsu',
    name: '七对子',
    nameJa: '七対子（チートイツ）',
    han: 2,
    category: 'advanced',
    description: '由7组不同的对子组成。必须门前清，固定25符。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '手牌由7组对子组成（共14张）',
      '必须门前清（不能副露）',
      '固定25符（不考虑其他符数计算）',
      '不能有四张相同的牌（不能用同一牌4枚做2对）'
    ],
    exampleTiles: ['1m', '1m', '3p', '3p', '5s', '5s', '7m', '7m', '9p', '9p', '2s', '2s', '8m', '8m'],
    winTile: '8m',
    contextHint: '该手牌门前清，七对子形'
  },

  {
    id: 'toitoiho',
    name: '对对和',
    nameJa: '対々和（トイトイホー）',
    han: 2,
    category: 'advanced',
    description: '由4组刻子（或槓）和1组雀头组成。可副露。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '手牌全部由刻子（或槓子）组成（4组刻子+1雀头）',
      '可副露，不影响番数',
      '不含顺子'
    ],
    exampleTiles: ['1m', '1m', '1m', '3p', '3p', '3p', '5s', '5s', '5s', '7z', '7z', '7z', '9m', '9m'],
    winTile: '9m',
    contextHint: '该手牌已副露'
  },

  {
    id: 'ittsuu',
    name: '一气通贯',
    nameJa: '一気通貫（イッツウ）',
    han: 2,
    category: 'advanced',
    description: '同种数牌的123、456、789三组顺子。副露后降为1番。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: true },
    conditions: [
      '同种数牌组成123+456+789三组顺子',
      '副露后降为1番（食下）',
      '不要求门前清'
    ],
    exampleTiles: ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '3p', '4p', '5p', '6s', '6s'],
    winTile: '6s',
    contextHint: '该手牌已副露'
  },

  {
    id: 'honchantaiyaochuu',
    name: '混全带幺九',
    nameJa: '混全帯么九（ホンチャンタイヤオチュー）',
    han: 2,
    category: 'advanced',
    description: '所有顺子/刻子都包含幺九牌（1或9），且雀头也是幺九牌。副露后降为1番。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: true },
    conditions: [
      '每个顺子或刻子都必须包含至少1张幺九牌（1、9或字牌）',
      '必须至少包含1组顺子',
      '雀头也必须是幺九牌（1、9、字牌）',
      '允许包含字牌',
      '副露后降为1番（食下）'
    ],
    exampleTiles: ['1m', '2m', '3m', '7p', '8p', '9p', '1s', '1s', '1s', '5z', '5z', '5z', '9s', '9s'],
    winTile: '9s',
    contextHint: '该手牌已副露'
  },

  {
    id: 'sanankou',
    name: '三暗刻',
    nameJa: '三暗刻（サンアンコウ）',
    han: 2,
    category: 'advanced',
    description: '拥有3组没有碰过的刻子（暗刻）。可副露。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '包含3组暗刻（未碰出的刻子）',
      '第4组面子可以是顺子或明刻',
      '可副露（第4组面子可以是通过副露完成的）'
    ],
    exampleTiles: ['2m', '2m', '2m', '5p', '5p', '5p', '8s', '8s', '8s', '4m', '5m', '6m', '3s', '3s'],
    winTile: '3s',
    contextHint: '该手牌已副露（明顺子）'
  },

  {
    id: 'double_riichi',
    name: '两立直',
    nameJa: 'ダブルリーチ（両立直）',
    han: 2,
    category: 'advanced',
    description: '在第一巡（无人鸣牌前）宣言立直。必须门前清。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '必须门前清（不能副露）',
      '第一巡即宣言立直（轮到自己前无人鸣牌）',
      '普通立直的所有条件也必须满足'
    ],
    exampleTiles: ['3m', '4m', '5m', '2p', '3p', '4p', '6s', '7s', '8s', '9s', '9s', '1m', '2m'],
    winTile: '3m',
    contextHint: '该玩家第一巡即宣言立直（两立直）',
    skipTileQuestion: true  // 必然与立直复合
  },

  {
    id: 'shousangen',
    name: '小三元',
    nameJa: '小三元（ショウサンゲン）',
    han: 2,
    category: 'advanced',
    description: '白、发、中其中两种为刻子，剩下一种为雀头。合计至少4番。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '包含白/发/中其中两种的刻子（或槓子）',
      '剩下一种三元牌作为雀头',
      '必然复合两个役牌（三元牌刻子各1番），实际4番起',
      '可副露'
    ],
    exampleTiles: ['5z', '5z', '5z', '7z', '7z', '7z', '2m', '3m', '4m', '6p', '7p', '8p', '6z', '6z'],
    winTile: '6z',
    contextHint: '该手牌已副露'
  },

  {
    id: 'honroutou',
    name: '混老头',
    nameJa: '混老頭（ホンロウトウ）',
    han: 2,
    category: 'advanced',
    description: '手牌只包含老头牌（1、9）和字牌。必然与对对和或七对子复合。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '手牌只含幺九牌（1万/9万/1饼/9饼/1索/9索）和字牌',
      '不含数牌2～8',
      '必然与对对和或七对子复合'
    ],
    exampleTiles: ['1m', '1m', '1m', '9p', '9p', '9p', '1s', '1s', '1s', '1z', '1z', '1z', '9s', '9s'],
    winTile: '9s',
    contextHint: '该手牌已副露'
  },

  {
    id: 'sanshoku_doukou',
    name: '三色同刻',
    nameJa: '三色同刻（サンショクドウコウ）',
    han: 2,
    category: 'advanced',
    description: '万、饼、索各有相同数字的刻子。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '万/饼/索三种花色都有同一数字的刻子（如555m+555p+555s）',
      '可副露，不影响番数',
      '不要求门前清'
    ],
    exampleTiles: ['5m', '5m', '5m', '5p', '5p', '5p', '5s', '5s', '5s', '2m', '3m', '4m', '8s', '8s'],
    winTile: '8s',
    contextHint: '该手牌已副露'
  },

  {
    id: 'sankantsu',
    name: '三槓子',
    nameJa: '三槓子（サンカンツ）',
    han: 2,
    category: 'advanced',
    description: '一人开槓3次。可副露。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '一人开槓3次（不论明槓暗槓）',
      '可副露，不影响番数'
    ],
    exampleTiles: ['2m', '2m', '2m', '2m', '5p', '5p', '5p', '5p', '8s', '8s', '8s', '8s', '1z', '1z'],
    winTile: '1z',
    contextHint: '该玩家已开3次槓'
  },

  // ===================================================================
  // 3番 (advanced)
  // ===================================================================

  {
    id: 'honitsu',
    name: '混一色',
    nameJa: '混一色（ホンイツ）',
    han: 3,
    category: 'advanced',
    description: '只包含一种数牌和字牌的手牌。副露后降为2番。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: true },
    conditions: [
      '手牌只包含一种花色的数牌+字牌',
      '不含其他花色的数牌',
      '副露后降为2番（食下）'
    ],
    exampleTiles: ['1m', '2m', '3m', '5m', '6m', '7m', '7m', '8m', '9m', '5z', '5z', '5z', '9m', '9m'],
    winTile: '9m',
    contextHint: '该手牌已副露'
  },

  {
    id: 'junchan_taiyaochuu',
    name: '纯全带幺九',
    nameJa: '純全帯么九（ジュンチャンタイヤオチュー）',
    han: 3,
    category: 'advanced',
    description: '所有顺子/刻子都包含老头牌（1或9），雀头也是老头牌。不包含字牌。副露后降为2番。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: true },
    conditions: [
      '每个顺子或刻子都必须包含至少1张老头牌（1或9）',
      '雀头也必须是老头牌（1或9）',
      '不能包含字牌',
      '副露后降为2番（食下）'
    ],
    exampleTiles: ['1m', '2m', '3m', '7p', '8p', '9p', '1s', '2s', '3s', '7s', '8s', '9s', '1m', '1m'],
    winTile: '1m',
    contextHint: '该手牌已副露'
  },

  {
    id: 'ryanpeikou',
    name: '二杯口',
    nameJa: '二盃口（リャンペーコー）',
    han: 3,
    category: 'advanced',
    description: '包含两组一杯口（即四组顺子两两完全相同）。必须门前清。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '包含两对完全相同的顺子（如两个123m+两个456p）',
      '必须门前清（不能副露）',
      '实际上就是两杯口（两组一杯口）'
    ],
    exampleTiles: ['1m', '2m', '3m', '1m', '2m', '3m', '5p', '6p', '7p', '5p', '6p', '7p', '8s', '8s'],
    winTile: '8s',
    contextHint: '该手牌门前清，含两组一杯口'
  },

  // ===================================================================
  // 6番 (advanced)
  // ===================================================================

  {
    id: 'chinitsu',
    name: '清一色',
    nameJa: '清一色（チンイツ）',
    han: 6,
    category: 'advanced',
    description: '手牌只包含一种花色的数牌，不含字牌。副露后降为5番。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: true },
    conditions: [
      '手牌只包含一种花色的数牌（万/饼/索其中一种）',
      '不含字牌',
      '不含其他花色的数牌',
      '副露后降为5番（食下）'
    ],
    exampleTiles: ['2m', '3m', '4m', '5m', '5m', '5m', '6m', '7m', '8m', '4m', '5m', '6m', '9m', '9m'],
    winTile: '9m',
    contextHint: '该手牌已副露'
  },

  // ===================================================================
  // 役满 (yakuman)
  // ===================================================================

  {
    id: 'suuankou',
    name: '四暗刻',
    nameJa: '四暗刻（スーアンコウ）',
    han: 13,
    category: 'yakuman',
    description: '包含4组没有碰过的刻子（全部暗刻）。必须门前清。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '手牌全部由刻子组成（4组暗刻+1雀头）',
      '4组刻子都必须是没有碰过的暗刻',
      '必须门前清（不能副露）',
      '自摸成立；荣和时必须是单骑和雀头'
    ],
    exampleTiles: ['2m', '2m', '2m', '5p', '5p', '5p', '8s', '8s', '8s', '1z', '1z', '1z', '3m', '3m'],
    winTile: '3m',
    contextHint: '该手牌门前清，自摸和牌'
  },

  {
    id: 'kokushi_musou',
    name: '国士无双',
    nameJa: '国士無双（コクシムソウ）',
    han: 13,
    category: 'yakuman',
    description: '集齐全部13种幺九牌（1万/9万/1饼/9饼/1索/9索/东南西北白发中）各1张，再加任意1张幺九牌组成对子。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '必须集齐全部13种幺九牌各至少1张',
      '其中某一种幺九牌有2张（作为雀头）',
      '必须门前清（不能副露）',
      '只能使用幺九牌（1/9/字牌）'
    ],
    exampleTiles: ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z', '1m'],
    winTile: '1m',
    contextHint: '该手牌门前清，国士无双形'
  },

  {
    id: 'daisangen',
    name: '大三元',
    nameJa: '大三元（ダイサンゲン）',
    han: 13,
    category: 'yakuman',
    description: '包含白、发、中三种三元牌的全部刻子。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '包含白/发/中三种三元牌的刻子（或槓子）',
      '可副露',
      '必然复合役牌（三元牌刻子各1番，合计役满）'
    ],
    exampleTiles: ['5z', '5z', '5z', '6z', '6z', '6z', '7z', '7z', '7z', '2m', '3m', '4m', '5s', '5s'],
    winTile: '5s',
    contextHint: '该手牌已副露'
  },

  {
    id: 'shousuushii',
    name: '小四喜',
    nameJa: '小四喜（ショウスーシー）',
    han: 13,
    category: 'yakuman',
    description: '东/南/西/北中三种为刻子，剩下一种为雀头。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '包含三种风牌的刻子（或槓子）',
      '剩下一种风牌作为雀头',
      '可副露',
      '若风刻同时是场风或自风，则另计役牌'
    ],
    exampleTiles: ['1z', '1z', '1z', '2z', '2z', '2z', '3z', '3z', '3z', '5m', '6m', '7m', '4z', '4z'],
    winTile: '4z',
    contextHint: '该手牌已副露'
  },

  {
    id: 'tsuuiisou',
    name: '字一色',
    nameJa: '字一色（ツーイーソウ）',
    han: 13,
    category: 'yakuman',
    description: '手牌全部由字牌组成。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '手牌只含字牌（东南西北白发中）',
      '不含任何数牌',
      '可副露'
    ],
    exampleTiles: ['1z', '1z', '1z', '3z', '3z', '3z', '5z', '5z', '5z', '6z', '6z', '6z', '7z', '7z'],
    winTile: '7z',
    contextHint: '该手牌已副露'
  },

  {
    id: 'ryuuiisou',
    name: '绿一色',
    nameJa: '緑一色（リューイーソウ）',
    han: 13,
    category: 'yakuman',
    description: '只包含索子2/3/4/6/8以及发（绿牌）。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '手牌只能包含索子2、3、4、6、8和发',
      '不含其他牌',
      '可副露'
    ],
    exampleTiles: ['2s', '2s', '2s', '3s', '3s', '3s', '6s', '6s', '6s', '6z', '6z', '6z', '8s', '8s'],
    winTile: '8s',
    contextHint: '该手牌已副露'
  },

  {
    id: 'chinroutou',
    name: '清老头',
    nameJa: '清老頭（チンロウトウ）',
    han: 13,
    category: 'yakuman',
    description: '手牌全部由老头牌（1万/9万/1饼/9饼/1索/9索）组成，不含字牌。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '手牌只含老头牌（1万/9万/1饼/9饼/1索/9索）',
      '不含字牌',
      '不含数牌2～8',
      '牌型上必然由刻子/槓子和雀头组成'
    ],
    exampleTiles: ['1m', '1m', '1m', '9m', '9m', '9m', '1p', '1p', '1p', '9p', '9p', '9p', '9s', '9s'],
    winTile: '9s',
    contextHint: '该手牌已副露'
  },

  {
    id: 'chuuren_poutou',
    name: '九莲宝灯',
    nameJa: '九蓮宝灯（チューレンポウトウ）',
    han: 13,
    category: 'yakuman',
    description: '同种数牌组成1112345678999的形，再加任意一张该花色的牌。必须门前清。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '同种数牌组成1112345678999的形状',
      '必须门前清（不能副露）',
      '和了牌是该花色的任意一张牌',
      '不可使用其他花色或字牌'
    ],
    exampleTiles: ['1m', '1m', '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '9m', '9m', '4m'],
    winTile: '4m',
    contextHint: '该手牌门前清，九莲宝灯形'
  },

  {
    id: 'tenhou',
    name: '天和',
    nameJa: '天和（テンホウ）',
    han: 13,
    category: 'yakuman',
    description: '庄家（亲家）在配牌时就已和牌。',
    facts: { winMethods: ['tsumo'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '必须是庄家（亲家）',
      '配牌阶段即已和牌（第一巡摸牌前）',
      '必须门前清（庄家初始手牌）'
    ],
    exampleTiles: ['2m', '3m', '4m', '5p', '6p', '7p', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '9s'],
    winTile: '9s',
    contextHint: '亲家配牌即和牌（天和）',
    skipTileQuestion: true  // 纯时机役种，牌型不具识别性
  },

  {
    id: 'chiihou',
    name: '地和',
    nameJa: '地和（チーホウ）',
    han: 13,
    category: 'yakuman',
    description: '子家在无人鸣牌的状态下，第一巡自摸和牌。',
    facts: { winMethods: ['tsumo'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '必须是子家（非庄家）',
      '第一巡自摸和牌',
      '轮到自己前无人鸣牌',
      '必须自摸（不能荣和）'
    ],
    exampleTiles: ['2m', '3m', '4m', '5p', '6p', '7p', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '9s'],
    winTile: '9s',
    contextHint: '子家第一巡自摸和牌（地和）',
    skipTileQuestion: true  // 纯时机役种，牌型不具识别性
  },

  {
    id: 'suukantsu',
    name: '四槓子',
    nameJa: '四槓子（スーカンツ）',
    han: 13,
    category: 'yakuman',
    description: '一人开槓4次。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '一人开槓4次（不论明槓暗槓）',
      '可副露',
      '牌型由4组槓子+1雀头组成'
    ],
    exampleTiles: ['2m', '2m', '2m', '2m', '5p', '5p', '5p', '5p', '8s', '8s', '8s', '8s', '1z', '1z', '1z', '1z', '7z', '7z'],
    winTile: '7z',
    contextHint: '该玩家已开4次槓'
  },

  // ===================================================================
  // 双倍役满 (yakuman)
  // ===================================================================

  {
    id: 'daisuushii',
    name: '大四喜',
    nameJa: '大四喜（ダイスーシー）',
    han: 26,
    category: 'yakuman',
    description: '包含东南西北四种风牌的刻子。双倍役满。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: false, kuisagari: false },
    conditions: [
      '包含东南西北四种风牌的刻子（或槓子）',
      '可副露',
      '双倍役满',
      '若风刻同时是场风或自风，则另计役牌'
    ],
    exampleTiles: ['1z', '1z', '1z', '2z', '2z', '2z', '3z', '3z', '3z', '4z', '4z', '4z', '5s', '5s'],
    winTile: '5s',
    contextHint: '该手牌已副露'
  },

  {
    id: 'suuankou_tanki',
    name: '四暗刻单骑',
    nameJa: '四暗刻単騎（スーアンコウタンキ）',
    han: 26,
    category: 'yakuman',
    description: '四暗刻以单骑听牌（听雀头）和牌。双倍役满。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '四暗刻的所有条件必须满足',
      '听牌方式必须是单骑（只差雀头）',
      '自摸或荣和均可成立',
      '双倍役满'
    ],
    exampleTiles: ['2m', '2m', '2m', '5p', '5p', '5p', '8s', '8s', '8s', '1z', '1z', '1z', '3m'],
    winTile: '3m',
    contextHint: '该手牌门前清，四暗刻单骑待',
    skipTileQuestion: true  // 四暗刻上位役种，牌型高度相似
  },

  {
    id: 'kokushi_musou_13men',
    name: '国士无双十三面听',
    nameJa: '国士無双十三面待ち（コクシムソウジュウサンメンマチ）',
    han: 26,
    category: 'yakuman',
    description: '国士无双以13面听形式（已有13种幺九牌各1张，听14种中的任意1张）和牌。双倍役满。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '国士无双的所有条件必须满足',
      '听牌状态为13面听（任何幺九牌都能和）',
      '双倍役满'
    ],
    exampleTiles: ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z'],
    winTile: '1m',
    contextHint: '该手牌门前清，国士无双13面听',
    skipTileQuestion: true  // 国士无双上位役种，牌型高度相似
  },

  {
    id: 'junsei_chuuren_poutou',
    name: '纯正九莲宝灯',
    nameJa: '純正九蓮宝灯（ジュンセイチューレンポウトウ）',
    han: 26,
    category: 'yakuman',
    description: '九莲宝灯以9面听形式（1112345678999听1～9中任意一张）和牌。双倍役满。',
    facts: { winMethods: ['tsumo', 'ron'], requiresMenzen: true, kuisagari: false },
    conditions: [
      '九莲宝灯的所有条件必须满足',
      '听牌状态为9面听（同花色1～9中任意一张都能和）',
      '双倍役满'
    ],
    exampleTiles: ['1m', '1m', '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '9m', '9m'],
    winTile: '5m',
    contextHint: '该手牌门前清，纯正九莲宝灯9面听',
    skipTileQuestion: true  // 九莲宝灯上位役种，牌型高度相似
  },

  // ===================================================================
  // 流局满贯
  // ===================================================================

  {
    id: 'nagashi_mangan',
    name: '流局满贯',
    nameJa: '流し満貫（ナガシマンガン）',
    han: 5,
    category: 'yakuman',
    description: '荒牌流局时，自家打出的牌全是幺九牌且一张都没有被别家鸣牌（吃/碰/槓）。',
    facts: { winMethods: [], requiresMenzen: true, kuisagari: false },
    conditions: [
      '自家打出的所有牌都是幺九牌（1、9、字牌）',
      '打出的幺九牌没有被别家鸣牌（吃/碰/槓）',
      '荒牌流局时成立',
      '满贯（5番相当）'
    ],
    exampleTiles: [],
    winTile: '',
    contextHint: '荒牌流局时，自家舍张全是幺九牌且未被鸣牌',
    skipTileQuestion: true  // 与手牌无关，看舍张
  }

];

module.exports = yakus;
