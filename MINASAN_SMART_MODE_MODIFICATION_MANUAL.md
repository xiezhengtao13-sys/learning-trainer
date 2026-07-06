# 大家的日语资料接入与智能模式界面重构修改手册

编写日期：2026-07-06

适用项目：`D:\codex\学习程序`

参考资料目录：`D:\codex\学习程序\minasang`

当前学习基线：
- 教材：大家的日语
- 当前教学进度：第 16 课
- 当前掌握程度：约 40%
- 日语目标：以当前基础为起点，逐步走向 JLPT N1，但现阶段必须先把第 1-16 课的句型、动词变形、助词和基础词汇打牢
- 推进原则：学习进度不能固定停在第 16 课；系统要随着词汇、语法、阅读掌握度提升，逐步推进到第 17 课及后续课次，同时保留必要回炉复习。

---

## 0. 本手册用途

本手册用于下一轮修改，不要求立刻一次性完成全部代码。

核心方向：
- 日语学习以“短文阅读 + 逐句解析”为主入口。
- 日语界面主功能只保留三项：短文阅读、词汇题、语法题。
- 英语做类似收敛，但只保留阅读词汇和词汇题，不新增英语语法题。
- N1 路线不作为主界面功能存在。它只作为长期目标和后台约束：决定最终方向、难度上限和桥接说明，不再单独占一个入口。
- 删除今日记录功能。
- 删除通勤模式。
- 删除旧的模式选择，仅保留“智能模式”。智能算法以后可以继续迭代，但用户界面不再展示“今日到期、弱项加练、混合挑战”等模式按钮。
- 使用 `minasang` 里的《大家的日语》资料作为日语短文、句型、语法点和词库的基础来源。
- 随着掌握度提升自动推进教材进度：低掌握度时优先巩固当前课和前置课，高掌握度时开放下一课词汇、句型和短文。
- 建立每周滚动更新机制：每周根据上周学习数据调整下周策略，详见 `WEEKLY_UPDATE_PLAN.md`。

重要要求：
- 每次正式改代码前，先在 `UPDATE_LOG_MANUAL.md` 追加新的修改记录。
- 每次正式改代码后，继续补充 `UPDATE_LOG_MANUAL.md`，写清楚改了什么、哪些未完成、测试结果、下一步建议。
- `UPDATE_LOG_MANUAL.md` 必须以 UTF-8 保存。后续 Codex 可以直接读取这份日志手册，判断当前实现状态并提出调整意见。
- 每周学习策略调整写入 `WEEKLY_UPDATE_PLAN.md`。这份计划不是一次性文档，而是每周复盘和推进课次的工作台。

滚雪球更新方式：
- 日常更新由程序自动完成：答题、短文评分、收藏词、标记模糊/不会，都会改变掌握度和下一轮智能推荐。
- 每周更新是策略复盘：总结上周数据，决定是否推进课次、调整短文/词汇/语法比例、补哪些教材索引。
- 不要求用户每周必须找 agent。理想实现是在设置或进度页提供“生成本周策略”按钮；agent 只是你想要外部检查、修改代码或重写策略时使用。
- 如果暂时没有自动周报功能，可以每周把 `WEEKLY_UPDATE_PLAN.md` 和 `UPDATE_LOG_MANUAL.md` 给 Codex 看，由 Codex 辅助更新。

---

## 1. 本次检查结论

### 1.1 基础测试结果

本次检查已运行：

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

说明：当前代码没有明显语法错误，已有基础测试仍然通过。

### 1.2 已完成的阅读驱动基础

根据 `UPDATE_LOG_MANUAL.md` 和代码检查，当前已经有以下基础：

- 日语模块已改为：
  - `jp-reading`
  - `jp-vocab`
  - `jp-grammar`
  - `jp-n1-plan`
- 英语模块已改为：
  - `en-reading`
  - `en-vocab`
  - `en-civil`
  - `en-ai`
  - `en-ielts`
- 已有 `vocabBank`，用于统一日语/英语生词。
- 已有 `grammarBank`，用于日语语法点收藏。
- 日语阅读卡已有逐句解析、词语收藏、语法点收藏和 AI 对话雏形。
- 智能推荐已经开始按阅读、单词、语法进行权重分桶。

这些是下一步继续推进的基础，不要推倒重来。

### 1.2.1 N1 路线的重新定位

用户反馈：N1 路线现在存在意义不明。

后续处理：

- 不再把 N1 路线作为主界面模块或任务入口。
- 不显示独立的 `jp-n1-plan` 入口，除非未来有非常明确的考试冲刺页需求。
- N1 只保留为后台长期目标：
  - 决定一年后的目标方向。
  - 限制 AI 解释时可以补一句“N1 里以后会遇到什么”。
  - 在掌握度足够后，逐步提高阅读抽象度。
  - 不影响当前第 1-16 课的主线推进。
- 当前阶段的显性主线是《大家的日语》滚雪球学习，不是 N1 路线图。

一句话原则：N1 是远处的灯塔，不是现在每天要点的按钮。

### 1.3 仍然不符合本轮目标的残留

以下内容还需要删除或合并。

`app.js` 中仍有模式选择：

- `render()` 中仍渲染“模式”区块，包含今日到期、智能推荐、弱项加练、混合挑战。
- 相关位置大约在 `app.js` 第 3727-3735 行。
- 事件处理仍支持 `action === "mode"`。
- 相关位置大约在 `app.js` 第 5125-5128 行。

`app.js` 中仍有通勤模式：

- 仍定义 `commuteSegments` 和 `eveningSegments`。
- `render()` 中仍调用 `renderCommutePanel()`。
- 相关位置大约在 `app.js` 第 3754 行。
- `renderCommutePanel()` 和 `renderCommuteButton()` 仍存在。
- 相关位置大约在 `app.js` 第 3828-3861 行。
- 仍有 `buildCommuteQueue()`、`buildCommuteSmartQueue()`。
- 相关位置大约在 `app.js` 第 3208-3260 行。
- 事件处理仍支持 `commute-dir`、`commute-segment`、`commute-start`。
- 相关位置大约在 `app.js` 第 5140-5157 行。

`app.js` 中仍有今日记录：

- `render()` 中仍调用 `renderDailyPanel()`。
- 相关位置大约在 `app.js` 第 3758 行。
- `renderTabbar()` 仍有“今日”标签。
- 相关位置大约在 `app.js` 第 3782-3789 行。
- `renderDailyPanel()` 仍存在。
- 相关位置大约在 `app.js` 第 4717-4767 行。
- `handleDailySubmit()`、`buildDailyCards()`、`buildDailyReadingCard()` 等逻辑仍依赖 `dailyLogs`。

`defaultState()` 中仍有旧状态字段：

- `mode: "due"`
- `dailyGoal`
- `activeCommuteSegment`
- `commuteDirection`
- `dailyLogs`

相关位置大约在 `app.js` 第 2896-2919 行。

文档中仍有旧功能描述：

- `README.md` 仍描述今日记录、通勤路线、四种模式、今日闭环。
- 后续完成界面收敛后必须同步删除或重写。

---

## 2. 《大家的日语》资料检查结论

`minasang` 目录当前有两份 PDF：

- `minasang\本册.pdf`
  - 页数：649 页
  - 抽样结果：属于扫描/图片型 PDF，直接文本抽取基本为空。
  - 抽样页面显示有教材使用说明、练习页、插图题、课文结构。
- `minasang\文法.pdf`
  - 页数：107 页
  - 抽样结果：属于扫描/图片型 PDF，直接文本抽取基本为空。
  - 抽样页面显示有 sentence patterns、example sentences、conversation、useful words and information 等内容。

结论：
- 不能直接靠 `pypdf.extract_text()` 自动导入。
- 必须先做 OCR 或人工标注页码索引。
- PDF 清晰度足够，适合后续用 OCR 建立本地索引。
- 不建议把整本教材内容硬编码进 `app.js`。
- 推荐建立“教材索引 + 派生练习”的结构：程序读取本地索引，AI 根据课次、句型和词库生成原创短文和题目。

版权和维护注意：
- 教材 PDF 只作为本地个人学习资料使用。
- 不要把完整教材文本、大段课文或整页 OCR 结果写进公开仓库。
- 可以保存必要的本地索引、页码、课次、语法点、短词条和自己生成的练习数据。
- 如果项目以后公开发布，`minasang` 原始 PDF 和完整 OCR 文本应放进 `.gitignore` 或仅保留在本机。

---

## 3. 新界面目标

### 3.1 总体入口

主界面不再围绕“模式”切换，而是围绕“学习任务”切换。

日语显示三项：

1. 短文阅读
2. 词汇题
3. 语法题

英语显示两项：

1. 短文阅读
2. 词汇题

英语不显示语法题入口，避免和当前目标冲突。

如果为了布局统一，也可以保留第三个位置，但应显示为不可点击的“语法题：日语专用”，不进入英语题库。

### 3.2 删除旧模式区

删除或隐藏这些可见模式：

- 今日到期
- 智能推荐
- 弱项加练
- 混合挑战
- 当前模式
- 通勤模式

用户不再手动选择模式。

内部可以继续使用 `adaptive` 或 `smart` 作为算法名称，但 UI 只呈现“智能模式”。

建议将状态字段改成：

```js
smartMode: {
  version: "2026-07-minna-v1",
  activeTask: "reading", // reading | vocab | grammar
  sessionSize: 12
}
```

或更简单地保留：

```js
activeTask: "reading"
smartAlgorithmVersion: "2026-07-minna-v1"
```

不要再让用户看到 `due`、`weak`、`mix`、`commute` 这些旧模式。

### 3.3 推荐的第一屏结构

第一屏应直接进入学习，不要像设置页或仪表盘。

建议结构：

- 顶部：
  - 当前科目：日语
  - 教材进度：大家的日语 第 16 课
  - 掌握估计：40%
  - 当前算法：智能模式
- 主任务切换：
  - 短文阅读
  - 词汇题
  - 语法题
- 主区域：
  - 当前任务内容
- 右侧或下方：
  - 生词/语法收藏摘要
  - AI 追问
  - 学习反馈按钮：会了、模糊、忘了

移动端：
- 顶部只保留科目切换和任务切换。
- 短文阅读优先占满屏幕。
- 生词、语法、AI 追问可以折叠。

### 3.4 新设置界面

所有“配置型”内容都应从练习主界面移走，集中放进新的设置界面。

设置界面建议保留为底部导航中的“设置”，但内部重新整理为分组，而不是把同步、AI、教材、导入导出混在练习页侧栏。

设置页分组建议：

1. AI 与模型
   - DeepSeek API Key
   - 本地代理地址
   - 本地模型名称
   - DeepSeek API / 本地 DeepSeek 8B 切换
   - 连接测试

2. 数据同步
   - GitHub Gist Token
   - Gist ID
   - 自动同步开关
   - 立即上传
   - 立即下载

3. 教材与进度
   - 当前教材：大家的日语
   - 当前课次：第 16 课
   - 掌握估计：40%
   - 是否允许自动推进课次
   - 每周复盘日
   - Minna 资料目录状态

4. 数据管理
   - 导出备份
   - 导入备份
   - 清理缓存
   - 重建教材索引

5. 隐私与安全
   - 说明 API Key 只存在本地浏览器
   - 说明教材 PDF 不上传
   - 说明备份中不包含敏感字段

练习页不应再出现这些配置：

- DeepSeek Key 输入框
- Gist Token 输入框
- 代理地址配置
- 导入/导出大文本框
- 教材目录说明长文

练习页只保留和当下学习直接相关的内容：

- 短文阅读
- 词汇题
- 语法题
- 收藏摘要
- AI 追问

---

## 4. 《大家的日语》资料接入方案

### 4.1 新增资料配置

建议新增一个教材配置对象，不要散落在多个函数里。

建议文件：

- `app.js` 内部先放轻量配置，方便快速开发。
- 后续可拆到 `data/minna.js` 或 `data/minna-index.json`。

建议结构：

```js
const japaneseSourceProfile = {
  textbook: "minna-no-nihongo",
  displayName: "大家的日语",
  sourceDir: "minasang",
  currentLesson: 16,
  masteryEstimate: 0.4,
  activeLessons: { from: 1, to: 16 },
  previewLessons: { from: 17, to: 25 },
  primaryPdf: "minasang/本册.pdf",
  grammarPdf: "minasang/文法.pdf"
};
```

用途：
- AI 生成短文时知道只能主要使用第 1-16 课范围。
- 智能算法知道当前基础不稳，不能突然跳太多 N1 表达。
- UI 显示当前教材进度。
- 词库和语法库可以按 lesson 加权。

### 4.2 建立 OCR/人工索引流程

由于 PDF 直接文本抽取为空，推荐先建立本地索引。

建议新增目录：

```text
data/
  minna/
    minna-index.example.json
    minna-index.local.json
    minna-vocab.local.json
    minna-grammar.local.json
```

建议 `.gitignore` 增加：

```gitignore
data/minna/*.local.json
minasang/*.pdf
```

说明：
- `*.example.json` 可以放少量示例结构，允许提交。
- `*.local.json` 保存用户本机 OCR/整理后的教材索引，不提交。
- PDF 不建议提交。

### 4.3 教材页索引结构

建议索引格式：

```json
{
  "source": "minna-no-nihongo",
  "version": "local-2026-07",
  "lessons": [
    {
      "lesson": 16,
      "status": "active",
      "masteryEstimate": 0.4,
      "pages": [
        {
          "pdf": "本册.pdf",
          "page": 160,
          "sectionType": "exercise",
          "title": "问题",
          "ocrStatus": "pending",
          "notes": "练习页，可用于词汇和句型变体题"
        }
      ]
    }
  ]
}
```

`sectionType` 建议取值：

- `vocabulary`
- `sentence-pattern`
- `example-sentence`
- `conversation`
- `reading`
- `exercise`
- `grammar-note`
- `review`
- `culture-info`

### 4.4 词库结构

词库不要只保存“词 -> 中文”，还要保存来源课次和掌握状态。

建议结构：

```json
{
  "word": "借ります",
  "reading": "かります",
  "meaning": "借入、借来",
  "lesson": 7,
  "source": "minna-no-nihongo",
  "sourcePdf": "本册.pdf",
  "sourcePage": 160,
  "partOfSpeech": "verb",
  "tags": ["minna", "lesson-7", "verb"],
  "mastery": 0.4,
  "seenCount": 0,
  "forgotCount": 0,
  "lastReviewedAt": ""
}
```

导入原则：
- 第 1-16 课词汇全部进入候选词库。
- 第 1-16 课中用户答错/忘记的词优先出现。
- 第 17 课以后暂不主动进入短文，除非 AI 作为预告词出现，且必须标记为 preview。
- 阅读中点击收藏的词继续进入 `vocabBank`。
- `vocabBank` 和教材词库不要混成一个概念：教材词库是来源，`vocabBank` 是用户学习状态。

### 4.5 语法目录与语法银行结构

日语语法系统分两层：

- `grammarCatalog`：完整语法目录，穷举《大家的日语》第 1-16 课所有相关语法点。
- `grammarBank`：用户弱项语法银行，只保存标记为模糊/不会/反复错误的语法点。

不要把这两个概念混在一起。

日语完整语法目录应以第 1-16 课句型为主，而不是直接塞 N1 语法。

建议结构：

```json
{
  "id": "minna-l15-vtemo-iidesuka",
  "pattern": "Vてもいいですか",
  "meaning": "可以做某事吗",
  "connection": "动词て形 + もいいですか",
  "lesson": 15,
  "source": "minna-no-nihongo",
  "sourcePdf": "文法.pdf",
  "sourcePage": 0,
  "level": "N5-N4 foundation",
  "tags": ["minna", "lesson-15", "permission", "te-form"],
  "mastery": 0.4,
  "seenCount": 0,
  "correctCount": 0,
  "fuzzyCount": 0,
  "forgotCount": 0
}
```

导入原则：
- 第 1-16 课语法点全部进入候选语法库。
- 第 1-16 课掌握估计统一先设为 0.4。
- 做语法题时先从 `grammarCatalog` 全量覆盖，不要求用户先收藏。
- 用户标记“模糊”或“不会”的语法点进入 `grammarBank`，并提高复习权重。
- 用户标记“会了”的语法点只更新 `grammarCatalog.mastery`，不自动加入弱项银行。
- N1 路线仍保留，但短文生成必须先保证第 1-16 课可理解。

### 4.6 短文生成原则

短文不应直接复制教材长段落。

推荐做法：
- 使用《大家的日语》第 1-16 课的句型、词汇和日常场景。
- 由 AI 生成原创短文。
- 每篇 3-5 句，难度比当前课略高一点，但不能超过太多。
- 每篇只引入 1-2 个新词或预告语法。
- 每句都必须有：
  - 原文
  - 假名
  - 中文
  - 语法点
  - 关键词

建议 AI 生成约束：

```text
学习者正在学习《大家的日语》第 16 课，1-16 课掌握约 40%。
请主要使用第 1-16 课已学词汇和句型，生成原创日语短文。
允许少量加入下一阶段词汇，但必须标记 preview。
短文长度 3-5 句。
每句输出 text, reading, translation, grammar, words。
语法说明必须优先解释第 1-16 课基础句型。
不要直接复写教材原文。
```

---

## 5. 智能模式算法目标

### 5.1 只保留一个可见算法入口

界面上只出现“智能模式”。

内部算法可以按任务分流：

```js
function buildSmartSession(task = state.activeTask, trackId = state.activeTrack) {
  if (trackId === "japanese") {
    return buildJapaneseMinnaSmartSession(task);
  }
  if (trackId === "english") {
    return buildEnglishVocabSmartSession(task);
  }
  return buildGenericSmartSession(task);
}
```

不要再用用户可见模式决定队列。

### 5.2 日语智能权重

鉴于当前第 16 课、掌握约 40%，不要把阅读做得太难。

建议初版权重：

- 短文阅读：50%
- 词汇题：30%
- 语法题：20%

短文阅读内部：

- 70% 来自第 1-16 课词汇和语法。
- 20% 来自用户忘记的生词/语法。
- 10% 来自 N1 方向的“很轻的预告”，只作为一句中的表达，不作为主要考点。

当掌握度升到 60% 后，可改为：

- 短文阅读：60%
- 词汇题：25%
- 语法题：15%

### 5.3 英语智能权重

英语只做单词方向。

建议权重：

- 短文阅读：60%
- 词汇题：40%

英语短文只用于词汇语境，不做语法点收藏，不显示语法题。

### 5.4 掌握度更新

每个词、语法点、短文都要能影响智能模式。

建议统一反馈：

- 会了：mastery +0.08
- 模糊：mastery -0.02，但增加 `seenCount`
- 忘了：mastery -0.08，增加 `forgotCount`

短文阅读评分：

- 会了：短文中已学词和语法小幅提升。
- 模糊：短文中的 preview 项不升级，已学项略降。
- 忘了：短文中的关键词和语法进入下一轮优先队列。

### 5.5 根据掌握度推进课次

智能模式必须具备“推进学习进度”的能力，而不是永远围绕第 16 课打转。

建议新增课次掌握度模型：

```js
lessonProgress: {
  currentLesson: 16,
  targetLesson: 17,
  lessons: {
    "16": {
      vocabMastery: 0.4,
      grammarMastery: 0.4,
      readingMastery: 0.35,
      retention: 0.4,
      overall: 0.39,
      status: "reinforce" // reinforce | stabilize | advance-ready | advanced
    }
  }
}
```

建议总掌握度计算：

- 词汇掌握：40%
- 语法掌握：30%
- 阅读理解：20%
- 复习保持率：10%

计算示例：

```js
overall =
  vocabMastery * 0.4 +
  grammarMastery * 0.3 +
  readingMastery * 0.2 +
  retention * 0.1;
```

推进规则：

- `overall < 0.50`：不推进课次，集中补当前课和前置课。
- `0.50 <= overall < 0.65`：稳定当前课，允许少量下一课 preview。
- `0.65 <= overall < 0.75`：进入推进准备，本周短文可混入下一课 10%-20% 内容。
- `overall >= 0.75`：推进到下一课，把下一课设为当前课，原课进入回炉复习。
- `overall >= 0.85` 且连续两周保持：可以加快推进或增加 N1 桥接表达。

推进课次还必须满足安全条件：

- 最近一周词汇“忘了”比例不超过 25%。
- 最近一周语法“忘了”比例不超过 30%。
- 最近至少 3 篇短文没有全部评为“忘了”。
- 当前课核心语法至少完成 2 轮复习。

如果掌握度达标但安全条件不满足，不推进课次，只进入“稳定当前课”。

### 5.6 每周策略更新

每周要根据学习数据调整下一周策略，而不是靠感觉临时改。

建议新增并长期维护：

- `WEEKLY_UPDATE_PLAN.md`

每周复盘内容：

- 当前课次
- 当前课掌握度
- 上周短文阅读数量
- 上周词汇题正确率
- 上周语法题正确率
- 新增忘词
- 新增忘记语法
- AI 对话中反复追问的问题
- 是否推进下一课
- 下周短文、词汇题、语法题比例
- 下周是否做 OCR/索引补充

第一轮计划建议：

- 周期：2026-07-06 到 2026-07-12
- 复盘日期：2026-07-13
- 当前课：第 16 课
- 初始掌握：40%
- 策略：不推进，先补第 1-16 课，重点强化第 14-16 课。

---

## 6. 删除今日记录功能

### 6.1 删除 UI

删除：

- `renderDailyPanel()`
- `render()` 中的 `${renderDailyPanel()}`
- `renderTabbar()` 中的“今日”标签
- `data-view="today"` 相关主功能区，除非某些 N1 路线信息要搬到“进度”页

保留或迁移：

- N1 年度路线可以保留到“进度”页。
- 学习状态不再靠用户手写“今日记录”，改为通过答题、收藏、忘记、AI 对话自动生成。

### 6.2 删除状态和数据流

可删除或废弃：

- `dailyLogs`
- `latestDailyLog()`
- `handleDailySubmit()`
- `buildDailyCards()`
- `buildDailyReadingCard()`
- `dailyChecklist()`

需要改造：

- `learningProfile()` 不再读取 `dailyLog` 作为主要信号。
- `renderAiPanel()` 不再要求“先保存今日记录”。
- `callDeepSeekGenerate()` 不再以今日记录为核心，改成以：
  - 当前教材进度
  - 最近错题
  - `vocabBank`
  - `grammarBank`
  - `minna` 索引
  - 当前阅读卡
  为核心。

### 6.3 兼容旧数据

不建议强制清空用户 localStorage。

建议：
- 旧的 `dailyLogs` 可以在 `loadState()` 中读取但不再展示。
- 备份/导入时可以继续兼容旧字段。
- 新导出的数据可以不再主动包含 `dailyLogs`，或者保留但标记为 legacy。

---

## 7. 删除通勤模式

### 7.1 删除 UI

删除：

- `renderCommutePanel()`
- `renderCommuteButton()`
- `render()` 中的 `${renderCommutePanel()}`
- `.commute-*` 相关 CSS
- README 中的通勤说明

### 7.2 删除队列逻辑

删除：

- `commuteSegments`
- `eveningSegments`
- `buildCommuteQueue()`
- `currentCommuteSegments()`
- `getCommuteSegment()`
- `buildCommuteSmartQueue()`
- `activeCommuteSegment`
- `commuteDirection`
- `commute-dir`
- `commute-segment`
- `commute-start`

删除后，所有练习都由智能模式统一调度。

如果以后想做“短时学习”，不要恢复通勤路线。可以做成智能模式参数：

```js
sessionLength: "short" | "normal" | "long"
```

但这不是当前阶段必须做的。

---

## 8. 删除旧模式选择

### 8.1 删除 UI

删除 `renderModeButton()` 和模式区块。

旧按钮：

- 今日到期
- 智能推荐
- 弱项加练
- 混合挑战

全部不再显示。

### 8.2 改造队列入口

现有：

```js
function buildQueue(mode = state.mode) {
  state.mode = mode;
  ...
}
```

建议改为：

```js
function buildQueue(task = state.activeTask || "reading") {
  state.activeTask = task;
  const queue = buildSmartSession(task, state.activeTrack);
  ...
}
```

或者保留函数名但内部固定智能模式：

```js
function buildQueue(task = state.activeTask || "reading") {
  state.mode = "smart";
  ...
}
```

### 8.3 删除旧 action

删除：

- `action === "mode"`
- `action === "start"` 中对 `state.mode` 的依赖

保留：

- `adaptive-start` 可以改名为 `smart-start`
- 或者直接让三个任务按钮调用：
  - `data-action="task-start" data-task="reading"`
  - `data-action="task-start" data-task="vocab"`
  - `data-action="task-start" data-task="grammar"`

---

## 9. 三项主交互设计

### 9.1 短文阅读

短文阅读是日语主模式。

功能：
- 显示 3-5 句原创短文。
- 标明来源：
  - 大家的日语 第几课
  - 用到的主要句型
  - 是否含 preview 项
- 支持逐句展开：
  - 假名
  - 中文
  - 语法点
  - 关键词
- 点击词语加入生词。
- 点击语法点加入语法银行。
- 支持用户主动选中文本收藏：
  - 桌面端：鼠标拖选短文里的任意日语词语或短语，出现“收藏生词”浮动按钮。
  - 手机端：长按/拖选文本后，出现底部“收藏选中词语”按钮。
  - 如果选中的是短语，先按原样收藏，并允许 AI 后续拆成词条。
  - 如果文本选择 API 不稳定，提供备用方案：点击“手动添加生词”，自动带入当前句子作为语境。
  - 收藏时必须保存 `sourceSentence`、`sourceCardId`、`lesson`、`createdAt`。
- 支持 AI 追问：
  - 这句为什么这样用？
  - 按我现在水平改写。
  - 用第 16 课以内表达再写一句。
  - 这个语法和 N1 有什么关系？

评分按钮：
- 会了
- 模糊
- 忘了

评分结果进入智能算法。

注意：阅读题不能只允许点击 AI 预先标出的 words chip。当前学习中真正卡住的词，经常不是系统预标的词，所以必须支持“用户自己选取词语收藏”。

### 9.2 词汇题

日语词汇题来源：

- 大家的日语第 1-16 课词汇。
- 阅读中收藏的词。
- 用户标记忘了的词。
- AI 在短文中标出的关键词。

题型：

- 选择中文意思。
- 看假名选词。
- 看中文输入日语。
- 在短句中填词。
- 从原阅读句回忆词义。

英语词汇题来源：

- 英语阅读中收藏的词。
- 工程/AI/IELTS 词汇。
- 用户忘记的词。

英语不生成语法题。

### 9.3 语法题

仅日语显示。

来源：

- 大家的日语第 1-16 课完整语法目录。
- 阅读中出现的语法点。
- 用户标记模糊/不会的语法点。

语法银行采用“穷举目录 + 错弱沉淀”的方法，不采用“先收藏才出题”的方法。

具体规则：

1. 先建立 `grammarCatalog`
   - 来源是《大家的日语》第 1-16 课所有语法点。
   - 做语法题时，初始阶段要覆盖这个完整目录。
   - 每个语法点都有 lesson、pattern、connection、meaning、example、tags。

2. 初始语法题从完整目录出
   - 用户一开始不需要先收藏语法点。
   - 系统应按课次和掌握度遍历全部语法相关题目。
   - 第 1-16 课先全覆盖，再根据表现加权复习。

3. 标记“模糊”或“不会”后进入语法银行
   - `grammarBank` 不再表示全部语法点。
   - `grammarBank` 表示用户的弱项语法、模糊语法、不会语法。
   - 每次标记模糊/不会，都写入或更新 `grammarBank`。

4. 标记“会了”不必进入语法银行
   - 只更新 `grammarCatalog` 中对应语法点的 mastery。
   - 如果之前在 `grammarBank` 中，连续会了若干次后可从弱项中降权或移出。

建议数据结构：

```js
grammarCatalog: [
  {
    id: "minna-l16-vte-kara",
    lesson: 16,
    pattern: "Vてから",
    connection: "动词て形 + から",
    meaning: "做完某事之后",
    examples: ["宿題をしてから、テレビを見ます。"],
    mastery: 0.4,
    seenCount: 0,
    correctCount: 0,
    fuzzyCount: 0,
    forgotCount: 0,
    tags: ["minna", "lesson-16", "te-form"]
  }
];

grammarBank: [
  {
    catalogId: "minna-l16-vte-kara",
    pattern: "Vてから",
    status: "fuzzy", // fuzzy | forgot
    lastMarkedAt: "2026-07-06T00:00:00.000Z",
    source: "grammar-question"
  }
];
```

题型：

- 选择正确接续。
- 看中文选句型。
- 改写句子。
- 在短句中补全语法结构。
- 回到阅读原句解释语法作用。

当前阶段优先：

- て形
- ない形
- 普通形基础
- 助词
- 授受/许可/正在进行/连接句
- 第 16 课以前已学句型

N1 语法暂时只能作为“预告解释”，不要作为主考点。

---

## 10. 推荐实施顺序

### 第一步：更新日志

先在 `UPDATE_LOG_MANUAL.md` 追加：

```markdown
## 2026-07-06 第 7 次修改

### 本次目标
- 按 MINASAN_SMART_MODE_MODIFICATION_MANUAL.md 开始接入《大家的日语》资料，并收敛界面为智能模式。

### 实际改动文件
- 待填写

### 完成内容
- 待填写

### 未完成/暂缓
- 待填写

### 测试结果
- 待填写

### 下一步建议
- 待填写
```

### 第二步：新增教材配置

先加 `japaneseSourceProfile`。

不要立刻 OCR 全书。

先让 UI 能显示：

- 大家的日语
- 第 16 课
- 掌握约 40%
- 智能模式版本

### 第三步：整理三项任务入口

新增或改造：

- `activeTask`
- `renderTaskTabs()`
- `task-start` 事件
- `buildQueue(task)`

日语任务：

- `reading`
- `vocab`
- `grammar`

英语任务：

- `reading`
- `vocab`

### 第四步：新增独立设置界面

把设置相关功能集中到设置页：

- AI 与模型配置
- 数据同步配置
- 教材与进度配置
- 导入/导出
- 隐私说明

练习页不再承载设置项，只保留短文阅读、词汇题、语法题和学习反馈。

### 第五步：删除旧模式 UI

删除模式按钮区。

确保页面上不再出现：

- 今日到期
- 弱项加练
- 混合挑战
- 当前模式

### 第六步：删除通勤模式

删除通勤 UI、状态、队列、CSS、README 描述。

删除后运行：

```powershell
rg -n "通勤|commute|Commute" app.js styles.css README.md
```

预期：
- 只允许出现在更新日志或旧手册中。
- 不应出现在运行代码和用户文档中。

### 第七步：删除今日记录

删除今日记录 UI、状态、生成逻辑、README 描述。

删除后运行：

```powershell
rg -n "今日记录|dailyLogs|daily-form|handleDaily|buildDaily" app.js README.md
```

预期：
- 运行代码中不再依赖今日记录。
- 如果为了兼容旧导入保留 `dailyLogs`，必须标注 legacy，并且不参与 UI 和新算法。

### 第八步：接入 Minna 本地索引

先做手工最小索引，不要一口气 OCR 649 页。

第一批建议：

- 第 14 课
- 第 15 课
- 第 16 课
- 再补第 1-13 课核心词和核心句型

原因：
- 当前教学进度在第 16 课，最近学习内容最容易转化成短文。
- 掌握度只有 40%，先回补第 1-16 课比直接向 N1 冲刺更有效。

### 第九步：短文生成改为教材驱动

改造 `buildReadingPassagePrompt()`：

输入必须包含：

- `japaneseSourceProfile`
- 当前 lesson：16
- 掌握估计：0.4
- 最近忘词
- 最近忘记语法
- 当前任务：reading
- 可用教材词库/语法库摘要

输出仍保持结构化 JSON。

### 第十步：实现阅读选词收藏

必须支持用户在阅读短文中主动选择词语收藏。

实现要求：

- 阅读正文文本允许正常选择，不要被按钮或布局阻断。
- 桌面端监听 `selectionchange` 或鼠标选区。
- 手机端提供“收藏选中词语”备用按钮。
- 保存选中词语时带上当前句子、卡片、课次和来源。
- 如果选区为空，给出明确提示。
- AI 预设 words chip 只是辅助，不是唯一收藏入口。

### 第十一步：语法题从完整目录生成

新增或改造：

- `buildVocabPracticeCards(trackId)`
- `buildGrammarPracticeCards()`
- `grammarCatalog`

要求：
- 词汇题从 `vocabBank` + 教材词库生成。
- 语法题先从 `grammarCatalog` 完整目录穷举生成。
- `grammarBank` 只用于记录模糊/不会的弱项，并提高复习权重。
- 不要只依赖静态 `cards` 数组。

### 第十二步：文档和缓存更新

同步修改：

- `README.md`
- `proxy/README.md`
- `service-worker.js` 缓存版本

README 中必须删除：

- 今日记录
- 通勤模式
- 四种模式

README 中新增：

- 大家的日语资料目录说明
- 第 16 课 / 40% 基线说明
- 智能模式说明
- 三项主交互说明

---

## 11. 验证清单

### 11.1 代码检查

```powershell
node --check app.js
node --check proxy\ai-proxy.mjs
node --check service-worker.js
node test.js
```

全部必须通过。

### 11.2 残留文案检查

```powershell
rg -n "今日记录|通勤|commute|今日到期|弱项加练|混合挑战|当前模式" app.js styles.css README.md
```

预期：
- 不应出现在运行 UI 代码中。
- 如果出现在旧手册或日志里可以接受。

### 11.3 新入口检查

```powershell
rg -n "短文阅读|词汇题|语法题|智能模式|大家的日语|第 16 课|40%|设置" app.js README.md
```

预期：
- 日语 UI 可以看到三项主入口。
- 英语 UI 不显示语法题入口，或明确标为日语专用。
- 智能模式是唯一可见算法入口。
- 设置相关配置集中在设置页，不挤在练习主界面。
- N1 不再作为日语主任务入口。

### 11.4 教材索引检查

如果新增了本地索引：

```powershell
rg -n "minna|大家的日语|lesson|sourcePage|masteryEstimate|grammarCatalog|grammarBank" app.js data
```

预期：
- 可以定位教材来源。
- 每个词/语法点能追溯到 lesson。
- 不把大段教材原文塞进 `app.js`。
- `grammarCatalog` 保存完整语法目录。
- `grammarBank` 只保存模糊/不会/弱项语法。

### 11.5 浏览器手动检查

打开页面后检查：

1. 默认进入日语智能模式。
2. 页面主入口只有短文阅读、词汇题、语法题。
3. 不出现今日记录。
4. 不出现通勤模式。
5. 不出现旧模式切换。
6. 短文阅读可以逐句展开。
7. 可以选中短文里的任意词语或短语并收藏。
8. 点击 AI 预设词语也能收藏，但不是唯一方式。
9. 点击语法点能进入语法系统。
10. 词汇题能基于已学/忘词生成。
11. 语法题只在日语下出现。
12. 初始语法题来自完整语法目录，不要求先收藏。
13. 标记“模糊/不会”的语法点会进入语法银行。
14. 英语不出现语法题。
15. AI 生成短文时能体现“大家的日语第 16 课、掌握约 40%”。
16. 设置相关内容集中在设置页。

---

## 12. 风险与处理方法

### 风险 1：直接 OCR 全书导致工作量过大

处理：
- 先做第 14-16 课最小索引。
- 再补第 1-13 课核心词和核心语法。
- 不急着处理第 17 课以后。

### 风险 2：短文太难，N1 目标压过当前基础

处理：
- AI prompt 必须写明第 1-16 课掌握约 40%。
- 每篇只允许少量 preview。
- 题目解释先讲基础，再讲 N1 连接。

### 风险 3：删除今日记录后 AI 缺上下文

处理：
- 上下文改由学习数据自动生成：
  - 最近错题
  - 最近忘词
  - 最近忘记语法
  - 最近阅读评分
  - 教材进度

### 风险 4：删除模式后用户不知道该点哪里

处理：
- 第一屏只给三个大入口。
- 默认选中“短文阅读”。
- 按钮文案使用“开始智能阅读”“开始词汇题”“开始语法题”。

### 风险 5：旧数据导入报错

处理：
- `loadState()` 保留旧字段兼容。
- `mergeImportedState()` 对旧字段宽容读取。
- UI 不再展示旧字段即可。

---

## 13. 后续 Codex 检查方式

后续你完成一轮修改后，可以直接让我看：

1. `UPDATE_LOG_MANUAL.md`
2. `MINASAN_SMART_MODE_MODIFICATION_MANUAL.md`
3. 当前 `app.js`
4. 当前 `README.md`

我会优先检查：

- 是否真的删掉今日记录。
- 是否真的删掉通勤模式。
- 是否真的只剩智能模式。
- 日语是否围绕短文阅读、词汇题、语法题三项。
- 英语是否没有误加语法题。
- 《大家的日语》第 16 课 / 掌握 40% 是否进入算法和 AI prompt。
- OCR/索引方案是否没有把整本教材硬编码进代码。
- 测试是否通过。

---

## 14. 最小可交付目标

下一轮不要追求“一步到 N1”。

最小可交付目标是：

- 日语第一屏清楚显示：
  - 大家的日语 第 16 课
  - 掌握约 40%
  - 智能模式
  - 短文阅读 / 词汇题 / 语法题
- 用户点“短文阅读”后，能看到一篇基于第 1-16 课范围的原创短文。
- 用户能选中短文里的任意词语并收藏。
- 用户点语法点能收藏。
- 用户点“词汇题”后，能练第 1-16 课和收藏词。
- 用户点“语法题”后，先从第 1-16 课完整语法目录开始练。
- 用户标记“模糊/不会”的语法点会进入语法银行。
- 页面上不再出现今日记录、通勤模式、旧模式选择。
- 页面上不再把 N1 路线作为主入口。
- 设置相关内容集中在设置页。

做到这一步，就已经比继续堆功能更有价值。
