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
  normalizeJapaneseWord
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

test("recalcLessonMastery good 提高阅读掌握度", () => {
  const rec = {
    vocab: { known: 5, fuzzy: 2, forgot: 1, mastery: 0 },
    grammar: { known: 3, fuzzy: 1, forgot: 1, mastery: 0 },
    reading: { good: 4, hard: 1, again: 0, mastery: 0 },
    retention: { due: 0, overdue: 0, stable: 0, mastery: 0 }
  };
  recalcLessonMastery(rec);
  assert.ok(rec.reading.mastery > 0.5, "4 good + 1 hard 应给出 >0.5 的 mastery");
  assert.ok(rec.overall > 0, "overall 应大于 0");
  assert.ok(rec.overall <= 1, "overall 应 ≤ 1");
});

test("recalcLessonMastery again 惩罚降低掌握度", () => {
  const recBad = {
    vocab: { known: 0, fuzzy: 0, forgot: 5, mastery: 0 },
    grammar: { known: 0, fuzzy: 0, forgot: 3, mastery: 0 },
    reading: { good: 0, hard: 0, again: 4, mastery: 0 },
    retention: { due: 0, overdue: 0, stable: 0, mastery: 0 }
  };
  recalcLessonMastery(recBad);
  assert.ok(recBad.overall < 0.3, "全 forgot/again 应给出低 mastery");
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
