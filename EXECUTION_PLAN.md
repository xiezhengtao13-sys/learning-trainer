# 三线学习训练器 — 执行计划

更新日期：2026-07-08

---

## 已完成

| 项目 | 完成日期 | 说明 |
|------|----------|------|
| PWA 发布 + GitHub Pages | 06-29 | 在线访问 + Gist 同步 |
| 题库 120 张原创卡 | 06-29 | 日语44/英语43/哲学33 |
| AI 出题（本地/DeepSeek） | 06-30 | proxy/ai-proxy.mjs |
| 移动端 App 形态 | 06-30 | 底部标签栏 + 分视图 |
| 学习速度/生词本/日语解析 | 06-30 | 偏慢检测 + 英语生词 + 本地解析 |
| 课次推进模型 | 07-06 | lessonProgress + 自动推进 |
| AI 出题入库 bug 修复 | 07-06 | normalizeAiCard 传参修正 |
| 生词查找统一 vocabBank | 07-06 | findJpVocab 优先查 vocabBank |
| 智能模式重构 | 07-06 | 删旧模式/通勤/今日记录 |
| **掌握度评估重写** | 07-08 | known/total 比例，不给 fuzzy 加分 |
| **推进阈值改为 80 分** | 07-08 | 词汇+语法分别≥80%才推进 |
| **去除 N1 内容** | 07-08 | 队列/AI prompt 不再引用 N1 |
| **按课生成 20-30 题** | 07-08 | AI prompt 改为按课结构化出题 |
| **清理冗余文档** | 07-08 | 删除 5 个过时计划文件 |
| **1-16 课数据全量载入** | 07-13 | data/minna-lessons.js：624 词 + 80 语法 + 18 篇分课短文 |
| **题库目录化出题** | 07-13 | 词汇 3 题型 ~1700 题、语法 3 题型 ~230 题，按课门控 |
| **生词标签页 + 语法银行修复** | 07-13 | 手机端新增「生词」tab；renderGrammarPanel 首次真正渲染 |
| **教材原文本地加载** | 07-13 | minna-readings.local.json 优先排队，不进仓库 |
| **任务过滤修复** | 07-13 | 词汇题/语法题任务只出对应题型（原先仍出阅读卡） |

---

## 进行中 / 待做

### 优先级 1：阅读收藏词完整体验
- 统一 findJpVocab 到 vocabBank（已完成基础）
- 选词浮动按钮（手机端点击即收藏）
- 收藏词编辑/解析/回显入口
- 待解析词不强行生成普通输入题

### 优先级 2：数据保存安全
- 增加 meta.deviceId / revision / updatedAt
- 导入前预览（备份时间/revision 对比）
- 本地恢复点（最近 5 个快照）
- 改造 diagnosis/readingChat/generatedCards 合并策略

### 优先级 3：针对性练习计划化
- 增加 focusPlans 结构
- 诊断题按 plan 管理，不再粗暴清旧 diag- 题
- 智能队列按 plan 插入弱项题

---

## 关键设计决策记录

### 掌握度公式（2026-07-08 重写）
```
vocabMastery  = known / (known + fuzzy + forgot)
grammarMastery = known / (known + fuzzy + forgot)
readingMastery = good / (good + hard + again)
overall = vocabMastery * 0.50 + grammarMastery * 0.50
```
- fuzzy/hard 不加分也不扣分
- forgot/again 不加分也不扣分
- 只有 known/good 贡献正分

### 课次推进条件
```
canAdvance = vocab.mastery >= 0.80 AND grammar.mastery >= 0.80
canPreview = vocab.mastery >= 0.50 OR grammar.mastery >= 0.50
```

### N1 策略
- N1 数据结构保留在代码中但不使用
- 练习队列不再包含 N1 卡片
- AI 出题/诊断严格限制在课本范围内
- 将来如需恢复 N1 路线，重新引用即可
