# 更新日志手册

创建日期：2026-07-06
关联方案：MODIFICATION_MANUAL.md（模式重构修改手册）

---

## 2026-07-06 第 1 次修改

### 本次目标
- 按 MODIFICATION_MANUAL.md 第一步：重命名和整理日语/英语模块

### 实际改动文件
- app.js

### 完成内容
- 日语 modules 重构为阅读驱动：jp-reading（阅读解析）排第一为主模式，jp-vocab（阅读单词）、jp-grammar（阅读语法）、jp-n1-plan（N1路线）
- 旧模块 jp-listening/jp-output/jp-sentence 移入 _legacyModules，不在主入口展示但仍可用于已有卡片
- 英语 modules 重命名：en-reading（阅读词汇）、en-vocab（生词复习）、en-civil（土木词汇）、en-ai（AI学术词汇）、en-ielts（雅思表达）
- n1ModuleCategory/n1CategoryLabel 更新为新命名
- 侧栏题组标题日语显示"阅读驱动"、英语显示"阅读词汇"
- 英语生词本面板标题更新为"英语生词复习"
- track 日语 summary 更新为强调阅读主模式

### 未完成/暂缓
- 无

### 测试结果
- node --check app.js ✓
- node --check service-worker.js ✓
- node test.js: 9 passed, 0 failed ✓

### 使用反馈
- （待实际使用后填写）

### 下一步建议
- 进入第二步：统一阅读卡数据结构

---

## 2026-07-06 第 2 次修改

### 本次目标
- 按 MODIFICATION_MANUAL.md 第二步：统一阅读卡数据结构

### 实际改动文件
- app.js

### 完成内容
- 新增 normalizeReadingSentence() 兼容函数：统一映射旧字段 jp/kana/zh → text/reading/translation
- 同样统一 word 子字段映射（jp/word → text, kana → reading, zh → meaning）
- 更新 renderReadingSentence() 使用统一字段
- 更新 renderWordChip() 使用 normalizeReadingSentence 获取 text
- 更新 readingCardText() 使用统一字段
- 更新 readingPayload() 使用统一字段输出给 AI
- 旧格式卡片数据（japaneseReadingLabCards）保持不变，运行时通过兼容函数自动映射

### 未完成/暂缓
- 无

### 测试结果
- node --check app.js ✓
- node test.js: 9 passed, 0 failed ✓

### 使用反馈
- （待实际使用后填写）

### 下一步建议
- 进入第三步：统一生词系统 vocabBank

---

## 2026-07-06 第 3 次修改

### 本次目标
- 按 MODIFICATION_MANUAL.md 第三步：统一生词系统 vocabBank

### 实际改动文件
- app.js

### 完成内容
- defaultState 新增 vocabBank: []，与旧 jpVocab 并存
- loadState 首次加载时自动调用 migrateToVocabBank() 从 jpVocab 和英语 en-vocab 卡迁移
- 迁移逻辑：去重（word+track），统一字段映射（jpVocab → {track:"japanese", word, reading, meaning, sourceSentence, …}）
- collectJpVocab() 同步写入 jpVocab（向后兼容）和 vocabBank
- handleVocabSubmit() 英语生词同步写入 vocabBank
- markJpVocab() 同步更新 vocabBank 中对应条目
- renderJapaneseVocabPanel() 优先读取 vocabBank（japanese track），回退 jpVocab
- renderVocabPanel() 英语端也从 vocabBank 读取
- readingKnowledgeBoundary() / readingLearningPayload() 使用 vocabBank 作为数据源
- mergeImportedState() 新增 vocabBank 合并
- persistedState / saveState 自动包含 vocabBank（不在运行时字段剥离列表）

### 未完成/暂缓
- 英语生词的"忘记/掌握"按钮尚未完全接入 vocabBank（目前仅 handleVocabSubmit 写入，评分联动留待后续）

### 测试结果
- node --check app.js ✓
- node test.js: 9 passed, 0 failed ✓

### 下一步建议
- 进入第四步：新增日语语法银行 grammarBank

---

## 2026-07-06 第 4 次修改

### 本次目标
- 按 MODIFICATION_MANUAL.md 第四步：新增日语语法银行 grammarBank

### 实际改动文件
- app.js, styles.css

### 完成内容
- defaultState 新增 grammarBank: []
- collectGrammarPoint(raw)：从阅读卡 grammar 字段收藏语法点（pattern/meaning/connection/sourceSentence/sourceCardId）
- markGrammarPoint(pattern, status)：标记语法点掌握/忘记
- renderReadingSentence() 语法点改为可点击的 grammar-chip 按钮，点击即收藏
- 新增 renderGrammarPanel()：日语专属"日语语法银行"面板，显示最近 10 个语法点，可标记忘了/掌握
- render() 主函数加入 renderGrammarPanel()（在生词面板之后）
- bindEvents 新增 collect-grammar / grammar-mark 动作处理
- mergeImportedState() 新增 grammarBank 合并
- styles.css 新增 .grammar-chip 样式（圆角药丸按钮，hover/收藏态变色）

### 未完成/暂缓
- grammarBank 基于 collection 自动生成语法复习题（留待后续）

### 测试结果
- node --check app.js ✓
- node test.js: 9 passed, 0 failed ✓

### 下一步建议
- 进入第五步：重写智能推荐

---

## 2026-07-06 第 5 次修改

### 本次目标
- 按 MODIFICATION_MANUAL.md 第五步：重写智能推荐和队列逻辑

### 实际改动文件
- app.js

### 完成内容
- buildSmartQueue() 重构为阅读驱动分桶：readingCards（type:"reading" 或模块为 reading）、wordCards（jp-vocab/en-vocab/vocab 标签）、grammarCards（日语 jp-grammar/语法标签）
- 日语权重：阅读 60%（到期 36% + 新 24%）/ 单词 25% / 语法 15%（轻量模式：50/40/10）
- 英语权重：阅读词汇 65%（到期 40% + 新 25%）/ 单词 35%
- smartSlots() 签名扩展接受 isJapanese/isEnglish/isLight 参数，按学科返回不同槽位配比
- 队列排序：到期阅读卡 → 新阅读卡 → 偏慢 → 今日 → 到期单词 → 弱项 → 到期语法(日语) → N1焦点(日语) → 新上下文 → 剩余
- 其他科目（哲学等）保持原有通用槽位逻辑不变

### 未完成/暂缓
- 通勤模式智能队列未同步调整权重（目前通勤走 buildCommuteSmartQueue，独立逻辑）
- 从 vocabBank/grammarBank 自动生成复习题并入队列（留待后续）

### 测试结果
- node --check app.js ✓
- node test.js: 9 passed, 0 failed ✓

### 下一步建议
- 进入第六步：验证同步导出导入 + 测试

---

## 2026-07-06 第 6 次修改

### 本次目标
- 验证同步导入导出对 vocabBank/grammarBank 的支持 + 全链路测试

### 实际改动文件
- 无（验证和测试）

### 完成内容
- 确认 persistedState() 中 vocabBank 和 grammarBank 不在运行时剥离列表，自动进入导出 JSON
- 确认 saveState() 持久化包含 vocabBank 和 grammarBank
- 确认 mergeImportedState() 正确合并 vocabBank（按 updatedAt）和 grammarBank（按 updatedAt）
- 确认敏感字段剥离不变：deepseekKey 和 gitSync.token 仍然不出现在备份/Gist 中
- 全链路语法检查：node --check app.js ✓ / service-worker.js ✓ / proxy/ai-proxy.mjs ✓
- 单元测试：node test.js 9 passed, 0 failed ✓

### 未完成/暂缓
- 浏览器实际打开验证（需用户手动测试）
- vocabBank/grammarBank 导入导出端到端验证
- 日语阅读卡正常显示、点击词语收藏、生词进入复习题等 UI 交互测试

### 测试结果
- node --check app.js ✓
- node --check service-worker.js ✓
- node --check proxy/ai-proxy.mjs ✓
- node test.js: 9 passed, 0 failed ✓

### 使用反馈
- （待实际使用后填写）

### 下一步建议
- 用户在浏览器打开页面，验证：
  1. 日语阅读卡是否正常显示
  2. 点击词语是否能收藏（vocabBank）
  3. 点击语法点是否能收藏（grammarBank）
  4. 生词是否在练习视图可见
  5. 智能推荐权重是否符合阅读驱动预期
  6. 导出/导入后生词和语法点是否保留
  7. AI 对话是否能走 DeepSeek API
- 后续可按 MODIFICATION_MANUAL.md 第六步强化 AI（/reading-passage 支持英语、/chat 支持上下文）
- 通勤模式权重可同步调整为阅读驱动

---

## 2026-07-06 第 7 次修改

### 本次目标
- 补充“随着掌握程度提升推进教材课次”的规则。
- 新增每周滚动更新计划，让后续可以根据上一周学习状况调整下一周策略。

### 实际改动文件
- MINASAN_SMART_MODE_MODIFICATION_MANUAL.md
- WEEKLY_UPDATE_PLAN.md
- UPDATE_LOG_MANUAL.md

### 完成内容
- 在主修改手册中加入动态推进原则：不固定停留在第 16 课，而是根据词汇、语法、阅读和保持率推进到第 17 课及后续课次。
- 在智能模式算法章节加入课次掌握度模型、总掌握度计算、推进阈值和安全条件。
- 新增 `WEEKLY_UPDATE_PLAN.md`，定义每周复盘时间、数据收集项、掌握度计算、推进规则、第一周计划和周复盘模板。
- 明确第一轮周期为 2026-07-06 到 2026-07-12，复盘日期为 2026-07-13。

### 未完成/暂缓
- 尚未把周计划和掌握度推进逻辑写入运行代码。
- 尚未建立第 14-16 课的最小教材索引。

### 测试结果
- 本次仅更新 Markdown 手册，未改运行代码，未重新运行代码测试。

### 下一步建议
- 按 `WEEKLY_UPDATE_PLAN.md` 第一周计划推进：先巩固第 1-16 课，重点整理第 14-16 课词汇和语法，再开始删除今日记录、通勤模式和旧模式选择。

---

## 2026-07-06 第 8 次修改

### 本次目标
- 按 MINASAN_SMART_MODE_MODIFICATION_MANUAL.md 第二至六步：接入《大家的日语》资料、重构三项任务入口、删除旧模式/通勤/今日记录

### 实际改动文件
- app.js, README.md, UPDATE_LOG_MANUAL.md

### 完成内容
- 新增 japaneseSourceProfile 教材配置对象（大家的日语/第16课/掌握约40%/第1-16课范围）
- defaultState 新增 activeTask（替代旧 mode）、smartAlgorithmVersion、lessonProgress 掌握度模型
- 新增 taskLabel/taskIcon/renderTaskTab/renderTaskTabs：日语三项（短文阅读/词汇题/语法题）、英语两项（短文阅读/词汇题）
- render() 主函数：
  - 模式区块替换为智能模式任务标签
  - 侧栏显示「大家的日语 第16课 · 掌握约40%」
  - 顶部标题显示当前任务（日语 · 短文阅读）
  - 移除 renderCommutePanel() 和 renderDailyPanel() 调用
  - "开始智能练习"按钮改为"开始短文阅读"等按任务文本
- 删除通勤模式 UI 入口和 commute-start 事件处理（commuteSegments/eveningSegments/buildCommuteQueue 保留代码但不再调用）
- renderTabbar() 移除"今日"标签（保留练习/进度/设置）
- N1 面板 data-view 从 today 改为 progress；AI 面板 data-view 从 today 改为 practice
- AI 面板文案不再引用"今日记录"，改为"当前教材进度、错题和收藏词"
- buildQueue() 固定使用智能模式（mode="smart"）
- 日语智能权重调整为 Minna 教材驱动：阅读 50%/单词 30%/语法 20%（轻量 45/35/20）
- 英语智能权重调整为：阅读 60%/单词 40%
- README.md 全面重写：删除今日记录/通勤/四种模式描述，新增大家的日语资料说明、智能模式说明、三项主交互说明、课次推进规则

### 未完成/暂缓
- 尚未建立 Minna 第 14-16 课最小教材索引（OCR/人工标注）
- 尚未从 vocabBank/grammarBank 自动生成词汇题和语法题（buildVocabPracticeCards/buildGrammarPracticeCards）
- 尚未改造 AI prompt 读取 japaneseSourceProfile（buildReadingPassagePrompt 待更新）
- 尚未实现 lessonProgress 的自动计算和周更新逻辑
- 通勤模式代码（commuteSegments/buildCommuteQueue 等）作为 dead code 保留，未彻底删除
- 今日记录数据（dailyLogs/handleDailySubmit/buildDailyCards 等）作为 legacy 保留，UI 已不展示
- styles.css 中 .commute-* 样式未清理

### 测试结果
- node --check app.js ✓
- node --check service-worker.js ✓
- node --check proxy/ai-proxy.mjs ✓
- node test.js: 9 passed, 0 failed ✓

### 使用反馈
- （待实际使用后填写）

### 下一步建议
- 在浏览器打开验证：
  1. 默认进入日语智能模式，三项任务标签可见
  2. 不出现今日记录、通勤模式、旧模式选择
  3. 英语只显示两项（短文阅读+词汇题，无语法题）
  4. 日语显示大家的日语第16课和掌握约40%
- 后续按 MINASAN_SMART_MODE_MODIFICATION_MANUAL.md 第七步：建立第14-16课最小教材索引
- 第八步：短文生成改为教材驱动（更新 AI prompt）
- 第九步：词汇题和语法题从 vocabBank/grammarBank 生成

---

## 2026-07-06 第 9 次修改

### 本次目标
- 回应用户对 N1 路线、滚雪球更新方式、设置页、阅读选词收藏、语法银行方法的反馈。
- 把这些反馈写入修改手册和每周计划，作为后续实现依据。

### 实际改动文件
- MINASAN_SMART_MODE_MODIFICATION_MANUAL.md
- WEEKLY_UPDATE_PLAN.md
- UPDATE_LOG_MANUAL.md

### 完成内容
- 明确 N1 路线不再作为主界面入口，只作为后台长期目标和解释桥梁。
- 明确滚雪球更新分两层：程序日常自动更新掌握度和推荐；每周复盘只负责策略调整，不要求用户每周必须找 agent。
- 新增设置页设计：AI 与模型、数据同步、教材与进度、数据管理、隐私安全都集中到设置界面。
- 明确阅读题必须支持用户主动选中文本收藏词语，不能只依赖 AI 预设 words chip。
- 重写语法银行规则：新增 `grammarCatalog` 作为第 1-16 课完整语法目录；`grammarBank` 只保存标记模糊/不会的弱项语法。
- 调整实施顺序：新增设置页、阅读选词收藏、语法目录穷举等步骤。
- 更新每周计划：补充无需强制每周找 agent、语法目录覆盖率、弱项语法银行数量等复盘项。

### 未完成/暂缓
- 尚未实现新的设置页代码。
- 尚未实现阅读正文选词收藏。
- 尚未建立 `grammarCatalog` 并从完整目录生成语法题。
- 尚未隐藏或移除 N1 路线主入口的相关代码。

### 测试结果
- 本次仅更新 Markdown 手册，未改运行代码，未重新运行代码测试。

### 下一步建议
- 下一轮优先实现：设置页收纳配置、阅读选词收藏、`grammarCatalog` 穷举语法题、N1 路线退出主入口。

---

## 2026-07-06 第 10 次修改

### 本次目标
- 清理 dead code、改造 AI prompt 读取教材配置、从 vocabBank/grammarBank 自动生成练习题、建立 Minna 最小教材索引

### 实际改动文件
- app.js, styles.css, service-worker.js, .gitignore, README.md
- data/minna/minna-index.example.json (新增)
- data/minna/minna-vocab.example.json (新增)
- data/minna/minna-grammar.example.json (新增)

### 完成内容
- **CSS 清理**：删除 .commute-* 全部桌面和移动端样式（约 80 行）
- **AI Prompt 改造**：
  - 新增 minnaPromptContext()：从 japaneseSourceProfile + vocabBank + grammarBank 构建教材上下文
  - n1PromptContext() 集成 minnaPromptContext()
  - buildDeepSeekGeneratePrompt() 不再依赖今日记录，改用教材进度 + 忘词 + 忘记语法
  - buildReadingPassagePrompt() 强制要求使用第 1-16 课词汇和句型，禁止复写教材原文
  - generateAiCards() 不再要求"先保存今日记录"
- **动态出题**：
  - 新增 buildVocabCardsFromBank(trackId)：从 vocabBank 双向生成填空/反向题（日语+英语）
  - 新增 buildGrammarCardsFromBank()：从 grammarBank 生成选择/填空题（仅日语）
  - allCards() 根据 activeTask 动态补充对应的词汇题或语法题
- **Minna 教材索引**：
  - 新建 data/minna/ 目录，含三个 .example.json 示例文件（索引/词库/语法库）
  - .gitignore 新增 data/minna/*.local.json 和 minasang/*.pdf
- **Service Worker** 缓存版本升级到 v7

### 未完成/暂缓
- grammarCatalog 穷举第 1-16 课完整语法目录（minna-grammar.example.json 仅含 7 个示例语法点）
- 阅读正文选词收藏（用户选中文本收藏，当前仅支持点击 chip 收藏）
- 设置页收纳所有配置（AI/同步/教材/数据/隐私）
- N1 路线入口从主界面移除或收敛

### 测试结果
- node --check app.js ✓
- node --check service-worker.js ✓
- node --check proxy/ai-proxy.mjs ✓
- node test.js: 9 passed, 0 failed ✓

### 使用反馈
- （待实际使用后填写）

### 下一步建议
- 在浏览器打开验证：
  1. 选择"词汇题"任务后，vocabBank 中的词是否自动生成填空/反向题
  2. 选择"语法题"任务后，grammarBank 中的语法点是否自动生成选择题
  3. AI 生成短文是否体现「大家的日语 第16课」约束
  4. DeepSeek 直连生成题目是否不再报"请先保存今日记录"
- 下一轮优先：grammarCatalog 穷举、阅读选词收藏、设置页

---

## 2026-07-06 第 11 次修改

### 本次目标
- 检查当前修改后的真实状态。
- 根据检查结果写下一轮修改计划，重点回应“设置相关项不要堆在右边，应由设置图标打开新窗口”。

### 实际改动文件
- CURRENT_CHECK_AND_MODIFICATION_PLAN.md
- UPDATE_LOG_MANUAL.md

### 完成内容
- 运行基础检查：`node --check app.js`、`node --check proxy\ai-proxy.mjs`、`node --check service-worker.js`、`node test.js` 均通过。
- 确认当前已具备任务标签、Minna 示例索引、vocabBank 动态出题、grammarBank 动态出题、阅读选中文本收藏基础函数。
- 确认设置相关内容仍挂在 `side-stack`，并未形成独立设置窗口。
- 确认 `renderAiPanel()` 仍残留“请先保存今日记录”的按钮禁用逻辑，需要修复。
- 确认 N1 路线仍作为显眼进度面板存在，需要退出主入口。
- 确认 `grammarCatalog` 尚未实现，语法题仍从 `grammarBank` 生成。
- 新增 `CURRENT_CHECK_AND_MODIFICATION_PLAN.md`，列出设置窗口、AI 面板修复、N1 收敛、阅读选词增强、grammarCatalog、dead code 清理的下一轮计划。

### 未完成/暂缓
- 本次只检查并写计划，未改运行代码。

### 测试结果
- node --check app.js ✓
- node --check proxy\ai-proxy.mjs ✓
- node --check service-worker.js ✓
- node test.js: 9 passed, 0 failed ✓

### 下一步建议
- 下一轮优先实现 `CURRENT_CHECK_AND_MODIFICATION_PLAN.md` 第一至三步：设置窗口、AI 出题按钮去今日记录依赖、N1 退出主入口。

---

## 2026-07-06 第 12 次修改

### 本次目标
- 按 CURRENT_CHECK_AND_MODIFICATION_PLAN.md 第一至五步：设置窗口、AI面板修复、N1收敛、grammarCatalog

### 实际改动文件
- app.js, styles.css, UPDATE_LOG_MANUAL.md

### 完成内容
- **设置窗口（模态）**：新增 settingsOpen/settingsSection 状态；renderSettingsWindow() 居中模态含6分区；renderSyncPanel/renderCustomPanel 迁入设置窗口；AI 配置迁入；设置图标触发；CSS 完整模态+移动端适配
- **AI 面板修复**：删除 latestDailyLog 依赖和按钮禁用；按钮改为"按教材进度与错题生成练习"
- **N1 收敛**：jp-n1-plan 从 modules 移除；renderN1PlanPanel 仅 progress 视图显示
- **grammarCatalog**：新增 25 个第1-16课核心语法点常量；buildGrammarCardsFromBank 重写为弱项优先+目录穷举；新增 makeGrammarCard 辅助函数
- **语法面板改名**："日语语法银行" → "日语弱项语法"

### 未完成/暂缓
- 阅读正文选词收藏增强（句子定位、浮动按钮）
- 通勤/今日记录 dead code 清理
- README 旧文案残留

### 测试结果
- node --check app.js ✓ / service-worker.js ✓ / proxy/ai-proxy.mjs ✓
- node test.js: 9 passed, 0 failed ✓

### 下一步建议
- 浏览器验证：设置窗口、AI按钮、N1入口、语法题从目录出题
- 下一轮：阅读选词收藏增强、dead code 清理

---

## 2026-07-06 第 13 次修改

### 本次目标
- 重新检查第 12 次修改后的当前状态。
- 修正 `CURRENT_CHECK_AND_MODIFICATION_PLAN.md` 中已经过时的结论。

### 实际改动文件
- CURRENT_CHECK_AND_MODIFICATION_PLAN.md
- UPDATE_LOG_MANUAL.md

### 完成内容
- 运行基础检查：`node --check app.js`、`node --check proxy\ai-proxy.mjs`、`node --check service-worker.js`、`node test.js` 均通过。
- 确认设置窗口已经实现：`settingsOpen`、`settingsSection`、`renderSettingsWindow()` 已存在。
- 确认 `grammarCatalog` 已存在，语法题已经采用“弱项优先 + 目录穷举”的结构。
- 确认 AI 出题按钮已不再因缺少今日记录而禁用。
- 发现新问题：设置窗口内部分新 `data-action` 尚未绑定旧逻辑，例如 `ai-proxy-url`、`git-token`、`git-create`、`export-backup`、`lesson-number` 等。
- 发现新问题：练习页右侧 AI 面板仍重复显示“出题来源 / 解析来源 / 本地代理地址”，这些仍属于设置项，应移入设置窗口。
- 发现 N1 仍在进度页较显眼，并保留“今日 N1 闭环 / 通勤时做选择听读”等旧文案。
- 重写 `CURRENT_CHECK_AND_MODIFICATION_PLAN.md`，将下一轮重点调整为：设置窗口控件可用性、右侧 AI 面板瘦身、N1 面板收敛、dead code 清理、阅读选词增强。

### 未完成/暂缓
- 本次只检查并更新 Markdown，没有改运行代码。

### 测试结果
- node --check app.js ✓
- node --check proxy\ai-proxy.mjs ✓
- node --check service-worker.js ✓
- node test.js: 9 passed, 0 failed ✓

### 下一步建议
- 优先修复设置窗口控件绑定，再移除练习页右侧 AI 面板中的设置项。

---

## 2026-07-06 第 14 次修改

### 本次目标
- 回答用户“为什么没看到设置窗口，是否打开错连接”的问题。
- 检查桌面端设置入口和右侧堆叠原因，并更新计划。

### 实际改动文件
- CURRENT_CHECK_AND_MODIFICATION_PLAN.md
- UPDATE_LOG_MANUAL.md

### 完成内容
- 确认设置窗口代码已存在：`settingsOpen`、`renderSettingsWindow()`、设置分区都在。
- 查明桌面端看不到设置入口的直接原因：设置按钮在底部 `tabbar` 中，而 `.tabbar` 默认 `display: none`，只在 `max-width: 980px` 的移动端显示。
- 判断：用户不一定打开错连接；即使用当前代码的桌面宽屏，也可能看不到设置图标。
- 确认右侧仍堆叠 `renderAiPanel()`、`renderDiagnosisPanel()`、`renderProfilePanel()` 等面板，且 AI 面板仍显示出题来源、解析来源、本地代理地址等设置项。
- 在 `CURRENT_CHECK_AND_MODIFICATION_PLAN.md` 中新增桌面设置入口修复要求：在顶部栏右侧或侧边栏底部增加齿轮按钮，点击打开同一个设置模态窗口。

### 未完成/暂缓
- 本次只更新 Markdown，没有改运行代码。

### 测试结果
- 本次未改运行代码，沿用上一轮检查：基础测试通过。

### 下一步建议
- 优先实现桌面端可见设置入口，再把右侧 AI 面板中的设置控件迁走。

---

## 2026-07-06 第 15 次修改

### 本次目标
- 按 CURRENT_CHECK_AND_MODIFICATION_PLAN.md 优先1-5：设置窗口控件绑定、AI面板瘦身+桌面设置入口、N1收敛、dead code/README清理、阅读选词增强

### 实际改动文件
- app.js, styles.css, README.md, UPDATE_LOG_MANUAL.md

### 完成内容
- **设置窗口事件绑定**：
  - 输入绑定：ai-proxy-url→ai-url, git-token→github-token, git-filename→github-filename, git-auto→github-auto（新旧 action 别名共存）
  - 点击绑定：export-backup→export-data, copy-backup→copy-data, download-backup→download-data, import-backup→import-data, git-create→create-gist, git-pull→pull-github, git-push→push-github
  - 新增：lesson-number（更改当前课次）、lesson-mastery（更改掌握估计）、clear-cache（清缓存+重载）、open-settings-section（带分区参数）
  - 设置窗口内 custom-form 复用已有绑定
- **桌面设置入口**：
  - 顶部栏新增 ⚙ 按钮（.desktop-settings-btn），桌面端（>980px）可见，移动端隐藏
  - 点击后触发 open-settings 打开模态窗口
- **AI 面板瘦身**：
  - 移除出题来源/解析来源/本地代理地址三个设置控件
  - 新增「⚙ AI 设置」按钮（直接打开设置窗口 AI 分区）和「🔍 学习诊断」按钮
  - 文案区分日语（按教材课次）和英语（按词汇进度）
- **N1 收敛**：
  - renderN1PlanPanel() 从 70 行缩减为 15 行：删除"今日 N1 闭环"时间块、"N1 年度路线"完整列表、"通勤时做选择/听读"文案
  - 改为简洁的"当前进度"面板：教材课次、掌握%、第几周、长期目标一句话
- **阅读选词增强**：
  - 阅读句子增加 data-card-id 和 data-sentence-index 属性
  - collectSelectedJapaneseText() 识别选区所在句子，保存 sentenceIndex、sourceSentence（精确到所在句）、lesson、tags
- **README 清理**："通勤时手机直接练" → "手机端直接练习"

### 未完成/暂缓
- 通勤/今日记录 dead code 详细清理（已标记，未删除函数定义）
- 桌面端选区浮动"收藏选中词语"按钮
- grammarCatalog 题目质量验证与弱项流转测试

### 测试结果
- node --check app.js ✓ / service-worker.js ✓ / proxy/ai-proxy.mjs ✓
- node test.js: 9 passed, 0 failed ✓

### 下一步建议
- 浏览器验证：桌面端顶部设置按钮可见、设置窗口控件生效、AI面板无出题来源选择、N1面板收敛、阅读选词收藏带句子定位
- 下一轮：阅读浮动按钮、通勤dead code彻底删除

---

## 2026-07-06 第 16 次修改
### 本次目标
- 回应“右侧仍堆叠大量设置相关板块”的问题，将右侧收束为学习总体状况面板。
- 确保设置、AI、同步、教材进度、学习诊断等管理项进入设置窗口，不再占用右侧。
- 保证桌面端右侧无需滚动即可看完全部状态信息。

### 实际改动文件
- app.js
- styles.css
- service-worker.js
- UPDATE_LOG_MANUAL.md

### 完成内容
- **新增学习总览面板**：实现 `renderLearningOverviewPanel(stats)`，右侧只显示当前学科、当前任务、教材课次/掌握度、今日完成、正确率、到期、已见、生词数、语法弱项、弱点标签、最近诊断摘要和下一步建议。
- **移除右侧设置堆叠**：主渲染区域的 `.side-stack` 仅保留学习总览，不再渲染 AI 出题、学习诊断、学习档案、弱项列表、历史记录等长面板。
- **设置入口保留但不堆内容**：右侧只保留一个齿轮按钮打开设置窗口，AI 与模型、数据同步、教材与进度等仍集中在设置页内。
- **右侧视觉压缩**：新增 `.overview-*` 样式，用 2x2 状态格和短文本压缩信息；桌面端右侧 sticky，移动端恢复普通流。
- **缓存刷新**：service worker 缓存号从 `triad-learning-trainer-v7` 升至 `triad-learning-trainer-v8`，降低浏览器继续显示旧右侧布局的概率。

### 测试结果
- `node --check app.js` ✓
- `node --check service-worker.js` ✓
- `node --check proxy\ai-proxy.mjs` ✓
- `node test.js`: 9 passed, 0 failed ✓
- 浏览器验证 `http://127.0.0.1:8787/`：1280×720 桌面视口下，右侧总览高度约 484px，未超出视口；页面无纵向滚动；右侧不再出现“AI 出题 / 学习诊断 / 学习档案”等旧面板；齿轮可打开设置窗口，AI 与模型等设置项在设置窗口内。

### 下一步建议
- 若手机端仍看到旧布局，优先执行设置窗口里的“清理缓存并重载”，或手动强制刷新页面。
- 下一轮可继续处理：阅读选词浮动收藏按钮、通勤/今日记录 dead code 删除、grammarCatalog 题目质量验证。

---

## 2026-07-06 第 17 次修改
### 本次目标
- 回答用户关于 N1 渐进推进、阅读收藏词、AI 更新题目、针对性练习、数据保存/同步风险的疑问。
- 只更新 Markdown 计划，不改运行代码。

### 实际改动文件
- CURRENT_CHECK_AND_MODIFICATION_PLAN.md
- UPDATE_LOG_MANUAL.md

### 完成内容
- 在 `CURRENT_CHECK_AND_MODIFICATION_PLAN.md` 新增“第 17 次补充检查”专章。
- 明确说明当前“逐渐推进至 N1”只是时间路线 + 教材 prompt 约束 + 智能队列倾斜，还没有真正按答题数据自动推进课次。
- 明确说明阅读收藏词已有 `collect-word` / `collect-selection` 基础代码，但缺少浮动选词、自动解析、词库回显、编辑/删除/标记等完整体验。
- 记录 AI 普通出题疑似入库 bug：`generateAiCards()` 调 `normalizeAiCard(c, { id: aiSourceId }, i)` 未传 `track`，可能导致生成题被过滤为空。
- 说明针对性练习当前来自三处：答题后自动巩固题、AI 诊断 focusCards、智能队列弱项排序。
- 梳理数据保存/同步风险：缺少 deviceId/revision、导入预览、恢复点、字段级合并、阅读聊天逐条合并、同步期间本地变更保护。
- 写入下一轮代码修改优先级：修 AI 出题入库、补阅读收藏完整体验、实现课次推进模型、增强同步安全、计划化针对性练习。

### 测试结果
- 本次未改运行代码，未运行测试。

### 下一步建议
- 下一轮先修 `generateAiCards()` 入库 bug，再做阅读选词收藏完整体验和数据同步安全层。

---

## 2026-07-06 第 18 次修改
### 本次目标
- 根据用户最新 1-5 条要求，把尚未完成项目写入 plan。
- 重新校准优先级：先做课次推进/N1渐进的最小可用实现，再让 AI 出题与该进度对齐，并修复普通 AI 出题入库 bug。
- 只更新 Markdown 计划，不改运行代码。

### 实际改动文件
- CURRENT_CHECK_AND_MODIFICATION_PLAN.md
- UPDATE_LOG_MANUAL.md

### 完成内容
- 在 `CURRENT_CHECK_AND_MODIFICATION_PLAN.md` 新增“第 18 次待实施计划：按用户确认后的执行顺序”。
- 将优先级 1 改为“实现课次推进最小可用版本”，包括 `lessonProgress.lessons`、`currentLessonState()`、评分/收藏/标记后更新掌握度、`maybeAdvanceLesson()`、设置页显示推进原因。
- 明确阅读点击收藏词的目标体验：读句子时看到词即可点击收藏；没有 words 数组时先用选区浮动收藏，后续再做 AI 分词/token 化。
- 明确 AI 生成新题当前只是与手动 `japaneseSourceProfile.currentLesson` 齐平，尚未与真实 `lessonProgress` 齐平；后续必须改为读取 `currentLessonState()`。
- 写入 AI 出题 bug 修复方法：`generateAiCards()` 调 `normalizeAiCard()` 时必须传入 `{ id, track, signals, lesson }`，代理回退路径同改，并增加生成结果验收日志。
- 保留第 4 项 focusPlans 方案：诊断题按弱项计划管理，不再粗暴删除旧 `diag-` 题。
- 保留第 5 项同步安全方案：引入 `meta.deviceId/revision/updatedAt`、恢复点、字段级合并、导入预览。

### 测试结果
- 本次未改运行代码，未运行测试。

### 下一步建议
- 第一轮代码交付顺序：课次推进数据结构 → `rateCurrent()` 接入掌握度更新 → AI prompt 改读 `currentLessonState()` → 修 `generateAiCards()` 入库 bug → 生成题保存 lesson 元数据。

---

## 2026-07-06 第 19 次修改

### 本次目标
- 按 CURRENT_CHECK_AND_MODIFICATION_PLAN.md 第 18 次待实施计划：课次推进最小可用版本 + 修 AI 出题 bug + AI prompt 对齐课次状态

### 实际改动文件
- app.js, UPDATE_LOG_MANUAL.md

### 完成内容
- **课次推进模型**：
  - `lessonProgress` 扩展：previewLesson, advanceMode, lastAdvanceAt, lastAdvanceReason
  - `currentLessonState()`：统一读取当前课次/掌握度/能否推进/障碍
  - `ensureLessonRecord(lessonNum)`：初始化一课的数据（vocab/grammar/reading/retention + mastery）
  - `lessonForCard(card)`：卡片→课次归因（显式 lesson → tag lesson-N → 当前课）
  - `updateLessonProgressFromCard(card, rating)`：答题后按 rating 更新 vocab/grammar/reading 计数
  - `recalcLessonMastery(rec)`：词汇40%+语法30%+阅读20%+保持10% 计算总掌握度
  - `maybeAdvanceLesson()`：overall≥65% 且无障碍 → 自动推进到下一课 + 写 reason
    （⚠ 此推进条件已两次改写：07-08 第 24 次改为词汇/语法各 ≥80%；
    07-24 第 30 次再加样本量下限，见该条）
  - 接入 `rateCurrent()`：每次评分后自动调用 updateLessonProgressFromCard
- **AI 出题 bug 修复**：
  - `normalizeAiCard()`：log 对象缺 track 时从 `state.activeTrack` 兜底（不再因为缺 track 返回 null）
- **AI prompt 对齐课次**：
  - `minnaPromptContext()` 改用 `currentLessonState()`：显示真实 lesson/mastery/canAdvance/blockers
- **设置页教材面板**：
  - 显示真实课次掌握度 + 四维分项（词汇/语法/阅读/保持）
  - 显示推进状态（已推进原因 / 当前障碍）
  - 新增"推进模式"选择（自动/手动）
  - 新增 lesson-advance-mode 事件处理

### 未完成/暂缓
- focusPlans 针对性练习方案
- 同步安全层（meta.deviceId/revision/恢复点）
- grammarCatalog 题目质量验证

### 测试结果
- node --check app.js ✓
- node test.js: 9 passed, 0 failed ✓

### 下一步建议
- 浏览器验证：答几道日语题后，打开设置→教材与进度，查看 lessonProgress 数据变化；AI 生成题是否能正常入库

---

## 2026-07-06 第 20 次修改

### 本次目标
- 回答“教材与进度查看掌握度变化是如何实现的”。
- 将上一轮审核提出的问题写成详细修改计划和方法。
- 只更新 Markdown 计划，不改运行代码。

### 实际改动文件
- CURRENT_CHECK_AND_MODIFICATION_PLAN.md
- UPDATE_LOG_MANUAL.md

### 完成内容
- 在 `CURRENT_CHECK_AND_MODIFICATION_PLAN.md` 新增“第 20 次审核：教材与进度掌握度显示机制 + 修复计划”。
- 说明当前掌握度显示链路：`rateCurrent()` → `updateLessonProgressFromCard()` → `recalcLessonMastery()` → `currentLessonState()` → `renderTextbookSettings()`。
- 明确指出当前实现缺口：
  - 评分按钮传 `good`，但课次模型判断 `easy`，导致“会了”不增加掌握度。
  - 自动推进写了 blockers 但未在推进条件中检查 blockers。
  - 手动改课次只写 `japaneseSourceProfile.currentLesson`，未同步 `state.lessonProgress.currentLesson`。
  - 右侧总览仍读 `japaneseSourceProfile`，可能与设置页不一致。
  - AI 出题调用处仍未显式传 `{ track, lesson, signals }`，只是靠 `normalizeAiCard()` 兜底。
  - 阅读收藏词仍未统一到 `vocabBank` 查询。
- 写入详细修复方法：
  - 新增 `normalizeRatingForMastery()`。
  - 调整掌握度公式与 `canPreview/canAdvance`。
  - 修 `lesson-number` 同步。
  - 右侧总览改读 `currentLessonState()`。
  - `generateAiCards()` 显式构造 `aiSource`，生成卡保存 `lesson/lessonRange/preview`。
  - `findJpVocab()` 优先查 `vocabBank`。
  - 补最小测试列表。
- 评估新展示：需要新增验收展示，但应等 P1/P2 修完后再做，避免误导。

### 测试结果
- 本次未改运行代码，未运行测试。

### 下一步建议
- 先修评分值映射和 AI 出题显式传参，再做新的验收展示文档。

---

## 2026-07-06 第 21 次修改

### 本次目标
- 按 CURRENT_CHECK_AND_MODIFICATION_PLAN.md 0.9 节六个修复计划：P1评分映射、P2掌握度公式与推进、P3手动课次同步、P4右侧总览数据源、P5 AI出题lesson元数据、P6阅读收藏一致性

### 实际改动文件
- app.js, UPDATE_LOG_MANUAL.md

### 完成内容
- **P1 评分值映射**：新增 normalizeRatingForMastery()，"good"/"easy"→"good"，"hard"→"hard"，其余→"again"。updateLessonProgressFromCard() 改用统一映射函数，修复"会了"不增加掌握度的 bug。
- **P2 掌握度公式+推进条件**：
  - recalcLessonMastery() 改为加权惩罚公式：vocab(known+fuzzy*0.45-forgot*0.35)/seen，grammar(known+fuzzy*0.40-forgot*0.45)/seen，reading(good+hard*0.55-again*0.35)/seen
  - overall = vocab*0.40+grammar*0.30+reading*0.30
  - 新增 boundedMastery() 夹紧到 [0,1]
  - maybeAdvanceLesson() 拆分 canPreview(≥50%) / canAdvance(≥65%+blockers为空+reading.seen≥2)
  - 推进条件强制检查 blockers.length===0 和 reading.seen≥2
    （⚠ 已过时：本条的加权惩罚公式和 65% 阈值在 07-08 第 24 次修改中被重写为
    `known/(known+fuzzy+forgot)` + 各 ≥80%；07-24 第 30 次又补上样本量下限）
- **P3 手动课次同步**：lesson-number handler 同步写 state.lessonProgress.currentLesson/previewLesson + ensureLessonRecord + japaneseSourceProfile + 写 reason + render
- **P4 右侧总览数据源**：renderLearningOverviewPanel() 改读 currentLessonState()，显示真实掌握%+canAdvance/canPreview/blockers
- **P5 AI出题lesson元数据**：generateAiCards() 构造完整 aiSource {track, lesson, lessonRange, previewLesson, signals}；normalizeAiCard() base 写入 lesson/lessonRange/preview 字段 + tags 含 lesson-N
- **P6 阅读收藏一致性**：findJpVocab() 优先查 vocabBank→回退 jpVocab；renderWordChip() 签名增加 index，payload 含 sentenceIndex/lesson/sourceSentence；collectSelectedJapaneseText() 使用 currentLessonState().lesson

### 未完成/暂缓
- focusPlans 针对性练习方案
- 同步安全层（meta.deviceId/revision/恢复点）
- 新增验收展示文档

### 测试结果
- node --check app.js ✓ / proxy/ai-proxy.mjs ✓ / service-worker.js ✓
- node test.js: 9 passed, 0 failed ✓

### 下一步建议
- 浏览器验证：连续点"会了"→教材与进度中掌握度上升；点"忘了"→掌握度下降；阅读不足2篇→不推进；手动改课次→设置页+右侧总览同步更新；AI生成题→card.lesson 正常

---

## 2026-07-06 第 22 次修改

### 本次目标
- 验收第 21 次代码改动。
- 给出下一轮新的要求。
- 只更新 Markdown 计划，不改运行代码。

### 实际改动文件
- CURRENT_CHECK_AND_MODIFICATION_PLAN.md
- UPDATE_LOG_MANUAL.md

### 验收结论
- 第 21 次改动方向通过，代码条件通过，但不建议作为最终展示版本。
- 基础检查通过：`node --check app.js`、`node --check proxy\ai-proxy.mjs`、`node --check service-worker.js`、`node test.js`。
- 现有测试仍未覆盖新课次模型、AI 入库、阅读收藏和同步安全，因此必须补新测试。

### 已通过项
- `normalizeRatingForMastery()` 已修复 good/hard/again 映射。
- `generateAiCards()` 已显式构造 `aiSource` 并传入 `normalizeAiCard()`。
- `lesson-number` 已同步写入 `state.lessonProgress.currentLesson` 和 `previewLesson`。
- `renderLearningOverviewPanel()` 已改读 `currentLessonState()`。
- `findJpVocab()` 已优先查 `vocabBank`。

### 新发现的问题
- `currentLessonState()` 尚未返回 `canPreview`，但右侧总览使用 `cls.canPreview`。
- `maybeAdvanceLesson()` 中阅读量要求目前通过 blockers 间接实现，建议显式写入 `rec.canAdvance` 条件。
- `normalizeAiCard()` 中只要存在 `previewLesson` 就设置 `base.preview = true`，会把当前课题也标成 preview。
- `type === "reading"` 的 AI 卡通过 `normalizeReadingCard(raw)` 返回时，可能丢失 `base.lesson / base.lessonRange / base.preview / lesson-N tag`。
- `collectSelectedJapaneseText()` 仍使用 `japaneseSourceProfile.currentLesson`。
- `collectJpVocab()` 没有把 `lesson` 和 `sentenceIndex` 落库到 `jpVocab/vocabBank`。

### 新要求
- 第 22 次代码修改优先补齐第 21 次验收缺口，不扩展新功能。
- 补 `currentLessonState().canPreview`。
- 显式要求 `rec.reading.seen >= 2` 才能 `canAdvance`。
- 修 AI preview 标记，只给真实 preview 题打标。
- reading 类型 AI 卡必须保留 lesson 元数据。
- 手动选词和点击词收藏都要把 `lesson/sentenceIndex/sourceSentence` 写入 `vocabBank`。
- 补最小测试后，再新增 `IMPLEMENTATION_ACCEPTANCE_SHOWCASE.md`。

### 下一步建议
- 下一轮先做第 22 次小修，不要先做展示；小修和测试通过后再写验收展示文档。

---

## 2026-07-06 第 22 次修改

### 本次目标
- 按 CURRENT_CHECK_AND_MODIFICATION_PLAN.md 0.10 节六个小修 + 补测试：R1 canPreview返回、R2 reading.seen≥2条件、R3 preview标记修正、R4 reading AI卡保留lesson、R5 选词用currentLessonState、R6 collectJpVocab保存lesson/sentenceIndex

### 实际改动文件
- app.js, test.js, UPDATE_LOG_MANUAL.md

### 完成内容
- **R1**：currentLessonState() 新增 `canPreview` 返回值，右侧总览不再读到 undefined
- **R2**：maybeAdvanceLesson() 的 `canAdvance` 条件显式加入 `rec.reading.seen >= 2`（之前仅通过 blocker 间接限制）
- **R3**：AI preview 标记修正：只在 `raw.preview` 显式设置或 `raw.lesson > log.lesson` 时才标 preview，不再因 `previewLesson` 存在就全标
- **R4**：normalizeAiCard() 中 reading 类型卡返回时保留 `base.lesson/lessonRange/preview` + 合并 tags（含 lesson-N）
- **R5**：collectSelectedJapaneseText() 改用 `currentLessonState().lesson`，不再读 `japaneseSourceProfile.currentLesson`
- **R6**：collectJpVocab() 新建和更新时保存 `lesson`/`sentenceIndex`，同步写入 jpVocab 和 vocabBank
- **测试扩展**：
  - 导出 normalizeRatingForMastery、boundedMastery、recalcLessonMastery、normalizeAiCard、findJpVocab
  - 新增 10 个测试：评分映射 5 分支、boundedMastery 夹紧、recalcLessonMastery good提高/again惩罚、normalizeAiCard 普通卡带lesson、reading卡保留、preview正确/不正确、缺track兜底、findJpVocab
  - 总计 19 passed, 0 failed

### 未完成/暂缓
- focusPlans 针对性练习方案
- 同步安全层
- IMPLEMENTATION_ACCEPTANCE_SHOWCASE.md（验收展示文档）

### 测试结果
- node --check app.js ✓
- node --check proxy/ai-proxy.mjs ✓
- node --check service-worker.js ✓
- node test.js: 19 passed, 0 failed ✓

---

## 2026-07-06 第 23 次修改

### 本次目标
- 验收第 22 次代码改动。
- 提出下一轮新要求。
- 只更新 Markdown 计划，不改运行代码。

### 实际改动文件
- CURRENT_CHECK_AND_MODIFICATION_PLAN.md
- UPDATE_LOG_MANUAL.md

### 验收结论
- 第 22 次代码改动条件通过。
- 命令检查通过：
  - node --check app.js ✓
  - node --check proxy/ai-proxy.mjs ✓
  - node --check service-worker.js ✓
  - node test.js: 19 passed, 0 failed ✓
- 主界面右侧当前只渲染学习总览；AI、同步、教材与进度、数据管理等配置项已进入设置窗口。
- 教材进度、AI 出题 lesson 元数据、preview 标记、阅读收藏 lesson/sentenceIndex 的主线代码已经接上。

### 发现的问题
- `ensureLessonRecord()` 新建记录没有显式 `canPreview: false`，`currentLessonState()` 也应对 `canPreview/canAdvance` 做 Boolean 兜底。
- `test.js` 里“reading 卡保留 lesson”的测试名不准确，实际测试的是 `type: "input"`，没有真正覆盖 `type: "reading"`。
- `findJpVocab()` 测试没有稳定注入 `vocabBank/jpVocab` 数据，只验证不抛错，不足以证明优先级逻辑。
- 尚未做浏览器交互验收，因此暂不写 `IMPLEMENTATION_ACCEPTANCE_SHOWCASE.md`。
- `focusPlans`、同步安全层、旧 dead code 清理仍未完成。

### 新要求
- 第 23 次先做小修与验收，不扩展大功能。
- 补 `ensureLessonRecord().canPreview = false`，并让 `currentLessonState()` 返回明确布尔值。
- 补真正的 reading AI 卡单元测试，断言 `type/lesson/lessonRange/preview/tags/words`。
- 抽出 `findJpVocabIn(vocabBank, jpVocab, word)` 或提供测试注入函数，补真实 fixture 测试。
- 做浏览器验收：设置窗口、右侧总览、点击词块收藏、选中文本收藏、掌握度变化、AI reading 卡入库。
- 浏览器验收通过后再新增 `IMPLEMENTATION_ACCEPTANCE_SHOWCASE.md`。
- 保证 reading 卡每句稳定带 `words`，否则点击收藏会退化成选中文本收藏。

### 下一步建议
- 下一轮执行顺序：小修默认字段 → 补 reading 测试 → 补 vocab 查找测试 → 浏览器验收 → 写验收展示文档。
- 展示文档完成后，再进入 `focusPlans` 和同步安全层。

---

## 2026-07-06 第 23 次修改（代码实施）

### 本次目标
- 按第 23 次验收新要求：默认字段修复 + reading AI 卡真正测试 + findJpVocabIn 抽出 + fixture 测试

### 实际改动文件
- app.js, test.js, UPDATE_LOG_MANUAL.md

### 完成内容
- **R1 默认字段**：ensureLessonRecord() 新建记录显式设置 `canPreview: false`；currentLessonState() 对 canPreview/canAdvance 做 `Boolean()` 兜底
- **R2 reading AI 卡真正测试**：
  - 新增第1个 reading 测试：走 `normalizeReadingCard(raw)` 真实路径，断言 type/words[0].text/tags merge
  - 新增第2个 reading 测试：走 `normalizeAiCard(raw, aiSrc, 0)` 完整路径，断言 lesson/lessonRange.to/preview===false/tags含lesson-16
- **R3 findJpVocabIn 抽出 + fixture 测试**：
  - 抽出纯函数 `findJpVocabIn(vocabBank, jpVocab, word)`
  - `findJpVocab(word)` 改为调用 `findJpVocabIn(state.vocabBank, state.jpVocab, word)`
  - 新增 4 个 fixture 测试：vocabBank优先、回退jpVocab、都不存在返回null、空参数不抛错
  - 导出 `findJpVocabIn` + `normalizeReadingCard`

### 未完成/暂缓
- 浏览器交互验收（需手动）
- IMPLEMENTATION_ACCEPTANCE_SHOWCASE.md
- focusPlans、同步安全层、旧 dead code 清理

### 测试结果
- node --check app.js ✓
- node test.js: 23 passed, 0 failed ✓（+4 new）

---

## 2026-07-06 第 24 次修改

### 本次目标
- 手机端适配：底层Tabbar、间距、触控尺寸、布局修复

### 实际改动文件
- styles.css, UPDATE_LOG_MANUAL.md

### 完成内容
- **Tabbar 列数**：`repeat(4, 1fr)` → `repeat(3, 1fr)`（练习/进度/设置，已删除"今日"）
- **View 过滤清理**：删除 `[data-view="today"]` 和 `[data-view="settings"]` 的过滤规则（这两个视图已不存在）
- **Card-footer**：980px 断点 `bottom` 从 `env(safe-area-inset-bottom)` 改为 `0`，避免与 tabbar 重叠
- **触控优化（≤680px）**：
  - `.word-chip` / `.grammar-chip` 最小高度 44px，padding 增大到 9px 11px
  - 阅读句子字号微调（jp 1rem, kana/zh 0.85rem），间距压缩
  - Overview stat-grid 改为 2 列紧凑布局
  - 桌面设置按钮在移动端隐藏
- **移动端 card-footer**：在 680px 断点保留 `bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom))` 确保评分条悬浮在标签栏上方

### 测试结果
- node --check app.js ✓
- node test.js: 23 passed, 0 failed ✓

### 下一步建议
- 手机浏览器打开验证：底部3栏均匀分布、任务标签可横滑、词块足够大、评分条悬浮在标签栏上方

---

## 2026-07-07 当日工作总结

### 完成内容
- **第 23 次修改**：默认字段修复（canPreview/canAdvance Boolean 兜底）+ 真正 reading AI 卡测试 + findJpVocabIn 纯函数抽出并补 4 个 fixture 测试
- **第 24 次修改**：手机端适配（Tabbar 3 列、view 过滤清理、card-footer 定位修复、词块/语法芯触控 44px、阅读句子字号微调、overview 2 列布局）
- **代码推送**：全部改动 commit & push 到 GitHub Pages 主分支
- **同步排查**：确认自动同步机制正常（pull-merge-push，2.5s 防抖）；发现手机端 Gist ID 为 `bfff6c1fae36…`，与电脑端 `3a4f05e15fb…` 不同
- **最终决定**：保留两个独立 Gist 各自存档，互不干扰，均在云端安全存储

### 当前状态
- 电脑端：Gist `3a4f05e15fb…`，自动同步正常
- 手机端：Gist `bfff6c1fae36…`，自动同步正常（新 token 已配置）
- 两端独立运行，互为备份
- 测试：23 passed, 0 failed

> ⚠ **本条结论是错的，已在 2026-07-24 第 30 次修改中纠正。**
> 「两端独立运行，互为备份」不是设计，是 bug：`createGitHubGist()` 在 `gistId` 为空时会静默新建 Gist，
> 所以每台只填了 token、没填 Gist ID 的设备都会另开一个云端。结果进度分裂成 3 个互不相通的 Gist
> （`3a4f05e1` 83 条 / `bfff6c1f` 50 条 / `c80f0752` 10 条），既不是备份也无法合并，
> 直到 07-24 才发现并合并成一份（权威 ID：`c80f075251422031816a8c400057ba93`）。

---

## 2026-07-13 当日工作总结

### 完成内容
- **第 25 次修改：1-16 课数据全量载入**：新增 `data/minna-lessons.js`——624 个词条（每课 24~47 词，含假名/词性/中文意思）、80 条语法（每课全部句型，带接续说明和原创例句+中文翻译）、18 篇分课原创短文（每课至少一篇，只用该课及之前的词汇语法）。删除原 3 篇 N1 难度内置短文（与"去 N1、课本为主"决定冲突）。
- **第 26 次修改：题库目录化出题**：词汇题从目录生成 1691 题（选意思/看假名选写法/看中文写日语），语法题 240 题（选意思/选接续/看中文选例句）。干扰项取自相邻课真实词条（确定性算法）。课次门控（没学到的课不出题）+ 到期轮换（做过的让位给没做过的，词汇每轮取 150、语法 120）+ 当前课优先。
- **第 27 次修改：手机端「生词」标签页**：底部标签栏 3→4（练习/生词/进度/设置）。生词页含阅读生词本、语法银行（修复：renderGrammarPanel 此前定义了但从未被调用）、课本词汇目录和语法目录（按课浏览，一键标记忘了/掌握写入 bank 并优先出题）。
- **第 28 次修改：任务过滤修复**：选词汇题/语法题任务后队列不再以阅读卡开头（新增 cardMatchesTask，原注释声称有过滤但从未实现）。
- **教材原文本地加载**：`data/minna/minna-readings.local.json` 存在时启动自动加载，作为 textbook 阅读卡优先排队；已被 .gitignore 排除不进仓库（版权边界：仓库内只放按课整理的学习清单和原创例句/短文）。
- **合并与发布**：worktree 分支合并到 main（保留本文件的手动记录，解决 modify/delete 冲突）、推送 GitHub、Pages 构建验证通过（数据文件 200、SW v9 生效）。

### 测试结果
- node --check app.js / data/minna-lessons.js / service-worker.js ✓
- node test.js: 33 passed, 0 failed（26→33，新增目录完整性/出题器 id 唯一/干扰项确定性/课次门控测试）
- 浏览器实测：生词页四面板、课次切换、标记写入、三任务队列出题均正常

### 当前状态
- 日语约 2000 题（静态 78 + 短文 18 + 词汇 1691 + 语法 240），全程序约 2100 题
- 手机端联网打开自动更新（SW network-first），更新标志：底部 4 个标签
- 词汇/语法/短文全部分课，跟随课次推进自动扩大出题范围（17 课后数据待补）

> ⚠ 已过时（2026-07-24 第 30 次修改）：第 17 课数据已补齐；短文改为按句拆卡；
> 「联网打开自动更新」对 iOS 主屏 App 不成立——它是恢复而非重新打开，页面可能几天不重载，
> 现已改为 waiting SW + 顶部横幅提示。

### 下一步建议
- 手机上逐课过一遍生词目录，把不会的标「忘了」喂给出题
- 优先级 2（数据保存安全：deviceId/revision/本地恢复点）仍是下一个该做的

---

## 2026-07-14 第 29 次修改

### 本次目标
- 基于已有词库（624 词）和语法（80 条），创建 30 篇 AI 生成短文，与课文题库分开，标记为「AI生成」

### 实际改动文件
- `data/ai-generated-readings.js`（新建）
- `app.js`
- `index.html`
- `styles.css`
- `service-worker.js`
- `test.js`

### 完成内容
- **30 篇 AI 生成短文**：按课次分三个等级（1-5课 8 篇 / 6-10课 10 篇 / 11-16课 12 篇），每篇 4-6 句，仅使用已学词汇语法
- **数据隔离**：`source: "ai-generated"` + `tags: ["ai-generated"]`，与课文原文（builtin-lesson）和教材 OCR（textbook）区分
- **队列优先级**：教材原文 > 课文原文 > AI 生成短文
- **视觉标记**：阅读卡片标题旁显示「🤖 AI生成」橙色徽章
- **构建函数增强**：`buildLessonReadingCard` 支持 ai-generated 标签自动注入
- **缓存升级**：service-worker v9 → v10，预缓存新数据文件

### 测试结果
- node --check app.js / data/ai-generated-readings.js / service-worker.js ✓
- node test.js: 35 passed, 0 failed（33→35，新增 AI 短文结构完整性 + 课次范围覆盖 2 项测试）

### 当前状态
- 短文共 48 篇（课文 18 + AI 30）、词汇 624、语法 80，全程序约 2200+ 题
- 手机端联网打开自动更新（SW v10 network-first），AI 短文有独立徽章

> ⚠ 已过时（2026-07-24 第 30 次修改）：现为短文 51 篇（课文 21 + AI 30）、词汇 661、语法 87；
> 短文按句拆成 224 张单句卡；SW 升到 v12 并改为 waiting + 横幅更新流程。

### 下一步建议
- 手机端验：短文阅读标签下遍历几张 AI 短文，确认徽章显示和内容质量
- 后续可继续扩充 AI 短文数量或增加阅读理解选择题

---

## 2026-07-24 第 30 次修改

### 本次目标
- 修「收藏语法后不常亮」；一题只出一句；补第 17 课；当天按掌握状况重复；题量可控
- 解决 iPhone 主屏 App 每次更新都要删图标重装的问题
- 合并散落在 3 个 Gist 里的学习进度，并按合并后的数据重做弱项分析

### 实际改动文件
- `app.js`
- `data/minna-lessons.js`
- `service-worker.js`
- `styles.css`
- `test.js`
- `README.md`
- `UPDATE_LOG_MANUAL.md`（含对旧条目的过时标注，见文末）

### 完成内容

**① 收藏语法点不常亮（bug）**
- `.grammar-chip.is-saved` 的 CSS 一直存在，但 JS 从来没加过这个 class——`word-chip` 有 `is-saved` 判断，`grammar-chip` 漏了
- 新增 `normalizeGrammarPattern()` / `findGrammarPointIn()` / `findGrammarPoint()`：只取 `=` 前面的句型，归一化全角半角空格后比对
- 已收藏的 chip 加 `is-saved` + ✓ 前缀，title 变「已收藏，点击更新」；`collectGrammarPoint` 改用同一套查重，重复点击变成更新而不是新增

**② 一题一句**
- 新增 `splitReadingCardBySentence()` / `splitReadingCards()`：把每篇短文按句拆成独立卡，带 `passageId` / `sentenceNo` / `sentenceTotal`
- 内置 21 篇 → 104 张单句卡，AI 30 篇 → 120 张；本地教材 OCR 和 AI 现场生成的短文走同一条路
- 每句有独立 SRS 进度，掌握状况可以按句判定
- 顺带修复：阅读卡的「朗读」按钮原本读 `card.prompt`（中文标题），改为读日文句子本身

**③ 第 17 课（ない形）**
- 词汇 37 条、语法 7 条（ない形变形 / Vないでください / Vなければなりません / Vなくてもいいです / Nは宾语提示 / Nまでに / どうしましたか）、短文 3 篇（病院で / 会社の規則 / 出張の準備）
- 短文只用第 17 课及之前的词汇语法，逐词核对过前 16 课词表
- 新增 `MINNA_LESSON_BASELINE` 常量 + `applyLessonBaseline()`：loadState 时把存档推到基线课次，只推一次（`lessonBaseline` 标记去重）、只前进不后退，历史与复习进度全保留

**④ 当天按掌握状况重复**
- 新增 `sameDayPlan(progress, rating)`：按 评分 + 累计正确率 + 见过次数 决定当天是否再出、隔几题、多久到期
  - 忘了 → 10 分钟后，隔 3 题；模糊（≤5 次或正确率<75%）→ 30 分钟，隔 7 题
  - 会了（首次）→ 90 分钟，隔 12 题；会了（正确率<70%）→ 120 分钟，隔 15 题；已稳定 → 按天数排
- `SAME_DAY_MAX_REPS = 4` 封顶，超过推到第二天
- `moveNext(remove, requeueGap)` + `requeueForToday()`：答完不再直接丢弃，而是插回队列靠后位置；队列只剩这一张时不重复，避免连着出两次

**⑤ 题量可控**
- `state.sessionSizeMode`（manual/auto）+ `manualSessionSize`，设置→教材与进度里可改，默认手动 20 题
- 自动模式取最近 7 个**练习日**的中位数；新增 `READING_SPLIT_DATE = "2026-07-24"`，只统计拆句之后的记录——拆句前一题含 ~5 句，答一题约等于现在的 5 题，两边量纲不同，混算会把题量严重低估（实测会被压到下限 8 题）
- 「今日完成」目标在手动模式下跟着题量走

**⑥ 课次推进缺样本量下限（bug）**
- `maybeAdvanceLesson()` 只看掌握度 ≥80%，没有样本量闸：答对 1 道词汇题 = 1/1 = 100% = 达标推进
- 实测后果：某台设备靠约 50 次答题从第 17 课连推到第 19 课（第 17 课词汇样本仅 1 题、第 18 课仅 3 题）
- 新增 `MIN_VOCAB_SAMPLES = 15` / `MIN_GRAMMAR_SAMPLES = 8`，未达标时 blockers 显示「词汇练习太少(1/15 题)」
- 同时修正设置页文案：原写「总掌握度 ≥50% / ≥65%」，与代码里的「词汇和语法各 ≥80%」对不上

**⑦ 队列被阅读题占满（本次拆句引入的回归）**
- 拆句让阅读卡从 51 张涨到 236 张，压垮了 阅读50%/词汇30%/语法20% 的配比：实测 20 题里 18 阅读 / 1 词汇 / **0 语法**
- 三个原因，全部修复：
  - 阅读模式下根本不往池里放动态词汇/语法卡（只在词汇/语法任务下生成），池里只有 15+24 张静态卡对 236 张阅读卡
  - `dueWords` / `dueGrammar` 只收「做过且到期」的卡，而课本目录题绝大多数没做过 → 桶几乎是空的，配额被阅读吃掉。新增 `newWords` / `newGrammar`
  - 「弱项优先」原本单独占配额，而弱项桶是全模块混排的，阅读卡数量碾压 → 改为**桶内排序**（`weakFirst`），三个核心模块桶排最前
- 修复后：阅读 9-10 / 词汇 5-7 / 语法 4-5（目标 10/6/4）；8 题小队列降级为 3/3/2

**⑧ 偏重产出题**
- 合并后数据显示：产出题（input/arrange）正确率 46%，选择题 87%，差 41 个百分点，瓶颈在「写不出」不在「认不出」
- 新增 `productionFirst(list, ratio)`：按比例把产出题交错排到配额前面；`state.productionRatio` 默认 0.6，设置里可选 30%/60%/80%
- 效果：每轮词汇语法题里的 input 从 ~1 道提到 5 道
- **供给上限**：语法目录 3 种题型全是选择题，一道产出题都没有；词汇每词 3 种里只有 1 种是 input。所以实际占比卡在 ~40%，到不了 60%

**⑨ iOS 主屏 App 免删除重装更新**
- 根因：iOS 主屏 App 有独立于 Safari 的存储容器（删图标会连同步 token 一起丢），且它是「恢复」而不是重新打开，页面可能好几天不重载；旧 `registerServiceWorker()` 只 register 完就不管了，既不查更新也不提示
- SW `install` 里**去掉无条件 `skipWaiting()`**：新版本先停在 waiting（原来新 SW 直接激活，页面这边根本没有「待更新」状态可检测）
- SW 新增 `message` 监听处理 `SKIP_WAITING`
- 页面侧：`updateViaCache: "none"` 注册；`visibilitychange` 切回前台主动 `registration.update()` + 30 分钟定时兜底；检测到 waiting 后显示顶部横幅；点「立即更新」→ postMessage → `controllerchange` 自动刷新（3 秒兜底强制刷新）
- 首次安装不弹提示（判据：`navigator.serviceWorker.controller` 存在才算升级）
- 设置→教材与进度→应用版本：显示 `APP_VERSION`、可手动检查更新
- SW 缓存版本 v10 → v12

**⑩ 课次进度参与云同步**
- 以前 `mergeImportedState()` 完全不碰 `lessonProgress`，三台设备分别停在第 16/17/19 课
- 新增 `mergeLessonProgress()`：`currentLesson` 取两边最大（只前进不后退），每课记录按 `updatedAt` 取新的那份——**不做累加**，否则同一轮练习同步两次会被重复计数；合并后重算派生掌握度
- **测试时当场崩了一次**：对方设备传来的记录缺 `blockers` 字段，`currentLessonState()` 直接透传 undefined，总览页读 `.length` 就炸。以前 lessonProgress 从不同步，记录都是本地 `ensureLessonRecord` 建的永远有这个字段——是开启同步才让这条路可达。两处都修：读取处兜底成数组，合并时补齐整个记录结构

**⑪ 答题历史上限**
- `HISTORY_LIMIT = 1200`（原本本地 400、云端合并 600，两个数不一致）；按每天 20 题算约能存 2 个月

**⑫ 三个 Gist 合并**
- 发现进度分裂在 3 个 Gist 里（详见对 07-08 第 27 次条目的过时标注）
- 用 app 自己的 `mergeHistory`/`mergeProgress`/`mergeById` 并集语义合并，断言零丢失后写回 `c80f075251422031816a8c400057ba93`
- 合并结果：143 条答题（原来只看到 83）、76 张卡进度、19 生词 + 12 语法收藏、11 个练习日
- 写入前清空 `deepseekKey` 和 `gitSync.token`，并校验 payload 无 `ghp_/gho_` 字样

### 未完成/暂缓
- **语法产出题型缺失**：语法目录没有 input 类题型，导致产出题占比到不了设定值。要真正补齐得加变形填空类题目（正对最弱的 `conjugation` 43%）
- 数据保存安全（deviceId/revision/本地恢复点）仍未做

### 测试结果
- `node test.js`：**54 passed, 0 failed**（35 → 54，新增 19 项）
  - 新增覆盖：拆句、语法查重与常亮、`sameDayPlan`、`requeueForToday`、课次基线迁移、样本量推进闸、`mergeLessonProgress`（含缺字段兜底）、`productionFirst`
- 浏览器实测（Chrome，本地 8787）：
  - 语法 chip 点击后 `is-saved` 生效、背景转绿、重新 render 和读 localStorage 后仍常亮，二次点击是更新不是新增
  - 拆句后队列里无多句阅读卡，卡头显示「第 n/N 句」
  - 真实点评分按钮：答「忘了」后卡片插回第 3 位并在 3 题后重新出现，队列长度不变
  - 用真实存档验证课次迁移：16 → 17，83 条历史 + 61 张卡进度一条没丢
  - **完整走通更新流程**：改 SW 模拟发版 → `update()` 检测到 → 进 waiting → 横幅出现 → 点「立即更新」→ 页面真的重载（标记消失、横幅消失、waiting 清空、新 SW activated）

### 当前状态
- 课次基线：**第 17 课**；短文 51 篇（课文 21 + AI 30）→ 拆成 224 张单句卡；词汇 661、语法 87
- 每轮题量：手动 20 题，配比 阅读 ~10 / 词汇 ~6 / 语法 ~4，其中产出题 5 道左右
- 同步：单一 Gist `c80f0752…`，课次进度也参与同步
- 手机更新：切回前台自动检查 → 横幅 → 一键更新，**不再需要删图标重装**

### 对旧日志条目的处理
本次没有删除任何历史条目（完成内容是当时的事实记录），但给 4 处已被推翻或已过时的表述加了 `⚠` 标注：
- **07-08 第 27 次「当前状态」**：「两端独立运行，互为备份」结论是错的——那不是设计而是 `createGitHubGist()` 在 `gistId` 为空时静默新建云端的 bug，实际造成进度分裂成 3 个互不相通的 Gist
- **07-13 第 28 次「当前状态」**：第 17 课数据已补齐；「联网打开自动更新」对 iOS 主屏 App 不成立
- **07-14 第 29 次「当前状态」**：短文/词汇/语法数量已变；SW 已升到 v12 且换了更新流程
- **07-07 第 23 次 / 07-08 第 24 次**：`maybeAdvanceLesson` 的 65% 阈值和加权惩罚公式已两次改写，标注指向最新规则

### 下一步建议
- 手机上把 Gist ID 填成 `c80f075251422031816a8c400057ba93`，确认课次进度和历史都同步过来
- 第 17 课优先啃 ない形变形——`jp-grammar-007`「把『行きます』变成 ない形」是全库最烂的三张卡之一，0 对 2 错
- 先清逾期卡再上新课，避免重演 06-30 那天（一天 45 题、正确率掉到 67%）
- 考虑给语法目录加产出题型，补上 ⑧ 的供给缺口
