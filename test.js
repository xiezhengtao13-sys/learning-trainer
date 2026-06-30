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
  mergeHistory
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
