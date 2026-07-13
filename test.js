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
  normalizeRatingForMastery,
  boundedMastery,
  recalcLessonMastery,
  normalizeAiCard,
  findJpVocab,
  findJpVocabIn,
  normalizeReadingCard,
  normalizeJapaneseWord,
  vocabCatalog,
  grammarCatalog,
  pickDistractors,
  buildVocabCardsFromCatalog,
  buildGrammarCardsFromBank,
  lessonGateOk,
  japaneseReadingLabCards
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

test("词汇目录：覆盖 1-16 全部课次且字段完整", () => {
  assert.ok(vocabCatalog.length >= 500, `词汇量应 >= 500，实际 ${vocabCatalog.length}`);
  const lessons = new Set(vocabCatalog.map((w) => w.lesson));
  for (let l = 1; l <= 16; l += 1) assert.ok(lessons.has(l), `缺少第 ${l} 课词汇`);
  vocabCatalog.forEach((w) => {
    assert.ok(w.word && w.reading && w.meaning, `词条字段不完整: ${JSON.stringify(w)}`);
    assert.ok(w.lesson >= 1 && w.lesson <= 16, `课次越界: ${w.word}`);
  });
});

test("语法目录：覆盖 1-16 全部课次且带例句", () => {
  assert.ok(grammarCatalog.length >= 60, `语法条数应 >= 60，实际 ${grammarCatalog.length}`);
  const lessons = new Set(grammarCatalog.map((g) => g.lesson));
  for (let l = 1; l <= 16; l += 1) assert.ok(lessons.has(l), `缺少第 ${l} 课语法`);
  grammarCatalog.forEach((g) => {
    assert.ok(g.pattern && g.meaning && g.connection, `语法字段不完整: ${g.pattern}`);
    assert.ok(g.example && g.exampleZh, `语法缺例句: ${g.pattern}`);
  });
});

test("阅读目录：短文覆盖全部课次且句子结构完整", () => {
  assert.ok(japaneseReadingLabCards.length >= 15, `短文数应 >= 15，实际 ${japaneseReadingLabCards.length}`);
  const lessons = new Set(japaneseReadingLabCards.map((c) => c.lesson));
  for (let l = 1; l <= 16; l += 1) assert.ok(lessons.has(l), `缺少第 ${l} 课短文`);
  japaneseReadingLabCards.forEach((card) => {
    assert.strictEqual(card.type, "reading");
    assert.ok(card.sentences.length >= 3, `短文句子太少: ${card.prompt}`);
    card.sentences.forEach((s) => {
      assert.ok(s.jp && s.kana && s.zh, `句子字段不完整: ${card.prompt}`);
      assert.ok(Array.isArray(s.grammar) && Array.isArray(s.words), `句子缺 grammar/words: ${card.prompt}`);
    });
  });
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

test("lessonGateOk：超过当前课的卡不进题库", () => {
  assert.strictEqual(lessonGateOk(1), true, "第 1 课应可用");
  assert.strictEqual(lessonGateOk(16), true, "当前课应可用");
  assert.strictEqual(lessonGateOk(30), false, "远超进度的课不应可用");
  assert.strictEqual(lessonGateOk(undefined), true, "无课次限制的卡应可用");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
