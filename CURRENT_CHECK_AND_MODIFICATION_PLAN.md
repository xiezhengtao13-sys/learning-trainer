# 当前检查结论与下一轮修改计划

检查日期：2026-07-06

检查对象：第 12 次修改后的当前代码状态。

本文件替代上一版检查计划。上一版中的“尚未实现设置窗口、尚未实现 grammarCatalog、AI 仍禁用”等结论已经部分过时。

---

## 0. 第 17 次补充检查：N1 推进、阅读收藏、AI 出题、针对性练习、数据保存

补充日期：2026-07-06

用户问题：

- “逐渐推进至 N1”目前到底是如何做到的？
- 阅读收藏词功能是否已经实现？
- AI 更新题目是如何做到的？
- 针对性练习是如何做到的？
- 数据保存/同步是否有读取不到最新数据或误覆盖最新数据的风险？

本节只做检查结论和确切实现计划，不改运行代码。

### 0.1 当前真实状态总览

结论：目前程序已经有“阅读驱动 + N1 目标约束 + AI 生成 + 生词/语法银行 + 同步合并”的基础，但其中几项仍是半成品。

当前已经存在：

- `japaneseSourceProfile.currentLesson = 16`
- `japaneseSourceProfile.masteryEstimate = 0.4`
- `japaneseSourceProfile.advanceThreshold = 0.50`
- `lessonProgress.currentLesson`
- `japaneseN1Status()`
- `minnaPromptContext()`
- `n1PromptContext()`
- `renderReadingLab()`
- `renderWordChip()`
- `collectSelectedJapaneseText()`
- `collectJpVocab()`
- `collectGrammarPoint()`
- `generateReadingPassageFromAi()`
- `generateAiCards()`
- `handleDiagnose()`
- `mergeImportedState()`
- `syncWithGitHub()`

但是：

- 课次并不会根据答题数据自动推进；现在只是手动课次 + AI prompt 约束 + UI 展示。
- 阅读收藏词“有代码入口”，但不是完整体验。词语 chip 必须依赖阅读卡里已有 `words` 数组；选中文本收藏只保存“待解析”，没有自动拆词、自动补假名/释义、浮动按钮和词库回显入口。
- AI 普通出题 `generateAiCards()` 当前疑似有入库 bug：调用 `normalizeAiCard(c, { id: aiSourceId }, i)` 时没有传 `track`，而 `normalizeAiCard()` 要求 `log.track` 存在，否则返回 `null`。这可能导致 AI 返回题目后被过滤为空。
- 诊断生成的针对性练习比普通 AI 出题更完整，因为 `normalizeAiCard(raw, trackId, ...)` 会带 track；但诊断题目前会清掉已有 `diag-` 来源题，策略偏粗。
- 数据同步是“拉取合并再上传”，但缺少版本号、设备号、变更日志、冲突预览和云端更新时间校验，所以确实可能出现旧数据覆盖新数据、用户误导入旧备份覆盖较新字段的风险。

---

### 0.2 “逐渐推进至 N1”当前如何做到

当前实现分三层。

第一层：时间路线。

- `japaneseN1Goal` 固定目标窗口：`2026-07-06 → 2027-07-06`。
- `japaneseN1Status()` 根据当前日期计算第几周、剩余几周、当前 N1 阶段。
- 这个函数只看日期，不看真实学习表现。

第二层：教材边界。

- `japaneseSourceProfile.currentLesson` 当前为第 16 课。
- `minnaPromptContext()` 会告诉 AI：主要使用《大家的日语》第 1-16 课词汇和句型。
- `n1PromptContext()` 会把 N1 年度目标和教材边界一起喂给 AI。
- 因此当前 AI 生成短文/题目时理论上会“以第 1-16 课为主体，少量 preview，不直接堆 N1”。

第三层：智能推荐。

- `learningProfile()` 会把 `japaneseN1Status()` 放进学习档案。
- `buildSmartQueue()` 会根据阅读、词汇、语法、弱项、到期、N1阶段配比排列队列。
- 这能让练习顺序有“向 N1 方向倾斜”的趋势。

当前缺口：

- 没有从 `history / progress / vocabBank / grammarBank / reading cards` 自动计算每课掌握度。
- 没有自动把第 16 课推进到第 17 课。
- `lessonProgress.lessons` 还没有真实结构和更新函数。
- 设置里改课次/掌握度本质是手动改全局值，不是学习结果驱动。

确切实现计划：

1. 新增课次掌握模型。

```js
state.lessonProgress = {
  currentLesson: 16,
  previewLesson: 17,
  updatedAt: "...",
  lessons: {
    "16": {
      vocab: { seen: 0, known: 0, forgot: 0, mastery: 0 },
      grammar: { seen: 0, known: 0, forgot: 0, mastery: 0 },
      reading: { seen: 0, good: 0, hard: 0, again: 0, mastery: 0 },
      retention: { due: 0, overdue: 0, stable: 0, mastery: 0 },
      overall: 0,
      status: "active|preview|locked|completed",
      updatedAt: "..."
    }
  }
}
```

2. 给卡片、生词、语法点补 lesson 来源。

- 阅读卡：`lessonRange` 或 `lesson`。
- 词汇：`lesson`、`sourceSentence`、`sourceCardId`、`sentenceIndex`。
- 语法：`lesson`、`pattern`、`sourceSentence`、`status`。
- 动态题：从词/语法继承 lesson。

3. 每次评分后更新课次掌握。

触发点：

- `rateCurrent(rating)`
- `markJpVocab(word, status)`
- `markGrammarPoint(pattern, status)`
- `collectJpVocab(raw)`
- `collectGrammarPoint(raw)`

新增函数：

```js
updateLessonProgressFromCard(card, rating, correct)
updateLessonProgressFromVocab(item)
updateLessonProgressFromGrammar(item)
recomputeLessonMastery(lesson)
maybeAdvanceLesson()
```

4. 推进规则落地。

建议第一版规则：

```text
overall < 0.50：不推进，只巩固当前课和前置课
0.50 <= overall < 0.65：稳定当前课，可引入 5%-10% 下一课 preview
0.65 <= overall < 0.75：推进准备，下一课 preview 提高到 10%-20%
overall >= 0.75 且忘词 <= 25% 且弱语法 <= 30%：currentLesson += 1
```

5. N1 与课次推进关系。

- N1 不直接决定今天学第几课。
- N1 只决定长期难度曲线、解释补充和阅读抽象度上限。
- 真正推进由《大家的日语》课次掌握度决定。

---

### 0.3 阅读收藏词功能当前状态与实现计划

当前已实现的部分：

- `renderReadingSentence()` 会渲染每句。
- 如果句子里有 `words` 数组，会调用 `renderWordChip()`。
- `renderWordChip()` 生成 `data-action="collect-word"` 按钮。
- `handleAction()` 中已经处理 `collect-word`，调用 `collectWordPayload()`。
- `collectWordPayload()` 解析 payload 后调用 `collectJpVocab()`。
- `collectJpVocab()` 会写入旧 `jpVocab` 和新 `vocabBank`，并 `saveState()`、`scheduleCloudSync()`。
- 工具栏有 `data-action="collect-selection"`，可以手动选中文本后收藏。
- `collectSelectedJapaneseText()` 已能记录选区所在句子 `sentenceIndex` 和 `sourceSentence`。

为什么用户会感觉“还没有实现”：

- 只有阅读卡本身带 `words` 数组时，词语 chip 才会出现；如果短文没有 `words`，用户只能手动框选。
- 手动框选后 `reading` 为空，`meaning` 是“待解析”，没有自动查词/AI解析。
- 没有浮动按钮，必须先选中文本再点工具栏按钮，手机上不直观。
- 收藏后右侧生词面板已被收束为总览，缺少一个明确的“生词本/已收藏词”查看与编辑入口。
- `findJpVocab()` 只查 `state.jpVocab`，不是优先查 `vocabBank`；两套数据可能不同步。
- `maybeCreateJpVocabCard()` 在 meaning 为“待解析”时不会生成词汇题，所以选中文本收藏后不一定立刻进入词汇练习。
- 没有“取消收藏 / 编辑释义 / 标记模糊 / 标记不会 / 查看来源句”的完整交互。

确切实现计划：

1. 统一词库来源。

- 将 `findJpVocab()` 改为优先查 `vocabBank`，兼容旧 `jpVocab`。
- 长期目标：日语也只以 `vocabBank` 为主，`jpVocab` 仅作为迁移兼容。

2. 增加阅读选词浮动工具。

交互：

- 用户在 `.sentence-jp` 或 `.sentence-kana` 中选择文本。
- 选择结束后，在选区附近显示浮动按钮：`收藏词`、`问 AI`。
- 手机端如果定位困难，固定显示在阅读卡底部。

实现点：

```js
state.selectionDraft = {
  text,
  cardId,
  sentenceIndex,
  sourceSentence,
  rect
}
```

事件：

- `selectionchange`
- `pointerup`
- `touchend`

3. 收藏时补充解析。

第一阶段：

- 收藏后立即写入 `vocabBank`，meaning 为“待解析”。
- 显示一个小编辑框让用户手动填假名和释义。

第二阶段：

- 增加 `enrich-vocab` action。
- 调 DeepSeek / 本地代理，根据来源句返回：

```json
{
  "word": "導入",
  "reading": "どうにゅう",
  "meaning": "引入，导入",
  "pos": "名词/サ变动词",
  "lessonGuess": 16,
  "example": "新しい制度を導入します。"
}
```

4. 收藏后立即进入可见状态。

- 词语 chip 增加 `is-saved` 样式。
- 总览显示“新收藏词 +1”。
- 在“词汇题”任务页顶部增加“生词本”折叠区，列出最近 10 个词。
- 每个词有：编辑、忘了、模糊、掌握、删除。

5. 待解析词进入词汇题的策略。

- meaning 为“待解析”时不出“写意思”题。
- 可以出“回到原句识别词”自评题。
- meaning 补齐后，再生成输入题/选择题。

---

### 0.4 AI 更新题目当前如何做到，以及需要修什么

当前有两条 AI 题目生成路径。

路径 A：阅读短文生成。

- 按钮：阅读卡上的“按我的边界生成新短文”。
- 事件：`reading-ai-passage`
- 函数：`generateReadingPassageFromAi()`
- 数据来源：
  - `readingLearningPayload()`
  - `readingKnowledgeBoundary()`
  - `minnaPromptContext()`
  - `vocabBank` 中最近词与忘词
  - `history` 中最近日语记录
- 输出：`normalizeReadingCard(raw)`。
- 保存：加入 `state.generatedCards`，设置 `state.currentId = card.id`，然后 `saveState()` 和 `scheduleCloudSync()`。

这条路径相对清楚，主要用于“生成下一篇阅读短文”。

路径 B：普通 AI 出题。

- 按钮：设置窗口 AI 分区里的“按教材进度生成练习”。
- 事件：`ai-generate`
- 函数：`generateAiCards()`
- 数据来源：
  - `learningProfile(state.activeTrack)`
  - `profile.weakTags`
  - `n1PromptContext(state.activeTrack)`
  - `minnaPromptContext()`
  - `vocabBank` 中 lapses > 0 的词
  - `grammarBank` 中 lapses > 0 的语法
- 输出：AI 返回 `cards` JSON。
- 预期保存：`normalizeAiCard()` 后加入 `state.generatedCards`。

当前疑似 bug：

```js
var cards = incoming.map(function(c, i) {
  return normalizeAiCard(c, { id: aiSourceId }, i);
}).filter(Boolean);
```

`normalizeAiCard()` 内部要求：

```js
if (!log || !log.track) return null;
```

因此 `{ id: aiSourceId }` 没有 `track`，很可能导致全部返回 `null`。

确切修复计划：

1. 修正传参。

```js
var source = { id: aiSourceId, track: state.activeTrack, signals: [] };
var cards = incoming.map(function(c, i) {
  return normalizeAiCard(c, source, i);
}).filter(Boolean);
```

代理回退路径也同样修。

2. 增加 AI 生成结果日志。

新增：

```js
state.aiGenerationLog = [
  {
    id,
    at,
    provider,
    track,
    requestedCount,
    receivedCount,
    normalizedCount,
    error,
    promptDigest
  }
]
```

3. 不要静默失败。

- 如果 AI 返回了 6 条但 normalized 为 0，显示“返回格式不符合卡片结构”，并把第一条错误原因存日志。
- 设置窗口里展示最近一次生成结果。

4. 生成题入队规则。

- 生成后进入 `generatedCards`。
- 立即 `buildQueue("adaptive")`。
- `buildSmartQueue()` 会从 `allCards()` 里取到 `generatedCards`。
- 如果是 reading 卡，则进入阅读优先桶；如果是词汇/语法卡，则进入对应桶。

---

### 0.5 针对性练习当前如何做到，以及需要修什么

当前针对性练习有三种来源。

来源 1：答题后的自动巩固题。

- 入口：`rateCurrent(rating)`
- 函数：`maybeCreateReinforcement(card, rating, correct)`
- 逻辑：
  - 如果答错、忘了，或某卡 pressure 足够高，就调用 `buildReinforcementCard(card)`。
  - 选择题会转输入题。
  - 组句题会转默写题。
  - 其他题会转自评复述题。
- 保存：加入 `state.generatedCards`。

优点：不依赖 AI，立即可用。

缺点：

- 只是基于单题变体，不会理解错因。
- 不会把多个错题合成一个系统训练。

来源 2：学习诊断生成 focusCards。

- 入口：设置窗口 AI 分区“生成诊断”。
- 函数：`handleDiagnose()`
- 数据来源：
  - 最近错题 `recentErrors`
  - 学习档案 `learningProfile()`
  - 弱标签 `weakTags`
  - 各模块正确率/到期数/平均耗时
  - N1/教材上下文
- AI 返回：
  - `summary`
  - `patterns`
  - `recommendations`
  - `focusCards`
- 保存：
  - `state.diagnosis[trackId]`
  - `focusCards` 归一化后写入 `state.generatedCards`

这是真正“针对性练习”的主路径。

当前问题：

- 每次诊断会删除所有 `aiSourceLogId` 以 `diag-` 开头的旧诊断题，可能把仍未练完的诊断题清掉。
- 诊断结果只显示摘要，不形成一个可追踪的“弱项训练计划”。
- focusCards 没有关联具体 pattern/category 的后续完成状态。

来源 3：智能队列排序。

- `buildSmartQueue()` 会优先排：
  - 到期阅读
  - 新阅读
  - 偏慢模块
  - 今日相关
  - 到期词汇
  - 弱项
  - 到期语法
  - N1 阶段焦点

这是“针对性排序”，不是“新题生成”。

确切实现计划：

1. 新增弱项训练计划结构。

```js
state.focusPlans = [
  {
    id,
    track,
    source: "diagnosis|auto|manual",
    patternCategory,
    relatedTags,
    cardIds,
    createdAt,
    status: "active|done|archived",
    targetReps,
    completedReps
  }
]
```

2. 诊断生成题不再粗暴删除旧题。

- 用 `focusPlanId` 关联一组诊断题。
- 只归档已完成的旧 plan。
- 未完成的旧诊断题保留，但降低优先级。

3. 队列优先级加入 focusPlan。

- `buildSmartQueue()` 在 weak 桶前加入 `focusPlanCards`。
- 每轮最多 20%-30%，避免被诊断题淹没。

4. 总览展示。

- 右侧总览显示“当前弱项计划：助词 / て形 / 长句切分”。
- 进入词汇题/语法题时顶部提示本轮训练目标。

---

### 0.6 数据保存与同步问题检查

当前本地保存：

- `saveState()` 把大部分 state 写入 `localStorage`。
- 它会排除临时字段：队列、当前题、输入态、toast、AI message 等。
- 刷新后会 `loadState()`。
- `loadState()` 会用 `defaultState()` 与 saved 合并，然后强制 `queue: []`、`currentId: null`、`activeView: "practice"`。

这意味着：

- 刷新后不会恢复上一张正在做的题。
- 某些临时状态不会保留是正常的。
- 但如果用户以为“当前题/当前队列”也会保存，就会误解为数据丢失。

当前云同步：

- `scheduleCloudSync()` 延迟 2.5 秒调用 `syncWithGitHub()`。
- `syncWithGitHub()` 流程是：
  1. pull from Gist
  2. `mergeImportedState()`
  3. push merged local state

当前合并策略：

- `progress`：按 reps 或 lastSeen 较大的一方。
- `history`：按 time 去重。
- `customCards/generatedCards/vocabBank/grammarBank`：按 id 合并，时间较新覆盖较旧。
- `diagnosis/analyses/readingChat`：对象浅合并，后者覆盖前者。

风险点：

1. 没有全局数据版本。

- 无法判断“这个备份是否比当前本地旧很多”。
- 用户导入旧备份时，部分字段仍可能覆盖当前状态。

2. 没有设备 ID。

- 电脑和手机同时操作时，无法明确哪个设备产生了哪个变更。

3. 没有修订号 / updatedAt 顶层字段。

- `exportedAt` 存在于 snapshot 外层，但 `mergeImportedState()` 主要合并 `data`，没有用它做安全判断。

4. `diagnosis` 和 `readingChat` 是浅合并。

- 同一 track 或同一卡片的聊天记录可能被覆盖，而不是按 message 逐条合并。

5. `generatedCards` 只保留最后 160 张。

- 两端各自生成题后合并，再 slice，可能丢掉一端较旧但未练过的生成题。

6. 自动同步可能与手动导入/生成题同时发生。

- `cloudSyncInFlight` 只防止同步函数重入，不防止用户在同步过程中继续修改本地状态。

7. `gitConfig()` 在一些读操作中会补默认值，并可能随后 `saveState()`。

- 这通常没问题，但配置状态与学习数据混在一个对象里，调试时不清楚是哪类数据更新。

确切实现计划：

1. 引入顶层元数据。

```js
state.meta = {
  deviceId: "uuid",
  revision: 0,
  updatedAt: "...",
  lastSyncedRevision: 0,
  lastSyncedAt: "...",
  schemaVersion: 3
}
```

2. 所有学习数据修改走统一提交函数。

新增：

```js
commitStateChange(reason, mutator)
```

行为：

- 执行 mutator。
- `revision += 1`。
- `updatedAt = now`。
- 写入 `changeLog` 最近 200 条。
- `saveState()`。
- `scheduleCloudSync()`。

3. 分离敏感配置和学习数据。

- 学习数据：`STORAGE_KEY`。
- 本地配置：`triad-learning-trainer-local-config`。
- DeepSeek Key、GitHub Token、本地代理地址只在 local config，不进入学习数据合并。

4. 导入前做安全检查。

导入旧备份时显示：

```text
备份时间：...
当前本机时间：...
备份 revision：...
本机 revision：...
将新增：X 条历史、Y 个生词、Z 个语法点
将覆盖：N 个同 ID 项
```

必须用户确认后才合并。

5. 改造合并策略。

- `diagnosis`：按 track 下的 `at` 比较，不要无条件覆盖。
- `readingChat`：每张卡按 message `at + role + content` 去重合并。
- `generatedCards`：未练过的 AI 卡优先保留；slice 前按 `createdAt / aiSourceLogId / progress` 排序。
- `vocabBank/grammarBank`：用 `updatedAt`，但字段级合并，避免较新空字段覆盖较旧有效字段。

6. 同步加锁与冲突提示。

- 同步开始时记录 `baseRevision`。
- pull 合并后，如果本地在同步期间 `revision` 变化，重新合并一次再 push。
- 如果云端 revision 大于本地且两边都有新改动，状态提示“已合并两端更改”，不要静默说“上传成功”。

7. 增加恢复点。

- 每次 import / pull / push 前，自动保存最近 5 个本地快照到：

```js
localStorage["triad-learning-trainer-recovery"]
```

- 设置页增加“恢复到上一个本地快照”。

---

### 0.7 下一轮代码修改优先级

优先级 1：实现课次推进最小可用版本。

- 实现 `lessonProgress.lessons`。
- 评分/标记时更新掌握度。
- 实现 `maybeAdvanceLesson()`。
- 让 AI 出题和阅读短文生成都读取同一个课次进度源。
- 设置页显示“为什么推进/为什么不推进”。

优先级 2：修 AI 普通出题入库 bug。

- 修 `generateAiCards()` 两处 `normalizeAiCard()` 传参。
- 加最小测试：模拟 AI 返回一张卡，确认进入 `generatedCards`。

优先级 3：补阅读收藏词完整体验。

- 统一 `findJpVocab()` 到 `vocabBank`。
- 做选词浮动按钮。
- 给收藏词增加编辑/解析/回显入口。
- 待解析词不强行生成普通输入题。

优先级 4：数据保存安全。

- 增加 `meta.deviceId/revision/updatedAt`。
- 导入预览和恢复点。
- 改造 `diagnosis/readingChat/generatedCards` 合并策略。

优先级 5：针对性练习计划化。

- 增加 `focusPlans`。
- 诊断题按 plan 管理，不再粗暴清旧 `diag-` 题。
- 智能队列按 plan 插入弱项题。

---

## 0.8 第 18 次待实施计划：按用户确认后的执行顺序

补充日期：2026-07-06

用户最新要求：

1. 第一项“进度逐步推进至 N1 / 教材课次推进”请尽快实现；先给详细计划和做法，交给用户。
2. 阅读句子时看到某个词，要可以直接点击标记并加入收藏。
3. 必须搞清楚生成新题是否和第一项进度齐平、是否基于教材；同时把修复 AI 出题 bug 的思路写清楚。
4. 针对性练习按上一节 focusPlans 思路推进。
5. 数据保存与同步安全按上一节 meta/revision/恢复点思路推进。

本节仍然是计划，不改运行代码。

---

### 0.8.1 第一项：课次推进 / N1 渐进的最小可用实现

目标不是“立刻做 N1 题”，而是让程序做到：

- 当前明确知道你正在《大家的日语》第几课。
- 每个词、语法、阅读题尽量归属到课次。
- 你每次答题、标记“忘了/模糊/会了”、收藏词语法后，课次掌握度会变化。
- 达到条件后，系统自动从第 16 课推进到第 17 课。
- N1 目标只作为长期方向，不直接覆盖当前教材进度。

#### A. 数据结构

在 `defaultState()` 里扩展 `lessonProgress`：

```js
lessonProgress: {
  currentLesson: 16,
  previewLesson: 17,
  advanceMode: "auto", // auto | manual
  lastAdvanceAt: "",
  lastAdvanceReason: "",
  lessons: {
    "16": {
      lesson: 16,
      status: "active", // locked | preview | active | completed
      vocab: { total: 0, seen: 0, known: 0, fuzzy: 0, forgot: 0, mastery: 0 },
      grammar: { total: 0, seen: 0, known: 0, fuzzy: 0, forgot: 0, mastery: 0 },
      reading: { total: 0, seen: 0, good: 0, hard: 0, again: 0, mastery: 0 },
      retention: { due: 0, overdue: 0, stable: 0, mastery: 0 },
      overall: 0,
      canAdvance: false,
      blockers: [],
      updatedAt: ""
    }
  }
}
```

同时保留旧字段兼容：

- `japaneseSourceProfile.currentLesson`
- `japaneseSourceProfile.masteryEstimate`

但它们不再作为主数据源，而是由 `lessonProgress` 派生更新。

#### B. 统一当前课次读取函数

新增：

```js
function currentLessonState() {
  const lp = state.lessonProgress || {};
  const lesson = Number(lp.currentLesson || japaneseSourceProfile.currentLesson || 16);
  const record = lp.lessons?.[lesson] || null;
  return {
    lesson,
    previewLesson: Number(lp.previewLesson || lesson + 1),
    mastery: record ? record.overall : japaneseSourceProfile.masteryEstimate,
    record
  };
}
```

所有使用 `japaneseSourceProfile.currentLesson` 的地方逐步改为：

- UI 显示：读 `currentLessonState().lesson`
- AI prompt：读 `currentLessonState()`
- 收藏词/语法：写入 `lesson`
- 生成题：写入 `lesson` 或 `lessonRange`

#### C. 课次归属规则

第一版不做复杂 OCR 和教材索引，先使用“显式 lesson + fallback”。

归属来源优先级：

1. 卡片自己的 `lesson`。
2. 卡片 `tags` 里的 `lesson-16`。
3. 词汇/语法项自己的 `lesson`。
4. 阅读卡 `lessonRange.to`。
5. 都没有时，归入当前课 `currentLessonState().lesson`。

新增：

```js
function lessonForCard(card) {}
function lessonForVocab(item) {}
function lessonForGrammar(item) {}
```

#### D. 掌握度更新触发点

必须接入这些函数：

- `rateCurrent(rating)`
- `collectJpVocab(raw)`
- `markJpVocab(word, status)`
- `collectGrammarPoint(raw)`
- `markGrammarPoint(pattern, status)`

新增：

```js
function updateLessonProgressFromCard(card, rating, correct) {}
function updateLessonProgressFromVocab(item, status) {}
function updateLessonProgressFromGrammar(item, status) {}
function recomputeLessonMastery(lesson) {}
function maybeAdvanceLesson() {}
```

评分映射：

```text
reading:
  good  -> reading.good +1
  hard  -> reading.hard +1
  again -> reading.again +1

vocab:
  known -> known +1
  fuzzy -> fuzzy +1
  forgot -> forgot +1

grammar:
  known -> known +1
  fuzzy -> fuzzy +1
  forgot -> forgot +1
```

#### E. 掌握度计算

第一版公式：

```text
vocabMastery =
  known / max(seen, 1)
  - forgot / max(seen, 1) * 0.45
  - fuzzy / max(seen, 1) * 0.20

grammarMastery =
  known / max(seen, 1)
  - forgot / max(seen, 1) * 0.50
  - fuzzy / max(seen, 1) * 0.25

readingMastery =
  (good + hard * 0.55) / max(seen, 1)
  - again / max(seen, 1) * 0.45

retentionMastery =
  stable / max(stable + overdue + due, 1)

overall =
  vocabMastery * 0.40
  + grammarMastery * 0.30
  + readingMastery * 0.20
  + retentionMastery * 0.10
```

数值限制在 `0..1`。

#### F. 推进规则

最小可用版本采用保守推进。

```text
overall < 0.50：
  不推进；只巩固当前课和前置课。

0.50 <= overall < 0.65：
  稳定当前课；AI 可加入 5%-10% 下一课 preview。

0.65 <= overall < 0.75：
  推进准备；AI 可加入 10%-20% 下一课 preview，但题目仍主要考当前课。

overall >= 0.75：
  允许推进，但必须同时满足：
  - vocab forgot ratio <= 25%
  - grammar forgot ratio <= 30%
  - reading again ratio <= 30%
  - 当前课至少有 2 次阅读卡评分
```

推进后：

```js
state.lessonProgress.currentLesson += 1;
state.lessonProgress.previewLesson = state.lessonProgress.currentLesson + 1;
state.lessonProgress.lastAdvanceAt = new Date().toISOString();
state.lessonProgress.lastAdvanceReason = "...";
japaneseSourceProfile.currentLesson = state.lessonProgress.currentLesson;
japaneseSourceProfile.masteryEstimate = newCurrentLessonOverall;
```

#### G. UI 显示

右侧总览显示：

- 当前课：第 16 课
- 掌握度：例如 42%
- 状态：巩固中 / 稳定中 / 推进准备 / 可推进
- 阻碍：忘词偏多、语法弱项偏多、阅读评分不足

设置页“教材与进度”显示：

- 当前课次
- preview 课次
- 四维掌握度
- 自动推进开关
- 手动推进按钮
- 最近一次推进原因

#### H. 验证方式

新增或补充测试：

```js
// 1. again 会降低 reading mastery
// 2. known vocab 会提高 vocab mastery
// 3. forgot grammar 会阻止推进
// 4. overall >= 0.75 且安全条件满足时 currentLesson + 1
// 5. currentLessonState() 能兼容旧 japaneseSourceProfile
```

---

### 0.8.2 第二项：阅读句子中点击词语即可收藏

用户想要的体验：

- 读日语句子时，看到一个词，就能直接点它。
- 点完即可收藏。
- 收藏后这个词要变色或显示“已收藏”。
- 后续进入词汇题和 AI 短文生成边界。

#### A. 第一阶段：基于 AI 返回 words 的点击收藏

当前 `renderWordChip()` 已经能做，但前提是阅读卡句子有 `words`。

要补：

- 确保所有内置阅读卡和 AI 阅读卡都带 `words`。
- `normalizeReadingCard()` 保留 `words` 的 `lesson`、`tags`。
- `renderWordChip()` payload 增加：

```js
lesson: sentence.lesson || card.lesson || currentLessonState().lesson,
sentenceIndex,
sourceSentence
```

#### B. 第二阶段：没有 words 时也能点词

不做完整分词器的第一版方案：

- 每个 `.sentence-jp` 支持手动选中。
- 选中后出现浮动按钮“收藏词”。
- 点击后存入 `vocabBank`，meaning 为“待解析”。

第二版方案：

- 给代理加 `/segment-japanese` 或 `/enrich-vocab`。
- 点击句子后，让 AI 返回候选词边界。
- 将句子渲染成可点击 token。

建议先做第一版，因为可靠、改动小。

#### C. 生词状态

`vocabBank` 增加字段：

```js
{
  lesson,
  sentenceIndex,
  sourceSentence,
  status: "new|fuzzy|forgot|known",
  meaningStatus: "pending|confirmed|ai"
}
```

按钮：

- 收藏
- 忘了
- 模糊
- 掌握
- 编辑

#### D. 回显

- 已收藏词 chip 加 `.is-saved`。
- 词汇题页顶部显示最近收藏词。
- 设置页数据管理里可导出/同步。

---

### 0.8.3 第三项：AI 生成新题必须与课次进度齐平

当前答案：

- 现在 AI 生成短文/题目“名义上基于教材”，因为 prompt 里有 `minnaPromptContext()`。
- 但它读取的是 `japaneseSourceProfile.currentLesson`，不是未来要实现的 `lessonProgress.currentLesson`。
- 所以当前还不能说“与真实学习进度齐平”；只能说“与手动设置的第 16 课齐平”。

目标：

- AI 出题必须读取 `currentLessonState()`。
- 课次推进后，AI 自动改成以新课为当前课。
- 未达到推进条件时，AI 不主动生成下一课考核题，只允许少量 preview。

#### A. 改造 prompt 数据源

修改 `minnaPromptContext()`：

```js
function minnaPromptContext() {
  const lessonState = currentLessonState();
  const lesson = lessonState.lesson;
  const mastery = lessonState.mastery;
  ...
}
```

prompt 明确输出：

```text
当前课：第 X 课
当前课掌握度：Y%
preview 课：第 X+1 课
允许 preview 比例：根据掌握度计算
禁止：直接生成超过当前课太多的考核题
```

#### B. AI 生成卡片必须带课次元数据

要求 AI 返回：

```json
{
  "module": "jp-reading",
  "type": "reading",
  "lesson": 16,
  "lessonRange": {"from": 1, "to": 16},
  "preview": false,
  "sentences": [...]
}
```

`normalizeAiCard()` 和 `normalizeReadingCard()` 保存这些字段。

#### C. 修复普通 AI 出题入库 bug

当前疑似 bug：

```js
normalizeAiCard(c, { id: aiSourceId }, i)
```

修法：

```js
const source = {
  id: aiSourceId,
  track: state.activeTrack,
  signals: [],
  lesson: currentLessonState().lesson
};

const cards = incoming
  .map((c, i) => normalizeAiCard(c, source, i))
  .filter(Boolean);
```

代理回退路径同步修改。

同时给 `normalizeAiCard()` 加保护：

```js
if (!log.track) {
  log.track = state.activeTrack;
}
```

但优先应该在调用处传对，不要只靠兜底。

#### D. AI 生成结果验收

生成后检查：

- `receivedCount > 0`
- `normalizedCount > 0`
- 日语卡必须有 `lesson <= currentLesson + 1`
- preview 卡数量不超过允许比例
- reading 卡必须有 `sentences`
- 词汇/语法卡必须有 `answer` 或自评字段

失败时：

- 不覆盖旧题。
- 设置页显示错误。
- `aiGenerationLog` 记录原因。

#### E. 回答“是否基于教材”

计划完成后的标准答案：

- 是，日语 AI 题目必须基于《大家的日语》当前课和前置课。
- 题目不复制教材原文，只使用教材词汇/句型边界生成原创内容。
- N1 只是长期方向，当前课未达标时不会硬塞 N1。

---

### 0.8.4 第四项：针对性练习按 focusPlans 推进

按 0.5 的方案实施，补充执行顺序：

1. 新增 `state.focusPlans`。
2. `handleDiagnose()` 生成一个 `focusPlan`。
3. `focusCards` 写入 `generatedCards` 时带 `focusPlanId`。
4. `buildSmartQueue()` 在 weak 桶前插入 active focus plan 卡。
5. `rateCurrent()` 更新 `focusPlan.completedReps`。
6. 达到目标后自动标记 `done`。

第一版不做复杂 UI，只在右侧总览显示当前 focus plan 名称和剩余题数。

---

### 0.8.5 第五项：数据保存与同步安全按 meta/revision 推进

按 0.6 的方案实施，补充执行顺序：

1. 新增 `state.meta.deviceId/revision/updatedAt/schemaVersion`。
2. 新增 `ensureMeta()`，在 `loadState()` 时补齐。
3. 新增 `commitStateChange(reason, mutator)`。
4. 暂时不一次性重写全部保存点，先接入高风险操作：
   - 收藏词
   - 标记词/语法
   - 评分
   - AI 生成题
   - 导入备份
   - GitHub pull/push
5. 新增本地恢复点：

```js
saveRecoverySnapshot(reason)
```

在导入、pull、push 前调用。

6. 改 `mergeImportedState()`：
   - `diagnosis` 按 `at` 合并。
   - `readingChat` 逐条去重。
   - `vocabBank/grammarBank` 字段级合并，避免空值覆盖非空值。
   - `generatedCards` 未练过优先保留。
7. 设置页增加：
   - 当前 revision
   - 最近同步时间
   - 最近恢复点
   - 恢复上一个快照按钮

---

### 0.8.6 推荐交付顺序

第一轮最小交付：

1. 课次推进数据结构 + `currentLessonState()`。
2. `rateCurrent()` 接入 `updateLessonProgressFromCard()`。
3. `minnaPromptContext()` 改读 `currentLessonState()`。
4. 修 `generateAiCards()` 入库 bug。
5. 生成题保存 `lesson` 元数据。
6. 基础测试通过。

第二轮交付：

1. 阅读选词浮动收藏。
2. `vocabBank` 统一查询。
3. 收藏词编辑/标记。

第三轮交付：

1. `focusPlans`。
2. 数据同步 revision/recovery。

第一轮做完后，就能回答：

```text
AI 生成的新题与当前教材课次进度齐平；
当前未达推进条件时，AI 仍围绕第 1-16 课；
达到推进条件后，系统推进到第 17 课，AI 自动以第 17 课为当前课。
```

---

## 0.9 第 20 次审核：教材与进度掌握度显示机制 + 修复计划

补充日期：2026-07-06

本节回答用户问题：

- “目前教材与进度查看掌握度变化是如何实现的？”
- “把上次审核提出的问题写成详细修改计划和方法。”

本节只更新计划文档，不改运行代码。

---

### 0.9.1 当前“教材与进度”掌握度变化如何实现

当前实现链路如下。

#### A. 数据源

初始状态在 `defaultState()`：

```js
lessonProgress: {
  currentLesson: 16,
  previewLesson: 17,
  advanceMode: "auto",
  lastAdvanceAt: "",
  lastAdvanceReason: "",
  lessons: {}
}
```

每一课的具体记录由 `ensureLessonRecord(lessonNum)` 延迟创建，结构包含：

- `vocab`
- `grammar`
- `reading`
- `retention`
- `overall`
- `canAdvance`
- `blockers`

#### B. 设置页如何读取掌握度

`renderTextbookSettings()` 会调用：

```js
var cls = currentLessonState();
var rec = cls.record;
```

`currentLessonState()` 的读取规则：

1. 先读 `state.lessonProgress.currentLesson`。
2. 如果没有，则读 `japaneseSourceProfile.currentLesson`。
3. 再找到 `state.lessonProgress.lessons[lesson]`。
4. 如果有 record，掌握度显示 `record.overall`。
5. 如果没有 record，回退显示 `japaneseSourceProfile.masteryEstimate`。

因此，“教材与进度”页面的掌握度并不是实时扫描所有题算出来的；它依赖 `lessonProgress.lessons[当前课].overall`。

#### C. 答题后如何改变掌握度

当前评分入口是：

```js
rateCurrent(rating)
```

评分后，如果当前卡片是日语卡：

```js
if (card.track === "japanese") updateLessonProgressFromCard(card, rating);
```

`updateLessonProgressFromCard(card, rating)` 做四步：

1. 用 `lessonForCard(card)` 判断这张卡属于第几课。
2. 用 `ensureLessonRecord(lesson)` 创建或读取该课记录。
3. 根据卡片类型更新阅读/词汇/语法计数。
4. 调 `recalcLessonMastery(rec)` 重新算该课 overall。
5. 调 `maybeAdvanceLesson()` 判断是否推进。

#### D. 掌握度计算方式

当前 `recalcLessonMastery(rec)` 的第一版公式很简化：

```text
vocabMastery   = vocab.known / (known + fuzzy + forgot)
grammarMastery = grammar.known / (known + fuzzy + forgot)
readingMastery = reading.good / (good + hard + again)
overall = vocab * 0.4 + grammar * 0.3 + reading * 0.2 + retention * 0.1
```

其中 retention 目前还没有真正接入复习保持率，只是一个占位。

#### E. 自动推进方式

当前 `maybeAdvanceLesson()`：

- `overall >= 0.50` 时设置 `canAdvance = true`。
- `overall >= 0.65` 且非手动模式时，把 `currentLesson` 推进到下一课。
- 推进后写 `lastAdvanceAt` 和 `lastAdvanceReason`。

#### F. 当前实现的关键问题

问题 1：评分值不匹配。

- 按钮实际传：
  - `again`
  - `hard`
  - `good`
- 但 `updateLessonProgressFromCard()` 里正向判断的是：
  - `rating === "easy"`

结果：

- 用户点“会了”时不会增加 `reading.good / vocab.known / grammar.known`。
- 掌握度可能不升，甚至只记录 hard/again。

问题 2：自动推进没有检查 blockers。

- `maybeAdvanceLesson()` 会写 blockers。
- 但推进条件只看 `rec.canAdvance && rec.overall >= 0.65`。
- 没有要求 `rec.blockers.length === 0`。

问题 3：手动改课次不同步。

- 设置页 `lesson-number` 当前只写：

```js
japaneseSourceProfile.currentLesson = v;
```

- 没有同步写：

```js
state.lessonProgress.currentLesson = v;
state.lessonProgress.previewLesson = v + 1;
```

问题 4：右侧总览仍读旧源。

`renderLearningOverviewPanel()` 仍显示：

- `japaneseSourceProfile.currentLesson`
- `japaneseSourceProfile.masteryEstimate`

它没有读 `currentLessonState()`，所以可能和设置页显示不一致。

问题 5：收藏词/语法没有更新课次掌握。

计划里说收藏/标记也要影响掌握度，但当前主要只接入了 `rateCurrent()`。

问题 6：AI 生成题没有真正带 lesson 元数据。

`normalizeAiCard()` 兜底补 track，但 `generateAiCards()` 调用处仍没有显式传：

- `track`
- `lesson`
- `signals`

生成卡片 base 也没有稳定写入：

- `lesson`
- `lessonRange`
- `preview`

---

### 0.9.2 修复计划总览

下一轮应优先修 P1/P2，不要先做新展示。

优先级：

1. 修掌握度评分值不匹配。
2. 修自动推进条件。
3. 修手动课次修改同步。
4. 修右侧总览显示数据源。
5. 修 AI 出题显式传进度源和 lesson 元数据。
6. 补阅读收藏词与 `vocabBank` 统一查询。
7. 补最小测试与验收展示。

---

### 0.9.3 修改计划 1：修评分值不匹配

涉及函数：

- `updateLessonProgressFromCard(card, rating)`
- `rateCurrent(rating)`

当前错误：

```js
if (rating === "easy") rec.reading.good += 1;
```

实际按钮：

```html
data-rating="good"
```

修法：

新增统一函数：

```js
function normalizeRatingForMastery(rating) {
  if (rating === "good" || rating === "easy") return "good";
  if (rating === "hard") return "hard";
  return "again";
}
```

然后：

```js
var normalized = normalizeRatingForMastery(rating);

if (normalized === "good") rec.reading.good += 1;
else if (normalized === "hard") rec.reading.hard += 1;
else rec.reading.again += 1;
```

词汇/语法同理：

```js
if (normalized === "good") rec.vocab.known += 1;
else if (normalized === "hard") rec.vocab.fuzzy += 1;
else rec.vocab.forgot += 1;
```

验收：

- 连续点 3 次“会了”，设置页阅读/词汇/语法掌握度应上升。
- `lessonProgress.lessons["16"].reading.good` 应增加。

---

### 0.9.4 修改计划 2：修掌握度公式与推进条件

涉及函数：

- `recalcLessonMastery(rec)`
- `maybeAdvanceLesson()`

当前公式过于简单，只算 known/good 比例，没有明确惩罚 forgot/fuzzy。

建议改成：

```js
function boundedMastery(value) {
  return Math.max(0, Math.min(1, value || 0));
}
```

词汇：

```js
var vocabSeen = rec.vocab.known + rec.vocab.fuzzy + rec.vocab.forgot;
var vocabMastery = vocabSeen
  ? (rec.vocab.known + rec.vocab.fuzzy * 0.45 - rec.vocab.forgot * 0.35) / vocabSeen
  : 0;
```

语法：

```js
var grammarSeen = rec.grammar.known + rec.grammar.fuzzy + rec.grammar.forgot;
var grammarMastery = grammarSeen
  ? (rec.grammar.known + rec.grammar.fuzzy * 0.40 - rec.grammar.forgot * 0.45) / grammarSeen
  : 0;
```

阅读：

```js
var readingSeen = rec.reading.good + rec.reading.hard + rec.reading.again;
var readingMastery = readingSeen
  ? (rec.reading.good + rec.reading.hard * 0.55 - rec.reading.again * 0.35) / readingSeen
  : 0;
```

保持率暂时用 `progress` 估算：

- 当前课相关卡片中，`interval >= 3` 且未到期：stable。
- 到期卡：due。
- 超期卡：overdue。

如果暂时不做 retention，先把 retention 权重转给阅读：

```text
overall = vocab * 0.40 + grammar * 0.30 + reading * 0.30
```

推进条件改为：

```js
rec.canAdvance =
  rec.overall >= 0.65 &&
  rec.blockers.length === 0 &&
  rec.reading.seen >= 2;

if (rec.canAdvance && rec.overall >= 0.75 && lesson < 50) {
  // 自动推进
}
```

说明：

- `>= 0.50` 只表示“可 preview 下一课”，不应叫 canAdvance。
- 建议拆成：
  - `canPreview`
  - `canAdvance`

验收：

- 只有词汇好、语法/阅读很差时，不应推进。
- `blockers.length > 0` 时，不应推进。
- 至少 2 张阅读卡评分前，不应推进。

---

### 0.9.5 修改计划 3：修手动课次修改同步

涉及位置：

- `bindEvents()` 中 `data-action="lesson-number"`。

当前只写：

```js
japaneseSourceProfile.currentLesson = v;
```

修法：

```js
if (v > 0 && v <= 50) {
  state.lessonProgress = state.lessonProgress || {};
  state.lessonProgress.currentLesson = v;
  state.lessonProgress.previewLesson = v + 1;
  ensureLessonRecord(v).status = "active";
  japaneseSourceProfile.currentLesson = v;
  japaneseSourceProfile.masteryEstimate = currentLessonState().mastery;
  saveState();
  render();
}
```

如果用户手动降课：

- 不删除高课次数据。
- 只把 currentLesson 切回去。
- 设置 `lastAdvanceReason = "手动切换到第 X 课"`。

验收：

- 设置页改第 15 课，关闭再打开仍显示第 15 课。
- AI prompt 中当前课也变成第 15 课。
- 右侧总览同步显示第 15 课。

---

### 0.9.6 修改计划 4：修右侧总览数据源

涉及函数：

- `renderLearningOverviewPanel(stats)`

当前问题：

```js
japaneseSourceProfile.currentLesson
japaneseSourceProfile.masteryEstimate
japaneseSourceProfile.advanceThreshold
```

修法：

```js
var cls = track.id === "japanese" ? currentLessonState() : null;
```

日语 chip 改为：

```js
lessonChips =
  '<span class="overview-chip">大家的日语 第 ' + cls.lesson + ' 课</span>' +
  '<span class="overview-chip">掌握 ' + Math.round(cls.mastery * 100) + '%</span>' +
  '<span class="overview-chip">' + (cls.canAdvance ? "可推进" : "巩固中") + '</span>';
```

下一步建议也应参考 `cls.blockers`：

```js
if (cls.blockers.length) {
  nextAdvice = "先补：" + cls.blockers.slice(0, 2).join("、");
}
```

验收：

- 设置页与右侧总览的课次、掌握度一致。
- 手动改课次后，两处同步变化。

---

### 0.9.7 修改计划 5：修 AI 出题与课次进度对齐

涉及函数：

- `generateAiCards()`
- `normalizeAiCard()`
- `normalizeReadingCard()`
- `buildDeepSeekGeneratePrompt()`
- `minnaPromptContext()`

当前状态：

- `minnaPromptContext()` 已改读 `currentLessonState()`，这是对的。
- 但 `generateAiCards()` 调 `normalizeAiCard()` 时仍传 `{ id: aiSourceId }`。
- `normalizeAiCard()` 兜底补 track，但这只是防止返回 null，不等于完整修复。

修法：

在 `generateAiCards()` 开头：

```js
var cls = currentLessonState();
var aiSource = {
  id: aiSourceId,
  track: state.activeTrack,
  signals: profile.weakTags || [],
  lesson: cls.lesson,
  lessonRange: state.activeTrack === "japanese" ? { from: 1, to: cls.lesson } : null,
  previewLesson: cls.previewLesson
};
```

直连路径：

```js
var cards = incoming.map(function(c, i) {
  return normalizeAiCard(c, aiSource, i);
}).filter(Boolean);
```

代理路径同样改。

`normalizeAiCard()` 的 base 增加：

```js
lesson: raw.lesson || log.lesson,
lessonRange: raw.lessonRange || log.lessonRange,
preview: Boolean(raw.preview),
```

tags 增加：

```js
...(log.lesson ? ["lesson-" + log.lesson] : [])
```

`normalizeReadingCard(raw)` 也保存：

```js
lesson: raw.lesson || currentLessonState().lesson,
lessonRange: raw.lessonRange || { from: 1, to: currentLessonState().lesson },
preview: Boolean(raw.preview)
```

验收：

- AI 生成的日语题 `card.lesson` 应为当前课。
- 推进到第 17 课后，新生成题 `lesson` 应变成 17。
- 未推进时，AI prompt 仍要求主要使用第 1-16 课。

---

### 0.9.8 修改计划 6：补阅读收藏词一致性

涉及函数：

- `findJpVocab(word)`
- `renderWordChip(card, sentence, word)`
- `collectSelectedJapaneseText()`
- `collectJpVocab(raw)`

当前问题：

- `findJpVocab()` 只查 `state.jpVocab`。
- `collectSelectedJapaneseText()` 写 lesson 时仍读 `japaneseSourceProfile.currentLesson`。
- `renderWordChip()` payload 里没有 sentenceIndex / lesson。

修法：

`findJpVocab()`：

```js
function findJpVocab(word) {
  var key = normalizeJapaneseWord(word);
  return (state.vocabBank || []).find(function(item) {
    return item.track === "japanese" && normalizeJapaneseWord(item.word) === key;
  }) || (state.jpVocab || []).find(function(item) {
    return normalizeJapaneseWord(item.word) === key;
  }) || null;
}
```

`renderWordChip()` payload 增加：

```js
lesson: card.lesson || currentLessonState().lesson,
sentenceIndex: index,
sourceSentence: s.text
```

注意：当前 `renderWordChip(card, s, word)` 没传 index，需要改函数签名：

```js
renderWordChip(card, s, word, index)
```

`collectSelectedJapaneseText()` 改：

```js
var cls = currentLessonState();
lesson: cls.lesson,
tags: ["selected", "minna", "lesson-" + cls.lesson]
```

验收：

- 点击阅读卡 words chip 后，词进入 `vocabBank`。
- 已收藏词 chip 变为 `.is-saved`。
- 手动选词收藏也带正确 lesson。

---

### 0.9.9 修改计划 7：补测试

当前 `node test.js` 没覆盖新模型。下一轮至少补这些测试：

1. `normalizeRatingForMastery("good") === "good"`。
2. 日语 reading 卡点 good 后，`reading.good` 增加。
3. `blockers.length > 0` 时不会自动推进。
4. 手动设置课次会同步 `lessonProgress.currentLesson`。
5. `generateAiCards()` 归一化时生成卡带 `track` 和 `lesson`。
6. `findJpVocab()` 能从 `vocabBank` 找到词。

如果不方便直接测 DOM，可把纯逻辑函数导出到 `module.exports`。

---

### 0.9.10 是否需要新的展示

结论：需要，但应放在上述 P1/P2 修完之后。

建议新增文档：

```text
IMPLEMENTATION_ACCEPTANCE_SHOWCASE.md
```

内容：

1. 当前已完成能力。
2. 当前半完成能力。
3. 验收步骤。
4. 预期截图位置。
5. 风险和下一步。

展示不应提前做成“成果展示”，否则会误导为课次推进和 AI 对齐已经稳定完成。

建议展示标题：

```text
阅读驱动学习系统验收展示：课次推进、阅读收藏、AI 出题对齐
```

---

## 0.10 第 22 次验收：第 21 次改动验收结论与新要求

补充日期：2026-07-06

本节用于验收第 21 次代码改动，并给出下一轮新要求。

---

### 0.10.1 验收范围

验收对象：

- P1 评分值映射
- P2 掌握度公式与推进条件
- P3 手动课次同步
- P4 右侧总览数据源
- P5 AI 出题 lesson 元数据
- P6 阅读收藏一致性

已运行基础检查：

```powershell
node --check app.js
node --check proxy\ai-proxy.mjs
node --check service-worker.js
node test.js
```

结果：

- `app.js` 语法检查通过。
- `proxy\ai-proxy.mjs` 语法检查通过。
- `service-worker.js` 语法检查通过。
- `node test.js` 通过，结果为 `9 passed, 0 failed`。

注意：现有 `test.js` 仍只覆盖旧纯函数，没有覆盖课次推进、AI 入库、阅读收藏和同步安全。因此基础测试通过不等于新功能完全验收通过。

---

### 0.10.2 验收结论

#### P1 评分值映射：通过

当前代码已经新增：

```js
normalizeRatingForMastery(rating)
```

并把 `good / hard / again` 映射进 `updateLessonProgressFromCard()`。

验收判断：

- 修复了上一轮“会了不会增加掌握度”的关键问题。
- 代码逻辑符合要求。

仍需补：

- 单元测试覆盖 `normalizeRatingForMastery("good")`。
- 浏览器实际点击验证。

#### P2 掌握度公式与推进条件：条件通过

当前代码已做到：

- `boundedMastery()` 夹紧到 `[0, 1]`。
- fuzzy/hard 部分加分。
- forgot/again 有惩罚。
- `overall = vocab*0.40 + grammar*0.30 + reading*0.30`。
- `maybeAdvanceLesson()` 拆出 `canPreview` 和 `canAdvance`。
- `canAdvance` 要求：
  - `overall >= 0.65`
  - `blockers.length === 0`

验收判断：

- 方向正确，可以算“第一版可用”。

仍需修：

- 注释说“要求至少读过”，但代码通过 blocker 间接实现；需要明确将 `rec.reading.seen >= 2` 写进 `canAdvance` 条件，避免未来修改 blockers 时误放行。
- 当前课推进阈值是 65%，而第 18/20 计划里曾建议 75% 才正式推进。需要用户确认：是保守 75%，还是当前 65%。
- 推进后新课 `overall` 初始为 0，`japaneseSourceProfile.masteryEstimate` 会随新课变成 0，这可能让右侧显示“第17课掌握0%”。这是合理但需要 UI 文案解释。

#### P3 手动课次同步：通过

当前 `lesson-number` 已同步写：

- `state.lessonProgress.currentLesson`
- `state.lessonProgress.previewLesson`
- `ensureLessonRecord(v)`
- `japaneseSourceProfile.currentLesson`
- `japaneseSourceProfile.masteryEstimate`

验收判断：

- 修复了“手动课次和真实模型不同步”的主要问题。

仍需补：

- 手动改课后应清理或提示当前队列可能仍是旧课题目，建议自动 `buildQueue("adaptive")` 或显示“重新开始本课练习”按钮。

#### P4 右侧总览数据源：条件通过

当前 `renderLearningOverviewPanel()` 已读取：

```js
currentLessonState()
```

并显示：

- 当前课
- 掌握度
- 可推进 / 可预览 / 巩固中
- blockers 作为下一步建议

验收判断：

- 方向正确，已不再主要依赖 `japaneseSourceProfile.masteryEstimate`。

仍需修：

- `currentLessonState()` 当前没有返回 `canPreview`，但右侧总览使用 `cls.canPreview`。因此“可预览第X课”状态可能永远不显示。应在 `currentLessonState()` 返回 `canPreview: record ? record.canPreview : false`。

#### P5 AI 出题 lesson 元数据：条件通过

当前 `generateAiCards()` 已构造：

```js
aiSource = { id, track, signals, lesson, lessonRange, previewLesson }
```

并传入：

```js
normalizeAiCard(c, aiSource, i)
```

`normalizeAiCard()` 也写入：

- `lesson`
- `lessonRange`
- `preview`
- `lesson-N` tag

验收判断：

- 普通 AI 出题入库 bug 已基本修复。
- 生成题已能携带当前课次元数据。

仍需修：

- `base.preview = true` 当前只要 `log.previewLesson` 存在就会为 true，导致所有当前课 AI 题都被标记 preview。应改为：

```js
base.preview = Boolean(raw.preview);
```

或：

```js
base.preview = Number(raw.lesson) > Number(log.lesson);
```

- `type === "reading"` 时会调用 `normalizeReadingCard(raw)`，然后返回 `{ ...card, id, aiSourceLogId, sourceLogId }`，可能丢掉 `base.lesson / base.lessonRange / base.preview / lesson-N tag`。应把这些字段也 merge 回 reading card。

#### P6 阅读收藏一致性：条件通过

当前已做到：

- `findJpVocab()` 优先查 `vocabBank`，再回退 `jpVocab`。
- `renderWordChip()` payload 增加 `sentenceIndex`、`lesson`、`sourceSentence`。
- 点击 words chip 后可以写入收藏。

仍需修：

- `collectSelectedJapaneseText()` 当前仍使用 `japaneseSourceProfile.currentLesson`，与第 21 次日志声称“使用 currentLessonState().lesson”不完全一致。应改为 `var cls = currentLessonState()`。
- `collectJpVocab()` 新建 `newItem` 时没有保存 `lesson` 和 `sentenceIndex` 字段，`vocabBank` 也没保存它们。payload 传了但落库丢失。
- 更新 existing 时也没有补 `lesson/sentenceIndex`。

---

### 0.10.3 新要求：第 22 次代码修改目标

第 22 次修改不再扩功能，先补齐第 21 次的验收缺口。

#### 要求 1：补齐 `currentLessonState().canPreview`

修改：

```js
return {
  ...
  canPreview: record ? record.canPreview : false,
  canAdvance: record ? record.canAdvance : false,
  ...
}
```

验收：

- 掌握度 50%-65% 时，右侧总览显示“可预览第X课”。

#### 要求 2：明确推进条件中的阅读量要求

修改：

```js
rec.canAdvance =
  rec.overall >= 0.65 &&
  rec.blockers.length === 0 &&
  rec.reading.seen >= 2;
```

验收：

- 阅读不足 2 篇时，即使 overall 高，也不能自动推进。

#### 要求 3：修 AI preview 标记

修改：

```js
if (raw.preview !== undefined) {
  base.preview = Boolean(raw.preview);
} else if (raw.lesson && log.lesson) {
  base.preview = Number(raw.lesson) > Number(log.lesson);
}
```

不要因为存在 `previewLesson` 就把所有题标为 preview。

验收：

- 当前课题 `preview === false` 或不写。
- 下一课 preview 题才 `preview === true`。

#### 要求 4：reading 类型 AI 卡保留 lesson 元数据

修改：

```js
if (type === "reading") {
  const card = normalizeReadingCard(raw);
  return {
    ...card,
    id: base.id,
    aiSourceLogId: base.aiSourceLogId,
    sourceLogId: base.sourceLogId,
    lesson: base.lesson,
    lessonRange: base.lessonRange,
    preview: base.preview,
    tags: [...new Set([...(card.tags || []), ...(base.tags || [])])]
  };
}
```

验收：

- AI reading 卡带 `lesson`。
- 阅读卡进入课次掌握模型时能归因到正确课次。

#### 要求 5：选中文本收藏保存 lesson/sentenceIndex

修改：

- `collectSelectedJapaneseText()` 改用 `currentLessonState().lesson`。
- `collectJpVocab()` 新建和更新时保存：
  - `lesson`
  - `sentenceIndex`
- 同步写入 `vocabBank`。

验收：

- 手动选词收藏后，`vocabBank` 对应词条有 `lesson` 和 `sentenceIndex`。

#### 要求 6：补最小测试

需要导出或可测试这些纯逻辑：

- `normalizeRatingForMastery`
- `boundedMastery`
- `recalcLessonMastery`
- `normalizeAiCard`

新增测试：

1. `normalizeRatingForMastery("good") === "good"`。
2. good 会提高 reading mastery。
3. reading.seen < 2 时不能推进。
4. `normalizeAiCard()` 生成普通卡时带 `lesson`。
5. `normalizeAiCard()` 生成 reading 卡时也保留 `lesson`。
6. `findJpVocab()` 能从 `vocabBank` 找词。

#### 要求 7：更新验收展示

第 22 次代码修完后，再新增：

```text
IMPLEMENTATION_ACCEPTANCE_SHOWCASE.md
```

展示内容：

- 教材与进度掌握度变化链路。
- “会了/模糊/忘了”三种评分对 mastery 的影响。
- AI 出题如何带 lesson。
- 阅读收藏词如何写入 vocabBank。
- 当前未完成项：focusPlans、同步安全层。

---

### 0.10.4 是否通过本轮验收

结论：第 21 次改动“方向通过，代码条件通过”，但不建议作为最终展示版本。

可验收项：

- P1 评分映射主 bug 已修。
- P3 手动课次同步主 bug 已修。
- P4 总览改读真实课次方向已修。
- P5 普通 AI 出题显式传参已修。
- P6 `findJpVocab()` 优先查 `vocabBank` 已修。

需第 22 次补齐后再展示：

- `canPreview` 返回缺失。
- AI reading 卡 lesson 元数据可能丢失。
- preview 标记过宽。
- 手动选词收藏 lesson/sentenceIndex 未落库。
- 新功能没有测试覆盖。

---

## 1. 本次检查结果

### 1.1 基础测试

已运行：

```powershell
node --check app.js
node --check proxy\ai-proxy.mjs
node --check service-worker.js
node test.js
```

结果：

- `app.js` 语法检查通过。
- `proxy\ai-proxy.mjs` 语法检查通过。
- `service-worker.js` 语法检查通过。
- `node test.js` 通过，结果为 `9 passed, 0 failed`。

结论：当前没有基础语法错误，已有逻辑测试仍然通过。

---

## 2. 已完成并确认的部分

### 2.1 设置窗口已经建立

当前代码已经有：

- `settingsOpen`
- `settingsSection`
- `renderSettingsWindow()`
- 设置图标按钮 `data-action="open-settings"`
- 设置窗口分区：
  - AI 与模型
  - 数据同步
  - 教材与进度
  - 数据管理
  - 自定义题
  - 隐私安全

说明：已经不是“完全没有设置窗口”的状态。

### 2.2 右侧栏已部分瘦身

`render()` 中的右侧 `side-stack` 已经不再直接挂：

- `renderSyncPanel()`
- `renderCustomPanel()`

这两类内容已迁入设置窗口。

当前右侧仍有：

```js
${state.activeView === "progress" ? renderN1PlanPanel() : ""}
${renderVocabPanel()}
${renderGrammarPanel()}
${renderAiPanel()}
${renderDiagnosisPanel()}
${renderStatsPanel(stats)}
${renderProfilePanel()}
${renderWeakPanel()}
${renderHistoryPanel()}
```

### 2.3 AI 出题按钮已不再被今日记录禁用

`renderAiPanel()` 里已经改成：

```js
<button class="plain-button primary full-button" data-action="ai-generate">
  按教材进度与错题生成练习
</button>
```

说明：此前“请先保存今日记录”导致按钮禁用的问题已经修复。

### 2.4 grammarCatalog 已经出现

当前代码已经有：

- `const grammarCatalog = [...]`
- `buildGrammarCardsFromBank()`
- `makeGrammarCard()`

`buildGrammarCardsFromBank()` 现在采用：

1. 先加入 `grammarBank` 中的弱项语法。
2. 再从 `grammarCatalog` 穷举补齐语法题。

说明：此前“语法题完全不从 grammarCatalog 出”的问题已经推进了一步。

### 2.5 阅读选中文本收藏已有基础入口

当前代码已有：

- 阅读工具栏按钮：`data-action="collect-selection"`
- `collectSelectedJapaneseText()`
- README 也提到“可以手动选中文本后点收藏选中文本”

说明：不是从零开始，但交互仍需要增强。

---

## 3. 当前仍存在的问题

### 问题 1：设置窗口部分控件没有事件绑定

设置窗口已经做出来了，但新控件使用了新的 `data-action` 名称，其中一部分没有对应事件处理。

补充检查结论：

- 设置窗口本身已经存在，但桌面端很可能看不到入口。
- 原因是设置图标目前放在底部 `tabbar`，而 `styles.css` 中 `.tabbar` 默认 `display: none`。
- `.tabbar` 只在 `@media (max-width: 980px)` 下显示，也就是移动端/窄屏才显示。
- 因此电脑宽屏打开时，看不到设置图标，也就无法打开设置窗口。
- 这不是用户一定打开错连接，而是当前桌面端 UI 入口设计不完整。

必须修复：

- 桌面端也要有明确的设置入口。
- 建议在顶部栏右侧或侧边栏底部增加齿轮按钮。
- 移动端继续保留底部设置按钮。
- 不建议为了桌面显示设置而强行显示完整底部 tabbar；桌面端更适合顶部图标或侧栏图标。

已发现的未绑定或疑似未绑定 action：

- `ai-proxy-url`
- `git-token`
- `git-filename`
- `git-auto`
- `git-create`
- `git-pull`
- `git-push`
- `export-backup`
- `copy-backup`
- `download-backup`
- `import-backup`
- `clear-cache`
- `lesson-number`
- `lesson-mastery`

当前旧事件绑定仍在监听：

- `ai-url`
- `github-token`
- `github-gist-id`
- `github-filename`
- `github-auto`
- `create-gist`
- `pull-github`
- `push-github`
- `export-data`
- `copy-data`
- `download-data`
- `import-data`

风险：

- 设置窗口看起来存在，但某些输入和按钮可能没有实际效果。
- 特别是本地代理地址、GitHub Token、GitHub 同步、备份导入导出、教材课次设置这些功能需要优先验证和补绑定。

### 问题 2：练习页右侧 AI 面板仍有设置项

虽然设置窗口已建立，但 `renderAiPanel()` 右侧仍显示：

- 出题来源
- 解析来源
- 本地代理地址

这些属于设置项，应移入设置窗口，不应继续堆在练习页右侧。

练习页 AI 面板建议只保留：

- 当前教材约束摘要
- 生成练习按钮
- 最近 AI 状态
- 必要的轻提示

### 问题 3：N1 已从任务入口收敛，但进度页仍然显眼

当前状态：

- `jp-n1-plan` 已从模块入口移除。
- 但 `renderN1PlanPanel()` 仍在 `progress` 视图显示。
- 面板内仍有：
  - “今日 N1 闭环”
  - “N1 年度路线”
  - “通勤时做选择/听读”

这仍然和最新定位冲突。

新定位：

- N1 是后台长期目标。
- 显性主线应是《大家的日语》滚雪球进度。
- 若保留 N1，只能作为“长期目标说明”小块，不要显示成今日路线或主要进度。

### 问题 4：旧通勤和今日记录 dead code 仍然存在

仍可搜索到：

- `commuteSegments`
- `renderCommutePanel()`
- `buildCommuteQueue()`
- `dailyLogs`
- `renderDailyPanel()`
- `handleDailySubmit()`
- `buildDailyCards()`
- `buildDailyReadingCard()`

其中部分可能已经不再调用，但继续存在会造成：

- 后续维护误判。
- 文案回流。
- AI prompt 或诊断逻辑继续读取旧 `dailyLogs`。

### 问题 5：README 仍有旧通勤文案

README 中仍可搜索到：

- “通勤时手机直接练”

需要改成：

- “电脑端生成题并同步到手机，手机端直接练习，不需要接触模型密钥。”

不要再提通勤模式。

### 问题 6：阅读选词收藏还不够自然

当前已有按钮，但仍待优化：

- 没有选区浮动按钮。
- 手机端没有专门的底部选区收藏体验。
- 收藏时 `sentence` 仍可能是整篇阅读文本，不一定是选区所在句。
- 没有保存 `lesson`、`sentenceIndex`。

下一步应从“能用”提升到“顺手”。

### 问题 7：grammarCatalog 已实现，但还需要验证题目质量

当前 `grammarCatalog` 已出现，但仍需检查：

- 是否覆盖第 1-16 课足够完整。
- 选项是否有误导性但不过分离谱。
- “模糊/不会”是否能真正写入 `grammarBank`。
- `grammarBank` 弱项是否在下一轮语法题中优先出现。

---

## 4. 下一轮修改计划

### 第一优先级：修复设置窗口事件绑定

需要统一新旧 action 命名。

建议方案：优先保留新设置窗口中的 action 名，并在 `bindEvents()` / `handleAction()` 中补齐处理。

需要补齐：

- `ai-proxy-url`：更新 `state.aiProxyUrl`
- `git-token`：更新 `state.gitSync.token`
- `git-filename`：更新 `state.gitSync.filename`
- `git-auto`：更新 `state.gitSync.auto`
- `git-create`：调用创建 Gist 逻辑
- `git-pull`：调用云端拉取逻辑
- `git-push`：调用上传本机逻辑
- `export-backup`：调用导出备份逻辑
- `copy-backup`：调用复制备份逻辑
- `download-backup`：调用下载备份逻辑
- `import-backup`：调用导入并合并逻辑
- `clear-cache`：清理缓存或刷新 service worker
- `lesson-number`：更新当前课次
- `lesson-mastery`：更新掌握估计

同时删除或停止使用旧设置面板动作：

- `github-token`
- `github-gist-id`
- `github-filename`
- `github-auto`
- `create-gist`
- `pull-github`
- `push-github`
- `export-data`
- `copy-data`
- `download-data`
- `import-data`

### 第二优先级：练习页右侧 AI 面板瘦身

从 `renderAiPanel()` 移除：

- 出题来源 select
- 解析来源 select
- 本地代理地址 input

保留：

- 面板标题
- 简短说明
- “按教材进度与错题生成练习”按钮
- 当前 AI 消息
- 一个“打开设置”小按钮，可直接打开设置窗口的 AI 分区

建议按钮：

```html
<button class="plain-button" data-action="open-settings-section" data-section="ai">
  AI 设置
</button>
```

同时新增桌面端设置入口：

```html
<button class="icon-button" data-action="open-settings-section" data-section="ai" title="设置">⚙</button>
```

建议放置位置：

- `topbar` 右侧，与开始按钮/今日完成分区同一层。
- 或者侧边栏底部，作为固定的设置按钮。

要求：

- 桌面端打开页面后，一眼能看到设置入口。
- 点击后进入同一个 `renderSettingsWindow()` 模态窗口。
- 如果带 `data-section`，直接打开对应设置分区。

### 第三优先级：N1 面板收敛为后台长期目标

处理方式：

- 移除“今日 N1 闭环”。
- 删除“通勤时做选择/听读”。
- 将 `renderN1PlanPanel()` 改成小型长期目标说明，或改名为 `renderLongTermGoalPanel()`。
- 进度页主面板改为：
  - 大家的日语当前课次
  - 第 1-16 课掌握度
  - 是否满足推进第 17 课条件
  - 本周滚雪球策略

N1 只保留一句：

```text
长期目标：一年内向 JLPT N1 推进；当前主线先巩固《大家的日语》第 1-16 课。
```

### 第四优先级：清理旧通勤/今日记录 dead code

删除或隔离：

- `commuteSegments`
- `eveningSegments`
- `renderCommutePanel()`
- `buildCommuteQueue()`
- `buildCommuteSmartQueue()`
- `currentCommuteSegments()`
- `getCommuteSegment()`
- `renderDailyPanel()`
- `handleDailySubmit()`
- `buildDailyCards()`
- `buildDailyReadingCard()`
- `dailyChecklist()`

保留兼容：

- 导入旧数据时可以忽略 `dailyLogs`，不要让它参与新算法。

### 第五优先级：阅读选词收藏增强

实现：

- 每个阅读句子带 `data-sentence-index`。
- 选中文本时识别所在句子。
- 收藏时保存：
  - `word`
  - `sourceSentence`
  - `sourceCardId`
  - `sentenceIndex`
  - `lesson`
  - `tags`
- 桌面端增加浮动“收藏选中词语”按钮。
- 手机端保留工具栏按钮，但文案和提示更明确。

### 第六优先级：grammarCatalog 题目质量与弱项流转验证

验证：

- 语法题任务下，即使 `grammarBank` 为空，也能从 `grammarCatalog` 出题。
- 回答“模糊/不会”后，语法点进入 `grammarBank`。
- 下一轮语法题优先出现该弱项。
- “会了”只更新掌握度，不误加入弱项银行。

---

## 5. 验证清单

### 5.1 命令检查

```powershell
node --check app.js
node --check proxy\ai-proxy.mjs
node --check service-worker.js
node test.js
```

### 5.2 搜索检查

```powershell
rg -n "请先保存今日记录|通勤模式|commute|renderCommute|buildCommute|renderDaily|handleDaily|buildDaily" app.js README.md styles.css
rg -n "ai-proxy-url|git-token|git-create|export-backup|lesson-number" app.js
rg -n "github-token|create-gist|export-data|import-data" app.js
```

预期：

- 第一条不应在运行路径和 README 中出现。
- 第二条应有完整事件绑定。
- 第三条若保留，应能解释为 legacy；最好逐步清理。

### 5.3 浏览器手动检查

- 点击设置图标，设置窗口打开。
- 在设置窗口中修改 DeepSeek Key、本地代理、GitHub Token 后能保存。
- GitHub 创建/拉取/上传按钮有效。
- 备份生成/复制/下载/导入有效。
- 练习页右侧不再显示模型来源和代理地址配置。
- AI 出题按钮不要求今日记录。
- 进度页不再显示“今日 N1 闭环”。
- README 不再出现通勤模式文案。
- 语法题能从完整目录出题。
- 标记模糊/不会后进入弱项语法。

---

## 6. 下一轮交付标准

下一轮至少完成：

- 设置窗口所有控件可用。
- 练习页右侧 AI 面板不再承载设置项。
- N1 面板收敛为后台长期目标。
- README 旧通勤文案清理。
- dead code 清理至少完成通勤模块。
- 基础测试全部通过。

---

## 7. 第 23 次验收：第 22 次代码改动结论与新要求

日期：2026-07-06

### 7.1 验收结论

第 22 次代码改动“条件通过”。

已通过命令检查：

```powershell
node --check app.js
node --check proxy\ai-proxy.mjs
node --check service-worker.js
node test.js
```

结果：

- `app.js` 语法检查通过。
- `proxy/ai-proxy.mjs` 语法检查通过。
- `service-worker.js` 语法检查通过。
- `test.js`：19 passed, 0 failed。

当前可以认可的完成项：

- `currentLessonState()` 已返回 `canPreview/canAdvance`，右侧总览可读取真实课次状态。
- `maybeAdvanceLesson()` 已显式要求 `reading.seen >= 2` 才能推进。
- `generateAiCards()` 已显式构造 `aiSource`，AI 生成题与当前教材课次齐平。
- `normalizeAiCard()` 已修正 preview 标记，不再因存在 `previewLesson` 就把当前课题标为 preview。
- reading 类型 AI 卡在代码路径上会合并 `lesson/lessonRange/preview/tags`。
- 点击词块和选中文本收藏已经写入 `lesson/sentenceIndex`，并同步到 `jpVocab/vocabBank`。
- 主界面右侧当前只渲染学习总览；AI、同步、教材进度、数据管理等配置项已进入设置窗口。旧 `renderAiPanel()` 等函数仍存在，但未被主界面调用。

### 7.2 本轮仍不建议写展示文档的原因

暂不创建 `IMPLEMENTATION_ACCEPTANCE_SHOWCASE.md`。

原因：

- 现有 `test.js` 中“normalizeAiCard 生成 reading 卡保留 lesson”这个测试名容易误导；测试体实际使用的是 `type: "input"`，并没有真正覆盖 reading 路径。
- `findJpVocab` 测试目前没有稳定注入 `state.vocabBank/jpVocab` 的夹具，主要验证“不抛错”，不足以证明优先查 `vocabBank`。
- 尚未做浏览器交互验收：设置窗口、右侧总览、阅读词块点击收藏、选中文本收藏、AI reading 卡入库这些都需要在页面中跑一遍。
- `focusPlans` 针对性练习方案和同步安全层仍未实现。

因此当前状态是“代码基础验收通过，交互展示暂缓”。

### 7.3 新要求：第 23 次小修与验收目标

第 23 次先做小修和验收，不扩展大功能。

#### 要求 1：补齐课次状态默认字段

修改点：

- `ensureLessonRecord()` 新建记录时加入 `canPreview: false`。
- `currentLessonState()` 返回时使用布尔兜底：

```js
canPreview: record ? Boolean(record.canPreview) : false,
canAdvance: record ? Boolean(record.canAdvance) : false
```

验收：

- 新用户或新课次记录没有练习数据时，`cls.canPreview` 和 `cls.canAdvance` 都是明确的 `false`。
- 右侧总览不出现 undefined 状态。

#### 要求 2：补真正的 reading AI 卡单元测试

当前测试名覆盖 reading，但实际没有走 reading 路径，需要改成真实 reading 输入。

测试样例：

```js
const raw = {
  type: "reading",
  prompt: "阅读短文：第16课复习",
  lesson: 16,
  sentences: [
    {
      jp: "わたしは駅で友だちを待っています。",
      kana: "わたしはえきでともだちをまっています。",
      zh: "我正在车站等朋友。",
      grammar: ["て形 + います=正在做某事"],
      words: [
        { text: "駅", reading: "えき", meaning: "车站", tags: ["lesson-16"] }
      ]
    }
  ]
};
const aiSrc = { id: "ai-reading-test", track: "japanese", lesson: 16, lessonRange: { from: 1, to: 16 }, signals: [] };
const card = normalizeAiCard(raw, aiSrc, 0);
```

验收：

- `card.type === "reading"`。
- `card.lesson === 16`。
- `card.lessonRange.to === 16`。
- `card.preview` 不是 true。
- `card.tags` 包含 `lesson-16`。
- `card.sentences[0].words[0].text === "駅"`。

#### 要求 3：补 `findJpVocab()` 的真实数据测试

当前 `findJpVocab()` 依赖模块内部 `state`，测试不容易注入数据。二选一：

- 推荐：抽出纯函数 `findJpVocabIn(vocabBank, jpVocab, word)`，`findJpVocab(word)` 内部调用它。
- 或者：导出测试专用状态注入函数，例如 `__setTestStateForVocab()`。

推荐第一种。

验收：

- 当 `vocabBank` 和 `jpVocab` 都有同一个词时，返回 `vocabBank` 里的条目。
- 当 `vocabBank` 没有、`jpVocab` 有时，能回退返回旧条目。
- 不存在时返回 `null`。

#### 要求 4：浏览器交互验收

第 23 次必须补一轮页面验收。

验收步骤：

1. 启动本地页面，打开练习主界面。
2. 点击右侧或顶部设置图标，确认设置窗口打开。
3. 设置窗口切到 AI 与模型、数据同步、教材与进度，确认配置项不再堆在右侧。
4. 日语阅读卡中点击已有词块，确认词进入生词库，且保存 `lesson/sourceSentence/sourceCardId/sentenceIndex`。
5. 选中文本后点击“收藏选中文本”，确认同样保存 `lesson/sourceSentence/sourceCardId/sentenceIndex`。
6. 对日语阅读卡点击“会了/模糊/忘了”，确认设置页教材掌握度与右侧总览同步变化。
7. 构造或生成一张 reading AI 卡，确认入库后带 `lesson/lessonRange/tags`。

验收后再写：

```text
IMPLEMENTATION_ACCEPTANCE_SHOWCASE.md
```

展示文档必须包含：

- 命令检查结果。
- 浏览器验收步骤与结果。
- 当前已实现功能。
- 暂未实现项：`focusPlans`、同步安全层、旧 dead code 清理。

#### 要求 5：阅读词块数据必须稳定产生

当前“点击词块收藏”依赖每个句子的 `words` 数组。若 AI 或教材短文没有 `words`，页面只能退化成选中文本收藏。

第 23 次至少要保证：

- `buildReadingPassagePrompt()` 继续强制要求每句返回 `words`。
- `normalizeReadingCard()` 保留每句 `words`。
- 示例/教材整理出的 reading 卡也应逐句带 `words`。

第 24 次可再做增强：

- 当句子没有 `words` 时，用 `vocabBank/minna` 词库做一次简单匹配，自动生成可点击词块。

#### 要求 6：下一轮功能优先级

第 23 次只做小修、测试、浏览器验收和展示文档。

通过后，第 24 次再进入功能扩展：

1. `focusPlans`：把诊断弱项变成可追踪的周计划，不再只生成一次性诊断题。
2. 同步安全层：加入 `meta.deviceId/revision/updatedAt`、导入预览、恢复点、同步期间本地变更保护。
3. 清理旧代码：`renderAiPanel()`、旧同步面板、通勤/今日记录遗留路径。
