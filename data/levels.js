// 关卡/阶段配置
const levels = {
  stages: [
    {
      id: 'stage1',
      name: '入门',
      description: '掌握 1番 基础役种',
      yakuIds: [
        'tanyao', 'yakuhai', 'pinfu', 'riichi', 'mentsumo',
        'ippatsu', 'iipeikou', 'rinshan_kaihou', 'chankan', 'haitei', 'houtei'
      ],
      requiredMastery: 0.6 // 每个役种正确率达到60%解锁下一阶段
    },
    {
      id: 'stage2',
      name: '进阶',
      description: '掌握 2～6番 进阶役种',
      yakuIds: [
        'sanshoku_doujun', 'chiitoitsu', 'toitoiho', 'ittsuu',
        'honchantaiyaochuu', 'sanankou', 'double_riichi', 'shousangen',
        'honroutou', 'sanshoku_doukou', 'sankantsu',
        'honitsu', 'junchan_taiyaochuu', 'ryanpeikou', 'chinitsu'
      ],
      requiredMastery: 0.5
    },
    {
      id: 'stage3',
      name: '役满',
      description: '掌握役满级役种',
      yakuIds: [
        'suuankou', 'kokushi_musou', 'daisangen', 'shousuushii',
        'tsuuiisou', 'ryuuiisou', 'chinroutou', 'chuuren_poutou',
        'tenhou', 'chiihou', 'suukantsu',
        'daisuushii', 'suuankou_tanki', 'kokushi_musou_13men',
        'junsei_chuuren_poutou', 'nagashi_mangan'
      ],
      requiredMastery: 0.3
    }
  ],

  quizConfig: {
    defaultCount: 20,        // 题库扩大了，默认每次出题数也增加
    maxOptions: 4,
    minOptions: 3,
    questionTypes: ['tiles-to-yaku', 'def-to-condition'],
    typeWeights: {
      'tiles-to-yaku': 0.5,
      'def-to-condition': 0.5
    }
  },

  reviewConfig: {
    dailyNewQuestions: 5,
    dailyReviewMax: 30,      // 题库扩大，复习上限也增加
    minAccuracyForMaster: 0.8 // 正确率 >= 80% 视为掌握
  },

  statsConfig: {
    streakMilestones: [3, 7, 14, 30],
    yakuMasteryThreshold: 0.8
  }
};

module.exports = levels;
