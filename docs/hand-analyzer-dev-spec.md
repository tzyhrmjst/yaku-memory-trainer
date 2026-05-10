# 手牌分析器开发规格文档

本文档用于指导其他开发 agent 在当前微信小程序中新增“手牌分析器”功能。目标不是一次性做成职业级麻将 AI，而是先交付一个稳定、可解释、可迭代的日麻牌效与役种倾向分析工具。

## 1. 背景与目标

当前项目是“日麻役种牌型记忆助手”，已有能力包括：

- 役种图鉴：`data/yakus.js`
- 役种判定：`utils/yakuChecker.js`
- 牌图资源：`assets/tiles/*.png`
- 手牌展示组件：`components/tile-hand`
- 原生微信小程序 + LESS + TDesign Miniprogram

新增功能建议命名为“手牌分析”或“牌效分析”：

用户从完整牌池中选择 14 张手牌，小程序输出：

- 当前手牌合法性
- 当前最小向听数
- 标准形 / 七对子 / 国士无双三类向听
- 最接近的役种方向
- 每张候选切牌的有效进张数量
- 推荐切牌与解释
- 可选：结合剩余牌数的概率估计

## 2. 范围定义

### 2.1 第一阶段必须完成

第一阶段做“离线静态分析”，不依赖对局牌河，不判断安全牌。

必须支持：

- 34 种基础牌选择，每种最多 4 张。
- 赤五可暂不单独建模，统一按普通 5 处理；现有资源中有 `0m`、`0p`、`0s`，后续可增强。
- 用户必须选满 14 张才显示分析结果。
- 支持一键清空。
- 支持当前选择数量提示，如 `已选 12/14`。
- 输出标准形、七对子、国士无双向听数。
- 输出综合最低向听数。
- 对每一种可切牌模拟切出后，统计有效进张。
- 给出推荐切牌排序。
- 输出最接近的 3 个役种方向。

### 2.2 第一阶段不做

以下内容留到后续版本：

- 牌河危险度、现物、筋、壁等防守分析。
- 副露后的复杂形态分析。
- 点数计算、符数计算。
- 宝牌、里宝牌、赤宝牌期望收益。
- 多巡模拟、蒙特卡洛模拟。
- 对手建模。
- 联网或后端。

## 3. 页面与入口

### 3.1 新增页面

建议新增页面：

```text
pages/analyzer/index.json
pages/analyzer/index.wxml
pages/analyzer/index.less
pages/analyzer/index.js
```

并在 `app.json` 的 `subPackages` 中加入：

```json
{
  "root": "pages/analyzer",
  "pages": ["index"]
}
```

### 3.2 首页入口

在 `pages/index/index.wxml` 的入口网格中新增一个入口卡片：

- 名称：`手牌分析`
- 描述：`向听与切牌建议`
- 点击事件：`goAnalyzer`

在 `pages/index/index.js` 添加：

```js
goAnalyzer() {
  wx.navigateTo({ url: '/pages/analyzer/index' });
}
```

首页目前已有 6 个入口。新增后可以变成 7 个，允许最后一个落单；如需视觉更齐整，可把“反馈建议”移到页面底部，但第一阶段不强制。

## 4. UI 交互设计

页面从上到下分为 5 个区块。

### 4.1 顶部状态区

显示：

- 标题：`手牌分析`
- 副标题：`选择 14 张牌，查看向听和切牌建议`
- 已选数量：`已选 X/14`
- 操作按钮：`清空`

当选择超过 14 张时，不允许继续添加，并提示 `最多选择 14 张`。

### 4.2 牌池选择区

按花色展示 34 种牌：

- 万子：`1m` 到 `9m`
- 筒子：`1p` 到 `9p`
- 索子：`1s` 到 `9s`
- 字牌：`1z` 到 `7z`

每张牌显示：

- 牌图：使用 `/assets/tiles/{tile}.png`
- 当前已选数量角标：0 不显示，1-4 显示。
- 不可选状态：已选 4 张时置灰。

点击牌：

- 如果该牌数量 < 4 且总数 < 14，则加入手牌。
- 如果该牌数量 >= 4，提示 `同一种牌最多 4 张`。
- 如果总数 >= 14，提示 `已选满 14 张`。

### 4.3 当前手牌区

显示用户已选择的牌，按固定顺序排序：

```text
1m-9m, 1p-9p, 1s-9s, 1z-7z
```

交互：

- 点击手牌中的某张牌，移除一张。
- 已选不足 14 张时显示空位占位。
- 满 14 张后自动触发分析。

### 4.4 分析结果区

选满 14 张后展示：

- 综合向听：如 `1 向听`
- 标准形向听
- 七对子向听
- 国士无双向听
- 推荐方向：如 `平和 / 断幺九 / 三色同顺`

说明文案要克制，避免长篇教程。示例：

```text
当前最接近 1 向听。优先保留两面搭子，推荐切孤立字牌。
```

### 4.5 切牌建议区

用列表展示每个候选切牌：

- 排名
- 切牌
- 分数
- 切出后向听
- 有效进张数量
- 有效牌列表
- 接近役种
- 理由

推荐项置顶并强化显示。

示例：

```text
推荐 1：切 西
切后 1 向听，有效牌 18 枚
有效牌：1m, 4m, 2p, 5p, 6s...
理由：西为孤立客风，切出后不破坏两面搭子，仍保留平和与断幺路线。
```

## 5. 数据模型

### 5.1 牌编码

沿用项目现有编码：

```js
// 万子
'1m' ... '9m'

// 筒子
'1p' ... '9p'

// 索子
'1s' ... '9s'

// 字牌
'1z' // 东
'2z' // 南
'3z' // 西
'4z' // 北
'5z' // 白
'6z' // 发
'7z' // 中
```

注意：

- `utils/yakuChecker.js` 里已有 `normalizeTile`，会把 `0m/0p/0s` 当作 `5m/5p/5s`。
- 第一阶段分析器内部只使用 34 种普通牌。

### 5.2 分析输入

新增核心入口建议为：

```js
const result = analyzeHand({
  tiles,
  mode,
  visibleTiles,
  context
});
```

字段说明：

```js
{
  tiles: ['1m', '2m', ...], // 必须 14 张
  mode: 'speed',            // speed | value | yaku，第一阶段默认 speed
  visibleTiles: [],         // 已见牌，第一阶段可为空
  context: {
    seatWind: '1z',
    roundWind: '1z',
    isMenzen: true
  }
}
```

### 5.3 分析输出

```js
{
  valid: true,
  errors: [],
  summary: {
    tileCount: 14,
    shanten: 1,
    bestShape: 'standard',
    standardShanten: 1,
    chiitoiShanten: 3,
    kokushiShanten: 6
  },
  closestYaku: [
    {
      id: 'pinfu',
      name: '平和',
      distance: 1,
      score: 86,
      reasons: ['已有 3 组顺子/两面搭子', '雀头候选不是役牌']
    }
  ],
  discards: [
    {
      tile: '3z',
      tileName: '西',
      rank: 1,
      recommended: true,
      shantenAfterDiscard: 1,
      ukeireKinds: 6,
      ukeireCount: 18,
      ukeireTiles: ['1m', '4m', '2p', '5p'],
      yakuHints: ['pinfu', 'tanyao'],
      score: 118,
      reasons: ['孤立客风价值低', '保留两面搭子', '有效牌最多']
    }
  ]
}
```

## 6. 文件拆分建议

新增工具模块：

```text
utils/mahjongTiles.js
utils/shantenCalculator.js
utils/ukeireCalculator.js
utils/yakuAdvisor.js
utils/handAnalyzer.js
```

职责：

- `mahjongTiles.js`
  - 牌常量、排序、计数、合法性校验、显示名。
- `shantenCalculator.js`
  - 标准形 / 七对子 / 国士向听计算。
- `ukeireCalculator.js`
  - 对切牌后 13 张手牌枚举摸牌，统计进张。
- `yakuAdvisor.js`
  - 对未和牌手牌做役种倾向评分。
- `handAnalyzer.js`
  - 统一编排，给页面使用。

不要把算法写进页面 JS。页面只负责状态、点击、展示。

## 7. 算法规格

### 7.1 合法性校验

校验规则：

- `tiles` 必须是数组。
- 长度必须是 14。
- 每张牌必须在 34 种编码内。
- 任意牌数量不能超过 4。

返回错误示例：

```js
['请选择 14 张牌']
['同一种牌不能超过 4 张：5m']
['未知牌编码：东']
```

### 7.2 标准形向听

目标形：`4 面子 + 1 雀头`。

建议实现：

- 将 34 种牌转为计数数组。
- DFS 枚举面子、搭子、对子。
- 计算最小向听。

常用公式：

```text
shanten = 8 - melds * 2 - taatsu - pair
```

修正：

```text
if (taatsu > 4 - melds) taatsu = 4 - melds
```

其中：

- `melds`：已完成面子数，顺子或刻子。
- `taatsu`：搭子数，包括两面、边张、嵌张、对子候选。
- `pair`：是否已有雀头。

标准形和牌时返回 `-1`，听牌返回 `0`。

### 7.3 七对子向听

计算：

```text
pairs = 数量 >= 2 的牌种数
unique = 数量 > 0 的牌种数
shanten = 6 - pairs + max(0, 7 - unique)
```

七对子和牌时返回 `-1`。

注意四张相同牌在七对子中只算一对，不算两对。

### 7.4 国士无双向听

幺九牌集合：

```js
['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z']
```

计算：

```text
uniqueOrphans = 拥有的幺九种类数
hasOrphanPair = 是否有任意幺九对子
shanten = 13 - uniqueOrphans - (hasOrphanPair ? 1 : 0)
```

国士和牌时返回 `-1`。

边界说明：

- 上述公式适用于 13 张手牌的国士向听计算。
- 对 14 张完整手牌，综合分析入口应先模拟切牌，或在内部计算时只评估“切出后 13 张”的国士向听。
- 若直接对 14 张调用，应枚举切掉每一种牌后的 13 张，取最小国士向听，避免 `11 种幺九 + 1 对幺九 + 2 张杂牌` 这类牌形被低估。
- 因此建议导出两个函数：

```js
calculateKokushiShanten13(tiles13)
calculateKokushiShanten(tiles) // 兼容 13/14 张；14 张时枚举切牌取最小值
```

### 7.5 有效进张统计

对每张候选切牌：

1. 从 14 张中移除该牌一张，得到 13 张。
2. 枚举 34 种摸牌。
3. 如果该牌在原手牌和已见牌中的数量已经 >= 4，则跳过。
4. 加入该摸牌，得到 14 张。
5. 计算新手牌的综合向听。
6. 如果新向听 < 切牌后向听，则记为有效牌。
7. 有效枚数 = 对每种有效牌计算剩余张数后求和。

剩余张数第一阶段公式：

```text
remaining = 4 - 原始14张中该牌数量 - visibleTiles中该牌数量
```

如果没有传 `visibleTiles`，只扣当前手牌。

### 7.6 切牌排序

第一阶段使用解释性评分，不做复杂 EV：

```text
score =
  ukeireCount * 5
  - shantenAfterDiscard * 30
  + yakuScore
  + shapeBonus
  - riskPenalty
```

第一阶段：

- `riskPenalty` 固定为 0。
- `shapeBonus` 可先简单实现。
- `yakuScore` 来自 `yakuAdvisor`。

排序优先级：

1. 切后向听更低。
2. 有效枚数更多。
3. 役种倾向分更高。
4. 孤立牌优先切。

## 8. 役种倾向评分

注意：`utils/yakuChecker.js` 是“已和牌判定”。新功能面对的是未完成手牌，不能直接拿它判断“接近哪个役种”。需要新增 `yakuAdvisor.js`。

第一阶段建议支持以下役种方向：

- `tanyao` 断幺九
- `pinfu` 平和
- `yakuhai` 役牌
- `chiitoitsu` 七对子
- `toitoiho` 对对和
- `honitsu` 混一色
- `chinitsu` 清一色
- `kokushi_musou` 国士无双
- `sanshoku_doujun` 三色同顺
- `ittsuu` 一气通贯
- `honchantaiyaochuu` 混全带幺九
- `junchan_taiyaochuu` 纯全带幺九

输出不要求完全精确，但必须稳定、可解释。

### 8.1 评分思路

每个方向返回：

```js
{
  id,
  name,
  distance,
  score,
  reasons
}
```

建议：

- `distance` 越小越接近。
- `score` 0-100。
- `reasons` 控制在 1-3 条。
- `distance` 第一阶段定义为“距离该役种理想结构还差的关键改造数”，不是严格向听数。
- `score` 与 `distance` 保持反向关系：`score = clamp(100 - distance * 18 + bonus - penalty, 0, 100)`。具体 bonus/penalty 可按役种轻量调整。

第一阶段 `distance` 口径：

| 役种 | distance 建议算法 |
| --- | --- |
| 断幺九 | 手牌中的幺九牌数量 |
| 平和 | `max(0, 4 - 顺子/两面搭子贡献) + 役牌雀头惩罚 + 刻子惩罚` |
| 役牌 | `0` 表示已有三元牌/场风/自风刻子，`1` 表示有对子，`2` 表示有单张，`3` 表示没有候选 |
| 七对子 | `max(0, 6 - pairs) + max(0, 7 - unique)`，与七对子向听口径一致 |
| 对对和 | `max(0, 4 - tripletCount - pairCount)`，顺子越多可额外 +1 |
| 混一色 | 选择“某一数牌花色 + 字牌”为目标，`distance = 非目标花色牌数量`，三种花色取最小 |
| 清一色 | 选择某一数牌花色为目标，`distance = 非该花色牌数量`，三种花色取最小 |
| 国士无双 | 使用国士向听值，非幺九多时可额外 +1 作为提示惩罚 |
| 三色同顺 | 对起点 1-7 计算三色 3 连段覆盖，`distance = 9 - 最佳覆盖牌数`，有完整顺子可降低 |
| 一气通贯 | 对每个花色计算 123/456/789 覆盖，`distance = 9 - 最佳覆盖牌数` |
| 混全带幺九 | 不含幺九的完成面子/搭子越多 distance 越高；第一阶段可用中张牌数量粗估 |
| 纯全带幺九 | 在混全基础上额外惩罚字牌数量 |

示例规则：

断幺九：

- 统计幺九牌数量。
- 幺九越少，分越高。
- 若全是 2-8 数牌，距离 0。

平和：

- 门清时才高分。
- 顺子和两面搭子越多分越高。
- 刻子、字牌对子越多扣分。

七对子：

- 对子数越多分越高。
- 孤张多但种类够时仍保留一定分。

国士：

- 幺九种类越多分越高。
- 非幺九数量越多扣分。

混一色 / 清一色：

- 统计三种数牌花色数量和字牌数量。
- 主花色数量越高分越高。
- 杂色越多扣分。

对对和：

- 对子、刻子越多分越高。
- 顺子倾向强则扣分。

三色同顺：

- 对 1-7 的每个起点，检查 m/p/s 三色的顺子或搭子覆盖。
- 覆盖花色越多分越高。

一气通贯：

- 对每个花色检查 123、456、789 三段覆盖。
- 覆盖段越多分越高。

## 9. 页面实现细节

### 9.1 analyzer 页面 data

```js
data: {
  selectedTiles: [],
  tileGroups: [],
  selectedCount: 0,
  analysis: null,
  analyzing: false
}
```

`tileGroups` 示例：

```js
[
  { title: '万子', tiles: [{ code: '1m', src: '/assets/tiles/1m.png', count: 0 }] },
  { title: '筒子', tiles: [...] },
  { title: '索子', tiles: [...] },
  { title: '字牌', tiles: [...] }
]
```

### 9.2 事件

```js
onAddTile(e)
onRemoveTile(e)
onClear()
runAnalysis()
```

`runAnalysis` 在 `selectedTiles.length === 14` 时调用。

### 9.3 性能

34 种切牌 x 34 种摸牌 = 1156 次向听计算。小程序端可以承受，但要注意：

- 避免在 WXML 中做复杂计算。
- 算法函数保持纯函数。
- 点击时只在选满 14 张后分析。
- 如真机卡顿，再加 `setTimeout` 或分片计算。

## 10. 测试用例

建议新增：

```text
utils/__tests__/shantenCalculator.test.js
utils/__tests__/ukeireCalculator.test.js
utils/__tests__/handAnalyzer.test.js
```

当前项目没有测试框架。若执行 agent 不方便引入 Jest，可先写一个简单脚本：

```text
scripts/test-hand-analyzer.js
```

并在 `package.json` 添加：

```json
{
  "scripts": {
    "test:analyzer": "node scripts/test-hand-analyzer.js"
  }
}
```

### 10.1 必测样例

和牌标准形：

```js
['1m','2m','3m','2p','3p','4p','3s','4s','5s','6s','7s','8s','5m','5m']
// standardShanten === -1
```

听牌标准形：

```js
['1m','2m','3m','2p','3p','4p','3s','4s','5s','6s','7s','8s','5m']
// 仅用于 calculateStandardShanten13 这类内部函数；结果应为 0 向听
```

14 张一向听标准形：

```js
['1m','2m','3m','2p','3p','4p','3s','4s','5s','6s','7s','8s','5m','7z']
// 14 张综合入口应推荐切孤张 7z，切后 13 张为 0 向听
```

七对子和牌：

```js
['1m','1m','3m','3m','5p','5p','7p','7p','2s','2s','9s','9s','5z','5z']
// chiitoiShanten === -1
```

国士一向听或听牌：

```js
['1m','9m','1p','9p','1s','9s','1z','2z','3z','4z','5z','6z','7z','7z']
// kokushiShanten === -1
```

非法五张：

```js
['1m','1m','1m','1m','1m', ...]
// valid === false
```

切牌建议稳定性：

```js
['2m','3m','4m','3p','4p','5p','4s','5s','6s','7s','8s','3z','3z','9m']
// 推荐应倾向切 9m 或孤立无价值牌，不应切已完成顺子核心牌
```

## 11. 验收标准

第一阶段验收时，请检查：

- 首页能进入“手牌分析”页面。
- 34 种牌都能显示图片。
- 每种牌最多选择 4 张。
- 总数最多选择 14 张。
- 点击已选手牌可以移除。
- 不满 14 张不显示误导性分析。
- 满 14 张后显示向听、役种倾向、切牌建议。
- 推荐切牌列表不会出现重复候选。
- 有效牌不会包含已经用满 4 张的牌。
- 清空后页面状态完全重置。
- 真机或开发者工具中无明显卡顿。
- `npm run lint` 能通过，若项目原本存在 lint 问题，至少新增文件无明显格式问题。

## 12. 建议执行顺序

建议让执行 agent 分 4 个提交或 4 个阶段做：

1. 基础算法
   - 新增 `mahjongTiles.js`
   - 新增 `shantenCalculator.js`
   - 新增测试脚本

2. 进张与综合分析
   - 新增 `ukeireCalculator.js`
   - 新增 `yakuAdvisor.js`
   - 新增 `handAnalyzer.js`

3. 页面与入口
   - 新增 `pages/analyzer`
   - 修改 `app.json`
   - 修改首页入口

4. 打磨与验收
   - 样式适配
   - 文案优化
   - 真机/开发者工具验证
   - 修 lint

## 13. 后续版本路线

第二阶段：

- 允许输入已见牌，修正剩余枚数。
- 加入自风、场风。
- 加入“最快和牌 / 高打点 / 役种练习”模式。
- 赤五建模。

第三阶段：

- 加入宝牌指示牌。
- 粗略计算打点倾向。
- 根据役种番数和有效牌估算简单 EV。

第四阶段：

- 加入牌河与防守建议。
- 现物、筋、壁、字牌安全度。
- 攻守平衡模式。

## 14. 给执行 agent 的注意事项

- 复用现有牌编码，不要引入中文牌名作为内部编码。
- 算法模块必须是 CommonJS：使用 `module.exports` / `require`，保持项目风格一致。
- 不要改动 `utils/yakuChecker.js` 的既有行为，除非只是复用导出的常量或补充无破坏性导出。
- 不要把大量算法写进 `pages/analyzer/index.js`。
- 不要引入大型第三方麻将库，第一阶段保持纯前端和可控体积。
- 页面样式沿用当前绿色主题和卡片风格，但分析结果应偏工具化、信息密度高一点。
- 所有新增文案用中文。
- 若算法结果与人类牌理存在争议，优先保证“向听数和有效牌统计正确”，役种倾向作为辅助解释。
