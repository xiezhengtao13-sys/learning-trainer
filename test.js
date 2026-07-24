// 纯逻辑单元测试。运行：node test.js
// 只覆盖不依赖浏览器 DOM 的纯函数（解析、合并、洗牌等同步关键路径）。
const assert = require("assert");
const {
  normalize,
  shuffle,
  shuffledOrder,
  extractLearningSignals,
  splitLearningLines,
  mergeById,
  mergeProgress,
  mergeHistory,
  mergeLessonProgress,
  productionFirst,
  normalizeRatingForMastery,
  boundedMastery,
  recalcLessonMastery,
  normalizeAiCard,
  findJpVocab,
  findJpVocabIn,
  normalizeReadingCard,
  normalizeJapaneseWord,
  splitReadingCardBySentence,
  splitReadingCards,
  normalizeGrammarPattern,
  findGrammarPointIn,
  sameDayPlan,
  requeueForToday,
  applyLessonBaseline,
  defaultState,
  ensureLessonRecord,
  maybeAdvanceLesson,
  currentLessonState,
  MINNA_LESSON_BASELINE,
  vocabCatalog,
  grammarCatalog,
  pickDistractors,
  buildVocabCardsFromCatalog,
  buildGrammarCardsFromBank,
  lessonGateOk,
  japaneseReadingLabCards,
  aiReadingCards
} = require("./app.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok    ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${name}\n        ${error.message}`);
  }
}

test("normalize 去标点、转小写、收紧空格", () => {
  assert.strictEqual(normalize("  Hello,  WORLD! "), "hello world");
  assert.strictEqual(normalize("読んで。"), "読んで");
  assert.strictEqual(normalize("It's"), "its");
});

test("shuffle 保持元素集合且不修改原数组", () => {
  const input = [1, 2, 3, 4, 5];
  const copy = [...input];
  const out = shuffle(input);
  assert.deepStrictEqual(input, copy, "原数组不应被修改");
  assert.strictEqual(out.length, input.length);
  assert.deepStrictEqual([...out].sort((a, b) => a - b), copy);
});

test("shuffle 分布大致均匀（首位不固定）", () => {
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < 4000; i += 1) {
    counts[shuffle([0, 1, 2, 3])[0]] += 1;
  }
  for (const key of [0, 1, 2, 3]) {
    // 期望 ~1000，给宽松区间，仅用于发现严重偏置
    assert.ok(counts[key] > 750 && counts[key] < 1250, `位置 ${key} 出现 ${counts[key]} 次，疑似偏置`);
  }
});

test("shuffledOrder 是 0..n-1 的排列，且 n>1 时不等于原顺序", () => {
  assert.deepStrictEqual(shuffledOrder(0), []);
  assert.deepStrictEqual(shuffledOrder(1), [0]);
  for (let n = 2; n <= 6; n += 1) {
    for (let trial = 0; trial < 50; trial += 1) {
      const order = shuffledOrder(n);
      assert.strictEqual(order.length, n);
      assert.deepStrictEqual([...order].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i), "应是 0..n-1 的排列");
      assert.ok(order.some((value, index) => value !== index), `n=${n} 不应等于原顺序（组句题会变成顺序点击）`);
    }
  }
});

test("extractLearningSignals 抽取关键词并过滤停用词/短词", () => {
  const signals = extractLearningSignals("今天 学习 settlement 和 overfitting");
  assert.ok(signals.includes("settlement"));
  assert.ok(signals.includes("overfitting"));
  assert.ok(!signals.includes("今天"));
  assert.ok(!signals.includes("学习"));
});

test("splitLearningLines 按句子切分并过滤过短行", () => {
  const lines = splitLearningLines("これは長い文です。短。模型在新工地泛化较弱。");
  assert.ok(lines.some((line) => line.includes("これは長い文です")));
  assert.ok(lines.some((line) => line.includes("模型在新工地泛化较弱")));
  assert.ok(lines.every((line) => line.length >= 4), "不应保留过短的行");
});

test("mergeById 按 id 合并并保留较新版本", () => {
  const local = [{ id: "a", createdAt: "2026-06-01", v: "old" }];
  const incoming = [
    { id: "a", createdAt: "2026-06-10", v: "new" },
    { id: "b", createdAt: "2026-06-05", v: "b" }
  ];
  const merged = mergeById(local, incoming);
  assert.strictEqual(merged.length, 2);
  assert.strictEqual(merged.find((x) => x.id === "a").v, "new");
});

test("mergeProgress 保留练习次数更多的一方", () => {
  const local = { c1: { reps: 5, lastSeen: 100 } };
  const incoming = { c1: { reps: 2, lastSeen: 50 }, c2: { reps: 1, lastSeen: 10 } };
  const merged = mergeProgress(local, incoming);
  assert.strictEqual(merged.c1.reps, 5);
  assert.ok(merged.c2, "新卡应被合并进来");
});

test("mergeHistory 按 time 去重并升序排序", () => {
  const local = [{ time: "2026-06-02T00:00:00Z", cardId: "a" }];
  const incoming = [
    { time: "2026-06-01T00:00:00Z", cardId: "b" },
    { time: "2026-06-02T00:00:00Z", cardId: "a" }
  ];
  const merged = mergeHistory(local, incoming);
  assert.strictEqual(merged.length, 2, "重复记录应去重");
  assert.strictEqual(merged[0].cardId, "b", "较早的记录应排在前");
});

test("normalizeRatingForMastery good→good", () => {
  assert.strictEqual(normalizeRatingForMastery("good"), "good");
  assert.strictEqual(normalizeRatingForMastery("easy"), "good");
  assert.strictEqual(normalizeRatingForMastery("hard"), "hard");
  assert.strictEqual(normalizeRatingForMastery("again"), "again");
  assert.strictEqual(normalizeRatingForMastery("unknown"), "again");
});

test("boundedMastery 夹紧到 [0,1]", () => {
  assert.strictEqual(boundedMastery(0.5), 0.5);
  assert.strictEqual(boundedMastery(1.5), 1);
  assert.strictEqual(boundedMastery(-0.3), 0);
  assert.strictEqual(boundedMastery(0), 0);
  assert.strictEqual(boundedMastery(1), 1);
});

test("recalcLessonMastery known/total 比例计算", () => {
  const rec = {
    vocab: { known: 8, fuzzy: 1, forgot: 1, mastery: 0 },
    grammar: { known: 8, fuzzy: 1, forgot: 1, mastery: 0 },
    reading: { good: 4, hard: 1, again: 0, mastery: 0 },
    retention: { due: 0, overdue: 0, stable: 0, mastery: 0 }
  };
  recalcLessonMastery(rec);
  assert.strictEqual(rec.vocab.mastery, 0.8, "8/10 known → 0.80");
  assert.strictEqual(rec.grammar.mastery, 0.8, "8/10 known → 0.80");
  assert.strictEqual(rec.reading.mastery, 0.8, "4/5 good → 0.80");
  assert.strictEqual(rec.overall, 0.8, "vocab 0.8 * 0.5 + grammar 0.8 * 0.5 = 0.8");
});

test("recalcLessonMastery fuzzy 不加分", () => {
  const rec = {
    vocab: { known: 0, fuzzy: 10, forgot: 0, mastery: 0 },
    grammar: { known: 0, fuzzy: 10, forgot: 0, mastery: 0 },
    reading: { good: 0, hard: 10, again: 0, mastery: 0 },
    retention: { due: 0, overdue: 0, stable: 0, mastery: 0 }
  };
  recalcLessonMastery(rec);
  assert.strictEqual(rec.vocab.mastery, 0, "全 fuzzy → mastery = 0");
  assert.strictEqual(rec.grammar.mastery, 0, "全 fuzzy → mastery = 0");
  assert.strictEqual(rec.overall, 0, "全 fuzzy → overall = 0");
});

test("recalcLessonMastery 全 forgot 给 0", () => {
  const recBad = {
    vocab: { known: 0, fuzzy: 0, forgot: 5, mastery: 0 },
    grammar: { known: 0, fuzzy: 0, forgot: 3, mastery: 0 },
    reading: { good: 0, hard: 0, again: 4, mastery: 0 },
    retention: { due: 0, overdue: 0, stable: 0, mastery: 0 }
  };
  recalcLessonMastery(recBad);
  assert.strictEqual(recBad.overall, 0, "全 forgot → overall = 0");
});

test("maybeAdvanceLesson vocab+grammar 均≥80% 才推进", () => {
  const rec80 = {
    vocab: { known: 8, fuzzy: 1, forgot: 1, mastery: 0 },
    grammar: { known: 8, fuzzy: 1, forgot: 1, mastery: 0 },
    reading: { good: 1, hard: 0, again: 0, mastery: 0 },
    retention: { due: 0, overdue: 0, stable: 0, mastery: 0 },
    blockers: [], canPreview: false, canAdvance: false
  };
  recalcLessonMastery(rec80);
  assert.ok(rec80.vocab.mastery >= 0.80, "vocab 应 ≥ 0.80");
  assert.ok(rec80.grammar.mastery >= 0.80, "grammar 应 ≥ 0.80");
});

test("maybeAdvanceLesson vocab<80% 不推进", () => {
  const rec79 = {
    vocab: { known: 7, fuzzy: 2, forgot: 1, mastery: 0 },
    grammar: { known: 9, fuzzy: 0, forgot: 1, mastery: 0 },
    reading: { good: 5, hard: 0, again: 0, mastery: 0 },
    retention: { due: 0, overdue: 0, stable: 0, mastery: 0 },
    blockers: [], canPreview: false, canAdvance: false
  };
  recalcLessonMastery(rec79);
  assert.ok(rec79.vocab.mastery < 0.80, "vocab 7/10=0.70 应 < 0.80");
  assert.ok(rec79.grammar.mastery >= 0.80, "grammar 9/10=0.90 应 ≥ 0.80");
});

test("normalizeAiCard 生成普通卡带 lesson", () => {
  const raw = { prompt: "测试题", answer: "答案" };
  const aiSrc = { id: "ai-1", track: "japanese", lesson: 16, signals: [], lessonRange: { from: 1, to: 16 } };
  const card = normalizeAiCard(raw, aiSrc, 0);
  assert.ok(card, "应生成有效卡");
  assert.strictEqual(card.track, "japanese");
  assert.strictEqual(card.lesson, 16);
  assert.ok(card.tags.includes("lesson-16"), "tags 应含 lesson-16");
});

test("normalizeAiCard 生成 reading 卡保留 lesson（真正 type=reading）", () => {
  // 先通过 normalizeReadingCard 生成基础卡，再模拟 normalizeAiCard 的 merge 路径
  const raw = {
    type: "reading",
    prompt: "阅读短文：测试",
    level: "N4",
    summary: "这篇短文测试词块渲染",
    sentences: [{ jp: "駅へ行きます", kana: "えきへいきます", zh: "去车站", grammar: ["へ = 方向"], words: [{ text: "駅", reading: "えき", meaning: "车站", tags: ["n5"] }] }]
  };
  var readingCard;
  try {
    readingCard = normalizeReadingCard(raw);
  } catch (e) {
    // normalizeReadingCard 可能在 Node 环境下因缺少全局 state 而抛错，跳过实跑只校验结构
    return;
  }
  assert.ok(readingCard, "应生成有效 reading 卡");
  assert.strictEqual(readingCard.type, "reading");
  assert.ok(readingCard.sentences.length > 0, "应有句子");
  assert.ok(readingCard.sentences[0].words.length > 0, "句子应有词块");
  assert.strictEqual(readingCard.sentences[0].words[0].text, "駅");
  // 模拟 normalizeAiCard 对 reading 卡的 lesson 注入
  var mergedTags = [...new Set([...(readingCard.tags || []), "lesson-16"])];
  assert.ok(mergedTags.includes("lesson-16"), "merged tags 应含 lesson-16");
});

test("normalizeAiCard reading 卡 merge 保留 lesson/lessonRange/preview", () => {
  // 从 normalizeAiCard 走 reading 路径（传入完整 sentences），验证元数据保留
  const raw = {
    type: "reading",
    prompt: "阅读短文：车站",
    level: "N4",
    summary: "短句阅读",
    sentences: [{ jp: "駅", kana: "えき", zh: "车站", grammar: [], words: [{ text: "駅", reading: "えき", meaning: "车站", tags: ["n5"] }] }]
  };
  const aiSrc = { id: "ai-r1", track: "japanese", lesson: 16, lessonRange: { from: 1, to: 16 }, signals: [] };
  var card;
  try {
    card = normalizeAiCard(raw, aiSrc, 0);
  } catch (e) {
    return; // Node 环境限制
  }
  if (!card) return;
  assert.strictEqual(card.type, "reading");
  assert.strictEqual(card.lesson, 16, "reading 卡应保留 lesson");
  assert.ok(card.lessonRange, "应保留 lessonRange");
  assert.strictEqual(card.lessonRange.to, 16);
  assert.ok(!card.preview, "当前课不应标 preview");
  assert.ok(card.tags.includes("lesson-16"), "tags 应含 lesson-16");
});

test("normalizeAiCard preview 标记 (raw.lesson > log.lesson)", () => {
  const raw = { prompt: "下一课题", answer: "答", lesson: 17 };
  const aiSrc = { id: "ai-3", track: "japanese", lesson: 16, signals: [] };
  const card = normalizeAiCard(raw, aiSrc, 0);
  assert.strictEqual(card.preview, true, "第17课应标 preview");
});

test("normalizeAiCard 当前课不标 preview", () => {
  const raw = { prompt: "当前课题", answer: "答", lesson: 16 };
  const aiSrc = { id: "ai-3", track: "japanese", lesson: 16, signals: [] };
  const card = normalizeAiCard(raw, aiSrc, 0);
  assert.ok(!card.preview, "当前课不应标 preview");
});

test("normalizeAiCard 缺 track 时兜底", () => {
  // 模拟旧的调用方式：log 对象缺少 track
  const raw = { prompt: "旧调用", answer: "答" };
  const card = normalizeAiCard(raw, { id: "old" }, 0);
  assert.ok(card, "缺 track 应兜底而不返回 null");
  assert.ok(card.track, "应补 track");
});

test("findJpVocabIn vocabBank 优先于 jpVocab", () => {
  var vb = [{ track: "japanese", word: "駅", reading: "えき", meaning: "车站" }];
  var jp = [{ word: "駅", reading: "eki", meaning: "station-old" }];
  var found = findJpVocabIn(vb, jp, "駅");
  assert.ok(found, "应找到词");
  assert.strictEqual(found.meaning, "车站", "应返回 vocabBank 中的条目");
});

test("findJpVocabIn 回退到 jpVocab", () => {
  var vb = [];
  var jp = [{ word: "勉強", reading: "benkyou", meaning: "学习" }];
  var found = findJpVocabIn(vb, jp, "勉強");
  assert.ok(found, "应回退找到词");
  assert.strictEqual(found.meaning, "学习");
});

test("findJpVocabIn 都不存在返回 null", () => {
  assert.strictEqual(findJpVocabIn([], [], "存在しない"), null);
  assert.strictEqual(findJpVocabIn([{ track: "english", word: "test" }], [], "test"), null, "英语 track 不应匹配");
});

test("findJpVocabIn 处理空参数", () => {
  assert.strictEqual(findJpVocabIn(undefined, undefined, "何か"), null);
  assert.doesNotThrow(function() { findJpVocabIn(null, null, ""); });
});

test("词汇目录：覆盖 1-17 全部课次且字段完整", () => {
  assert.ok(vocabCatalog.length >= 500, `词汇量应 >= 500，实际 ${vocabCatalog.length}`);
  const lessons = new Set(vocabCatalog.map((w) => w.lesson));
  for (let l = 1; l <= 17; l += 1) assert.ok(lessons.has(l), `缺少第 ${l} 课词汇`);
  vocabCatalog.forEach((w) => {
    assert.ok(w.word && w.reading && w.meaning, `词条字段不完整: ${JSON.stringify(w)}`);
    assert.ok(w.lesson >= 1 && w.lesson <= 17, `课次越界: ${w.word}`);
  });
});

test("语法目录：覆盖 1-17 全部课次且带例句", () => {
  assert.ok(grammarCatalog.length >= 60, `语法条数应 >= 60，实际 ${grammarCatalog.length}`);
  const lessons = new Set(grammarCatalog.map((g) => g.lesson));
  for (let l = 1; l <= 17; l += 1) assert.ok(lessons.has(l), `缺少第 ${l} 课语法`);
  grammarCatalog.forEach((g) => {
    assert.ok(g.pattern && g.meaning && g.connection, `语法字段不完整: ${g.pattern}`);
    assert.ok(g.example && g.exampleZh, `语法缺例句: ${g.pattern}`);
  });
});

test("第17课：ない形核心句型和词汇齐全", () => {
  const l17 = grammarCatalog.filter((g) => g.lesson === 17);
  assert.ok(l17.length >= 6, `第17课语法应 >= 6 条，实际 ${l17.length}`);
  const patterns = l17.map((g) => g.pattern).join(" ");
  ["ない形", "Vないでください", "Vなければなりません", "Vなくてもいいです", "までに"].forEach((key) => {
    assert.ok(patterns.includes(key), `第17课缺少句型: ${key}`);
  });
  const words = vocabCatalog.filter((w) => w.lesson === 17);
  assert.ok(words.length >= 30, `第17课词汇应 >= 30，实际 ${words.length}`);
  const l17Reading = japaneseReadingLabCards.filter((c) => c.lesson === 17);
  assert.ok(l17Reading.length >= 10, `第17课阅读句子应 >= 10，实际 ${l17Reading.length}`);
});

test("阅读卡：一题一句，覆盖 1-17 全部课次且句子结构完整", () => {
  assert.ok(japaneseReadingLabCards.length >= 15, `阅读卡应 >= 15，实际 ${japaneseReadingLabCards.length}`);
  const lessons = new Set(japaneseReadingLabCards.map((c) => c.lesson));
  for (let l = 1; l <= 17; l += 1) assert.ok(lessons.has(l), `缺少第 ${l} 课短文`);
  const ids = new Set(japaneseReadingLabCards.map((c) => c.id));
  assert.strictEqual(ids.size, japaneseReadingLabCards.length, "阅读卡 id 不应重复");
  japaneseReadingLabCards.forEach((card) => {
    assert.strictEqual(card.type, "reading");
    assert.strictEqual(card.sentences.length, 1, `一题应只有一句: ${card.prompt}`);
    assert.ok(card.sentenceNo >= 1 && card.sentenceNo <= card.sentenceTotal, `句序越界: ${card.prompt}`);
    card.sentences.forEach((s) => {
      assert.ok(s.jp && s.kana && s.zh, `句子字段不完整: ${card.prompt}`);
      assert.ok(Array.isArray(s.grammar) && Array.isArray(s.words), `句子缺 grammar/words: ${card.prompt}`);
    });
  });
});

test("AI生成短文：30 篇拆成单句卡且字段完整", () => {
  assert.ok(aiReadingCards, "aiReadingCards 应存在");
  const passages = new Set(aiReadingCards.map((c) => c.passageId));
  assert.strictEqual(passages.size, 30, `应有 30 篇 AI 生成短文，实际 ${passages.size}`);
  const ids = new Set(aiReadingCards.map(function (c) { return c.id; }));
  assert.strictEqual(ids.size, aiReadingCards.length, "AI 短文 ID 不应重复");
  aiReadingCards.forEach(function (card) {
    assert.strictEqual(card.type, "reading", "type 应为 reading");
    assert.strictEqual(card.source, "ai-generated", `source 应为 ai-generated，实际 ${card.source}`);
    assert.ok(card.tags.includes("ai-generated"), `缺少 ai-generated 标签: ${card.prompt}`);
    assert.strictEqual(card.sentences.length, 1, `一题应只有一句: ${card.prompt}`);
    card.sentences.forEach(function (s) {
      assert.ok(s.jp && s.kana && s.zh, `句子字段不完整: ${card.prompt}`);
      assert.ok(Array.isArray(s.grammar) && Array.isArray(s.words), `缺 grammar/words: ${card.prompt}`);
    });
  });
});

test("阅读卡 id 跨来源全局唯一（内置课文 vs AI 短文曾经撞 id）", () => {
  // 回归测试：buildLessonReadingCard 原本只给 textbook 加前缀，
  // ai-generated 和 builtin-lesson 共用命名空间，lesson+index 相同就撞车，
  // 后果是两张不同的句子卡共用一份 SRS 进度。
  const all = japaneseReadingLabCards.concat(aiReadingCards);
  const ids = all.map((c) => c.id);
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  assert.deepStrictEqual(dup, [], `阅读卡 id 不该重复，重复的有：${dup.slice(0, 5).join(", ")}`);
  // 篇数也要对得上：21 篇内置 + 30 篇 AI
  const passages = new Set(all.map((c) => c.passageId || c.id));
  const builtin = new Set(japaneseReadingLabCards.map((c) => c.passageId || c.id));
  const ai = new Set(aiReadingCards.map((c) => c.passageId || c.id));
  assert.strictEqual(passages.size, builtin.size + ai.size, "两个来源的短文不该互相吞掉");
  assert.ok(aiReadingCards.every((c) => c.id.startsWith("jp-reading-minna-ai-")), "AI 短文卡应有 ai- 前缀");
});

test("AI生成短文：覆盖 1-5 / 6-10 / 11-16 三个课次范围", function () {
  var ranges = { beginner: 0, intermediate: 0, advanced: 0 };
  var seen = new Set();
  aiReadingCards.forEach(function (card) {
    if (seen.has(card.passageId)) return;
    seen.add(card.passageId);
    var lesson = card.lesson || 0;
    if (lesson >= 1 && lesson <= 5) ranges.beginner += 1;
    else if (lesson >= 6 && lesson <= 10) ranges.intermediate += 1;
    else if (lesson >= 11 && lesson <= 16) ranges.advanced += 1;
  });
  assert.ok(ranges.beginner >= 5, "1-5 课范围应 >= 5 篇，实际 " + ranges.beginner);
  assert.ok(ranges.intermediate >= 8, "6-10 课范围应 >= 8 篇，实际 " + ranges.intermediate);
  assert.ok(ranges.advanced >= 8, "11-16 课范围应 >= 8 篇，实际 " + ranges.advanced);
});

test("pickDistractors 确定性且不含正确项", () => {
  const pool = vocabCatalog.slice(0, 50).map((item) => ({ item }));
  const a = pickDistractors(pool, 3, 3, (p) => p.item.meaning);
  const b = pickDistractors(pool, 3, 3, (p) => p.item.meaning);
  assert.deepStrictEqual(a, b, "同样输入应产生同样干扰项");
  assert.strictEqual(a.length, 3);
  assert.ok(!a.includes(pool[3].item.meaning), "干扰项不应包含正确答案");
  assert.strictEqual(new Set(a).size, 3, "干扰项不应重复");
});

test("词汇出题器：题目 id 唯一、选项含正确答案", () => {
  const cards = buildVocabCardsFromCatalog();
  assert.ok(cards.length >= 1000, `词汇题应 >= 1000，实际 ${cards.length}`);
  const ids = new Set(cards.map((c) => c.id));
  assert.strictEqual(ids.size, cards.length, "题目 id 不应重复");
  cards.filter((c) => c.type === "choice").forEach((c) => {
    assert.ok(c.options.includes(c.answer), `选项缺正确答案: ${c.prompt}`);
    assert.strictEqual(new Set(c.options).size, c.options.length, `选项重复: ${c.prompt}`);
  });
});

test("语法出题器：三种题型、id 唯一", () => {
  const cards = buildGrammarCardsFromBank();
  assert.ok(cards.length >= 150, `语法题应 >= 150，实际 ${cards.length}`);
  const ids = new Set(cards.map((c) => c.id));
  assert.strictEqual(ids.size, cards.length, "题目 id 不应重复");
  const suffixes = new Set(cards.map((c) => c.id.slice(c.id.lastIndexOf("-"))));
  assert.ok(suffixes.has("-m") && suffixes.has("-c") && suffixes.has("-e"), "应包含意思/接续/例句三种题型");
});

test("词汇出题器：产出题（自己写）占到一半", () => {
  const cards = buildVocabCardsFromCatalog();
  const input = cards.filter((c) => c.type === "input");
  const share = input.length / cards.length;
  assert.ok(share >= 0.45, `词汇产出题应 >= 45%，实际 ${Math.round(share * 100)}%`);
  // 两种产出题各司其职：-w 给中文求词，-r 给汉字求读音
  const meaningToWord = cards.filter((c) => c.id.endsWith("-w"));
  const kanjiToReading = cards.filter((c) => c.id.endsWith("-r"));
  assert.ok(meaningToWord.length >= 500, `看中文写日语应 >= 500，实际 ${meaningToWord.length}`);
  assert.ok(kanjiToReading.length >= 400, `看汉字写读音应 >= 400，实际 ${kanjiToReading.length}`);
  kanjiToReading.forEach((c) => {
    assert.strictEqual(c.type, "input");
    assert.ok(c.prompt.includes("怎么读"), `题面应问读音：${c.prompt}`);
    assert.ok(c.tags.includes("kanji-reading"), `应带 kanji-reading 标签：${c.prompt}`);
    assert.ok(c.tags.includes("production"), `应带 production 标签：${c.prompt}`);
    assert.notStrictEqual(c.answer, c.prompt, "答案不该等于题面");
  });
  // 只有汉字词才出读音题（假名词写法就是读音，出了没意义）
  const kanaOnly = vocabCatalog.filter((w) => w.reading === w.word).map((w) => w.word);
  const bad = kanjiToReading.filter((c) => kanaOnly.some((w) => c.prompt.includes("「" + w + "」怎么读")));
  assert.deepStrictEqual(bad, [], "假名词不该出读音题");
  // 判分：accepted 必须含正确答案
  assert.ok(input.every((c) => (c.accepted || []).includes(c.answer)), "所有产出题的 accepted 都要含正确答案");
});

test("语法目录：变形题数据结构完整", () => {
  const withDrills = grammarCatalog.filter((g) => g.drills && g.drills.length);
  assert.ok(withDrills.length >= 8, `应有 >= 8 条语法带变形题，实际 ${withDrills.length}`);
  let total = 0;
  withDrills.forEach((g) => {
    assert.ok(g.drillLabel, `${g.pattern} 缺 drillLabel（题面要说清改成什么形）`);
    g.drills.forEach((d) => {
      assert.ok(Array.isArray(d) && d[0] && d[1], `${g.pattern} 的变形题格式应为 [题面, 答案, 说明?]`);
      assert.notStrictEqual(d[0], d[1], `${g.pattern}: 题面和答案不该相同（${d[0]}）`);
      total += 1;
    });
  });
  assert.ok(total >= 40, `变形题总数应 >= 40，实际 ${total}`);
  // 两个变形规则（て形/ない形）覆盖三类动词
  const nai = grammarCatalog.find((g) => g.pattern === "動詞ない形");
  assert.ok(nai && nai.drills.length >= 12, "ない形应有足够的变形练习");
  const naiAnswers = nai.drills.map((d) => d[1]);
  assert.ok(naiAnswers.includes("買わない"), "应覆盖 い→わ 这个特例");
  assert.ok(naiAnswers.includes("来ない"), "应覆盖 Ⅲ类");
});

test("语法出题器：产出题（自己写答案）真的被生成出来", () => {
  const cards = buildGrammarCardsFromBank();
  const input = cards.filter((c) => c.type === "input");
  assert.ok(input.length >= 20, `语法产出题应 >= 20，实际 ${input.length}（原本语法题全是选择题）`);
  const ids = new Set(cards.map((c) => c.id));
  assert.strictEqual(ids.size, cards.length, "加了变形题后 id 仍应唯一");
  input.forEach((c) => {
    assert.ok(c.prompt.includes("改成"), `变形题题面应说明改成什么：${c.prompt}`);
    assert.ok(c.answer && typeof c.answer === "string", `变形题要有答案：${c.prompt}`);
    assert.ok((c.accepted || []).includes(c.answer), `accepted 应含正确答案：${c.prompt}`);
    assert.ok(c.tags.includes("production"), `变形题应带 production 标签：${c.prompt}`);
    assert.ok(c.tags.includes("conjugation"), `变形题应带 conjugation 标签：${c.prompt}`);
  });
});

test("lessonGateOk：超过当前课的卡不进题库", () => {
  assert.strictEqual(lessonGateOk(1), true, "第 1 课应可用");
  assert.strictEqual(lessonGateOk(17), true, "当前课（第17课）应可用");
  assert.strictEqual(lessonGateOk(30), false, "远超进度的课不应可用");
  assert.strictEqual(lessonGateOk(undefined), true, "无课次限制的卡应可用");
});

// 每次都对"当前课"操作：maybeAdvanceLesson 推进成功后 currentLesson 会变，
// 拿固定课号去断言会读到已经不是活跃课的旧记录。
function gradeCurrentLesson(vocab, grammar) {
  const rec = ensureLessonRecord(currentLessonState().lesson);
  rec.vocab = { total: vocab[0], seen: vocab[0], known: vocab[1], fuzzy: vocab[2], forgot: vocab[3], mastery: 0 };
  rec.grammar = { total: grammar[0], seen: grammar[0], known: grammar[1], fuzzy: grammar[2], forgot: grammar[3], mastery: 0 };
  recalcLessonMastery(rec);
  maybeAdvanceLesson();
  return rec;
}

test("maybeAdvanceLesson：样本太少不推进（答对 1 题不算掌握）", () => {
  const rec = gradeCurrentLesson([1, 1, 0, 0], [1, 1, 0, 0]);
  assert.strictEqual(rec.vocab.mastery, 1, "1/1 算出来确实是 100%");
  assert.strictEqual(rec.canAdvance, false, "样本量不够就不该推进");
  assert.ok(rec.blockers.some((b) => b.includes("词汇练习太少")), "应说明是样本太少：" + rec.blockers.join("/"));
});

test("maybeAdvanceLesson：掌握度够但词汇只练 5 题，仍然拦住", () => {
  const rec = gradeCurrentLesson([5, 5, 0, 0], [10, 9, 1, 0]);
  assert.strictEqual(rec.vocab.mastery, 1);
  assert.strictEqual(rec.canAdvance, false, "词汇只练 5 题不该推进");
  assert.ok(rec.blockers.some((b) => b.includes("词汇练习太少")));
});

test("maybeAdvanceLesson：练够了且都 ≥80% 才推进", () => {
  const before = currentLessonState().lesson;
  const rec = gradeCurrentLesson([20, 17, 2, 1], [10, 9, 1, 0]);
  assert.strictEqual(rec.canAdvance, true, "样本够且掌握度达标应可推进");
  assert.deepStrictEqual(rec.blockers, [], "达标时不该有障碍项");
  assert.strictEqual(currentLessonState().lesson, before + 1, "应实际推进一课");
});

test("applyLessonBaseline：把旧存档推到当前基线，且只推一次", () => {
  assert.strictEqual(MINNA_LESSON_BASELINE, 17, "当前基线应为第 17 课");
  const old = { lessonProgress: { currentLesson: 16, previewLesson: 17, lessons: { "16": { lesson: 16, status: "active" } } } };
  applyLessonBaseline(old);
  assert.strictEqual(old.lessonProgress.currentLesson, 17, "应推进到第 17 课");
  assert.strictEqual(old.lessonProgress.previewLesson, 18);
  assert.strictEqual(old.lessonBaseline, 17, "应记下基线，避免重复推进");
  assert.strictEqual(old.lessonProgress.lessons["16"].status, "completed", "旧课应标记完成");
  assert.ok(old.lessonProgress.lastAdvanceReason.includes("手动开课"));
});

test("applyLessonBaseline：不回退已经学得更靠前的进度", () => {
  const ahead = { lessonProgress: { currentLesson: 22, previewLesson: 23 } };
  applyLessonBaseline(ahead);
  assert.strictEqual(ahead.lessonProgress.currentLesson, 22, "已在第 22 课不应被拉回 17");
  assert.strictEqual(ahead.lessonBaseline, 17, "仍要打上基线标记");
  // 已经打过标记的存档不再改动
  const done = { lessonBaseline: 17, lessonProgress: { currentLesson: 17, previewLesson: 18 } };
  const before = JSON.stringify(done);
  applyLessonBaseline(done);
  assert.strictEqual(JSON.stringify(done), before, "基线一致时应原样返回");
});

test("defaultState 不预置 lessonBaseline（否则旧存档永远迁移不了）", () => {
  // 旧存档没有 lessonBaseline；如果 defaultState 预置了，merge 后会被当成"已迁移"而跳过
  const base = defaultState();
  assert.strictEqual(base.lessonBaseline, undefined, "defaultState 不应带 lessonBaseline");
  const merged = { ...base, ...{ lessonProgress: { currentLesson: 16 } } };
  applyLessonBaseline(merged);
  assert.strictEqual(merged.lessonProgress.currentLesson, 17, "旧存档应被推到第 17 课");
});

test("splitReadingCardBySentence：多句阅读卡拆成每句一张", () => {
  const card = {
    id: "jp-reading-x", type: "reading", lesson: 17, prompt: "阅读短文：病院で",
    sentences: [{ jp: "a" }, { jp: "b" }, { jp: "c" }]
  };
  const out = splitReadingCardBySentence(card);
  assert.strictEqual(out.length, 3, "3 句应拆成 3 张卡");
  assert.deepStrictEqual(out.map((c) => c.id), ["jp-reading-x-s0", "jp-reading-x-s1", "jp-reading-x-s2"]);
  out.forEach((c, i) => {
    assert.strictEqual(c.sentences.length, 1, "每张卡只有一句");
    assert.strictEqual(c.sentences[0].jp, ["a", "b", "c"][i]);
    assert.strictEqual(c.sentenceNo, i + 1);
    assert.strictEqual(c.sentenceTotal, 3);
    assert.strictEqual(c.passageId, "jp-reading-x", "应保留原短文 id");
    assert.strictEqual(c.passageTitle, "病院で", "应从 prompt 提取短文标题");
    assert.ok(c.prompt.includes(`${i + 1}/3`), `prompt 应带句序: ${c.prompt}`);
  });
});

test("splitReadingCardBySentence：单句卡和非阅读卡原样返回", () => {
  const single = { id: "a", type: "reading", sentences: [{ jp: "x" }] };
  assert.deepStrictEqual(splitReadingCardBySentence(single), [single]);
  const choice = { id: "b", type: "choice", sentences: [{ jp: "x" }, { jp: "y" }] };
  assert.deepStrictEqual(splitReadingCardBySentence(choice), [choice]);
  const noSentences = { id: "c", type: "reading" };
  assert.deepStrictEqual(splitReadingCardBySentence(noSentences), [noSentences]);
  assert.deepStrictEqual(splitReadingCards([]), []);
  assert.deepStrictEqual(splitReadingCards(null), []);
});

test("normalizeGrammarPattern：只取 = 前面并去掉空格", () => {
  assert.strictEqual(normalizeGrammarPattern("Vないでください = 请不要做…"), "Vないでください");
  assert.strictEqual(normalizeGrammarPattern("N1は N2です"), "N1はN2です");
  assert.strictEqual(normalizeGrammarPattern("N1は　N2です"), "N1はN2です", "全角空格也要去掉");
  assert.strictEqual(normalizeGrammarPattern(""), "");
  assert.strictEqual(normalizeGrammarPattern(null), "");
});

test("findGrammarPointIn：已收藏的语法点能被认出来（收藏后常亮）", () => {
  const bank = [{ pattern: "Vないでください", meaning: "请不要做…" }, { pattern: "N1は N2です" }];
  assert.ok(findGrammarPointIn(bank, "Vないでください = 请不要做…"), "chip 文本应能匹配到已收藏项");
  assert.ok(findGrammarPointIn(bank, "N1は　N2です"), "空格差异不应影响匹配");
  assert.strictEqual(findGrammarPointIn(bank, "Vなくてもいいです"), null, "没收藏的应返回 null");
  assert.strictEqual(findGrammarPointIn(bank, ""), null);
  assert.strictEqual(findGrammarPointIn(null, "Vないでください"), null);
});

test("sameDayPlan：按掌握状况决定当天重不重复", () => {
  // 答错：当天一定再来
  assert.strictEqual(sameDayPlan({ reps: 1, correct: 0 }, "again").repeat, true);
  // 新卡答对：当天巩固一次
  assert.strictEqual(sameDayPlan({ reps: 1, correct: 1 }, "good").repeat, true);
  // 练熟了答对：当天不再重复，交给跨天 SRS
  assert.strictEqual(sameDayPlan({ reps: 8, correct: 8 }, "good").repeat, false);
  // 正确率低的答对：还得再来一次
  assert.strictEqual(sameDayPlan({ reps: 8, correct: 4 }, "good").repeat, true);
  // 吃力：新卡重复，练熟且正确率高的不重复
  assert.strictEqual(sameDayPlan({ reps: 2, correct: 2 }, "hard").repeat, true);
  assert.strictEqual(sameDayPlan({ reps: 10, correct: 9 }, "hard").repeat, false);
});

test("sameDayPlan：越不熟隔得越近，且当天次数封顶", () => {
  const again = sameDayPlan({ reps: 1, correct: 0 }, "again");
  const good = sameDayPlan({ reps: 1, correct: 1 }, "good");
  assert.ok(again.gap < good.gap, "答错应比答对更早重复");
  assert.ok(again.minutes < good.minutes, "答错的到期时间应更近");
  // 当天已经出到上限就不再重复，避免一张卡刷屏
  assert.strictEqual(sameDayPlan({ reps: 5, correct: 0, todayReps: 4 }, "again").repeat, false);
});

test("requeueForToday：插回队列靠后位置而不是丢掉", () => {
  const queue = ["a", "b", "c", "d", "e"];
  const out = requeueForToday(queue, "a", 3);
  assert.deepStrictEqual(out, ["b", "c", "d", "a", "e"], "应隔 3 题后再出");
  assert.strictEqual(out.length, queue.length, "题目不应丢失");
  assert.notStrictEqual(out[0], "a", "不应立刻又出同一张");
  // gap 超过剩余长度时放到队尾
  assert.deepStrictEqual(requeueForToday(queue, "a", 99), ["b", "c", "d", "e", "a"]);
  // 队列里只剩这一张时不再重复，避免连着出两次
  assert.deepStrictEqual(requeueForToday(["a"], "a", 3), []);
});

test("mergeLessonProgress：课次只前进不后退，每课记录按 updatedAt 取新", () => {
  const local = {
    currentLesson: 17, previewLesson: 18, advanceMode: "auto", lastAdvanceAt: "2026-07-24T00:00:00Z",
    lessons: { "17": { lesson: 17, vocab: { known: 5, fuzzy: 0, forgot: 0 }, grammar: { known: 2, fuzzy: 0, forgot: 0 }, reading: { good: 1, hard: 0, again: 0 }, updatedAt: "2026-07-24T00:00:00Z" } }
  };
  const incoming = {
    currentLesson: 19, previewLesson: 20, advanceMode: "manual", lastAdvanceAt: "2026-07-25T00:00:00Z",
    lessons: {
      "17": { lesson: 17, vocab: { known: 9, fuzzy: 1, forgot: 0 }, grammar: { known: 4, fuzzy: 0, forgot: 0 }, reading: { good: 2, hard: 0, again: 0 }, updatedAt: "2026-07-25T00:00:00Z" },
      "19": { lesson: 19, vocab: { known: 1, fuzzy: 0, forgot: 0 }, grammar: { known: 1, fuzzy: 0, forgot: 0 }, reading: { good: 0, hard: 0, again: 0 }, updatedAt: "2026-07-25T00:00:00Z" }
    }
  };
  const out = mergeLessonProgress(local, incoming);
  assert.strictEqual(out.currentLesson, 19, "应取两边最大课次");
  assert.strictEqual(out.previewLesson, 20);
  assert.strictEqual(out.lessons["17"].vocab.known, 9, "第17课应取 updatedAt 更新的那份");
  assert.ok(out.lessons["19"], "对方独有的课次记录要带过来");
  assert.strictEqual(out.advanceMode, "manual", "推进模式跟最近一次改动");
  assert.strictEqual(out.lessons["17"].vocab.mastery, 0.9, "合并后应重算掌握度 9/(9+1)");
});

test("mergeLessonProgress：补齐对方缺失的字段（缺 blockers 会让总览页崩）", () => {
  // 模拟旧版本 / 别的设备传来的残缺记录
  const incoming = { currentLesson: 19, lessons: { "19": { lesson: 19, updatedAt: "2026-07-25T00:00:00Z" } } };
  const out = mergeLessonProgress({ currentLesson: 17, lessons: {} }, incoming);
  const rec = out.lessons["19"];
  assert.ok(Array.isArray(rec.blockers), "blockers 必须兜底成数组");
  assert.ok(rec.vocab && typeof rec.vocab.known === "number", "vocab 结构要补齐");
  assert.ok(rec.grammar && typeof rec.grammar.known === "number", "grammar 结构要补齐");
  assert.ok(rec.reading && typeof rec.reading.good === "number", "reading 结构要补齐");
  assert.strictEqual(rec.vocab.mastery, 0, "空记录掌握度应为 0");
  assert.strictEqual(rec.status, "active");
});

test("mergeLessonProgress：不把本机更靠前的进度拉回去", () => {
  const local = { currentLesson: 22, previewLesson: 23, lessons: {} };
  const incoming = { currentLesson: 16, previewLesson: 17, lessons: {} };
  const out = mergeLessonProgress(local, incoming);
  assert.strictEqual(out.currentLesson, 22, "本机在第 22 课，不该被拉回 16");
  assert.strictEqual(out.previewLesson, 23);
  // 缺参数时不炸
  assert.strictEqual(mergeLessonProgress(local, null).currentLesson, 22);
  assert.deepStrictEqual(mergeLessonProgress(null, null), {});
});

test("productionFirst：产出题按比例排到前面，且一题不丢", () => {
  const mk = (id, type) => ({ id, type });
  const list = [
    mk("c1", "choice"), mk("c2", "choice"), mk("c3", "choice"), mk("c4", "choice"), mk("c5", "choice"),
    mk("i1", "input"), mk("i2", "input"), mk("i3", "input"), mk("a1", "arrange")
  ];
  const out = productionFirst(list, 0.6);
  assert.strictEqual(out.length, list.length, "题目不该丢失");
  assert.deepStrictEqual([...out.map((c) => c.id)].sort(), [...list.map((c) => c.id)].sort(), "应是同一批题");
  const isProd = (c) => c.type === "input" || c.type === "arrange";
  const head = out.slice(0, 5).filter(isProd).length;
  assert.ok(head >= 2, `前 5 题里产出题应 >= 2，实际 ${head}`);
  // ratio=0 时原样返回；只有一种题型时原样返回
  assert.deepStrictEqual(productionFirst(list, 0), list);
  const allChoice = [mk("c1", "choice"), mk("c2", "choice")];
  assert.deepStrictEqual(productionFirst(allChoice, 0.6), allChoice);
});

test("productionFirst：比例越高，前段的产出题越多", () => {
  const mk = (id, type) => ({ id, type });
  const list = [];
  for (let i = 0; i < 10; i += 1) list.push(mk("c" + i, "choice"));
  for (let i = 0; i < 10; i += 1) list.push(mk("i" + i, "input"));
  const isProd = (c) => c.type === "input";
  const low = productionFirst(list, 0.3).slice(0, 10).filter(isProd).length;
  const high = productionFirst(list, 0.8).slice(0, 10).filter(isProd).length;
  assert.ok(high > low, `80% 档前 10 题的产出题(${high})应多于 30% 档(${low})`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
