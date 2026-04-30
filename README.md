# 日麻役种记忆训练

一款纯前端微信小程序，帮助日本麻将（リーチ麻雀）新手记忆役种。支持役种图鉴、选择题练习、错题本和本地复习。

## 功能

- **役种图鉴** — 浏览役种的名称、番数、成立条件、牌例
- **选择题练习** — 两种题型（看牌猜役 / 看定义选条件），答对答错即时反馈
- **错题本** — 自动收集错题，记录复习次数
- **今日复习** — 基于错题本生成复习题单
- **学习统计** — 累计答题、正确率、连续天数、各役种掌握度

## 技术栈

- 微信小程序原生 + LESS
- TDesign Miniprogram v1.11
- 纯前端，无后端，无数据库，数据存 `wx.Storage`

## 运行方式

```bash
# 1. 安装依赖
npm install

# 2. 微信开发者工具 → 工具 → 构建 npm

# 3. 点击编译运行
```

## 目录结构

```
yaku/
├── data/                # 数据层
│   ├── yakus.js         # 役种数据
│   ├── questions.js     # 题库
│   └── levels.js        # 配置
├── utils/               # 工具层
│   ├── storage.js       # 本地存储封装
│   ├── questionEngine.js # 出题引擎
│   ├── reviewEngine.js  # 复习引擎
│   ├── statsEngine.js   # 统计引擎
│   └── format.js        # 格式化工具
├── components/          # 组件
│   ├── yaku-card/       # 役种卡片
│   ├── tile-hand/       # 牌面展示
│   ├── quiz-option/     # 选项按钮
│   ├── stat-card/       # 统计卡片
│   └── empty-state/     # 空状态
└── pages/               # 页面
    ├── index/           # 首页
    ├── catalog/         # 役种图鉴
    ├── yaku-detail/     # 役种详情
    ├── quiz/            # 练习
    ├── review/          # 复习
    ├── wrongbook/       # 错题本
    └── profile/         # 我的进度
```

## 如何扩充题库

### 添加新役种

编辑 `data/yakus.js`，按以下格式添加：

```js
{
  id: 'chitoi',           // 唯一标识
  name: '七对子',
  nameJa: 'チートイツ',
  han: 2,
  category: 'advanced',   // basic | advanced | yakuman
  description: '由7对不同牌组成的和牌。',
  conditions: [
    '手牌由7对不同的牌组成',
    '不能有4张相同的牌（即不能有槓子）'
  ],
  note: '七对子必然是门前清。',
  exampleTiles: ['1m', '1m', '3p', '3p', '5s', '5s', '7m', '7m', '东', '东', '白', '白', '9p', '9p'],
  winTile: '9p'
}
```

### 添加新题目

编辑 `data/questions.js`，按以下格式添加：

```js
// 看牌猜役
{
  id: 'q021',             // 唯一ID
  type: 'tiles-to-yaku',
  yakuId: 'chitoi',       // 对应役种ID
  tiles: ['1m', '1m', '3p', '3p', ...],
  options: ['七对子', '平和', '断幺九', '役牌'],
  answer: 0,              // 正确答案索引
  explanation: '手牌由7对不同牌组成，符合七对子条件。'
}

// 看定义选条件
{
  id: 'q022',
  type: 'def-to-condition',
  yakuId: 'chitoi',
  question: '七对子的核心条件是什么？',
  options: ['A', 'B', 'C', 'D'],
  answer: 2,
  explanation: '解释...'
}
```

### 图片模式（可选）

`tile-hand` 组件默认使用 CSS 文字绘制牌面。如需切换为图片：

```xml
<tile-hand
  tiles="{{tiles}}"
  useImages="{{true}}"
  tileImages="{{['/assets/2m.png', ...]}}"
/>
```

## License

MIT
