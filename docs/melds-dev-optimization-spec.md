# 副露功能开发优化文档

本文档用于指导“看牌猜役”和“算分练习”中新增“具体副露了哪些牌”的能力。目标不是只把页面上的“副露”二字改漂亮，而是建立一套可复用的数据模型，让题目展示、自由练习、役种判定和符数计算都能理解具体副露面子。

## 1. 背景与问题

当前项目已经具备基础副露概念：

- 算分题上下文中有 `context.hasOpenMeld` 和 `context.isMenzen`。
- 看牌猜役题通过 `contextHint` 描述“该手牌已副露”。
- 符数计算器 `utils/fuCalculator.js` 已预留 `explicitMelds`、`meldOpenFlags`、`explicitPair`。

但现在副露仍是粗粒度状态，主要问题是：

- 牌面展示组件 `components/tile-hand` 只渲染线性的 14 张 `tiles`，无法区分暗牌与副露牌。
- 题目页面只能显示“副露”，用户不知道吃、碰、杠的是哪一组牌。
- 算分时若只知道 `hasOpenMeld=true`，部分刻子/杠子的明暗状态可能被粗略处理，影响符数拆解准确性。
- 自由练习只能开关“有吃/碰/明杠”，无法表达真实牌姿。

## 2. 产品目标

第一目标：让练习题能明确展示副露组合。

第二目标：让算分引擎使用具体副露信息，提高符数与解释准确性。

第三目标：让自由练习支持用户手动设置吃、碰、杠。

完成后，用户在看牌猜役和算分练习中应能一眼看出：

- 暗牌区有哪些牌。
- 副露区有哪些面子。
- 每个副露面子是吃、碰、明杠还是暗杠。
- 这些副露如何影响门清限定役、食下番数和符数。

## 3. 范围定义

### 3.1 第一阶段必须完成

- 定义统一的副露数据结构。
- `tile-hand` 支持 `concealedTiles` + `melds` 展示，同时兼容旧的 `tiles`。
- 看牌猜役页面展示具体副露面子。
- 算分出题页面展示具体副露面子。
- 随机题生成器在 `hasOpenMeld=true` 时生成合理的 `melds`。
- `scoreAnswerBuilder` 将 `explicitMelds`、`explicitPair` 或可用的明暗标记传入 `fuCalculator`。
- 模板题可逐步补充 `melds`，旧模板在未补齐前继续兼容。

### 3.2 第二阶段必须完成

- 算分自由练习支持从已选牌中设置副露面子。
- 自由练习计算时使用用户设置的副露结构。
- 对副露输入做合法性校验。

### 3.3 后续增强

- 标记副露来自上家、对家、下家。
- 横置被鸣牌，提升真实牌桌表现。
- 暗杠两端盖牌展示。
- 支持加杠、抢杠、岭上开花的更完整上下文。

## 4. 统一数据模型

建议题目对象保留旧字段，并新增结构化字段：

```js
{
  tiles: ['2m', '3m', '4m', '5z', '5z', '5z', '6s', '6s', ...],
  concealedTiles: ['2m', '3m', '4m', '6s', '6s'],
  melds: [
    {
      type: 'chi',
      tiles: ['3p', '4p', '5p'],
      open: true,
      calledTile: '4p',
      from: 'left'
    },
    {
      type: 'pon',
      tiles: ['5z', '5z', '5z'],
      open: true,
      calledTile: '5z',
      from: 'right'
    }
  ],
  winTile: '6s',
  context: {
    isMenzen: false,
    hasOpenMeld: true
  }
}
```

字段说明：

- `tiles`：兼容旧逻辑的完整牌数组，仍用于役种判定和宝牌统计。
- `concealedTiles`：暗牌区展示用。通常为 14 张去掉副露面子后的手牌展示。
- `melds`：结构化面子数组。
- `melds[].type`：`chi`、`pon`、`kan`、`ankan`，内部计算时可映射为 `sequence`、`triplet`、`kan`。
- `melds[].tiles`：该面子真实展示牌。
- `melds[].open`：是否明面子。`ankan` 为 `false`。
- `melds[].calledTile`：被鸣的牌，第一阶段可以只存不展示。
- `melds[].from`：来源，第一阶段可以只存不展示。
- `context.hasOpenMeld`：从 `melds.some(m => m.open)` 推导，避免手写不一致。
- `context.isMenzen`：从 `!context.hasOpenMeld` 推导。

### 4.1 算符专用映射

`fuCalculator` 的 `explicitMelds` 目前需要类似结构：

```js
[
  { type: 'sequence', suit: 'p', startNum: 3, open: true },
  { type: 'triplet', tile: '5z', open: true },
  { type: 'kan', tile: '9m', open: true }
]
```

建议新增工具函数：

```js
function toExplicitMelds(melds) {
  // chi -> sequence
  // pon -> triplet
  // kan / ankan -> kan
}
```

该函数建议放在 `utils/melds.js`，避免页面和生成器重复实现。

## 5. 展示设计

### 5.1 `tile-hand` 组件

新增 properties：

```js
concealedTiles: { type: Array, value: [] },
melds: { type: Array, value: [] },
showMeldLabels: { type: Boolean, value: true }
```

渲染规则：

- 如果传入 `concealedTiles` 或 `melds`，使用新布局。
- 否则沿用 `tiles` 旧布局。
- 暗牌区正常横向展示。
- 副露区每个面子使用独立容器，并与暗牌区保留间距。
- 每组副露可显示小标签：`吃`、`碰`、`明杠`、`暗杠`。
- 和了牌仍用现有高亮逻辑显示。

建议结构：

```text
[暗牌][暗牌][暗牌]   [吃 3p4p5p] [碰 白白白]   和了 [6s]
```

移动端注意点：

- 副露组之间使用固定 `gap`。
- 单个副露组不应被拆行；整体不足时允许整组换行。
- 牌图尺寸沿用现有 `.tile-img`，避免和旧 UI 风格割裂。

### 5.2 看牌猜役页面

将：

```xml
<tile-hand tiles="{{currentQuestion.tiles}}" winTile="{{currentQuestion.winTile}}" />
```

升级为：

```xml
<tile-hand
  tiles="{{currentQuestion.tiles}}"
  concealedTiles="{{currentQuestion.concealedTiles}}"
  melds="{{currentQuestion.melds}}"
  winTile="{{currentQuestion.winTile}}"
/>
```

`context` 文案仍保留，但从“该手牌已副露”优化为更具体的提示，例如：

- `已副露：碰 白`
- `已副露：吃 345p、碰 中`
- `门前清`

### 5.3 算分练习页面

出题练习同样传入 `concealedTiles` 和 `melds`。

`context-strip` 中“副露”可以保留为状态摘要，另在牌面下方显示副露明细：

```text
副露：吃 3p4p5p · 碰 白白白
```

这能减少初学者来回对照牌面和条件的成本。

### 5.4 自由练习页面

第二阶段建议加入“副露编辑区”：

- 用户先从牌池选择 14 张完整牌。
- 点击某几张手牌后，选择 `吃`、`碰`、`明杠`、`暗杠`。
- 系统把这几张从暗牌展示中移入副露区。
- 副露组可点击撤销，撤销后牌回到暗牌区。

合法性规则：

- 吃：必须是同花色连续 3 张，不能是字牌。
- 碰：必须 3 张相同。
- 明杠/暗杠：必须 4 张相同。
- 最多 4 个面子。
- 副露后 `freeRiichi` 自动关闭并禁用。
- 存在明副露时 `freeHasOpenMeld=true`。
- 仅暗杠不破门清，但第一阶段自由练习可以先提示“暗杠暂按门清处理”。

## 6. 生成器设计

### 6.1 从已有 groups 推导副露

`utils/handGenerator.js` 的很多生成函数内部已经构建了 `groups` 和 `pair`，这是最适合生成 `melds` 的地方。

建议生成结果逐步扩展为：

```js
{
  tiles,
  winTile,
  groups,
  pair,
  concealedTiles,
  melds,
  contextHint
}
```

当 `contextHint` 包含 `已副露` 时：

- 从 `groups` 中挑选 1 到 3 组可公开的面子。
- 顺子生成 `chi`。
- 刻子生成 `pon`。
- 杠子生成 `kan`。
- 剩余牌放入 `concealedTiles`。

### 6.2 不应副露的役种

以下役种应保持门清，不生成明副露：

- 立直
- 一发
- 门前清自摸和
- 平和
- 一杯口
- 二杯口
- 七对子
- 国士无双
- 九莲宝灯
- 四暗刻
- 天和
- 地和

已有 `MENZEN_ONLY_YAKU` 可作为主要依据。

### 6.3 特殊役种注意

- 三暗刻：如果生成副露，优先副露顺子；不要把暗刻副露出去，否则会破坏目标役。
- 对对和：可以副露 1 到 4 个刻子。
- 役牌：优先把役牌刻子设为 `pon`，教学意义更强。
- 混一色/清一色/三色同顺/一气通贯/混全/纯全：副露后需要应用食下番数。
- 岭上开花、三杠子、四杠子：需要 `kan` 面子；暗杠和明杠可后续细分。

## 7. 算分引擎接入

### 7.1 `scoreAnswerBuilder`

当前 `buildAnswer(tiles, context)` 调用 `calculateFu` 时只传：

```js
{
  winMethod,
  winTile,
  hasOpenMeld,
  roundWind,
  seatWind
}
```

应扩展为：

```js
{
  winMethod,
  winTile,
  hasOpenMeld,
  roundWind,
  seatWind,
  explicitMelds: toExplicitMelds(context.melds),
  explicitPair: context.explicitPair,
  waitType: context.waitType
}
```

如果 `explicitMelds` 不满 4 组，不能直接走 `fuCalculator` 当前的完整分区路径。建议两步走：

第一步：

- 只在题目能提供完整 4 面子 + 1 雀头时传 `explicitMelds`。
- 其他情况继续旧逻辑。

第二步：

- 增强 `fuCalculator`，支持“部分显式副露 + 剩余暗牌自动拆分”。
- 自动拆分时固定已知副露，只枚举剩余暗牌的面子和雀头。

### 7.2 `fuCalculator`

建议新增能力：

```js
calculateFu(tiles, {
  fixedMelds: [...],
  ...
})
```

算法思路：

1. 从完整 `tiles` 计数中扣除 `fixedMelds` 的牌。
2. 对剩余牌寻找合法分区。
3. 将固定副露面子与自动分区面子合并。
4. 计算符数时按每个面子的 `open` 判断明暗。

这能解决“只副露了一个顺子，但暗刻仍应按暗刻计符”的问题。

## 8. 兼容与迁移

为了降低风险，迁移应保持旧字段可用：

- 旧题目只有 `tiles`：照常展示和计算。
- 新题目有 `concealedTiles` / `melds`：优先新展示。
- 模板题可以分批补充 `melds`，不要求一次改完所有模板。
- `hasOpenMeld` 初期继续保留，但应由 `melds` 推导或在构建题目时同步校验。

建议新增工具：

```js
function normalizeHandShape(question) {
  // 输入旧题或新题
  // 输出 { tiles, concealedTiles, melds, hasOpenMeld, isMenzen }
}
```

## 9. 测试计划

### 9.1 单元脚本

新增或扩展脚本：

- `scripts/test-melds.js`
- `scripts/test-score-random-generator.js`
- `scripts/test-score-calculator.js`

重点断言：

- `chi` 只能由同花连续数字牌组成。
- `pon` 必须三张相同。
- `kan` / `ankan` 必须四张相同。
- `tiles` 等于 `concealedTiles + melds[].tiles` 的多重集合。
- `hasOpenMeld` 与 `melds.some(m.open)` 一致。
- 副露题不会出现门清限定役。
- 食下役番数正确。
- 有具体副露时符数拆解中明刻/暗刻判断正确。

### 9.2 视觉检查

需要覆盖：

- 无副露 14 张牌。
- 1 组吃。
- 1 组碰。
- 多组副露换行。
- 明杠 4 张。
- 暗杠展示。
- 有和了牌高亮。
- 小屏下副露组不被拆散。

### 9.3 练习流程检查

- 看牌猜役能正常答题、记录错题。
- 算分出题能正常提交番符点。
- 算分解释中的成立役种和符数与副露一致。
- 自由练习设置副露后能撤销、清空、重新计算。

## 10. 推荐开发顺序

1. 新增 `utils/melds.js`，实现副露数据校验、展示文本、`toExplicitMelds`、`normalizeHandShape`。
2. 升级 `components/tile-hand`，兼容旧 `tiles`，支持 `concealedTiles` 和 `melds`。
3. 改造看牌猜役页面和复习页面，让它们传入新字段。
4. 改造算分出题页面，让它传入新字段并展示副露摘要。
5. 改造随机题生成器，从 `groups` 推导 `melds`。
6. 改造 `scoreAnswerBuilder`，在可用时传入显式面子。
7. 增强 `fuCalculator` 支持部分固定副露。
8. 改造自由练习，增加副露编辑区。
9. 补充模板题的 `melds`。
10. 跑脚本测试和页面视觉检查。

## 11. 风险与处理

- 风险：已有题库依赖 14 张线性数组。
  - 处理：保留 `tiles`，新字段只作为增强。

- 风险：随机生成器没有稳定输出完整分区。
  - 处理：优先在已有 `groups/pair` 的生成函数中补充，新旧题混跑。

- 风险：部分显式副露的符数计算复杂。
  - 处理：第一阶段只在完整显式分区时启用，第二阶段再做固定副露分区。

- 风险：自由练习交互过重。
  - 处理：先做“选中牌 -> 设为副露 -> 可撤销”的朴素流程，不做来源横置。

## 12. 验收标准

第一阶段验收：

- 看牌猜役中出现副露题时，牌面能显示具体副露组。
- 算分出题中出现副露题时，牌面能显示具体副露组。
- 无副露题的展示不回归。
- 随机算分题仍能稳定生成。
- 至少有吃、碰、明杠三类展示样例。

第二阶段验收：

- 自由练习可创建、撤销吃/碰/杠。
- 设置明副露后自动关闭立直。
- 计算结果使用具体副露信息。
- 明刻/暗刻、明杠/暗杠符数拆解正确。

## 13. 命名建议

建议统一使用：

- 中文 UI：`副露`、`吃`、`碰`、`明杠`、`暗杠`
- 数据字段：`melds`、`concealedTiles`、`hasOpenMeld`、`isMenzen`
- 工具文件：`utils/melds.js`
- 展示文本函数：`formatMeldLabel`、`formatMeldSummary`
- 校验函数：`validateMeld`、`validateMelds`

这套命名与现有 `fuCalculator` 的 `explicitMelds` 概念接近，后续维护成本较低。
