const STORAGE_KEY = "triad-learning-trainer-v1";
const DAY = 24 * 60 * 60 * 1000;

const japaneseN1Goal = {
  startDate: "2026-07-06",
  targetDate: "2027-07-06",
  currentLevel: "初级 · 大家的日语 1-15 附近",
  targetLevel: "JLPT N1 合格",
  weeklyHours: 12,
  dailyMinutes: 100,
  examSkills: ["文字词汇", "文法", "読解", "聴解", "输出复述"]
};

const japaneseN1Phases = [
  {
    from: 1,
    to: 8,
    title: "补地基：N5/N4 → N3",
    goal: "把て形、ない形、普通形、助词和基础阅读速度补齐，结束只会选答案的阶段。",
    focus: ["基础变形自动化", "助词は/が/を/に/で", "每天1段短文复述"],
    mix: { vocab: 30, grammar: 30, reading: 20, listening: 15, output: 5 }
  },
  {
    from: 9,
    to: 20,
    title: "上坡：N3 → N2",
    goal: "建立中级语法网，开始处理长句、抽象名词和新闻/说明文。",
    focus: ["接续词与句尾判断", "N2核心语法", "长句切分", "听力关键词预判"],
    mix: { vocab: 25, grammar: 30, reading: 25, listening: 15, output: 5 }
  },
  {
    from: 21,
    to: 36,
    title: "主攻：N2 → N1",
    goal: "进入N1长文、评论文、抽象表达和听力即时理解训练。",
    focus: ["N1高频语法", "论说文段落结构", "漢字語与近义词", "影子跟读"],
    mix: { vocab: 25, grammar: 20, reading: 30, listening: 20, output: 5 }
  },
  {
    from: 37,
    to: 48,
    title: "成套：N1综合演练",
    goal: "用限时训练把词汇、文法、阅读、听力串起来，错题只追根因。",
    focus: ["限时阅读", "听力场景反应", "错因归类", "弱项回炉"],
    mix: { vocab: 20, grammar: 20, reading: 30, listening: 25, output: 5 }
  },
  {
    from: 49,
    to: 52,
    title: "冲刺：模考与压缩复盘",
    goal: "减少新内容，压缩错题、提高稳定性，把考试节奏练熟。",
    focus: ["整套节奏", "高错标签清零", "睡眠与状态管理", "最后错题本"],
    mix: { vocab: 15, grammar: 15, reading: 30, listening: 30, output: 10 }
  }
];

// 大家的日语教材配置：AI 生成短文和题目的基础约束
// 手动课次基线：数据里补完一课、并且确认要开始学时把它调高一格。
// loadState 会用它把已保存的进度推到这一课（只推一次），所以调整这里等于"直接开始第 N 课"，
// 不受掌握度门控影响；N → N+1 的自动推进仍然由 maybeAdvanceLesson 的 80% 规则管。
const MINNA_LESSON_BASELINE = 17;

// 版本号：显示在设置里，方便确认手机上的更新到底生效了没有。发版时改这里。
const APP_VERSION = "2026-07-24";

// 每轮默认题数。defaultState() 在模块初始化时就会跑，所以这个常量必须声明在它之前。
const DEFAULT_MANUAL_SESSION_SIZE = 20;

// 答题历史保留条数。按每天 20 题算约能存 2 个月，够做长期趋势分析。
// 云端合并时用同一个上限，避免两边不一致导致同步后又被截断。
const HISTORY_LIMIT = 1200;

// 词汇/语法题里"产出题"（自己写答案）的目标占比。0.6 = 大约每 5 题里 3 题要自己写。
const DEFAULT_PRODUCTION_RATIO = 0.6;

// 推进课次前每课至少要练够的题数。一课约 40 词 / 7 条语法，
// 这个量级保证 80% 是"练了一批之后的 80%"，而不是"答对 1 题的 100%"。
const MIN_VOCAB_SAMPLES = 15;
const MIN_GRAMMAR_SAMPLES = 8;

const japaneseSourceProfile = {
  textbook: "minna-no-nihongo",
  displayName: "大家的日语",
  sourceDir: "minasang",
  currentLesson: MINNA_LESSON_BASELINE,
  masteryEstimate: 0.4,
  activeLessons: { from: 1, to: MINNA_LESSON_BASELINE },
  previewLessons: { from: MINNA_LESSON_BASELINE + 1, to: 25 },
  primaryPdf: "minasang/本册.pdf",
  grammarPdf: "minasang/文法.pdf",
  // 掌握度低于此值不推进课次
  advanceThreshold: 0.50,
  // 当前阶段优先语法点
  priorityGrammar: ["te-form", "nai-form", "plain-form", "particle", "giving-receiving", "permission", "ongoing", "conjunction"]
};

// 《大家的日语》1-17 课完整数据（词汇/语法/分课短文），来自 data/minna-lessons.js
const MINNA_DATA = (function () {
  if (typeof MINNA_LESSONS !== "undefined") return MINNA_LESSONS;
  if (typeof require === "function" && typeof module !== "undefined") {
    try { return require("./data/minna-lessons.js"); } catch (e) { /* Node 下缺文件时回退 */ }
  }
  return { vocab: [], grammar: [], readings: [] };
})();

// AI生成短文：30篇，仅使用第1-16课词汇/语法，标记为 source="ai-generated"
const AI_READINGS_DATA = (function () {
  if (typeof AI_GENERATED_READINGS !== "undefined") return AI_GENERATED_READINGS;
  if (typeof require === "function" && typeof module !== "undefined") {
    try { return require("./data/ai-generated-readings.js"); } catch (e) { /* Node 下缺文件时回退 */ }
  }
  return { readings: [] };
})();

// 词汇目录：1-17 课全部词条（word/reading/meaning/lesson/partOfSpeech/tags）
const vocabCatalog = MINNA_DATA.vocab || [];

// 《大家的日语》第 1-17 课完整语法目录
// grammarBank 只保存用户标记"模糊/不会"的弱项；语法题主来源从此目录穷举
const grammarCatalogFallback = [
  { pattern: "Vてください", meaning: "请做某事", connection: "动词て形 + ください", lesson: 14, level: "N5", tags: ["minna", "lesson-14", "te-form", "request"] },
  { pattern: "Vています", meaning: "正在进行/状态", connection: "动词て形 + います", lesson: 15, level: "N5", tags: ["minna", "lesson-15", "te-form", "ongoing"] },
  { pattern: "Vてもいいですか", meaning: "可以做某事吗", connection: "动词て形 + もいいですか", lesson: 15, level: "N5", tags: ["minna", "lesson-15", "te-form", "permission"] },
  { pattern: "Vてはいけません", meaning: "不可以做某事", connection: "动词て形 + はいけません", lesson: 15, level: "N5", tags: ["minna", "lesson-15", "te-form", "prohibition"] },
  { pattern: "Vてから", meaning: "做完……之后", connection: "动词て形 + から", lesson: 16, level: "N5", tags: ["minna", "lesson-16", "te-form", "sequence"] },
  { pattern: "Vないでください", meaning: "请不要做某事", connection: "动词ない形 + でください", lesson: 16, level: "N5", tags: ["minna", "lesson-16", "nai-form", "request"] },
  { pattern: "Vなければなりません", meaning: "必须做某事", connection: "动词ない形(去い) + ければなりません", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "obligation"] },
  { pattern: "Vなくてもいいです", meaning: "不做也可以", connection: "动词ない形(去い) + くてもいいです", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "permission"] },
  { pattern: "Vたことがあります", meaning: "有过某种经历", connection: "动词た形 + ことがあります", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "experience"] },
  { pattern: "Vたり Vたりします", meaning: "又……又……（列举动作）", connection: "动词た形 + り + 动词た形 + りします", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "listing"] },
  { pattern: "〜と思います", meaning: "我认为……", connection: "普通形 + と思います", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "opinion"] },
  { pattern: "〜と言います", meaning: "叫作……/说……", connection: "普通形 + と言います", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "quotation"] },
  { pattern: "V dictionary form + 前に", meaning: "在做……之前", connection: "动词辞书形 + 前に", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "time"] },
  { pattern: "〜でしょう", meaning: "大概……吧（推测）", connection: "普通形 + でしょう", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "conjecture"] },
  { pattern: "〜ましょうか", meaning: "要我帮你……吗？", connection: "动词ます形(去ます) + ましょうか", lesson: 14, level: "N5", tags: ["minna", "lesson-14", "offer"] },
  { pattern: "Nが できます", meaning: "会做某事/能……", connection: "名词 + ができます / 动词辞书形 + ことができます", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "ability"] },
  { pattern: "〜は 〜が 〜です", meaning: "主题-主语-谓语结构", connection: "N1 は N2 が Adj です", lesson: 10, level: "N5", tags: ["minna", "lesson-10", "structure"] },
  { pattern: "V dictionary form + ことができます", meaning: "能够做某事", connection: "动词辞书形 + ことができます", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "ability"] },
  { pattern: "〜くなる / 〜になる", meaning: "变得……", connection: "い形容词语干 + くなる / な形容词语干 + になる", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "change"] },
  { pattern: "V dictionary form + つもりです", meaning: "打算做某事", connection: "动词辞书形 + つもりです", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "intention"] },
  { pattern: "修饰名词的动词普通形", meaning: "动词普通形可以直接修饰名词", connection: "动词普通形 + 名词（如：あそこで 本を 読んでいる 人）", lesson: 16, level: "N4", tags: ["minna", "lesson-16", "modifier"] },
  { pattern: "N1 は N2 より Adj です", meaning: "N1比N2更……", connection: "N1 は N2 より Adj です", lesson: 12, level: "N5", tags: ["minna", "lesson-12", "comparison"] },
  { pattern: "N1 と N2 と どちらが Adj ですか", meaning: "N1和N2哪个更……", connection: "N1 と N2 と どちらが Adj ですか", lesson: 12, level: "N5", tags: ["minna", "lesson-12", "comparison"] },
  { pattern: "〜中で N が いちばん Adj です", meaning: "在……之中N最……", connection: "〜中で N が いちばん Adj です", lesson: 12, level: "N5", tags: ["minna", "lesson-12", "superlative"] },
  { pattern: "もう Vました / まだ Vていません", meaning: "已经做了/还没做", connection: "もう + た形 / まだ + ていません", lesson: 7, level: "N5", tags: ["minna", "lesson-7", "aspect"] }
];

// 优先使用完整目录（87 条覆盖 1-17 课），数据文件缺失时回退到内置精简版
const grammarCatalog = (MINNA_DATA.grammar && MINNA_DATA.grammar.length) ? MINNA_DATA.grammar : grammarCatalogFallback;

const commuteSegments = [
  {
    id: "platform",
    name: "站台/换乘",
    route: "等车或走路时",
    size: 3,
    hint: "只做单手选择题，随时可停。",
    tracks: ["japanese", "english", "tractatus"],
    types: ["choice"],
    forms: ["quiz"]
  },
  {
    id: "minamiyono-akabane",
    name: "南与野→赤羽",
    route: "JR 段 1",
    size: 8,
    hint: "适合读课文长句，先进入状态。",
    tracks: ["japanese", "english"],
    types: ["choice", "input", "arrange", "self"],
    forms: ["context", "quiz"]
  },
  {
    id: "akabane-oji",
    name: "赤羽→王子",
    route: "短段快练",
    size: 5,
    hint: "短段不打字，做快速判断。",
    tracks: ["japanese", "english", "tractatus"],
    types: ["choice"],
    forms: ["quiz"]
  },
  {
    id: "oji-todaimae",
    name: "王子→东大前",
    route: "地下铁段",
    size: 10,
    hint: "适合长句、默写和口语复述。",
    tracks: ["english", "tractatus", "japanese"],
    types: ["input", "arrange", "self", "choice"],
    forms: ["context", "writing", "speaking"]
  }
];

// 下班模式：回程路线、人比较累，所以题量更小、以选择/听读/复习为主，不安排打字和组句。
const eveningSegments = [
  {
    id: "e-platform",
    name: "站台/换乘",
    route: "等车或走路时",
    size: 3,
    hint: "累了就只点选择题，随时可停。",
    tracks: ["japanese", "english", "tractatus"],
    types: ["choice"],
    forms: ["quiz", "listening"]
  },
  {
    id: "e-todaimae-oji",
    name: "东大前→王子",
    route: "地下铁段",
    size: 6,
    hint: "轻松回顾今天，多看少打字。",
    tracks: ["japanese", "english", "tractatus"],
    types: ["choice", "self"],
    forms: ["quiz", "listening", "context"]
  },
  {
    id: "e-oji-akabane",
    name: "王子→赤羽",
    route: "短段",
    size: 4,
    hint: "短选择，脑子放空也能做。",
    tracks: ["japanese", "english"],
    types: ["choice"],
    forms: ["quiz"]
  },
  {
    id: "e-akabane-minamiyono",
    name: "赤羽→南与野",
    route: "JR 段",
    size: 6,
    hint: "到家前再过一遍弱项和到期。",
    tracks: ["japanese", "english", "tractatus"],
    types: ["choice", "self"],
    forms: ["quiz", "listening"]
  }
];

const tracks = [
  {
    id: "japanese",
    name: "日语",
    mark: "日",
    color: "#d05b4f",
    level: "一年冲刺 · JLPT N1",
    summary: "以阅读短文为主模式，逐句解析后收藏单词和语法点，让单词和语法从阅读中来。",
    modules: [
      { id: "jp-reading", name: "阅读解析" },
      { id: "jp-vocab", name: "阅读单词" },
      { id: "jp-grammar", name: "阅读语法" }
    ],
    _legacyModules: ["jp-listening", "jp-output", "jp-sentence"]
  },
  {
    id: "english",
    name: "英语",
    mark: "EN",
    color: "#286bb8",
    level: "IELTS 6.0 · 工程/AI",
    summary: "以阅读短句/短文为主模式，在语境中积累和复习词汇（不做语法子模式）。",
    modules: [
      { id: "en-reading", name: "阅读词汇" },
      { id: "en-vocab", name: "生词复习" },
      { id: "en-civil", name: "土木词汇" },
      { id: "en-ai", name: "AI学术词汇" },
      { id: "en-ielts", name: "雅思表达" }
    ]
  },
  {
    id: "tractatus",
    name: "逻辑哲学论",
    mark: "L",
    color: "#2f7d5b",
    level: "入门 · 概念地图",
    summary: "用短段落、概念题和关系题建立《逻辑哲学论》的骨架。",
    modules: [
      { id: "tlp-passage", name: "段落精读" },
      { id: "tlp-concept", name: "核心概念" },
      { id: "tlp-relation", name: "关系辨析" },
      { id: "tlp-reading", name: "读法判断" }
    ]
  }
];

const cards = [
  {
    id: "jp-vocab-001",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「はたらきます」最贴近哪一个意思？",
    options: ["工作", "休息", "借入", "等待"],
    answer: "工作",
    speak: "はたらきます",
    explanation: "はたらきます 是「工作」。常见句型：会社で はたらきます。",
    tags: ["vocab", "verb", "kanji-reading"]
  },
  {
    id: "jp-vocab-002",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「借ります」和「貸します」的关系是？",
    options: ["借入 / 借出", "进入 / 出去", "学习 / 教授", "打开 / 关闭"],
    answer: "借入 / 借出",
    speak: "かります。かします。",
    explanation: "借ります 是从别人那里借来；貸します 是把东西借给别人。",
    tags: ["vocab", "verb", "pair-word"]
  },
  {
    id: "jp-vocab-003",
    track: "japanese",
    module: "jp-vocab",
    type: "input",
    prompt: "写出「使用」的日语动词ます形。",
    accepted: ["つかいます", "使います"],
    answer: "使います",
    speak: "つかいます",
    explanation: "使います 表示使用工具、设备、语言等。例：パソコンを使います。",
    tags: ["vocab", "verb", "kanji-reading"]
  },
  {
    id: "jp-vocab-004",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「入ります」通常和哪个助词搭配表示进入某处？",
    options: ["に", "を", "で", "と"],
    answer: "に",
    speak: "へやに はいります",
    explanation: "进入的目标常用 に：部屋に入ります。离开某处常用 を：部屋を出ます。",
    tags: ["vocab", "verb", "particle", "kanji-reading"]
  },
  {
    id: "jp-grammar-001",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "想说「请在这里写名字」，最自然的是？",
    options: [
      "ここに名前を書いてください。",
      "ここで名前を書きますください。",
      "ここを名前で書いてください。",
      "ここに名前を書くてもいいです。"
    ],
    answer: "ここに名前を書いてください。",
    speak: "ここに名前を書いてください。",
    explanation: "请求别人做某事：动词て形 + ください。写在某个位置常用 に。",
    tags: ["grammar", "te-form", "sentence-pattern", "request"]
  },
  {
    id: "jp-grammar-002",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「可以用信用卡吗？」对应哪一句？",
    options: [
      "カードを使ってもいいですか。",
      "カードを使ってはいけませんか。",
      "カードを使っていますか。",
      "カードを使いましょうか。"
    ],
    answer: "カードを使ってもいいですか。",
    speak: "カードを使ってもいいですか。",
    explanation: "许可表达：动词て形 + もいいですか。禁止是 てはいけません。",
    tags: ["grammar", "te-form", "sentence-pattern", "permission"]
  },
  {
    id: "jp-grammar-003",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「现在正在学习日语」应该选哪一句？",
    options: [
      "今、日本語を勉強しています。",
      "今、日本語を勉強してもいいです。",
      "今、日本語を勉強してください。",
      "今、日本語を勉強しませんでした。"
    ],
    answer: "今、日本語を勉強しています。",
    speak: "いま、日本語を勉強しています。",
    explanation: "正在进行：动词て形 + います。",
    tags: ["grammar", "te-form", "sentence-pattern", "ongoing"]
  },
  {
    id: "jp-grammar-004",
    track: "japanese",
    module: "jp-grammar",
    type: "input",
    prompt: "把「飲みます」变成 て形。",
    accepted: ["飲んで", "のんで"],
    answer: "飲んで",
    speak: "のんで",
    explanation: "み/び/に 结尾的一类动词，て形常变为 んで：飲みます -> 飲んで。",
    tags: ["grammar", "conjugation", "te-form"]
  },
  {
    id: "jp-sentence-001",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：请不要在这里拍照。",
    tokens: ["ここで", "写真を", "撮らないで", "ください"],
    answer: ["ここで", "写真を", "撮らないで", "ください"],
    speak: "ここで写真を撮らないでください。",
    explanation: "礼貌地请求不要做某事：ない形 + でください。",
    tags: ["sentence", "word-order", "nai-form", "request"]
  },
  {
    id: "jp-sentence-002",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：我明天和老师去图书馆。",
    tokens: ["あした", "先生と", "図書館へ", "行きます"],
    answer: ["あした", "先生と", "図書館へ", "行きます"],
    speak: "あした先生と図書館へ行きます。",
    explanation: "と 表示一起行动的人；へ 表示移动方向。",
    tags: ["sentence", "particle", "word-order", "とへ"]
  },
  {
    id: "jp-sentence-003",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：我可以坐这里吗？",
    tokens: ["ここに", "座っても", "いいですか"],
    answer: ["ここに", "座っても", "いいですか"],
    speak: "ここに座ってもいいですか。",
    explanation: "座る 的て形是 座って；许可询问用 てもいいですか。",
    tags: ["sentence", "te-form", "word-order", "permission"]
  },
  {
    id: "en-civil-001",
    track: "english",
    module: "en-civil",
    type: "choice",
    prompt: "In civil engineering, “settlement” most often means:",
    options: [
      "downward movement of the ground or foundation",
      "a legal agreement after a dispute",
      "mixing water into concrete",
      "the top layer of asphalt"
    ],
    answer: "downward movement of the ground or foundation",
    speak: "The foundation showed excessive settlement after construction.",
    explanation: "工程语境里 settlement 常指地基或结构的沉降。"
  },
  {
    id: "en-civil-002",
    track: "english",
    module: "en-civil",
    type: "choice",
    prompt: "Choose the best collocation: “___ strength of soil”.",
    options: ["shear", "sharp", "split", "shallow"],
    answer: "shear",
    speak: "The shear strength of soil is critical for slope stability.",
    explanation: "shear strength 是「抗剪强度」，土力学里非常高频。"
  },
  {
    id: "en-civil-003",
    track: "english",
    module: "en-civil",
    type: "input",
    prompt: "Translate into academic English: 钢筋混凝土",
    accepted: ["reinforced concrete"],
    answer: "reinforced concrete",
    speak: "reinforced concrete",
    explanation: "reinforced concrete 指钢筋混凝土；rebar 是钢筋本身。"
  },
  {
    id: "en-civil-004",
    track: "english",
    module: "en-civil",
    type: "choice",
    prompt: "“Permeability” is closest to:",
    options: [
      "the ability of water to pass through a material",
      "the weight carried by a beam",
      "the curing time of concrete",
      "the accuracy of a survey"
    ],
    answer: "the ability of water to pass through a material",
    speak: "Clay usually has low permeability.",
    explanation: "permeability 是渗透性，常用于土、岩石、混凝土等材料。"
  },
  {
    id: "en-ai-001",
    track: "english",
    module: "en-ai",
    type: "choice",
    prompt: "In machine learning, “overfitting” means the model:",
    options: [
      "performs well on training data but poorly on new data",
      "has too few parameters to learn the task",
      "runs faster after deployment",
      "uses only labeled examples"
    ],
    answer: "performs well on training data but poorly on new data",
    speak: "The model overfits the training set and fails to generalize.",
    explanation: "overfitting 是过拟合；generalize/generalization 是泛化。"
  },
  {
    id: "en-ai-002",
    track: "english",
    module: "en-ai",
    type: "input",
    prompt: "Fill in the blank: A simple model used for comparison is called a ___.",
    accepted: ["baseline"],
    answer: "baseline",
    speak: "We compare our method with a strong baseline.",
    explanation: "baseline 是基线模型或基准方法，论文里常用于比较改进幅度。"
  },
  {
    id: "en-ai-003",
    track: "english",
    module: "en-ai",
    type: "choice",
    prompt: "“Inference” in AI deployment usually refers to:",
    options: [
      "using a trained model to make predictions",
      "collecting labels for a dataset",
      "rewriting the loss function",
      "randomly initializing model weights"
    ],
    answer: "using a trained model to make predictions",
    speak: "Inference latency matters in real-time applications.",
    explanation: "训练后的模型进行预测叫 inference。latency 是延迟。"
  },
  {
    id: "en-ai-004",
    track: "english",
    module: "en-ai",
    type: "choice",
    prompt: "Choose the best paraphrase: “The dataset is biased.”",
    options: [
      "The data does not represent the target population fairly.",
      "The data is stored in a smaller file.",
      "The model has fewer layers.",
      "The training process finished early."
    ],
    answer: "The data does not represent the target population fairly.",
    speak: "The dataset is biased.",
    explanation: "biased dataset 指样本分布、标注或来源存在偏差，不是文件大小问题。"
  },
  {
    id: "en-ielts-001",
    track: "english",
    module: "en-ielts",
    type: "choice",
    prompt: "IELTS Task 1: “increase rapidly” 的更学术替换是？",
    options: ["rise sharply", "go big", "move fastly", "become much"],
    answer: "rise sharply",
    speak: "The proportion rose sharply between 2010 and 2020.",
    explanation: "rise sharply 是自然搭配；fastly 基本不用。"
  },
  {
    id: "en-ielts-002",
    track: "english",
    module: "en-ielts",
    type: "input",
    prompt: "把 “I think this is important” 改成更学术的开头。",
    accepted: [
      "it is important to note that",
      "it is worth noting that",
      "it should be noted that"
    ],
    answer: "It is worth noting that ...",
    speak: "It is worth noting that this issue affects long-term safety.",
    explanation: "写作里可以用 It is worth noting that... 来降低口语感。"
  },
  {
    id: "tlp-concept-001",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "《逻辑哲学论》开头把世界理解为：",
    options: ["事实的总和", "物体的清单", "心理经验的集合", "伦理命令的系统"],
    answer: "事实的总和",
    explanation: "入门先抓住区分：世界不是单个东西的清单，而是成立的事实的总和。"
  },
  {
    id: "tlp-concept-002",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "“命题像图像一样表现现实”主要对应哪个理论？",
    options: ["图像论", "功利主义", "经验归纳法", "观念回忆说"],
    answer: "图像论",
    explanation: "图像论关注命题与现实共享某种结构，因此命题能表现可能的事态。"
  },
  {
    id: "tlp-concept-003",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "在《逻辑哲学论》的框架里，逻辑形式更像是：",
    options: [
      "使命题能够表现事实的结构条件",
      "一个心理图像的颜色",
      "某种经验科学结论",
      "一种道德规范"
    ],
    answer: "使命题能够表现事实的结构条件",
    explanation: "逻辑形式不是普通对象；它是命题和现实能够对应的结构条件。"
  },
  {
    id: "tlp-relation-001",
    track: "tractatus",
    module: "tlp-relation",
    type: "arrange",
    prompt: "按入门理解排序：",
    tokens: ["对象", "事态", "事实", "世界"],
    answer: ["对象", "事态", "事实", "世界"],
    explanation: "可粗略记为：对象构成可能的事态；成立的事态是事实；世界由事实构成。"
  },
  {
    id: "tlp-relation-002",
    track: "tractatus",
    module: "tlp-relation",
    type: "choice",
    prompt: "“重言式”在逻辑上最接近：",
    options: [
      "无论事实如何都为真",
      "经验上很可能为真",
      "在伦理上正确",
      "因为观察到很多次所以为真"
    ],
    answer: "无论事实如何都为真",
    explanation: "重言式不描述世界中的具体事实，而展示逻辑结构。"
  },
  {
    id: "tlp-relation-003",
    track: "tractatus",
    module: "tlp-relation",
    type: "choice",
    prompt: "如果一个命题有意义，它至少应该能够：",
    options: [
      "区分世界可能如何与不可能如何",
      "保证说话者道德正确",
      "表达无法想象的神秘对象",
      "自动成为科学定律"
    ],
    answer: "区分世界可能如何与不可能如何",
    explanation: "有意义的命题能描画一种可能的事实状态，因此有真假条件。"
  },
  {
    id: "tlp-reading-001",
    track: "tractatus",
    module: "tlp-reading",
    type: "choice",
    prompt: "读《逻辑哲学论》时，哪种做法更适合初学者？",
    options: [
      "先画概念关系，再回到编号命题",
      "逐字背诵全部命题编号",
      "只看结尾一句，不管前文",
      "先用现代 AI 术语重写全书"
    ],
    answer: "先画概念关系，再回到编号命题",
    explanation: "这本书压缩度很高，初学阶段先建立概念地图会比硬背更稳。"
  },
  {
    id: "tlp-reading-002",
    track: "tractatus",
    module: "tlp-reading",
    type: "input",
    prompt: "用两个字填空：维特根斯坦常被理解为在划定“可说”与“可___”的界限。",
    accepted: ["显示", "示"],
    answer: "显示",
    explanation: "一个常见入口是区分 saying 和 showing：有些东西不能被事实命题说出，却在语言使用中显示出来。"
  },
  {
    id: "tlp-reading-003",
    track: "tractatus",
    module: "tlp-reading",
    type: "self",
    prompt: "用 60 秒解释：为什么“世界是事实的总和”不是“世界是物的总和”？",
    subprompt: "解释完后按自己的清晰度评分。",
    checklist: [
      "是否区分了对象和事实",
      "是否说到对象之间的组合关系",
      "是否给出一个简单例子"
    ],
    sample: "A list of objects does not tell us what is the case. Facts include how objects are arranged, for example whether the book is on the table.",
    explanation: "这题的关键是把“有什么东西”和“事情如何成立”分开。"
  },
  {
    id: "jp-reading-001",
    track: "japanese",
    module: "jp-reading",
    type: "choice",
    prompt: "根据课文，田中さん为什么去图书馆？",
    context: {
      title: "小课文：図書館で",
      body: [
        "きのう、田中さんは大学の図書館へ行きました。",
        "図書館で日本語の本を読んで、新しい言葉をノートに書きました。",
        "うちへ帰ってから、先生にメールを送りました。"
      ],
      translation: "昨天田中去了大学图书馆。在图书馆读了日语书，并把新词写在笔记本上。回家以后，给老师发了邮件。",
      notes: ["へ 表示移动方向", "読んで、書きました 是动作连接", "帰ってから 表示回去之后"]
    },
    options: ["读日语书并记新词", "和老师一起吃饭", "借朋友的钱", "买电脑"],
    answer: "读日语书并记新词",
    speak: "きのう、田中さんは大学の図書館へ行きました。図書館で日本語の本を読んで、新しい言葉をノートに書きました。",
    explanation: "课文第二句给出原因：日本語の本を読んで、新しい言葉をノートに書きました。",
    tags: ["reading", "te-form", "vocab", "kanji-reading"]
  },
  {
    id: "jp-reading-002",
    track: "japanese",
    module: "jp-reading",
    type: "input",
    prompt: "根据课文填空：図書館で日本語の本を___、新しい言葉をノートに書きました。",
    context: {
      title: "小课文：図書館で",
      body: [
        "きのう、田中さんは大学の図書館へ行きました。",
        "図書館で日本語の本を読んで、新しい言葉をノートに書きました。",
        "うちへ帰ってから、先生にメールを送りました。"
      ],
      translation: "昨天田中去了大学图书馆。在图书馆读了日语书，并把新词写在笔记本上。回家以后，给老师发了邮件。",
      notes: ["読む 的て形是 読んで", "て形可以连接先后动作"]
    },
    accepted: ["読んで", "よんで"],
    answer: "読んで",
    speak: "図書館で日本語の本を読んで、新しい言葉をノートに書きました。",
    explanation: "読む -> 読んで。这里不是单独背变化，而是放进课文动作链里记。",
    tags: ["reading", "te-form", "verb", "kanji-reading"]
  },
  {
    id: "jp-reading-003",
    track: "japanese",
    module: "jp-reading",
    type: "arrange",
    prompt: "组出长句：我用电脑写报告后，把邮件发给了老师。",
    context: {
      title: "长句骨架",
      body: ["パソコンを使って、レポートを書いてから、先生にメールを送りました。"],
      translation: "用电脑写完报告后，给老师发了邮件。",
      notes: ["使って 表示使用某工具", "書いてから 表示写完之后", "先生に 表示邮件发送对象"]
    },
    tokens: ["パソコンを使って", "レポートを書いてから", "先生に", "メールを送りました"],
    answer: ["パソコンを使って", "レポートを書いてから", "先生に", "メールを送りました"],
    speak: "パソコンを使って、レポートを書いてから、先生にメールを送りました。",
    explanation: "这个长句把 て形、から、に 的用法串在一起，适合整句记忆。",
    tags: ["reading", "long-sentence", "te-form", "kanji-reading"]
  },
  {
    id: "en-reading-001",
    track: "english",
    module: "en-reading",
    type: "choice",
    prompt: "In the passage, why did the engineer recommend monitoring?",
    context: {
      title: "Civil Engineering Long Sentence",
      body: [
        "During a site inspection, the engineer noticed small cracks near the retaining wall and recommended monitoring the foundation because uneven settlement could reduce long-term structural safety."
      ],
      translation: "现场检查时，工程师注意到挡土墙附近有细小裂缝，并建议监测地基，因为不均匀沉降可能降低长期结构安全性。",
      notes: ["retaining wall = 挡土墙", "uneven settlement = 不均匀沉降", "long-term structural safety = 长期结构安全"]
    },
    options: [
      "Uneven settlement could affect structural safety.",
      "The wall was painted the wrong color.",
      "The concrete had already been replaced.",
      "The site inspection was cancelled."
    ],
    answer: "Uneven settlement could affect structural safety.",
    speak: "During a site inspection, the engineer noticed small cracks near the retaining wall and recommended monitoring the foundation because uneven settlement could reduce long-term structural safety.",
    explanation: "because 后面解释原因：uneven settlement could reduce long-term structural safety。",
    tags: ["reading", "civil", "long-sentence"]
  },
  {
    id: "en-reading-002",
    track: "english",
    module: "en-reading",
    type: "input",
    prompt: "Fill in the academic verb: The model was trained to ___ crack patterns in bridge images.",
    context: {
      title: "AI + Civil Engineering Sentence",
      body: [
        "The model was trained to identify crack patterns in bridge images so that engineers could prioritize detailed inspections more efficiently."
      ],
      translation: "该模型被训练用于识别桥梁图像中的裂缝模式，从而让工程师更高效地安排详细检查的优先级。",
      notes: ["identify = 识别", "prioritize = 确定优先级", "inspection = 检查"]
    },
    accepted: ["identify", "detect"],
    answer: "identify",
    speak: "The model was trained to identify crack patterns in bridge images so that engineers could prioritize detailed inspections more efficiently.",
    explanation: "identify/detect 都可用于“识别裂缝模式”。这里重点是把 AI 动词放进工程语境。",
    tags: ["reading", "ai", "civil", "academic-verb"]
  },
  {
    id: "en-reading-003",
    track: "english",
    module: "en-reading",
    type: "arrange",
    prompt: "Rebuild the sentence: 由于训练数据有限，模型在新工地上的泛化能力较弱。",
    context: {
      title: "Academic Sentence Pattern",
      body: ["Because the training data was limited, the model generalized poorly to new construction sites."],
      translation: "由于训练数据有限，模型在新工地上的泛化能力较弱。",
      notes: ["Because + clause 放句首", "generalize to = 泛化到", "construction site = 工地"]
    },
    tokens: ["Because the training data was limited", "the model", "generalized poorly", "to new construction sites"],
    answer: ["Because the training data was limited", "the model", "generalized poorly", "to new construction sites"],
    speak: "Because the training data was limited, the model generalized poorly to new construction sites.",
    explanation: "这句把原因状语从句和 AI 高频动词 generalize 放在一起练。",
    tags: ["reading", "ai", "long-sentence"]
  },
  {
    id: "tlp-passage-001",
    track: "tractatus",
    module: "tlp-passage",
    type: "choice",
    prompt: "这段话想帮助你区分什么？",
    context: {
      title: "入门段落：事实与对象",
      body: [
        "如果我们只列出桌子、书和房间，还没有说明世界中发生了什么。只有当我们说“书在桌子上”时，才描画了一个可能成立或不成立的事实。"
      ],
      translation: "这不是原书引文，而是入门改写：重点是把对象清单和事实结构分开。",
      notes: ["对象：桌子、书、房间", "事实：书在桌子上", "命题：描画一种可能的事实"]
    },
    options: ["对象清单与事实结构", "数学计算与统计图表", "心理感受与伦理命令", "经验科学与历史叙事"],
    answer: "对象清单与事实结构",
    explanation: "这段用例子说明：光有对象不等于有事实，事实包含对象之间如何组合。",
    tags: ["passage", "fact", "object"]
  },
  {
    id: "tlp-passage-002",
    track: "tractatus",
    module: "tlp-passage",
    type: "self",
    prompt: "用自己的话复述这段：为什么“书在桌子上”比“书、桌子”更像一个事实？",
    subprompt: "说完后按清晰度评分。",
    context: {
      title: "入门段落：事实与对象",
      body: [
        "如果我们只列出桌子、书和房间，还没有说明世界中发生了什么。只有当我们说“书在桌子上”时，才描画了一个可能成立或不成立的事实。"
      ],
      translation: "这不是原书引文，而是入门改写：重点是把对象清单和事实结构分开。",
      notes: ["用一个生活例子解释即可", "不要急着背编号，先抓关系"]
    },
    checklist: ["是否说到对象之间的关系", "是否说明事实可以成立或不成立", "是否用了自己的例子"],
    sample: "“书、桌子”只是两个对象的名字；“书在桌子上”说明了它们之间的一种排列关系，因此可以判断为真或假。",
    explanation: "能把对象和关系分开，你就抓住了读这本书的一个入口。",
    tags: ["passage", "fact", "object"]
  },
  {
    id: "jp-vocab-005",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「いそがしい」最贴近哪一个意思？",
    options: ["忙碌", "安静", "便宜", "有名"],
    answer: "忙碌",
    speak: "きょうは いそがしいです。",
    explanation: "いそがしい 是「忙」。例：今日は仕事が忙しいです。",
    tags: ["vocab", "adj", "kanji-reading"]
  },
  {
    id: "jp-vocab-006",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「べんり」的意思是？",
    options: ["方便", "不便", "危险", "安静"],
    answer: "方便",
    speak: "このアプリは べんりです。",
    explanation: "便利（べんり）是「方便」。反义是 不便（ふべん）。",
    tags: ["vocab", "adj-na", "kanji-reading"]
  },
  {
    id: "jp-vocab-007",
    track: "japanese",
    module: "jp-vocab",
    type: "input",
    prompt: "写出「便宜」的い形容词（假名即可）。",
    accepted: ["やすい", "安い"],
    answer: "安い",
    speak: "この みせは やすいです。",
    explanation: "安い（やすい）是「便宜」；注意和「安全」的汉字虽同，但读法不同。",
    tags: ["vocab", "adj", "kanji-reading"]
  },
  {
    id: "jp-vocab-008",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「あさって」指的是？",
    options: ["后天", "昨天", "前天", "今早"],
    answer: "后天",
    speak: "あさって テストが あります。",
    explanation: "时间词：おととい(前天)・きのう(昨天)・きょう(今天)・あした(明天)・あさって(后天)。",
    tags: ["vocab", "time-word", "kanji-reading"]
  },
  {
    id: "jp-grammar-005",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「我想喝水」最自然的是？",
    options: [
      "水が飲みたいです。",
      "水を飲みできます。",
      "水を飲んでいます。",
      "水を飲みましょう。"
    ],
    answer: "水が飲みたいです。",
    speak: "水が飲みたいです。",
    explanation: "想做某事：动词ます形去ます + たいです。对象常用 が（用 を 也可以）。",
    tags: ["grammar", "sentence-pattern", "desire"]
  },
  {
    id: "jp-grammar-006",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「东京比大阪大」对应哪一句？",
    options: [
      "東京は大阪より大きいです。",
      "東京は大阪と大きいです。",
      "東京は大阪が大きいです。",
      "東京より大阪は大きいです。"
    ],
    answer: "東京は大阪より大きいです。",
    speak: "東京は大阪より大きいです。",
    explanation: "比较句：AはBより〜です，表示 A 比 B 更…。最后一项意思反了。",
    tags: ["grammar", "particle", "sentence-pattern", "comparison"]
  },
  {
    id: "jp-grammar-007",
    track: "japanese",
    module: "jp-grammar",
    type: "input",
    prompt: "把「行きます」变成 ない形。",
    accepted: ["行かない", "いかない"],
    answer: "行かない",
    speak: "いかない",
    explanation: "一类动词 ない形：き→か + ない。行きます -> 行かない。",
    tags: ["grammar", "conjugation", "nai-form"]
  },
  {
    id: "jp-grammar-008",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「会日语」最自然的是？",
    options: [
      "日本語が できます。",
      "日本語を できます。",
      "日本語に できます。",
      "日本語で できます。"
    ],
    answer: "日本語が できます。",
    speak: "日本語が できます。",
    explanation: "できます（会／能）前面的对象用 が：日本語が できます。",
    tags: ["grammar", "particle", "sentence-pattern", "ability"]
  },
  {
    id: "jp-grammar-009",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「我住在东京」应该选哪一句？",
    options: [
      "東京に住んでいます。",
      "東京に住みます。",
      "東京で住んでいます。",
      "東京に住んでいました。"
    ],
    answer: "東京に住んでいます。",
    speak: "東京に住んでいます。",
    explanation: "住む 用「〜ています」表示持续状态；居住地点用 に。",
    tags: ["grammar", "te-form", "particle", "sentence-pattern", "state"]
  },
  {
    id: "jp-sentence-004",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：周末和朋友看了电影。",
    tokens: ["しゅうまつ", "友達と", "映画を", "見ました"],
    answer: ["しゅうまつ", "友達と", "映画を", "見ました"],
    speak: "しゅうまつ、友達と映画を見ました。",
    explanation: "と 表示一起做事的人；映画を見ます 是固定搭配。",
    tags: ["sentence", "particle", "word-order", "とを"]
  },
  {
    id: "jp-sentence-005",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：我每天早上七点起床。",
    tokens: ["毎朝", "7時に", "起きます"],
    answer: ["毎朝", "7時に", "起きます"],
    speak: "毎朝7時に起きます。",
    explanation: "具体时间点用 に：7時に。毎朝 是频率词，不加 に。",
    tags: ["sentence", "particle", "word-order", "time-ni"]
  },
  {
    id: "jp-sentence-006",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：这家餐厅又便宜又好吃。",
    tokens: ["このレストランは", "安くて", "おいしいです"],
    answer: ["このレストランは", "安くて", "おいしいです"],
    speak: "このレストランは安くておいしいです。",
    explanation: "い形容词连接用「〜くて」：安い -> 安くて。",
    tags: ["sentence", "conjugation", "word-order", "adj-te"]
  },
  {
    id: "jp-reading-004",
    track: "japanese",
    module: "jp-reading",
    type: "choice",
    prompt: "根据课文，他们在百货店做了什么？",
    context: {
      title: "小课文：週末",
      body: [
        "先週の日曜日、わたしは友達と新宿へ行きました。",
        "デパートで買い物をして、おいしいラーメンを食べました。",
        "それから、映画を見て、夜うちへ帰りました。"
      ],
      translation: "上周日，我和朋友去了新宿。在百货店购物，吃了好吃的拉面。然后看了电影，晚上回了家。",
      notes: ["へ 表示移动方向", "〜て、〜て 连接先后动作", "それから 表示「然后」"]
    },
    options: ["买东西", "看电影", "学日语", "睡觉"],
    answer: "买东西",
    speak: "デパートで買い物をして、おいしいラーメンを食べました。",
    explanation: "第二句：デパートで買い物をして…说明在百货店买了东西。",
    tags: ["reading", "te-form", "vocab", "kanji-reading"]
  },
  {
    id: "jp-reading-005",
    track: "japanese",
    module: "jp-reading",
    type: "input",
    prompt: "根据课文填空：それから、映画を___、夜うちへ帰りました。",
    context: {
      title: "小课文：週末",
      body: [
        "先週の日曜日、わたしは友達と新宿へ行きました。",
        "デパートで買い物をして、おいしいラーメンを食べました。",
        "それから、映画を見て、夜うちへ帰りました。"
      ],
      translation: "上周日，我和朋友去了新宿。在百货店购物，吃了好吃的拉面。然后看了电影，晚上回了家。",
      notes: ["見る 的て形是 見て", "て形可以连接两个动作"]
    },
    accepted: ["見て", "みて"],
    answer: "見て",
    speak: "それから、映画を見て、夜うちへ帰りました。",
    explanation: "見る -> 見て。放进课文动作链里记，比单背更稳。",
    tags: ["reading", "te-form", "verb", "kanji-reading"]
  },
  {
    id: "jp-reading-006",
    track: "japanese",
    module: "jp-reading",
    type: "arrange",
    prompt: "组出长句：周末在图书馆学习后，和朋友吃了饭。",
    context: {
      title: "长句骨架",
      body: ["週末は図書館で勉強してから、友達とごはんを食べました。"],
      translation: "周末在图书馆学习之后，和朋友一起吃了饭。",
      notes: ["勉強してから 表示「学习之后」", "で 表示动作发生的场所", "と 表示一起的人"]
    },
    tokens: ["週末は", "図書館で", "勉強してから", "友達と", "ごはんを食べました"],
    answer: ["週末は", "図書館で", "勉強してから", "友達と", "ごはんを食べました"],
    speak: "週末は図書館で勉強してから、友達とごはんを食べました。",
    explanation: "〜てから 表示前一个动作完成后再做下一件事。",
    tags: ["reading", "long-sentence", "te-form", "kanji-reading"]
  },
  {
    id: "en-civil-005",
    track: "english",
    module: "en-civil",
    type: "choice",
    prompt: "“Bearing capacity” of soil refers to:",
    options: [
      "the maximum load the soil can safely support",
      "the speed of groundwater flow",
      "the color of the concrete mix",
      "the height of a retaining wall"
    ],
    answer: "the maximum load the soil can safely support",
    speak: "The bearing capacity of the soil governs the foundation design.",
    explanation: "bearing capacity 是地基承载力，决定基础尺寸和形式。"
  },
  {
    id: "en-civil-006",
    track: "english",
    module: "en-civil",
    type: "input",
    prompt: "Translate into academic English: 抗压强度",
    accepted: ["compressive strength"],
    answer: "compressive strength",
    speak: "compressive strength",
    explanation: "compressive strength 抗压强度；tensile strength 抗拉强度；shear strength 抗剪强度。"
  },
  {
    id: "en-civil-007",
    track: "english",
    module: "en-civil",
    type: "choice",
    prompt: "In construction, “formwork” is:",
    options: [
      "temporary molds that hold wet concrete until it hardens",
      "the steel inside reinforced concrete",
      "a survey of the site boundary",
      "the final coat of paint"
    ],
    answer: "temporary molds that hold wet concrete until it hardens",
    speak: "The formwork was removed after the concrete had cured.",
    explanation: "formwork 是模板，混凝土硬化后拆除；cure 指养护。"
  },
  {
    id: "en-civil-008",
    track: "english",
    module: "en-civil",
    type: "choice",
    prompt: "Choose the correct collocation: moving traffic produces a “___ load”.",
    options: ["live", "alive", "living", "lived"],
    answer: "live",
    speak: "Bridges must be designed for both dead load and live load.",
    explanation: "live load 活载（车辆、人群等可变荷载）；dead load 恒载（结构自重）。"
  },
  {
    id: "en-ai-005",
    track: "english",
    module: "en-ai",
    type: "choice",
    prompt: "In machine learning, “ground truth” means:",
    options: [
      "the correct labels used to train or evaluate a model",
      "the server hardware running the model",
      "the current value of the loss function",
      "the learning rate of the optimizer"
    ],
    answer: "the correct labels used to train or evaluate a model",
    speak: "We compared the predictions against the ground truth.",
    explanation: "ground truth 是真实标签/参考答案，用来训练或衡量模型。"
  },
  {
    id: "en-ai-006",
    track: "english",
    module: "en-ai",
    type: "input",
    prompt: "Fill in the term: A model too simple to capture the pattern is said to be ___.",
    accepted: ["underfitting", "underfit"],
    answer: "underfitting",
    speak: "The model is underfitting and performs poorly even on the training set.",
    explanation: "underfitting 欠拟合，和 overfitting 过拟合相对。"
  },
  {
    id: "en-ai-007",
    track: "english",
    module: "en-ai",
    type: "choice",
    prompt: "“Fine-tuning” a pretrained model usually means:",
    options: [
      "continuing training it on a specific downstream task",
      "deleting half of its layers",
      "measuring its inference latency",
      "collecting a brand-new dataset from scratch"
    ],
    answer: "continuing training it on a specific downstream task",
    speak: "We fine-tuned the pretrained model on our own dataset.",
    explanation: "fine-tuning 微调：在预训练模型基础上，用特定任务数据继续训练。"
  },
  {
    id: "en-ai-008",
    track: "english",
    module: "en-ai",
    type: "choice",
    prompt: "Best paraphrase: “The improvement is statistically significant.”",
    options: [
      "The improvement is unlikely to be due to random chance.",
      "The improvement is extremely large.",
      "The model runs much faster now.",
      "The dataset is very small."
    ],
    answer: "The improvement is unlikely to be due to random chance.",
    speak: "The improvement is statistically significant.",
    explanation: "statistically significant 指差异在统计上不太可能是偶然，不等于「很大」。"
  },
  {
    id: "en-ielts-004",
    track: "english",
    module: "en-ielts",
    type: "choice",
    prompt: "IELTS 写作：“a lot of problems” 的更学术替换是？",
    options: [
      "a significant number of problems",
      "a lot lot of problems",
      "many many problems",
      "a big amount of problems"
    ],
    answer: "a significant number of problems",
    speak: "A significant number of problems were identified during testing.",
    explanation: "可数名词用 a significant/considerable number of；amount of 用于不可数名词。"
  },
  {
    id: "en-ielts-005",
    track: "english",
    module: "en-ielts",
    type: "input",
    prompt: "给出 “In conclusion” 的一个学术替换开头。",
    accepted: ["to sum up", "to conclude", "in summary", "overall"],
    answer: "To sum up, ...",
    speak: "To sum up, the benefits outweigh the drawbacks.",
    explanation: "结尾段可用 To sum up / To conclude / In summary / Overall。"
  },
  {
    id: "en-reading-004",
    track: "english",
    module: "en-reading",
    type: "choice",
    prompt: "According to the sentence, what is the main benefit of the sensors?",
    context: {
      title: "AI + Civil Engineering Sentence",
      body: [
        "By installing sensors on the bridge, engineers can collect real-time data on vibration and temperature, which helps them detect potential damage before it becomes dangerous."
      ],
      translation: "通过在桥上安装传感器，工程师可以实时采集振动和温度数据，从而在潜在损伤变得危险之前发现它。",
      notes: ["real-time data = 实时数据", "detect = 发现/检测", "before it becomes dangerous = 在变危险之前"]
    },
    options: [
      "Detecting potential damage early.",
      "Reducing the weight of the bridge.",
      "Changing the color of the bridge.",
      "Increasing the speed of traffic."
    ],
    answer: "Detecting potential damage early.",
    speak: "By installing sensors on the bridge, engineers can collect real-time data on vibration and temperature, which helps them detect potential damage before it becomes dangerous.",
    explanation: "which helps them detect potential damage before it becomes dangerous 点明主要好处。",
    tags: ["reading", "civil", "ai", "long-sentence"]
  },
  {
    id: "en-reading-005",
    track: "english",
    module: "en-reading",
    type: "input",
    prompt: "Fill in the academic verb: Researchers ___ the new method on three datasets to test its robustness.",
    context: {
      title: "Academic Method Sentence",
      body: [
        "Researchers evaluated the new method on three datasets to test its robustness under different conditions."
      ],
      translation: "研究者在三个数据集上评估了新方法，以测试它在不同条件下的稳健性。",
      notes: ["evaluate = 评估", "robustness = 稳健性/鲁棒性", "under different conditions = 在不同条件下"]
    },
    accepted: ["evaluated", "tested", "assessed"],
    answer: "evaluated",
    speak: "Researchers evaluated the new method on three datasets to test its robustness.",
    explanation: "evaluate / test / assess 都可用于「评估方法」，论文方法部分高频。",
    tags: ["reading", "ai", "academic-verb"]
  },
  {
    id: "en-reading-006",
    track: "english",
    module: "en-reading",
    type: "arrange",
    prompt: "Rebuild the sentence: 尽管模型准确率很高，它需要大量带标注的数据。",
    context: {
      title: "Concessive Sentence Pattern",
      body: ["Although the model achieved high accuracy, it required a large amount of labeled data."],
      translation: "尽管模型达到了很高的准确率，它需要大量带标注的数据。",
      notes: ["Although + 从句 表示让步", "a large amount of = 大量（不可数）", "labeled data = 带标注的数据"]
    },
    tokens: ["Although the model achieved high accuracy", "it required", "a large amount of", "labeled data"],
    answer: ["Although the model achieved high accuracy", "it required", "a large amount of", "labeled data"],
    speak: "Although the model achieved high accuracy, it required a large amount of labeled data.",
    explanation: "Although 引导让步状语从句，常用来在论文里承认局限。",
    tags: ["reading", "ai", "long-sentence"]
  },
  {
    id: "tlp-concept-004",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "命题能够描画现实，是因为它和现实共享：",
    options: ["逻辑形式（结构）", "相同的颜色", "相同的重量", "相同的价格"],
    answer: "逻辑形式（结构）",
    explanation: "图像论：命题之所以能表现事态，是因为它与所描画的事态共享逻辑形式。"
  },
  {
    id: "tlp-concept-005",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "全书结尾命题（命题 7）入门理解最接近：",
    options: [
      "对于不能说的东西，必须保持沉默。",
      "对于不能说的东西，要大声争论。",
      "不能说的东西根本不存在。",
      "不能说的东西就是科学定律。"
    ],
    answer: "对于不能说的东西，必须保持沉默。",
    explanation: "命题 7：「对于不能谈论的东西，必须保持沉默。」是全书著名收尾。"
  },
  {
    id: "tlp-relation-004",
    track: "tractatus",
    module: "tlp-relation",
    type: "choice",
    prompt: "和「重言式恒为真」相对，「矛盾式」是：",
    options: [
      "无论事实如何都为假",
      "无论事实如何都为真",
      "有时真有时假",
      "经验上很可能为真"
    ],
    answer: "无论事实如何都为假",
    explanation: "重言式恒真、矛盾式恒假；两者都不描述世界中的具体事实，只展示逻辑结构。"
  },
  {
    id: "tlp-relation-005",
    track: "tractatus",
    module: "tlp-relation",
    type: "choice",
    prompt: "按入门理解，「逻辑形式本身」更适合说成：",
    options: [
      "不能被说出，只能被显示",
      "可以像普通事实一样被描述",
      "是一种经验观察的结果",
      "是一条伦理规范"
    ],
    answer: "不能被说出，只能被显示",
    explanation: "saying / showing 的区分：逻辑形式显示在命题如何运作之中，却不能再被一个命题说出。"
  },
  {
    id: "tlp-passage-003",
    track: "tractatus",
    module: "tlp-passage",
    type: "choice",
    prompt: "这段话想帮助你区分什么？",
    context: {
      title: "入门段落：可说与显示",
      body: [
        "科学命题试图说出世界中成立了什么。但有些东西——例如逻辑形式本身——不能再被一个命题说出，它只在命题如何运作中显示出来。"
      ],
      translation: "这不是原书引文，而是入门改写：重点是区分「说出」和「显示」。",
      notes: ["可说：经验事实", "显示：逻辑形式", "入口：saying / showing"]
    },
    options: ["说出与显示", "真与假", "好与坏", "多与少"],
    answer: "说出与显示",
    explanation: "有些东西不能被事实命题说出，却在语言的使用中显示出来。",
    tags: ["passage", "saying", "showing"]
  },
  {
    id: "tlp-passage-004",
    track: "tractatus",
    module: "tlp-passage",
    type: "self",
    prompt: "用自己的话解释命题 7：「对于不能说的东西，必须保持沉默」。",
    subprompt: "说完后按清晰度评分。",
    context: {
      title: "入门段落：沉默的边界",
      body: [
        "如果有意义的命题只能描画可能的事实，那么超出事实之外的东西（如绝对的价值、世界整体的意义）就无法被这样说出。"
      ],
      translation: "入门改写，非原文引用：重点是理解「沉默」针对的是哪一类东西。",
      notes: ["先说命题的界限在哪里", "再说沉默针对什么", "不必同意，先讲清"]
    },
    checklist: ["是否说清「可说」的界限", "是否说明沉默针对什么", "是否给出一个自己的例子"],
    sample: "有意义的命题只能描述可能成立或不成立的事实。像「世界整体为什么存在」这类问题不在事实范围内，因此不能被这样的命题说出，只能保持沉默。",
    explanation: "重点不是「闭嘴」，而是划清事实语言的边界。",
    tags: ["passage", "saying", "showing"]
  },
  {
    id: "tlp-reading-004",
    track: "tractatus",
    module: "tlp-reading",
    type: "choice",
    prompt: "关于全书的小数编号（1, 1.1, 1.11…），更合适的入门理解是：",
    options: [
      "小数位表示命题之间的从属和注释关系（逻辑权重）",
      "编号是随机排列的",
      "编号表示写作的日期顺序",
      "编号表示原书的页码"
    ],
    answer: "小数位表示命题之间的从属和注释关系（逻辑权重）",
    explanation: "维特根斯坦用小数编号表示命题的逻辑层级：n.1 是对 n 的注释，依此类推。"
  },
  {
    id: "jp-vocab-009",
    track: "japanese",
    module: "jp-vocab",
    type: "input",
    prompt: "写出「教」的日语动词ます形（假名即可）。",
    accepted: ["おしえます", "教えます"],
    answer: "教えます",
    speak: "日本語を教えます。",
    explanation: "教えます（おしえます）表示教授。例：先生は日本語を教えます。",
    tags: ["vocab", "verb", "kanji-reading"]
  },
  {
    id: "jp-vocab-010",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「ひま」最贴近哪一个意思？",
    options: ["空闲", "忙碌", "便宜", "危险"],
    answer: "空闲",
    speak: "きょうは ひまです。",
    explanation: "暇（ひま）是「空闲」，反义是 忙しい（いそがしい）。",
    tags: ["vocab", "adj-na", "kanji-reading"]
  },
  {
    id: "jp-vocab-011",
    track: "japanese",
    module: "jp-vocab",
    type: "input",
    prompt: "写出「便利」的反义词（假名即可）。",
    accepted: ["ふべん", "不便"],
    answer: "不便",
    speak: "ここは ちょっと ふべんです。",
    explanation: "便利（べんり）⇔ 不便（ふべん）。",
    tags: ["vocab", "adj-na", "antonym", "kanji-reading"]
  },
  {
    id: "jp-grammar-010",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「公园里有一只狗」应该选哪一句？",
    options: [
      "公園に犬がいます。",
      "公園に犬があります。",
      "公園で犬がいます。",
      "公園は犬がいます。"
    ],
    answer: "公園に犬がいます。",
    speak: "公園に犬がいます。",
    explanation: "有生命的（人、动物）用 います；无生命的用 あります。存在地点用 に。",
    tags: ["grammar", "particle", "existence", "iru-aru"]
  },
  {
    id: "jp-grammar-011",
    track: "japanese",
    module: "jp-grammar",
    type: "input",
    prompt: "把「行きます」改成「昨天没去」的形式（过去否定）。",
    accepted: ["行きませんでした", "いきませんでした"],
    answer: "行きませんでした",
    speak: "きのうは行きませんでした。",
    explanation: "ます的过去否定：ます -> ませんでした。行きます -> 行きませんでした。",
    tags: ["grammar", "conjugation", "past-negative"]
  },
  {
    id: "jp-grammar-012",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「这次旅行很开心」（过去）最自然的是？",
    options: [
      "旅行は楽しかったです。",
      "旅行は楽しいでした。",
      "旅行は楽しくでした。",
      "旅行は楽しいかったです。"
    ],
    answer: "旅行は楽しかったです。",
    speak: "旅行は楽しかったです。",
    explanation: "い形容词过去式：楽しい -> 楽しかったです（不是「楽しいでした」）。",
    tags: ["grammar", "conjugation", "adj-i-past"]
  },
  {
    id: "jp-grammar-013",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「这里很安静」应该选哪一句？",
    options: [
      "ここは静かです。",
      "ここは静かいです。",
      "ここは静くです。",
      "ここは静かいでした。"
    ],
    answer: "ここは静かです。",
    speak: "ここは静かです。",
    explanation: "静か 是な形容词，直接 + です：静かです（没有 い）。",
    tags: ["grammar", "adj-na", "sentence-pattern"]
  },
  {
    id: "jp-grammar-014",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「我喜欢日本料理」最自然的是？",
    options: [
      "日本料理が好きです。",
      "日本料理を好きです。",
      "日本料理に好きです。",
      "日本料理は好きます。"
    ],
    answer: "日本料理が好きです。",
    speak: "日本料理が好きです。",
    explanation: "好き・嫌い・上手・下手 前面的对象用 が。",
    tags: ["grammar", "particle", "sentence-pattern", "suki-ga"]
  },
  {
    id: "jp-sentence-007",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：我想要一台新电脑。",
    tokens: ["新しい", "パソコンが", "ほしいです"],
    answer: ["新しい", "パソコンが", "ほしいです"],
    speak: "新しいパソコンがほしいです。",
    explanation: "想要某物：〜が ほしいです。形容词 新しい 直接修饰名词。",
    tags: ["sentence", "particle", "word-order", "hoshii-ga"]
  },
  {
    id: "jp-sentence-008",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：一起去看电影吧。",
    tokens: ["いっしょに", "映画を", "見ましょう"],
    answer: ["いっしょに", "映画を", "見ましょう"],
    speak: "いっしょに映画を見ましょう。",
    explanation: "提议一起做某事：动词ます形去ます + ましょう。",
    tags: ["sentence", "word-order", "sentence-pattern", "mashou"]
  },
  {
    id: "jp-sentence-009",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：周末和家人去旅行。",
    tokens: ["しゅうまつ", "家族と", "旅行に", "行きます"],
    answer: ["しゅうまつ", "家族と", "旅行に", "行きます"],
    speak: "しゅうまつ、家族と旅行に行きます。",
    explanation: "去做某活动：〜に行きます。旅行に行きます = 去旅行。",
    tags: ["sentence", "particle", "word-order", "ni-iku"]
  },
  {
    id: "jp-reading-007",
    track: "japanese",
    module: "jp-reading",
    type: "choice",
    prompt: "根据课文，田中さん怎么去公司？",
    context: {
      title: "小课文：田中さんの一日",
      body: [
        "田中さんは毎朝6時半に起きます。",
        "朝ごはんを食べてから、駅まで歩いて、電車で会社へ行きます。",
        "仕事は9時に始まって、6時に終わります。"
      ],
      translation: "田中每天早上六点半起床。吃完早饭后，走到车站，坐电车去公司。工作九点开始，六点结束。",
      notes: ["〜てから 表示「…之后」", "まで 表示「到…为止」", "で 表示交通手段：電車で"]
    },
    options: ["先走到车站，再坐电车去", "开车去", "骑自行车去", "坐飞机去"],
    answer: "先走到车站，再坐电车去",
    speak: "朝ごはんを食べてから、駅まで歩いて、電車で会社へ行きます。",
    explanation: "第二句：駅まで歩いて、電車で会社へ行きます——先走到车站再坐电车。",
    tags: ["reading", "te-form", "transport", "kanji-reading"]
  },
  {
    id: "jp-reading-008",
    track: "japanese",
    module: "jp-reading",
    type: "input",
    prompt: "根据课文填空：朝ごはんを___から、駅まで歩きます。",
    context: {
      title: "小课文：田中さんの一日",
      body: [
        "田中さんは毎朝6時半に起きます。",
        "朝ごはんを食べてから、駅まで歩いて、電車で会社へ行きます。",
        "仕事は9時に始まって、6時に終わります。"
      ],
      translation: "田中每天早上六点半起床。吃完早饭后，走到车站，坐电车去公司。工作九点开始，六点结束。",
      notes: ["食べる 的て形是 食べて", "〜てから 表示「…之后」"]
    },
    accepted: ["食べて", "たべて"],
    answer: "食べて",
    speak: "朝ごはんを食べてから、駅まで歩きます。",
    explanation: "食べる -> 食べて；〜てから 表示前一动作完成后再做下一件。",
    tags: ["reading", "te-form", "verb", "kanji-reading"]
  },
  {
    id: "jp-reading-009",
    track: "japanese",
    module: "jp-reading",
    type: "arrange",
    prompt: "组句：工作九点开始，六点结束。",
    context: {
      title: "长句骨架",
      body: ["仕事は9時に始まって、6時に終わります。"],
      translation: "工作九点开始，六点结束。",
      notes: ["始まって 是 始まる 的て形", "时间点用 に：9時に", "て形连接两个动作"]
    },
    tokens: ["仕事は", "9時に始まって", "6時に終わります"],
    answer: ["仕事は", "9時に始まって", "6時に終わります"],
    speak: "仕事は9時に始まって、6時に終わります。",
    explanation: "始まる -> 始まって；用て形把「开始」和「结束」连成一句。",
    tags: ["reading", "long-sentence", "te-form", "kanji-reading"]
  },
  {
    id: "en-civil-009",
    track: "english",
    module: "en-civil",
    type: "choice",
    prompt: "“Excavation” most often means:",
    options: [
      "digging out soil or rock, e.g. for a foundation",
      "pouring the final layer of asphalt",
      "painting a steel beam",
      "surveying the property line"
    ],
    answer: "digging out soil or rock, e.g. for a foundation",
    speak: "Excavation began before the foundation was laid.",
    explanation: "excavation 是开挖（土方）；动词 excavate。"
  },
  {
    id: "en-civil-010",
    track: "english",
    module: "en-civil",
    type: "input",
    prompt: "Translate into English: 地基 / 基础（建筑）",
    accepted: ["foundation"],
    answer: "foundation",
    speak: "A deep foundation was required on the soft ground.",
    explanation: "foundation 是基础/地基；deep foundation 深基础，shallow foundation 浅基础。"
  },
  {
    id: "en-civil-011",
    track: "english",
    module: "en-civil",
    type: "choice",
    prompt: "A “load-bearing wall” is a wall that:",
    options: [
      "supports the weight of the structure above it",
      "only divides rooms and carries no load",
      "is always made of glass",
      "is used only for decoration"
    ],
    answer: "supports the weight of the structure above it",
    speak: "Do not remove a load-bearing wall without proper support.",
    explanation: "load-bearing wall 是承重墙，拆除前必须有临时支撑。"
  },
  {
    id: "en-civil-012",
    track: "english",
    module: "en-civil",
    type: "choice",
    prompt: "“Durability” of a material refers to its ability to:",
    options: [
      "resist wear and deterioration over time",
      "change color quickly",
      "conduct electricity",
      "float on water"
    ],
    answer: "resist wear and deterioration over time",
    speak: "Durability is a key requirement for marine structures.",
    explanation: "durability 是耐久性，指材料长期抵抗磨损和劣化的能力。"
  },
  {
    id: "en-ai-009",
    track: "english",
    module: "en-ai",
    type: "choice",
    prompt: "In training, one “epoch” is:",
    options: [
      "one full pass through the entire training dataset",
      "a single neuron in the network",
      "the final accuracy score",
      "the physical size of the model"
    ],
    answer: "one full pass through the entire training dataset",
    speak: "The model was trained for fifty epochs.",
    explanation: "epoch 是「轮」：完整遍历一次训练集。"
  },
  {
    id: "en-ai-010",
    track: "english",
    module: "en-ai",
    type: "input",
    prompt: "Fill in the term: The function that measures how wrong the predictions are is the ___ function.",
    accepted: ["loss", "cost"],
    answer: "loss",
    speak: "Training minimizes the loss function.",
    explanation: "loss / cost function 损失函数；训练就是让它变小。"
  },
  {
    id: "en-ai-011",
    track: "english",
    module: "en-ai",
    type: "choice",
    prompt: "“Regularization” is mainly used to:",
    options: [
      "reduce overfitting",
      "speed up the GPU",
      "label the training data",
      "increase the learning rate"
    ],
    answer: "reduce overfitting",
    speak: "We added dropout as a form of regularization.",
    explanation: "正则化（如 dropout、weight decay）主要用来抑制过拟合。"
  },
  {
    id: "en-ielts-007",
    track: "english",
    module: "en-ielts",
    type: "choice",
    prompt: "学术写作里表示转折，句首更合适的是：",
    options: [
      "However, this approach has some limitations.",
      "Beside, this approach has some limitations.",
      "In other hand, this approach has some limitations.",
      "Although so, this approach has some limitations."
    ],
    answer: "However, this approach has some limitations.",
    speak: "However, this approach has some limitations.",
    explanation: "转折常用 However（后接逗号）；注意 besides 不是 beside，且没有 in other hand。"
  },
  {
    id: "en-ielts-008",
    track: "english",
    module: "en-ielts",
    type: "input",
    prompt: "把 “a big increase” 改成更学术的说法。",
    accepted: ["a significant increase", "a substantial increase", "a considerable increase", "a sharp increase"],
    answer: "a significant increase",
    speak: "There was a significant increase in demand.",
    explanation: "significant / substantial / considerable / sharp + increase 都比 big 更学术。"
  },
  {
    id: "en-reading-007",
    track: "english",
    module: "en-reading",
    type: "choice",
    prompt: "According to the sentence, why is drainage important on slopes?",
    context: {
      title: "Civil Engineering Long Sentence",
      body: [
        "Proper drainage is essential on slopes, because water that builds up behind a retaining wall increases the pressure on it and can eventually cause the wall to fail."
      ],
      translation: "在边坡上做好排水非常重要，因为积聚在挡土墙后的水会增大对墙体的压力，最终可能导致墙体破坏。",
      notes: ["build up behind = 在…后面积聚", "pressure = 压力", "cause ... to fail = 导致…破坏"]
    },
    options: [
      "Water building up behind the wall increases pressure and may cause failure.",
      "The wall needs to be repainted regularly.",
      "Drainage makes the concrete cheaper.",
      "It speeds up the traffic on the slope."
    ],
    answer: "Water building up behind the wall increases pressure and may cause failure.",
    speak: "Proper drainage is essential on slopes, because water that builds up behind a retaining wall increases the pressure on it and can eventually cause the wall to fail.",
    explanation: "because 后给出原因：积水增大压力，可能导致墙体破坏。",
    tags: ["reading", "civil", "long-sentence"]
  },
  {
    id: "en-reading-008",
    track: "english",
    module: "en-reading",
    type: "input",
    prompt: "Fill in the academic verb: Engineers ___ the bridge regularly to make sure it is still safe.",
    context: {
      title: "Civil Engineering Sentence",
      body: [
        "Engineers inspect the bridge regularly to make sure it is still safe and to find small problems early."
      ],
      translation: "工程师定期检查桥梁，以确保它仍然安全，并尽早发现小问题。",
      notes: ["inspect = 检查", "regularly = 定期地", "find problems early = 尽早发现问题"]
    },
    accepted: ["inspect", "monitor", "check"],
    answer: "inspect",
    speak: "Engineers inspect the bridge regularly to make sure it is still safe.",
    explanation: "inspect / monitor / check 都可用于「定期检查」结构。",
    tags: ["reading", "civil", "academic-verb"]
  },
  {
    id: "en-reading-009",
    track: "english",
    module: "en-reading",
    type: "arrange",
    prompt: "Rebuild the sentence: 尽管准确率很高，模型却无法泛化到未见过的环境。",
    context: {
      title: "Concessive Sentence (AI)",
      body: ["Despite achieving high accuracy, the model failed to generalize to unseen environments."],
      translation: "尽管达到了很高的准确率，模型却无法泛化到未见过的环境。",
      notes: ["Despite + 名词/动名词 表示让步", "generalize to = 泛化到", "unseen environments = 未见过的环境"]
    },
    tokens: ["Despite achieving high accuracy", "the model failed", "to generalize", "to unseen environments"],
    answer: ["Despite achieving high accuracy", "the model failed", "to generalize", "to unseen environments"],
    speak: "Despite achieving high accuracy, the model failed to generalize to unseen environments.",
    explanation: "Despite 后接名词或动名词（achieving），不接句子；这是论文里承认局限的常用句式。",
    tags: ["reading", "ai", "long-sentence"]
  },
  {
    id: "en-reading-010",
    track: "english",
    module: "en-reading",
    type: "self",
    prompt: "Read the long sentence aloud, then summarize it in one English sentence.",
    subprompt: "说完后按概括是否准确评分。",
    context: {
      title: "AI + Engineering Sentence",
      body: [
        "Because sensor data can be noisy, the team applied a filter before feeding it into the model, which improved the reliability of the predictions."
      ],
      translation: "由于传感器数据可能含噪声，团队在把数据送入模型之前先做了滤波，这提高了预测的可靠性。",
      notes: ["noisy = 含噪声的", "apply a filter = 滤波", "reliability = 可靠性"]
    },
    checklist: ["是否读出整句", "是否用一句英文概括", "是否包含 filter / reliable / prediction 之一"],
    sample: "The team filtered noisy sensor data to make the model's predictions more reliable.",
    speak: "Because sensor data can be noisy, the team applied a filter before feeding it into the model, which improved the reliability of the predictions.",
    explanation: "先读懂长句，再压成一句话，是精读 + 输出的好练习。",
    tags: ["reading", "ai", "summary"]
  },
  {
    id: "en-reading-011",
    track: "english",
    module: "en-reading",
    type: "choice",
    prompt: "What is the main benefit described in the sentence?",
    context: {
      title: "AI + Maintenance Sentence",
      body: [
        "By combining sensor data with machine learning, the system can predict equipment failures before they happen, which helps reduce maintenance costs."
      ],
      translation: "通过把传感器数据与机器学习结合，系统可以在设备故障发生前进行预测，这有助于降低维护成本。",
      notes: ["combine A with B = 把 A 与 B 结合", "predict failures = 预测故障", "maintenance costs = 维护成本"]
    },
    options: [
      "Predicting failures early to reduce maintenance costs.",
      "Making the equipment heavier.",
      "Changing the color of the sensors.",
      "Increasing the energy the system uses."
    ],
    answer: "Predicting failures early to reduce maintenance costs.",
    speak: "By combining sensor data with machine learning, the system can predict equipment failures before they happen, which helps reduce maintenance costs.",
    explanation: "which helps reduce maintenance costs 点明主要好处：提前预测以降本。",
    tags: ["reading", "ai", "civil", "long-sentence"]
  },
  {
    id: "tlp-concept-006",
    track: "tractatus",
    module: "tlp-concept",
    type: "input",
    prompt: "用两个字填空：世界是___的总和。",
    accepted: ["事实"],
    answer: "事实",
    explanation: "命题 1：世界是事实的总和（不是物的总和）。"
  },
  {
    id: "tlp-concept-007",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "在《逻辑哲学论》体系里，「简单对象」的作用是：",
    options: ["充当构成事态的基本要素", "表达一种情绪", "下达道德命令", "记录观察数据"],
    answer: "充当构成事态的基本要素",
    explanation: "对象是不可再分的基本要素，它们的组合构成可能的事态。"
  },
  {
    id: "tlp-concept-008",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "按入门理解，「思想」大致是：",
    options: [
      "事态的逻辑图像（由有意义的命题表达）",
      "一种纯粹的情绪",
      "一条物理定律",
      "一种宗教信仰"
    ],
    answer: "事态的逻辑图像（由有意义的命题表达）",
    explanation: "思想是事态的逻辑图像，可由有意义的命题表达出来。"
  },
  {
    id: "tlp-concept-009",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "维特根斯坦认为哲学应当是：",
    options: [
      "澄清思想的活动，而不是一套学说",
      "一门经验科学",
      "一套伦理规范",
      "一种文学创作"
    ],
    answer: "澄清思想的活动，而不是一套学说",
    explanation: "哲学不是理论体系，而是把可说的说清楚、为思想划界的活动。"
  },
  {
    id: "tlp-relation-006",
    track: "tractatus",
    module: "tlp-relation",
    type: "choice",
    prompt: "在命题里，一个「名称(name)」对应现实中的：",
    options: ["对象", "事实", "整个世界", "真理"],
    answer: "对象",
    explanation: "名称指称对象；名称的组合（命题）描画事态。"
  },
  {
    id: "tlp-relation-007",
    track: "tractatus",
    module: "tlp-relation",
    type: "choice",
    prompt: "一个有意义的命题，必须能够：",
    options: ["为真或为假（有两种可能）", "永远为真", "永远为假", "保证说话者道德正确"],
    answer: "为真或为假（有两种可能）",
    explanation: "有意义的命题描画一种可能的事态，因此有真假条件。"
  },
  {
    id: "tlp-relation-008",
    track: "tractatus",
    module: "tlp-relation",
    type: "choice",
    prompt: "下面哪一个不描述世界中的事实？",
    options: ["重言式", "天气预报", "实验报告", "新闻报道"],
    answer: "重言式",
    explanation: "重言式恒真、矛盾式恒假，二者都不描述世界中的具体事实。"
  },
  {
    id: "tlp-relation-009",
    track: "tractatus",
    module: "tlp-relation",
    type: "choice",
    prompt: "重言式提供的、关于世界的信息量是：",
    options: ["零", "很大", "中等", "无法确定"],
    answer: "零",
    explanation: "重言式不排除任何可能情况，所以关于世界的信息量为零。"
  },
  {
    id: "tlp-passage-005",
    track: "tractatus",
    module: "tlp-passage",
    type: "choice",
    prompt: "这段强调的对应关系是？",
    context: {
      title: "入门段落：名称与命题",
      body: [
        "在最简单的层面上，名称指称对象。把名称按一定结构组合成命题，就像把对象组合成事态。命题之所以有意义，是因为它的结构对应着事态的结构。"
      ],
      translation: "入门改写，非原文引用：重点是「名称↔对象、命题↔事态」的结构对应。",
      notes: ["名称 ↔ 对象", "命题 ↔ 事态", "结构对应是关键"]
    },
    options: [
      "名称↔对象，命题↔事态",
      "名称↔颜色，命题↔声音",
      "名称↔价格，命题↔重量",
      "名称↔作者，命题↔日期"
    ],
    answer: "名称↔对象，命题↔事态",
    explanation: "命题能描画事态，因为名称—对象、命题—事态之间存在结构对应。",
    tags: ["passage", "name", "object"]
  },
  {
    id: "tlp-passage-006",
    track: "tractatus",
    module: "tlp-passage",
    type: "self",
    prompt: "用自己的话讲讲「显示(showing)」和「说出(saying)」的区别，并举一个例子。",
    subprompt: "说完后按清晰度评分。",
    context: {
      title: "入门段落：说出与显示",
      body: [
        "经验命题说出世界中成立了什么；但有些东西（如逻辑形式）不能被这样说出，只能在命题如何运作中显示出来。"
      ],
      translation: "入门改写，非原文引用。",
      notes: ["说出：经验事实", "显示：逻辑形式", "举一个自己的例子"]
    },
    checklist: ["是否说清「说出」针对经验事实", "是否说清「显示」针对逻辑形式", "是否举了一个自己的例子"],
    sample: "「书在桌子上」说出了一个事实；而「这句话有主语和谓语」这种逻辑结构本身不被说出，却在句子如何组成中显示出来。",
    explanation: "能把「说出经验事实」和「显示逻辑结构」分开，就抓住了一个核心区分。",
    tags: ["passage", "saying", "showing"]
  },
  {
    id: "tlp-passage-007",
    track: "tractatus",
    module: "tlp-passage",
    type: "choice",
    prompt: "「下雨或不下雨」这个例子，想说明重言式：",
    context: {
      title: "入门段落：重言式",
      body: [
        "「今天下雨或者不下雨」无论天气如何都为真，所以它其实没告诉你今天的天气。这样的命题是重言式：它不描述世界，只展示逻辑本身。"
      ],
      translation: "入门改写，非原文引用。",
      notes: ["重言式恒真", "不提供世界的信息", "与之相对的是矛盾式（恒假）"]
    },
    options: ["不提供关于世界的任何信息", "准确预报了天气", "在伦理上是对的", "是一条经验定律"],
    answer: "不提供关于世界的任何信息",
    explanation: "重言式无论世界如何都为真，因此对世界零信息，只展示逻辑结构。",
    tags: ["passage", "tautology"]
  },
  {
    id: "tlp-passage-008",
    track: "tractatus",
    module: "tlp-passage",
    type: "input",
    prompt: "填空：世界是事实的总和，而不是___的总和。",
    context: {
      title: "入门段落：事实而非物",
      body: [
        "维特根斯坦一开始就区分：世界是「发生的事情」的总和，而不是「东西」的清单。"
      ],
      translation: "对应命题 1.1 的入门理解。",
      notes: ["事实 = 事情如何成立", "物 = 单个对象", "先抓住这个区分"]
    },
    accepted: ["物", "对象", "事物", "东西"],
    answer: "物",
    explanation: "命题 1.1：世界是事实的总和，而非物（things）的总和。",
    tags: ["passage", "fact", "object"]
  },
  {
    id: "tlp-reading-005",
    track: "tractatus",
    module: "tlp-reading",
    type: "choice",
    prompt: "对初学者，读《逻辑哲学论》较稳的做法是：",
    options: [
      "配合一本入门导读，边读边画概念关系",
      "只读原文，不看任何解释",
      "先背下所有命题编号",
      "从最后一句往前读"
    ],
    answer: "配合一本入门导读，边读边画概念关系",
    explanation: "本书压缩度极高，配合导读和概念图比硬啃原文更稳。"
  },
  {
    id: "tlp-reading-006",
    track: "tractatus",
    module: "tlp-reading",
    type: "self",
    prompt: "解释：为什么全书最后落在「沉默」，而不是给出一套人生答案？",
    subprompt: "说完后按清晰度评分。",
    checklist: ["是否说到事实语言的界限", "是否说明哪类问题被排除在外", "是否避免把它误读为「什么都别说」"],
    sample: "因为有意义的命题只能描画事实，像人生意义这类问题不在事实之内，所以不能被这样说出——沉默针对的是这类越界的问题，而不是叫人闭嘴。",
    explanation: "「沉默」是对语言界限的标记，不是消极的禁令。"
  },
  {
    id: "tlp-reading-007",
    track: "tractatus",
    module: "tlp-reading",
    type: "choice",
    prompt: "命题 6.54 的「梯子」比喻是指：",
    options: [
      "理解之后，要把这些命题本身像梯子一样扔掉",
      "梯子是世界的基础结构",
      "要永远背住每一条命题",
      "梯子代表科学方法"
    ],
    answer: "理解之后，要把这些命题本身像梯子一样扔掉",
    explanation: "读者借这些命题爬上去看清问题后，应认识到它们本身也要被超越——「爬上去后扔掉梯子」。"
  },
  // === 日语扩充：Minna 16+ 语法/词汇（20张） ===
  {
    id: "jp-grammar-015",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「窗户开着」最自然的是？",
    options: [
      "窓が開けてあります。",
      "窓が開けています。",
      "窓が開けてください。",
      "窓が開けました。"
    ],
    answer: "窓が開けてあります。",
    speak: "窓が開けてあります。",
    explanation: "〜てある 表示某动作造成的结果状态仍在持续（人为动作后留下的状态）。開ける（他动词）→ 開けてある。",
    tags: ["grammar", "te-form", "sentence-pattern", "te-aru"]
  },
  {
    id: "jp-grammar-016",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「我提前把作业做完了」最自然的是？",
    options: [
      "宿題をやっておきました。",
      "宿題をやっています。",
      "宿題をやってあります。",
      "宿題をやりました。"
    ],
    answer: "宿題をやっておきました。",
    speak: "宿題をやっておきました。",
    explanation: "〜ておく 表示为了某个目的而事先做好某事。やっておく → やっておきました。",
    tags: ["grammar", "te-form", "sentence-pattern", "te-oku"]
  },
  {
    id: "jp-grammar-017",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「我能读日语报纸了」最自然的是？",
    options: [
      "日本語の新聞が読めるようになりました。",
      "日本語の新聞を読みます。",
      "日本語の新聞が読みたいです。",
      "日本語の新聞を読んでいます。"
    ],
    answer: "日本語の新聞が読めるようになりました。",
    speak: "日本語の新聞が読めるようになりました。",
    explanation: "可能形：読む → 読める。〜ようになる 表示状态的变化（从不会到会）。",
    tags: ["grammar", "conjugation", "potential", "sentence-pattern"]
  },
  {
    id: "jp-grammar-018",
    track: "japanese",
    module: "jp-grammar",
    type: "input",
    prompt: "把「食べます」变成可能形（辞书形即可）。",
    accepted: ["食べられる", "たべられる"],
    answer: "食べられる",
    speak: "たべられる",
    explanation: "二类动词可能形：去る + られる。食べる → 食べられる。口语中也常说 食べれる（ら抜き）。",
    tags: ["grammar", "conjugation", "potential"]
  },
  {
    id: "jp-grammar-019",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「我被老师表扬了」最自然的是？",
    options: [
      "先生にほめられました。",
      "先生をほめました。",
      "先生がほめました。",
      "先生はほめました。"
    ],
    answer: "先生にほめられました。",
    speak: "先生にほめられました。",
    explanation: "受身形（被动）：一类动词ない形 + れる。ほめる → ほめられる。动作主体用 に。",
    tags: ["grammar", "conjugation", "passive"]
  },
  {
    id: "jp-grammar-020",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「妈妈让孩子打扫房间」最自然的是？",
    options: [
      "お母さんは子供に部屋を掃除させました。",
      "お母さんは子供が部屋を掃除しました。",
      "お母さんは子供に部屋を掃除されました。",
      "お母さんは子供を部屋に掃除しました。"
    ],
    answer: "お母さんは子供に部屋を掃除させました。",
    speak: "お母さんは子供に部屋を掃除させました。",
    explanation: "使役形：一类动词ない形 + せる。掃除する → 掃除させる。让某人做某事用 に。",
    tags: ["grammar", "conjugation", "causative"]
  },
  {
    id: "jp-vocab-012",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「しっかり」最贴近哪一个意思？",
    options: ["踏实、しっかり地", "慢慢地", "安静地", "开心地"],
    answer: "踏实、しっかり地",
    speak: "しっかり勉強してください。",
    explanation: "しっかり 是拟态词，表示「扎实地、可靠地」。例：しっかり覚えてください（请牢牢记住）。",
    tags: ["vocab", "adverb", "mimetic", "kanji-reading"]
  },
  {
    id: "jp-vocab-013",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「はっきり」最贴近哪一个意思？",
    options: ["清楚、明确", "模糊", "慢慢地", "安静地"],
    answer: "清楚、明确",
    speak: "はっきり言ってください。",
    explanation: "はっきり 是拟态词，表示「清楚地、明确地」。例：はっきり見えます（看得很清楚）。",
    tags: ["vocab", "adverb", "mimetic", "kanji-reading"]
  },
  {
    id: "jp-vocab-014",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「ゆっくり」最贴近哪一个意思？",
    options: ["慢慢地、从容地", "快速地", "清楚地", "安静地"],
    answer: "慢慢地、从容地",
    speak: "ゆっくり話してください。",
    explanation: "ゆっくり 表示「慢慢地、从容地」。例：ゆっくり休んでください（请好好休息）。",
    tags: ["vocab", "adverb", "mimetic"]
  },
  {
    id: "jp-vocab-015",
    track: "japanese",
    module: "jp-vocab",
    type: "input",
    prompt: "写出「忘记」的日语动词辞书形（假名即可）。",
    accepted: ["わすれる", "忘れる"],
    answer: "忘れる",
    speak: "かさを忘れました。",
    explanation: "忘れる（わすれる）是二类动词。例：傘を忘れました（忘了伞）。注意和「覚える（おぼえる，记住）」成对。",
    tags: ["vocab", "verb", "kanji-reading"]
  },
  {
    id: "jp-sentence-010",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：因为昨天病了，所以没去公司。",
    tokens: ["きのう", "病気だったので", "会社へ", "行きませんでした"],
    answer: ["きのう", "病気だったので", "会社へ", "行きませんでした"],
    speak: "きのう病気だったので、会社へ行きませんでした。",
    explanation: "〜ので 表示原因（比 から 更礼貌/客观）。な形容词/名词过去式 + なので/だったので。",
    tags: ["sentence", "word-order", "sentence-pattern", "node"]
  },
  {
    id: "jp-sentence-011",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：如果你去日本的话，请告诉我。",
    tokens: ["日本へ", "行ったら", "教えてください"],
    answer: ["日本へ", "行ったら", "教えてください"],
    speak: "日本へ行ったら、教えてください。",
    explanation: "〜たら 表示假定条件（如果…的话）。行く → 行ったら（た形 + ら）。",
    tags: ["sentence", "word-order", "conjugation", "tara"]
  },
  {
    id: "jp-sentence-012",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组句：即使贵，我也想买这个。",
    tokens: ["高くても", "これを", "買いたいです"],
    answer: ["高くても", "これを", "買いたいです"],
    speak: "高くても、これを買いたいです。",
    explanation: "〜ても 表示让步（即使…也）。い形容词 → 〜くても：高い → 高くても。",
    tags: ["sentence", "word-order", "conjugation", "temo"]
  },
  {
    id: "jp-grammar-021",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「好像要下雨」最自然的是？",
    options: [
      "雨が降りそうです。",
      "雨が降るそうです。",
      "雨が降っています。",
      "雨が降るようです。"
    ],
    answer: "雨が降りそうです。",
    speak: "雨が降りそうです。",
    explanation: "〜そうだ 表示根据眼前迹象的推测（看起来…）。动词ます形去ます + そうだ：降ります → 降りそうだ。注意和传闻的 〜そうだ（普通形+そうだ）区分。",
    tags: ["grammar", "sentence-pattern", "sou-da", "inference"]
  },
  {
    id: "jp-grammar-022",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「听说田中要结婚」最自然的是？",
    options: [
      "田中さんは結婚するそうです。",
      "田中さんは結婚しそうです。",
      "田中さんは結婚しています。",
      "田中さんは結婚するようです。"
    ],
    answer: "田中さんは結婚するそうです。",
    speak: "田中さんは結婚するそうです。",
    explanation: "传闻的 〜そうだ：动词普通形 + そうだ。结婚する + そうだ = 結婚するそうです（听说…）。和样态的 降りそうだ 不同。",
    tags: ["grammar", "sentence-pattern", "sou-da", "hearsay"]
  },
  {
    id: "jp-grammar-023",
    track: "japanese",
    module: "jp-grammar",
    type: "input",
    prompt: "把「書きます」变成意向形（〜ましょう的普通体）。",
    accepted: ["書こう", "かこう"],
    answer: "書こう",
    speak: "いっしょに書こう。",
    explanation: "意向形：一类动词 き→こ + う。書きます → 書こう。普通体 〜う/よう = 敬体 〜ましょう。",
    tags: ["grammar", "conjugation", "volitional"]
  },
  {
    id: "jp-grammar-024",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「我正在考虑去日本留学」最自然的是？",
    options: [
      "日本に留学しようと思っています。",
      "日本に留学すると思います。",
      "日本に留学したいです。",
      "日本に留学してください。"
    ],
    answer: "日本に留学しようと思っています。",
    speak: "日本に留学しようと思っています。",
    explanation: "意向形 + と思っています 表示「正在考虑要做…」（持续一段时间的打算）。留学する → 留学しよう。",
    tags: ["grammar", "conjugation", "volitional", "sentence-pattern"]
  },
  {
    id: "jp-reading-010",
    track: "japanese",
    module: "jp-reading",
    type: "choice",
    prompt: "根据课文，这个人为什么去医院？",
    context: {
      title: "小课文：体の調子",
      body: [
        "きのうから頭が痛くて、熱も少しありました。",
        "今朝、熱が38度以上になったので、近くの病院へ行きました。",
        "医者に風邪だと診断されて、薬をもらいました。"
      ],
      translation: "从昨天开始头疼，也有点发烧。今早烧到38度以上，所以去了附近的医院。医生诊断为感冒，开了药。",
      notes: ["〜くて 连接原因", "〜ので 表示客观原因", "受身形「診断されて」表示被医生诊断"]
    },
    options: ["头痛发烧加重了", "去上班", "去上课", "去买东西"],
    answer: "头痛发烧加重了",
    speak: "今朝、熱が38度以上になったので、近くの病院へ行きました。",
    explanation: "第二句说明原因：烧到38度以上，所以去了医院。",
    tags: ["reading", "te-form", "node", "kanji-reading"]
  },
  {
    id: "jp-reading-011",
    track: "japanese",
    module: "jp-reading",
    type: "input",
    prompt: "根据课文填空：医者に風邪だと___、薬をもらいました。",
    context: {
      title: "小课文：体の調子",
      body: [
        "きのうから頭が痛くて、熱も少しありました。",
        "今朝、熱が38度以上になったので、近くの病院へ行きました。",
        "医者に風邪だと診断されて、薬をもらいました。"
      ],
      translation: "从昨天开始头疼，也有点发烧。今早烧到38度以上，所以去了附近的医院。医生诊断为感冒，开了药。",
      notes: ["診断する 的被动是 診断される", "〜て 连接两个被动/接受动作"]
    },
    accepted: ["診断されて", "しんだんされて"],
    answer: "診断されて",
    speak: "医者に風邪だと診断されて、薬をもらいました。",
    explanation: "診断する → 診断されて（受身て形）。放进课文就比单记被动变形更自然。",
    tags: ["reading", "passive", "te-form", "kanji-reading"]
  },
  {
    id: "jp-reading-012",
    track: "japanese",
    module: "jp-reading",
    type: "arrange",
    prompt: "组句：被前辈邀请，去了周末的派对。",
    context: {
      title: "长句骨架",
      body: ["先輩に誘われて、週末のパーティーに行きました。"],
      translation: "被前辈邀请，去了周末的派对。",
      notes: ["誘う → 誘われる（被动）→ 誘われて（被动て形）", "週末の 表示「周末的」"]
    },
    tokens: ["先輩に誘われて", "週末の", "パーティーに", "行きました"],
    answer: ["先輩に誘われて", "週末の", "パーティーに", "行きました"],
    speak: "先輩に誘われて、週末のパーティーに行きました。",
    explanation: "被动て形 + 主动动作：被…之后做了…。这种链式结构在日语叙事中非常常见。",
    tags: ["reading", "passive", "te-form", "long-sentence"]
  },
  // === 英语扩充：工程/AI 长句（10张） ===
  {
    id: "en-reading-012",
    track: "english",
    module: "en-reading",
    type: "choice",
    prompt: "According to the passage, what is the main benefit of SHM?",
    context: {
      title: "Structural Health Monitoring",
      body: [
        "Structural health monitoring (SHM) uses sensors embedded in bridges and buildings to track strain, vibration, and temperature over time.",
        "By detecting anomalies before they become critical, SHM helps engineers schedule maintenance proactively rather than reactively.",
        "This shift from scheduled to condition-based maintenance can extend the service life of infrastructure by decades."
      ],
      translation: "结构健康监测（SHM）利用嵌入桥梁和建筑的传感器追踪应变、振动和温度。通过提前检测异常，工程师可以主动安排维护。这种从定时维护到基于状态的维护的转变，可以将基础设施的使用寿命延长数十年。",
      notes: ["condition-based maintenance 基于状态的维护", "extend service life 延长使用寿命", "proactively vs reactively 主动 vs 被动"]
    },
    options: [
      "It enables condition-based maintenance and extends infrastructure life",
      "It replaces all human inspection completely",
      "It reduces the weight of bridges",
      "It eliminates the need for structural design"
    ],
    answer: "It enables condition-based maintenance and extends infrastructure life",
    speak: "SHM helps engineers schedule maintenance proactively, extending infrastructure service life by decades.",
    explanation: "SHM shifts maintenance from scheduled to condition-based, extending service life.",
    tags: ["reading", "civil", "long-sentence", "academic-verb"]
  },
  {
    id: "en-reading-013",
    track: "english",
    module: "en-reading",
    type: "input",
    prompt: "Fill in: The shift from scheduled to ___ maintenance can extend infrastructure life.",
    context: {
      title: "Structural Health Monitoring",
      body: [
        "Structural health monitoring (SHM) uses sensors embedded in bridges and buildings to track strain, vibration, and temperature over time.",
        "By detecting anomalies before they become critical, SHM helps engineers schedule maintenance proactively rather than reactively.",
        "This shift from scheduled to condition-based maintenance can extend the service life of infrastructure by decades."
      ],
      translation: "同上",
      notes: ["condition-based = 基于状态的", "scheduled maintenance = 定时维护"]
    },
    accepted: ["condition-based", "condition based"],
    answer: "condition-based",
    speak: "condition-based maintenance",
    explanation: "condition-based maintenance: maintenance triggered by actual condition, not calendar.",
    tags: ["reading", "civil", "vocab", "academic-verb"]
  },
  {
    id: "en-reading-014",
    track: "english",
    module: "en-reading",
    type: "choice",
    prompt: "What does 'data drift' refer to in the ML context?",
    context: {
      title: "ML in Production: Data Drift",
      body: [
        "Data drift occurs when the statistical properties of the input data change over time relative to the training distribution.",
        "For example, a model trained on summer traffic patterns may underperform in winter when road conditions and travel behavior differ.",
        "Engineers monitor drift metrics and retrain models when the distribution shift exceeds a predefined threshold."
      ],
      translation: "数据漂移指输入数据的统计特性随时间变化，偏离训练分布。例如用夏季交通数据训练的模型在冬季可能表现不佳。工程师监控漂移指标，当分布偏移超过阈值时重新训练模型。",
      notes: ["statistical properties 统计特性", "training distribution 训练分布", "predefined threshold 预定义阈值"]
    },
    options: [
      "When input data statistics shift away from the training distribution",
      "When the model runs slower over time",
      "When the data storage fills up",
      "When the training code has bugs"
    ],
    answer: "When input data statistics shift away from the training distribution",
    speak: "Data drift occurs when the statistical properties of input data change relative to the training distribution.",
    explanation: "Data drift = distribution shift between training and production data, causing model degradation.",
    tags: ["reading", "ai", "long-sentence", "academic-verb"]
  },
  {
    id: "en-ai-012",
    track: "english",
    module: "en-ai",
    type: "input",
    prompt: "Translate into academic English: 迁移学习",
    accepted: ["transfer learning"],
    answer: "transfer learning",
    speak: "transfer learning",
    explanation: "transfer learning: applying knowledge learned from one task to a related but different task. Common in vision (pre-trained on ImageNet) and NLP (pre-trained language models)."
  },
  {
    id: "en-ai-013",
    track: "english",
    module: "en-ai",
    type: "choice",
    prompt: "In ML, 'overfitting' means:",
    options: [
      "the model memorizes training data but fails to generalize to new data",
      "the model trains too quickly",
      "the dataset is too small to load",
      "the model has too few parameters"
    ],
    answer: "the model memorizes training data but fails to generalize to new data",
    speak: "Overfitting occurs when a model learns the noise in the training data rather than the underlying pattern.",
    explanation: "Overfitting → low training error but high test error. Countermeasures: regularization, dropout, early stopping, more data."
  },
  {
    id: "en-ai-014",
    track: "english",
    module: "en-ai",
    type: "input",
    prompt: "Fill in: ___ is the process of converting raw data into features suitable for ML models.",
    accepted: ["feature engineering", "feature extraction"],
    answer: "feature engineering",
    speak: "feature engineering",
    explanation: "Feature engineering: selecting, transforming, and creating input variables that help ML models learn patterns effectively."
  },
  {
    id: "en-civil-013",
    track: "english",
    module: "en-civil",
    type: "input",
    prompt: "Translate: 预应力混凝土",
    accepted: ["prestressed concrete"],
    answer: "prestressed concrete",
    speak: "prestressed concrete",
    explanation: "prestressed concrete: concrete with internal stresses intentionally introduced to counteract service loads. Common in bridges and long-span structures."
  },
  {
    id: "en-civil-014",
    track: "english",
    module: "en-civil",
    type: "choice",
    prompt: "In structural engineering, 'shear' refers to:",
    options: [
      "forces that cause one part of a material to slide past another",
      "pulling forces along the length of a member",
      "forces that cause buckling",
      "rotational movement at a joint"
    ],
    answer: "forces that cause one part of a material to slide past another",
    speak: "Shear forces act parallel to the cross-section, causing adjacent parts to slide relative to each other.",
    explanation: "Shear = parallel sliding force. Contrast with tension (pulling apart) and compression (pushing together)."
  },
  {
    id: "en-ielts-010",
    track: "english",
    module: "en-ielts",
    type: "choice",
    prompt: "Which phrase best introduces a contrasting point in academic writing?",
    options: [
      "On the other hand,",
      "In addition,",
      "As a result,",
      "For instance,"
    ],
    answer: "On the other hand,",
    speak: "On the other hand, the environmental costs of this approach cannot be overlooked.",
    explanation: "On the other hand = introduces contrast. In addition = adds; As a result = consequence; For instance = example."
  },
  {
    id: "en-ielts-011",
    track: "english",
    module: "en-ielts",
    type: "input",
    prompt: "Complete the academic phrase: It is widely ___ that climate change poses a significant threat.",
    accepted: ["acknowledged", "recognized", "accepted"],
    answer: "acknowledged",
    speak: "It is widely acknowledged that climate change poses a significant threat.",
    explanation: "It is widely acknowledged/recognized that... = common academic hedging phrase to introduce consensus views."
  },
  // === 哲学扩充：命题导读与概念关系（8张） ===
  {
    id: "tlp-concept-010",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "命题1「世界是所有实际情况之所是」中的「实际情况」(Tatsachen / facts) 和「事物」(Dinge / things) 的关系是：",
    options: [
      "实际情况是事物的配置（结合方式），是世界的基本构件",
      "实际情况就是事物本身",
      "实际情况是人对世界的主观解释",
      "实际情况和事物没有关系"
    ],
    answer: "实际情况是事物的配置（结合方式），是世界的基本构件",
    explanation: "TLP 1-1.1：世界由事实（facts）构成，而非事物（things）。事实是事物以特定方式配置在一起的状态。"
  },
  {
    id: "tlp-concept-011",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "命题 2.063「全部实在就是世界」和命题 1 的关系是：",
    options: [
      "实在 = 实际情况的总和，所有事实的总和就是世界（收敛性陈述）",
      "实在不同于世界，是一个更大的概念",
      "实在指物理世界，世界包括心理世界",
      "两者没有逻辑关联"
    ],
    answer: "实在 = 实际情况的总和，所有事实的总和就是世界（收敛性陈述）",
    explanation: "2.063 将「实在」定义为实际情况的总和，这与 1 的「世界 = 事实总和」形成闭环。事实是唯一的基本存在。"
  },
  {
    id: "tlp-concept-012",
    track: "tractatus",
    module: "tlp-concept",
    type: "choice",
    prompt: "命题 2 的「事态」(Sachverhalt / state of affairs) 和命题 1 的「事实」(Tatsache / fact) 的区别是：",
    options: [
      "事态是可能的、简单的情况组合；事实是实际存在的、可能由多个事态构成的复杂情况",
      "事态和事实完全一样",
      "事态是主观的，事实是客观的",
      "事态指未来，事实指过去"
    ],
    answer: "事态是可能的、简单的情况组合；事实是实际存在的、可能由多个事态构成的复杂情况",
    explanation: "2-2.01：事态是对象的结合（可能态），事实是实际存在的事态（更复杂）。事实由事态构成。"
  },
  {
    id: "tlp-relation-010",
    track: "tractatus",
    module: "tlp-relation",
    type: "choice",
    prompt: "「对象 → 事态 → 事实 → 世界」这条链中，哪个层次对应「逻辑空间中的可能性」？",
    options: [
      "事态（在逻辑空间中，对象可以有无限多种结合方式）",
      "对象",
      "事实",
      "世界"
    ],
    answer: "事态（在逻辑空间中，对象可以有无限多种结合方式）",
    explanation: "2.012-2.014：对象包含其所有可能的结合方式（类似于「逻辑形式」），这些可能性构成了事态的逻辑空间。"
  },
  {
    id: "tlp-passage-009",
    track: "tractatus",
    module: "tlp-passage",
    type: "self",
    prompt: "用自己的话解释命题 2.021/2.022 中「对象构成世界的实体」和「对象是固定的、不变的」这两个主张之间的关系。",
    subprompt: "提示：如果对象是可变的，世界会是什么样子？为什么维特根斯坦坚持对象不变？",
    checklist: ["是否解释了不变性对逻辑必然性的意义", "是否举例说明对象 vs 事实的稳定性差异"],
    sample: "对象不变是因为它们在所有可能世界中是同一的。只有事实/事态可以「发生或不发生」，而对象是可能性本身的前提。如果对象变了，逻辑空间也会随之崩溃。",
    explanation: "对象的固定性是 TLP 本体论的核心假设之一：世界的变化 = 对象配置的变化，而非对象本身的生灭。",
    tags: ["passage", "object", "substance", "fixed"]
  },
  {
    id: "tlp-reading-008",
    track: "tractatus",
    module: "tlp-reading",
    type: "choice",
    prompt: "命题 4.001「命题的总和就是语言」与前面的世界-事实链形成什么关系？",
    options: [
      "语言 = 世界：命题描画事实，就像事实描画世界一样，形成一种映射对应",
      "语言和世界没有直接关系",
      "语言只是沟通工具，不涉及事实",
      "命题比事实更基本"
    ],
    answer: "语言 = 世界：命题描画事实，就像事实描画世界一样，形成一种映射对应",
    explanation: "4-4.001：语言（命题的总和）与世界（事实的总和）之间通过「描画关系」对应。这是图式论的核心。"
  },
  {
    id: "tlp-reading-009",
    track: "tractatus",
    module: "tlp-reading",
    type: "choice",
    prompt: "命题 5.6「我的语言的界限就是我的世界的界限」中的「语言界限」最准确的理解是：",
    options: [
      "我能用有意义的命题清晰表达的范围，就是我能有意义地谈论和思考的范围",
      "我会说的外语种类限制了我对世界的认知",
      "词汇量越大，世界越大",
      "这是一种文学修辞，不需要严格解释"
    ],
    answer: "我能用有意义的命题清晰表达的范围，就是我能有意义地谈论和思考的范围",
    explanation: "5.6-5.62：语言界限 = 有意义命题的边界。超出这个边界的就是「不可说的」（伦理、美学、生命意义等），对此应保持沉默（命题 7）。"
  },
  {
    id: "tlp-concept-013",
    track: "tractatus",
    module: "tlp-concept",
    type: "self",
    prompt: "用「语言界限」的概念，尝试解释为什么维特根斯坦在命题 7 说「对于不可说的东西，必须保持沉默」。这种沉默是消极的还是积极的？",
    subprompt: "提示：想想 6.54 的「梯子」比喻——说出不可说的东西会导致什么？沉默的目的不是放弃思考，而是什么？",
    checklist: ["是否区分了「可说」与「不可说」的边界", "是否解释了沉默的积极意义（而非消极回避）"],
    sample: "沉默不是放弃，而是认识到语言的边界后的一种深刻尊重。不可说的东西（伦理、生命意义）不是不存在，而是不能用命题形式表达。保持沉默 = 用行动/生活本身去「显示」它们。",
    explanation: "命题 7 是全书最后一句，也是一切的核心：语言有清晰的界限，承认这一点本身就是哲学的最重要姿态。",
    tags: ["passage", "limit", "silence", "showing"]
  }
];

const n1FoundationCards = [
  {
    id: "jp-n1-plan-001",
    track: "japanese",
    module: "jp-n1-plan",
    type: "self",
    prompt: "一年冲刺 N1：今天先用中文复述你的三层目标。",
    subprompt: "三层目标：补基础自动化、建立N2/N1语法阅读能力、最后用限时综合训练稳定发挥。",
    checklist: ["是否说出当前起点", "是否说出本周最小行动", "是否说出一个可量化指标"],
    sample: "我现在从初级基础出发，先把变形和助词练到自动化。本周每天完成到期复习、1段日语长句精读、1次听读跟读，并记录错因。",
    explanation: "先把目标拆小，程序后续才能用每日记录和错因来调度。",
    tags: ["n1", "plan", "meta"]
  },
  {
    id: "jp-n1-plan-002",
    track: "japanese",
    module: "jp-n1-plan",
    type: "choice",
    prompt: "从当前初级水平冲 N1，最应该优先自动化的是哪组能力？",
    options: ["动词/形容词变形 + 助词 + 长句切分", "只背N1单词表", "只做选择题", "先跳过听力"],
    answer: "动词/形容词变形 + 助词 + 长句切分",
    explanation: "N1不是只靠背词。基础变形、助词和长句切分不稳，读解和听解都会被拖慢。",
    tags: ["n1", "plan", "foundation"]
  },
  {
    id: "jp-n1-vocab-001",
    track: "japanese",
    module: "jp-vocab",
    type: "input",
    prompt: "写出「方針」的假名读音。",
    answer: "ほうしん",
    accepted: ["ほうしん", "ホウシン"],
    speak: "方針",
    explanation: "方針（ほうしん）= 方针、策略。N1阅读中常和政策、组织、研究计划一起出现。",
    tags: ["n1", "vocab", "kanji-reading"]
  },
  {
    id: "jp-n1-vocab-002",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「著しい」最接近哪一个意思？",
    options: ["显著的", "温柔的", "偶然的", "便宜的"],
    answer: "显著的",
    speak: "著しい変化",
    explanation: "著しい（いちじるしい）= 显著的、明显的。常见搭配：著しい変化、著しい発展。",
    tags: ["n1", "vocab", "adjective", "kanji-reading"]
  },
  {
    id: "jp-n1-vocab-003",
    track: "japanese",
    module: "jp-vocab",
    type: "choice",
    prompt: "「導入する」在学术/社会语境里通常表示：",
    options: ["引入、采用一种制度或技术", "把东西弄丢", "暂时休息", "故意回避"],
    answer: "引入、采用一种制度或技术",
    speak: "新しい制度を導入する。",
    explanation: "導入する = 引入、导入。适合和制度、技術、設備、方法搭配。",
    tags: ["n1", "vocab", "academic"]
  },
  {
    id: "jp-n1-grammar-001",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「努力した＿＿、結果が出るとは限らない。」最自然的接续是？",
    options: ["からといって", "ながら", "つつある", "にしては"],
    answer: "からといって",
    speak: "努力したからといって、結果が出るとは限らない。",
    explanation: "からといって = 虽说因为A，但不一定B。常和「とは限らない」搭配。",
    tags: ["n1", "grammar", "sentence-pattern"]
  },
  {
    id: "jp-n1-grammar-002",
    track: "japanese",
    module: "jp-grammar",
    type: "input",
    prompt: "补全句子：この問題は、専門家＿＿解決できないほど複雑だ。（连专家都）",
    answer: "でさえ",
    accepted: ["でさえ", "さえ"],
    speak: "この問題は、専門家でさえ解決できないほど複雑だ。",
    explanation: "でさえ/さえ = 连……都。这里强调连专家也难以解决。",
    tags: ["n1", "grammar", "particle", "emphasis"]
  },
  {
    id: "jp-n1-grammar-003",
    track: "japanese",
    module: "jp-grammar",
    type: "choice",
    prompt: "「〜を余儀なくされる」的核心意思是？",
    options: ["被迫做某事", "主动享受某事", "刚刚开始做某事", "反复尝试某事"],
    answer: "被迫做某事",
    speak: "計画の変更を余儀なくされた。",
    explanation: "Aを余儀なくされる = 被迫A。常见于新闻、说明文和正式写作。",
    tags: ["n1", "grammar", "formal"]
  },
  {
    id: "jp-n1-sentence-001",
    track: "japanese",
    module: "jp-sentence",
    type: "arrange",
    prompt: "组出句子：由于预算有限，不得不修改计划。",
    tokens: ["予算が限られているため", "計画の変更を", "余儀なくされた"],
    answer: ["予算が限られているため", "計画の変更を", "余儀なくされた"],
    speak: "予算が限られているため、計画の変更を余儀なくされた。",
    explanation: "原因「ため」+ 正式表达「変更を余儀なくされた」。",
    tags: ["n1", "arrange", "formal", "cause"]
  },
  {
    id: "jp-n1-reading-001",
    track: "japanese",
    module: "jp-reading",
    type: "choice",
    prompt: "根据短文，作者最想强调什么？",
    context: {
      title: "N1读解 · 学习策略",
      body: [
        "語学学習において、単語を多く覚えることは確かに重要である。",
        "しかし、文脈の中で使えなければ、試験でも実生活でも十分な力にはならない。",
        "したがって、学習者は新しい語を覚えるたびに、短い文を作り、聞き、読み返す習慣を持つべきである。"
      ],
      translation: "语言学习中背很多单词很重要。但是如果不能在上下文中使用，考试和现实中都不够。因此每学一个词，都应该造短句、听、再读。",
      notes: ["確かにA。しかしB = 承认A后转折到重点B", "したがって = 因此"]
    },
    options: ["单词要放进语境反复使用", "只要背词就能通过考试", "听力比阅读完全不重要", "应该避免造句"],
    answer: "单词要放进语境反复使用",
    speak: "文脈の中で使えなければ、十分な力にはならない。",
    explanation: "转折后的重点在「文脈の中で使えなければ」，结论是要造句、听、读回去。",
    tags: ["n1", "reading", "discourse"]
  },
  {
    id: "jp-n1-reading-002",
    track: "japanese",
    module: "jp-reading",
    type: "input",
    prompt: "短文中的「したがって」中文意思是什么？",
    context: {
      title: "N1读解 · 接续词",
      body: [
        "新しい制度は便利である一方、利用者に一定の負担を求める。",
        "したがって、導入する前に十分な説明が必要だ。"
      ],
      translation: "新制度便利，但另一方面也要求使用者承担一定负担。因此，在引入前需要充分说明。",
      notes: ["一方 = 另一方面", "導入する = 引入"]
    },
    answer: "因此",
    accepted: ["因此", "所以", "因而", "于是"],
    explanation: "したがって 表示根据前文得出结论，读解里经常标记作者主张。",
    tags: ["n1", "reading", "connector"]
  },
  {
    id: "jp-n1-listening-001",
    track: "japanese",
    module: "jp-listening",
    type: "self",
    prompt: "影子跟读：先听一句，再停顿复述。",
    subprompt: "句子：新しい制度を導入するにあたって、利用者への説明が欠かせません。",
    checklist: ["是否跟上「導入するにあたって」", "是否听出「欠かせません」", "是否能用中文说出大意"],
    sample: "在引入新制度时，面向使用者的说明不可缺少。",
    speak: "新しい制度を導入するにあたって、利用者への説明が欠かせません。",
    explanation: "N1听解要训练边听边抓功能表达。にあたって = 在……之际。",
    tags: ["n1", "listening", "shadowing", "formal"]
  },
  {
    id: "jp-n1-listening-002",
    track: "japanese",
    module: "jp-listening",
    type: "choice",
    prompt: "听读句子「会議は延期になったわけではなく、開始時間が変更されただけです。」最接近哪一个意思？",
    options: ["会议不是延期，只是开始时间变了", "会议已经取消", "会议地点变了", "会议内容完全改变"],
    answer: "会议不是延期，只是开始时间变了",
    speak: "会議は延期になったわけではなく、開始時間が変更されただけです。",
    explanation: "わけではなく = 并不是……；ただ〜だけ = 只是……。",
    tags: ["n1", "listening", "contrast"]
  },
  {
    id: "jp-n1-output-001",
    track: "japanese",
    module: "jp-output",
    type: "self",
    prompt: "用日语复述：虽然引入新制度很方便，但也会增加使用者负担。",
    subprompt: "提示词：導入する / 便利である一方 / 負担が増える",
    checklist: ["是否用了「一方」表达两面性", "是否正确使用「負担」", "是否说成完整句"],
    sample: "新しい制度を導入することは便利である一方、利用者の負担が増える可能性もあります。",
    speak: "新しい制度を導入することは便利である一方、利用者の負担が増える可能性もあります。",
    explanation: "输出复述能把读解词汇转成自己的可用表达。",
    tags: ["n1", "output", "speaking", "writing"]
  },
  {
    id: "jp-n1-output-002",
    track: "japanese",
    module: "jp-output",
    type: "input",
    prompt: "把「不一定会出结果」补成日语：結果が出る＿＿。",
    answer: "とは限らない",
    accepted: ["とは限らない", "とはかぎらない"],
    speak: "結果が出るとは限らない。",
    explanation: "とは限らない = 不一定。适合表达保留、限制或反驳过度断定。",
    tags: ["n1", "output", "grammar"]
  }
];

// 阅读卡：由 1-17 课分课短文目录生成（原创短文，课次对齐）。
// 若本地存在教材原文（data/minna/minna-readings.local.json，已被 .gitignore 排除），
// 启动时会追加为 source="textbook" 的阅读卡并在排队时优先。
function buildLessonReadingCard(item, index, source) {
  var lesson = Number(item.lesson) || 0;
  return {
    id: "jp-reading-minna-" + (source === "textbook" ? "tb-" : "") + lesson + "-" + index,
    track: "japanese",
    module: "jp-reading",
    type: "reading",
    prompt: "阅读短文：" + (item.title || "第" + lesson + "课"),
    level: "第" + lesson + "课",
    lesson: lesson,
    source: source || "builtin-lesson",
    tags: ["reading-lab", "minna", "lesson-" + lesson].concat(
      source === "textbook" ? ["textbook"] : [],
      source === "ai-generated" ? ["ai-generated"] : []
    ),
    summary: item.summary || "",
    sentences: item.sentences || []
  };
}

// 一题一句：一张卡里塞 5 句时，答一次要读完整篇，量太大，而且 SRS 只能整篇打一个分。
// 拆成"每句一张卡"后每句有独立进度，掌握状况按句判定，当天重复也能只重复没掌握的那句。
function splitReadingCardBySentence(card) {
  var sentences = Array.isArray(card.sentences) ? card.sentences : [];
  if (card.type !== "reading" || sentences.length <= 1) return [card];
  var title = card.passageTitle || String(card.prompt || "").replace(/^阅读短文：/, "").trim() || ("第" + (card.lesson || "") + "课");
  return sentences.map(function (sentence, si) {
    return Object.assign({}, card, {
      id: card.id + "-s" + si,
      passageId: card.id,
      passageTitle: title,
      sentenceNo: si + 1,
      sentenceTotal: sentences.length,
      prompt: "读句子：" + title + "（" + (si + 1) + "/" + sentences.length + "）",
      sentences: [sentence]
    });
  });
}

function splitReadingCards(list) {
  var out = [];
  (list || []).forEach(function (card) {
    splitReadingCardBySentence(card).forEach(function (item) { out.push(item); });
  });
  return out;
}

const japaneseReadingLabCards = splitReadingCards((MINNA_DATA.readings || []).map(function (item, index) {
  return buildLessonReadingCard(item, index, item.source || "builtin-lesson");
}));

// AI生成短文卡：30篇，标记为 source="ai-generated"，使用 lessonRange 标记适用课次范围
const aiReadingCards = splitReadingCards((AI_READINGS_DATA.readings || []).map(function (item, index) {
  return buildLessonReadingCard(item, index, "ai-generated");
}));

// 教材原文（用户本机 OCR 结果，不进仓库）：启动时尝试加载
let textbookReadingCards = [];
function loadLocalTextbookReadings() {
  if (typeof fetch !== "function" || typeof document === "undefined") return;
  fetch("data/minna/minna-readings.local.json")
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (json) {
      var list = json && (json.readings || json);
      if (!Array.isArray(list) || !list.length) return;
      textbookReadingCards = splitReadingCards(list
        .filter(function (item) { return item && Array.isArray(item.sentences) && item.sentences.length; })
        .map(function (item, index) { return buildLessonReadingCard(item, index, "textbook"); }));
      render();
      showToast("已加载 " + list.length + " 篇本地教材课文（拆成 " + textbookReadingCards.length + " 句）");
    })
    .catch(function () { /* 没有本地课文文件时静默跳过 */ });
}

function defaultState() {
  return {
    activeTrack: "japanese",
    activeModule: "all",
    activeView: "practice",
    activeTask: "reading",
    smartAlgorithmVersion: "2026-07-minna-v1",
    mode: "smart",
    settingsOpen: false,
    settingsSection: "ai",
    dailyGoal: 18,
    // 每轮题量：manual = 用 manualSessionSize；auto = 按拆句后的实际刷题量推算
    sessionSizeMode: "manual",
    manualSessionSize: DEFAULT_MANUAL_SESSION_SIZE,
    // 产出题占比：调高 = 更多"自己写"，调低 = 更多选择题
    productionRatio: DEFAULT_PRODUCTION_RATIO,
    deepseekKey: "",
    activeCommuteSegment: "platform",
    commuteDirection: "morning",
    // 注意：这里不要预置 lessonBaseline。它由 applyLessonBaseline 在迁移后盖章，
    // 预置的话会和旧存档 merge 出"已经是最新基线"的假象，迁移就永远不触发了。
    // 课次掌握度模型：追踪每课词汇/语法/阅读/保持率
    lessonProgress: {
      currentLesson: MINNA_LESSON_BASELINE,
      previewLesson: MINNA_LESSON_BASELINE + 1,
      advanceMode: "auto",
      lastAdvanceAt: "",
      lastAdvanceReason: "",
      lessons: {}
    },
    progress: {},
    customCards: [],
    generatedCards: [],
    jpVocab: [],
    vocabBank: [],
    grammarBank: [],
    readingChat: {},
    readingChatInput: "",
    readingAiBusy: false,
    readingAiMessage: "",
    selectionDraft: null,
    analyses: {},
    diagnosis: {},
    dailyLogs: [],
    history: [],
    queue: [],
    currentId: null,
    selected: null,
    typed: "",
    arranged: [],
    tokenOrder: [],
    optionOrder: [],
    revealAnswer: false,
    cardShownAt: 0,
    analysisOpen: false,
    analyzing: false,
    chatGptPendingPrompt: "",
    chatGptPendingCardId: "",
    submitted: false,
    lastResult: null,
    sampleOpen: false,
    translationOpen: false,
    syncText: "",
    syncMessage: "",
    toast: "",
    viewAnim: false,
    aiProxyUrl: "http://127.0.0.1:8799",
    aiProvider: "deepseek",
    analyzeProvider: "deepseek",
    aiMessage: "",
    gitSync: {
      enabled: false,
      token: "",
      gistId: "",
      filename: "triad-learning-data.json",
      auto: true,
      lastSync: "",
      status: ""
    }
  };
}

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const base = defaultState();
    if (!saved || typeof saved !== "object") return base;
    const merged = { ...base, ...saved, gitSync: { ...base.gitSync, ...(saved.gitSync || {}) }, queue: [], currentId: null, activeView: "practice" };
    // 迁移旧生词到 vocabBank（仅首次，之后 vocabBank 已有数据就不再迁移）
    if (!merged.vocabBank || !merged.vocabBank.length) {
      merged.vocabBank = migrateToVocabBank(merged);
    }
    applyLessonBaseline(merged);
    return merged;
  } catch {
    return defaultState();
  }
}

// 手动课次基线迁移：只在 lessonBaseline 落后于 MINNA_LESSON_BASELINE 时推一次。
// 只往前推、不往回退——已经靠掌握度自动推到更高课次的进度不会被拉回来。
function applyLessonBaseline(data) {
  if (data.lessonBaseline === MINNA_LESSON_BASELINE) return data;
  data.lessonProgress = data.lessonProgress || {};
  const current = Number(data.lessonProgress.currentLesson) || 0;
  if (current < MINNA_LESSON_BASELINE) {
    data.lessonProgress.currentLesson = MINNA_LESSON_BASELINE;
    data.lessonProgress.previewLesson = MINNA_LESSON_BASELINE + 1;
    data.lessonProgress.lastAdvanceAt = new Date().toISOString();
    data.lessonProgress.lastAdvanceReason = "手动开课：直接开始第 " + MINNA_LESSON_BASELINE + " 课";
    const lessons = data.lessonProgress.lessons || (data.lessonProgress.lessons = {});
    const previous = lessons[String(current)];
    if (previous) previous.status = "completed";
  }
  data.lessonBaseline = MINNA_LESSON_BASELINE;
  return data;
}

// 从旧 jpVocab 和英语生词卡迁移到统一的 vocabBank
function migrateToVocabBank(data) {
  const bank = [];
  const seen = new Set();
  // 日语旧生词
  for (const item of (data.jpVocab || [])) {
    if (!item || !item.word) continue;
    const entry = {
      id: item.id || `vocab-jp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      track: "japanese",
      word: item.word,
      reading: item.reading || "",
      meaning: item.meaning || "",
      sourceSentence: item.sentence || "",
      sourceCardId: item.sourceCardId || "",
      tags: Array.isArray(item.tags) ? item.tags : [],
      status: item.status || "new",
      correct: item.correct || 0,
      lapses: item.lapses || 0,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    };
    if (!seen.has(entry.word + entry.track)) {
      bank.push(entry);
      seen.add(entry.word + entry.track);
    }
  }
  // 英语生词卡（module === "en-vocab" 的 customCards）
  for (const card of (data.customCards || [])) {
    if (card.module !== "en-vocab" || !card.word) continue;
    if (card.tags?.includes("reverse")) continue; // 反向卡不重复计入
    const entry = {
      id: `vocab-en-${card.id || Date.now()}`,
      track: "english",
      word: card.word,
      reading: "",
      meaning: card.answer || "",
      sourceSentence: card.context?.body?.[0] || "",
      sourceCardId: card.id || "",
      tags: Array.isArray(card.tags) ? card.tags : [],
      status: "new",
      correct: 0,
      lapses: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!seen.has(entry.word + entry.track)) {
      bank.push(entry);
      seen.add(entry.word + entry.track);
    }
  }
  return bank;
}

function saveState() {
  bumpStateRevision(); // 任何持久化变更都让 allCards() 缓存失效
  const { queue, currentId, selected, typed, arranged, tokenOrder, optionOrder, revealAnswer, cardShownAt, analysisOpen, analyzing, submitted, lastResult, sampleOpen, translationOpen, syncText, syncMessage, aiMessage, toast, viewAnim, readingAiBusy, readingAiMessage, ...persisted } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

const app = typeof document !== "undefined" ? document.querySelector("#app") : null;
let cloudSyncTimer = null;
let cloudSyncInFlight = false;
let toastTimer = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[。．.！!？?、,，;；:：'"“”‘’]/g, "")
    .replace(/\s+/g, " ");
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function japaneseN1Status(date = new Date()) {
  const start = parseDateKey(japaneseN1Goal.startDate);
  const target = parseDateKey(japaneseN1Goal.targetDate);
  const totalDays = Math.max(1, Math.round((target - start) / DAY));
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.floor((date - start) / DAY)));
  const remainingDays = Math.max(0, Math.ceil((target - date) / DAY));
  const week = Math.min(52, Math.max(1, Math.floor(elapsedDays / 7) + 1));
  const phase = japaneseN1Phases.find((item) => week >= item.from && week <= item.to) || japaneseN1Phases[japaneseN1Phases.length - 1];
  return {
    week,
    elapsedDays,
    remainingDays,
    remainingWeeks: Math.max(0, Math.ceil(remainingDays / 7)),
    progressPercent: Math.round((elapsedDays / totalDays) * 100),
    phase
  };
}

function n1ModuleCategory(moduleId) {
  // 新模式：阅读驱动，单词和语法都从阅读中来
  if (moduleId === "jp-vocab") return "vocab";
  if (moduleId === "jp-grammar") return "grammar";
  if (moduleId === "jp-reading") return "reading";
  if (moduleId === "jp-n1-plan") return "reading";
  // 旧模块兼容：仍映射到对应类别，但不在主入口展示
  if (moduleId === "jp-listening") return "listening";
  if (moduleId === "jp-output") return "output";
  if (moduleId === "jp-sentence") return "grammar";
  return "reading";
}

function n1CategoryLabel(category) {
  return {
    vocab: "阅读单词",
    grammar: "阅读语法",
    reading: "阅读解析",
    listening: "听解影子",
    output: "输出复述"
  }[category] || category;
}

// 课次门控：带 lesson 的卡只在"已学到该课"或"可预览下一课"时进入题库
function lessonGateOk(lesson, cls) {
  if (!lesson) return true;
  cls = cls || currentLessonState();
  if (lesson <= cls.lesson) return true;
  if (cls.canPreview && lesson === cls.previewLesson) return true;
  return false;
}

// 确定性取干扰项：从 pool 里按固定步长取 count 个与正确项不同的值
function pickDistractors(pool, index, count, keyFn) {
  var correct = keyFn(pool[index]);
  var result = [];
  var step = 7;
  var cursor = index;
  var guard = 0;
  while (result.length < count && guard < pool.length * 2) {
    cursor = (cursor + step) % pool.length;
    step += 6;
    guard += 1;
    var value = keyFn(pool[cursor]);
    if (value && value !== correct && result.indexOf(value) < 0) result.push(value);
  }
  return result;
}

// 把生成的卡按"到期 > 没做过 > 其他"排序后截断，避免永远只出前 N 题
function prioritizeByProgress(cardsList, limit) {
  var due = [], unseen = [], rest = [];
  cardsList.forEach(function (card) {
    var progress = cardProgress(card.id);
    if (!progress) unseen.push(card);
    else if (progress.due <= Date.now()) due.push(card);
    else rest.push(card);
  });
  return due.concat(unseen, rest).slice(0, limit);
}

// 从 1-17 课词汇目录生成词汇题（选意思/看假名选词/看意思写词），只出已学课次
// 结果按课次门控缓存：render 会多次调用 allCards()，避免每次重建 ~1700 个对象
var _vocabCatalogCardsCache = { key: "", cards: null };
function buildVocabCardsFromCatalog() {
  var result = [];
  if (!vocabCatalog.length) return result;
  var cls = currentLessonState();
  var cacheKey = cls.lesson + ":" + (cls.canPreview ? cls.previewLesson : 0);
  if (_vocabCatalogCardsCache.key === cacheKey && _vocabCatalogCardsCache.cards) {
    return _vocabCatalogCardsCache.cards;
  }
  var pool = [];
  vocabCatalog.forEach(function (item, index) {
    if (lessonGateOk(item.lesson, cls)) pool.push({ item: item, catalogIndex: index });
  });
  // 当前课优先出题（新课词先练），干扰项也更多来自相邻课
  pool.sort(function (a, b) { return b.item.lesson - a.item.lesson; });
  pool.forEach(function (entry, i) {
    var item = entry.item;
    var id = "mv-" + entry.catalogIndex;
    var lessonNote = "《大家的日语》第" + item.lesson + "课";
    var baseTags = ["vocab", "dynamic", "catalog"].concat(item.tags || []);
    // 1. 选择中文意思
    var meaningOptions = pickDistractors(pool, i, 3, function (p) { return p.item.meaning; });
    if (meaningOptions.length === 3) {
      result.push({
        id: id + "-m", track: "japanese", module: "jp-vocab", type: "choice", dynamic: true,
        prompt: "「" + item.word + "」" + (item.reading !== item.word ? "（" + item.reading + "）" : "") + " 的中文意思是？",
        options: [item.meaning].concat(meaningOptions),
        answer: item.meaning,
        explanation: item.word + "（" + item.reading + "）= " + item.meaning + " · " + lessonNote,
        tags: baseTags
      });
    }
    // 2. 看假名选写法（仅当写法与读音不同，如汉字词）
    if (item.reading && item.reading !== item.word) {
      var wordOptions = pickDistractors(pool, i, 3, function (p) { return p.item.word; });
      if (wordOptions.length === 3) {
        result.push({
          id: id + "-k", track: "japanese", module: "jp-vocab", type: "choice", dynamic: true,
          prompt: "假名「" + item.reading + "」（" + item.meaning + "）对应的写法是？",
          options: [item.word].concat(wordOptions),
          answer: item.word,
          explanation: item.reading + " → " + item.word + " · " + lessonNote,
          tags: baseTags.concat(["kanji-reading"])
        });
      }
    }
    // 3. 看中文写日语（主动回忆）
    result.push({
      id: id + "-w", track: "japanese", module: "jp-vocab", type: "input", dynamic: true,
      prompt: "「" + item.meaning + "」的日语是？（写假名或原词）",
      answer: item.word,
      accepted: item.reading !== item.word ? [item.word, item.reading] : [item.word],
      explanation: item.meaning + " = " + item.word + (item.reading !== item.word ? "（" + item.reading + "）" : "") + " · " + lessonNote,
      tags: baseTags.concat(["recall"])
    });
  });
  _vocabCatalogCardsCache = { key: cacheKey, cards: result };
  return result;
}

// 从 vocabBank 动态生成词汇练习题（填空/选择）
function buildVocabCardsFromBank(trackId) {
  var result = [];
  var bank = (state.vocabBank || []).filter(function(item) { return item.track === trackId && item.word; });
  var isJapanese = trackId === "japanese";
  bank.slice(-40).forEach(function(item, i) {
    var id = "dyn-vocab-" + trackId + "-" + i;
    // 看词写意思（填空）
    result.push({
      id: id, track: trackId, module: isJapanese ? "jp-vocab" : "en-vocab",
      type: "input", dynamic: true,
      prompt: (isJapanese ? "「" + item.word + "」" + (item.reading ? "（" + item.reading + "）" : "") + " 是什么意思？" : "「" + item.word + "」是什么意思？（中文）"),
      answer: item.meaning, accepted: [item.meaning],
      explanation: (item.sourceSentence ? "来源：" + item.sourceSentence : "") + " · " + item.word + " = " + item.meaning,
      tags: ["vocab", "dynamic", "bank"].concat(item.tags || []),
      context: item.sourceSentence ? { title: "原句", body: [item.sourceSentence], translation: "", notes: [] } : undefined
    });
    // 看意思写词（填空，反向）
    if (item.meaning && item.meaning !== "待解析") {
      result.push({
        id: id + "-r", track: trackId, module: isJapanese ? "jp-vocab" : "en-vocab",
        type: "input", dynamic: true,
        prompt: (isJapanese ? "「" + item.meaning + "」对应的日语是？" : "「" + item.meaning + "」对应的英语单词是？"),
        answer: item.word, accepted: [item.word],
        explanation: item.meaning + " = " + item.word,
        tags: ["vocab", "dynamic", "bank", "reverse"].concat(item.tags || [])
      });
    }
  });
  return result.slice(0, 40);
}

// 从 grammarBank + 完整语法目录动态生成语法练习题（仅日语）
// 每条语法最多 3 种题型：选意思、选接续、看中文选例句；干扰项来自其他语法条目
function buildGrammarCardsFromBank() {
  var result = [];
  var gatedCatalog = [];
  var gcls = currentLessonState();
  grammarCatalog.forEach(function (item, index) {
    if (lessonGateOk(item.lesson, gcls)) gatedCatalog.push({ item: item, catalogIndex: index });
  });
  // 当前课语法优先出题
  gatedCatalog.sort(function (a, b) { return b.item.lesson - a.item.lesson; });
  // 1. 弱项语法优先（来自 grammarBank，用户标记"忘了"或答错过）
  var weakBank = (state.grammarBank || []).filter(function(item) { return item.pattern && (item.status === "forgot" || item.lapses > 0); });
  var weakPatterns = new Set(weakBank.map(function(item) { return item.pattern; }));
  // 弱项条目在目录里找到完整信息后前置
  var weakEntries = gatedCatalog.filter(function (entry) { return weakPatterns.has(entry.item.pattern); });
  var normalEntries = gatedCatalog.filter(function (entry) { return !weakPatterns.has(entry.item.pattern); });
  weakEntries.concat(normalEntries).forEach(function (entry) {
    var item = entry.item;
    var i = gatedCatalog.indexOf(entry);
    var id = "mg-" + entry.catalogIndex;
    var isWeak = weakPatterns.has(item.pattern);
    var tags = ["grammar", "dynamic", isWeak ? "weak" : "catalog"].concat(item.tags || []);
    var lessonNote = "《大家的日语》第" + (item.lesson || "?") + "课";
    var context = item.example
      ? { title: "大家的日语 第" + item.lesson + "课", body: [item.example], translation: item.exampleZh || "", notes: [item.connection || item.pattern] }
      : undefined;
    // 1) 选正确意思
    var meaningOptions = pickDistractors(gatedCatalog, i, 3, function (p) { return p.item.meaning; });
    if (item.meaning && meaningOptions.length === 3) {
      result.push({
        id: id + "-m", track: "japanese", module: "jp-grammar", type: "choice", dynamic: true,
        prompt: "语法「" + item.pattern + "」的意思是？",
        options: [item.meaning].concat(meaningOptions),
        answer: item.meaning,
        explanation: item.pattern + " = " + item.meaning + (item.connection ? " · 接续：" + item.connection : "") + " · " + lessonNote,
        tags: tags, context: context
      });
    }
    // 2) 选正确接续
    var connectionOptions = pickDistractors(gatedCatalog, i, 3, function (p) { return p.item.connection; });
    if (item.connection && connectionOptions.length === 3) {
      result.push({
        id: id + "-c", track: "japanese", module: "jp-grammar", type: "choice", dynamic: true,
        prompt: "「" + item.pattern + "」（" + (item.meaning || "") + "）的正确接续是？",
        options: [item.connection].concat(connectionOptions),
        answer: item.connection,
        explanation: item.pattern + " · 接续：" + item.connection + " · " + lessonNote,
        tags: tags.concat(["connection"]), context: context
      });
    }
    // 3) 看中文选例句（需要例句数据）
    if (item.example && item.exampleZh) {
      var exampleOptions = pickDistractors(gatedCatalog, i, 3, function (p) { return p.item.example; });
      if (exampleOptions.length === 3) {
        result.push({
          id: id + "-e", track: "japanese", module: "jp-grammar", type: "choice", dynamic: true,
          prompt: "「" + item.exampleZh + "」用日语怎么说？",
          options: [item.example].concat(exampleOptions),
          answer: item.example,
          explanation: item.exampleZh + " → " + item.example + " · 语法点：" + item.pattern + " · " + lessonNote,
          tags: tags.concat(["sentence-pattern"])
        });
      }
    }
  });
  return result;
}

// allCards() 在一次渲染/事件处理里会被调用多次（getCard / filteredCards / 队列构建），
// 每次重建 ~2000 张卡的池很浪费。用 stateRevision 做缓存：只要没发生持久化变更
// （saveState 会 bump revision）且任务/科目未变，就复用上次的池。
var _allCardsCache = { key: "", pool: null };
var _stateRevision = 0;
function bumpStateRevision() { _stateRevision += 1; }

function allCards() {
  var cacheKey = _stateRevision + "|" + (state.activeTask || "") + "|" + (state.activeTrack || "") + "|" + textbookReadingCards.length;
  if (_allCardsCache.key === cacheKey && _allCardsCache.pool) return _allCardsCache.pool;

  var dynamicCards = [];
  // 根据当前任务动态补充词汇/语法题
  if (state.activeTask === "vocab") {
    dynamicCards = buildVocabCardsFromBank(state.activeTrack);
    if (state.activeTrack === "japanese") {
      // 收藏词题 + 课本目录题：目录题按"到期 > 没做过 > 其他"轮换，避免永远出前几题
      dynamicCards = dynamicCards.concat(prioritizeByProgress(buildVocabCardsFromCatalog(), 150));
    }
  } else if (state.activeTask === "grammar" && state.activeTrack === "japanese") {
    dynamicCards = prioritizeByProgress(buildGrammarCardsFromBank(), 120);
  } else if (state.activeTrack === "japanese") {
    // 阅读模式也要往池里放词汇/语法卡，否则智能队列的 阅读50%/词汇30%/语法20% 配比落不了地：
    // 拆句后阅读卡有 200+ 张，静态词汇语法卡只有几十张，不补这一步队列会被阅读全占满。
    dynamicCards = prioritizeByProgress(buildVocabCardsFromCatalog(), 60)
      .concat(prioritizeByProgress(buildGrammarCardsFromBank(), 40));
  }
  // 自定义/AI 生成里也可能有多句阅读卡，同样按句拆开，保证"一题一句"
  var pool = [...cards, ...japaneseReadingLabCards, ...aiReadingCards, ...textbookReadingCards, ...splitReadingCards(state.customCards), ...splitReadingCards(state.generatedCards), ...dynamicCards];
  // 课次门控：还没学到的课的卡不进入题库（预览课除外）。cls 在整轮过滤里恒定，算一次即可。
  var cls = currentLessonState();
  var result = pool.filter(function (card) { return lessonGateOk(card.lesson, cls); });
  _allCardsCache = { key: cacheKey, pool: result };
  return result;
}

function getTrack(id = state.activeTrack) {
  return tracks.find((track) => track.id === id) || tracks[0];
}

function getCard(id = state.currentId) {
  return allCards().find((card) => card.id === id) || null;
}

function cardProgress(cardId) {
  return state.progress[cardId] || null;
}

function isDue(card) {
  const progress = cardProgress(card.id);
  return !progress || progress.due <= Date.now();
}

// 默认队列只放"到期"或"从没见过"的卡，避免重新打开后已掌握、还没到复习时间的题反复出现。
function isAvailable(card) {
  return !cardProgress(card.id) || isDue(card);
}

function filteredCards() {
  return allCards().filter((card) => {
    const byTrack = card.track === state.activeTrack;
    const byModule = state.activeModule === "all" || card.module === state.activeModule;
    return byTrack && byModule;
  });
}

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 组句题词块的显示顺序：打乱 0..n-1，且尽量不等于原顺序（否则组句变成顺序点击）。
function shuffledOrder(n) {
  const base = Array.from({ length: n }, (_, index) => index);
  if (n <= 1) return base;
  let order = shuffle(base);
  let tries = 0;
  while (tries < 8 && order.every((value, index) => value === index)) {
    order = shuffle(base);
    tries += 1;
  }
  // 仍是原顺序时强制交换前两个，保证词块不会按答案顺序排列。
  if (order.every((value, index) => value === index)) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

// 任务过滤：词汇题/语法题只出对应题型，阅读任务保持阅读驱动的混合队列
function cardMatchesTask(card) {
  var task = state.activeTask || "reading";
  if (task === "vocab") {
    return card.module === "jp-vocab" || card.module === "en-vocab" || (card.tags || []).indexOf("vocab") >= 0;
  }
  if (task === "grammar") {
    return card.module === "jp-grammar" || (card.tags || []).indexOf("grammar") >= 0 || (card.tags || []).indexOf("sentence-pattern") >= 0;
  }
  return true;
}

function buildQueue(mode) {
  // 智能模式：始终使用 adaptive 算法，task 决定过滤偏向
  state.mode = "smart";
  if (!mode) mode = "adaptive";
  const pool = filteredCards().filter(cardMatchesTask);
  const due = pool.filter(isDue);
  const weak = pool
    .filter((card) => cardProgress(card.id))
    .sort((a, b) => weakScore(b) - weakScore(a));
  const unseen = pool.filter((card) => !cardProgress(card.id));
  const profile = learningProfile(state.activeTrack);
  let queue;

  if (mode === "weak") {
    queue = [...weak.filter((card) => weakScore(card) > 0), ...due, ...unseen];
  } else if (mode === "adaptive") {
    queue = buildSmartQueue(pool, profile);
  } else if (mode === "mix") {
    queue = shuffle(pool);
  } else {
    queue = [...due, ...unseen];
  }

  const unique = [];
  const seen = new Set();
  for (const card of queue) {
    if (!seen.has(card.id)) {
      unique.push(card);
      seen.add(card.id);
    }
  }

  const targetSize = mode === "adaptive" ? profile.sessionSize : state.dailyGoal;
  state.queue = unique.slice(0, targetSize).map((card) => card.id);
  state.currentId = state.queue[0] || null;
  resetAnswerState();
  saveState();
  render();
  focusPracticeSoon();
}

function buildCommuteQueue(segmentId = state.activeCommuteSegment) {
  const segment = getCommuteSegment(segmentId);
  state.activeCommuteSegment = segment.id;
  state.mode = "commute";
  state.activeModule = "all";
  const pool = allCards().filter((card) => segment.tracks.includes(card.track));
  const queue = buildCommuteSmartQueue(pool, segment);
  state.queue = queue.slice(0, segment.size).map((card) => card.id);
  state.currentId = state.queue[0] || null;
  resetAnswerState();
  saveState();
  render();
  focusPracticeSoon();
}

function currentCommuteSegments() {
  return state.commuteDirection === "evening" ? eveningSegments : commuteSegments;
}

function getCommuteSegment(id = state.activeCommuteSegment) {
  const segments = currentCommuteSegments();
  return segments.find((segment) => segment.id === id) || segments[0];
}

function buildCommuteSmartQueue(pool, segment) {
  const profiles = tracks.map((track) => learningProfile(track.id));
  const dailyLogs = profiles.map((profile) => profile.dailyLog).filter(Boolean);
  const dailySignals = [...new Set(profiles.flatMap((profile) => profile.dailySignals))];
  const weakTags = [...new Set(profiles.flatMap((profile) => profile.weakTags))];
  const seen = new Set();
  const queue = [];
  const available = pool.filter(isAvailable);
  const due = available.filter((card) => cardProgress(card.id) && isDue(card));
  const todayExact = available.filter((card) => dailyLogs.some((log) => card.sourceLogId === log.id));
  const todaySignal = available.filter((card) => cardMatchesSignals(card, dailySignals));
  const weak = available
    .filter((card) => weakScore(card) > 0 || weakTags.some((tag) => cardTags(card).includes(tag)))
    .sort((a, b) => weakScore(b) - weakScore(a));
  const segmentType = available.filter((card) => segment.types.includes(card.type));
  const segmentForm = available.filter((card) => segment.forms.some((form) => preferredCard(card, form)));
  const activeTrackCards = available.filter((card) => card.track === state.activeTrack);
  const fallback = shuffle(available);

  pushBucket(queue, due, seen, Math.max(1, Math.round(segment.size * 0.25)));
  pushBucket(queue, [...todayExact, ...todaySignal], seen, Math.max(1, Math.round(segment.size * 0.35)));
  pushBucket(queue, weak, seen, Math.max(1, Math.round(segment.size * 0.2)));
  pushBucket(queue, segmentType, seen, Math.max(1, Math.round(segment.size * 0.25)));
  pushBucket(queue, segmentForm, seen, Math.max(1, Math.round(segment.size * 0.2)));
  pushBucket(queue, activeTrackCards, seen, Math.max(1, Math.round(segment.size * 0.2)));
  pushBucket(queue, fallback, seen, segment.size);
  // 兜底：当到期/未见的卡不足以填满本段时，才用全部题补齐，保证一段路有题可做。
  pushBucket(queue, shuffle(pool), seen, segment.size);
  return queue;
}

function cardTags(card) {
  return card.tags?.length ? card.tags : [card.module, card.type];
}

function accuracy(items) {
  if (!items.length) return null;
  const correct = items.filter((item) => item.correct).length;
  return Math.round((correct / items.length) * 100);
}

function latestDailyLog(trackId = state.activeTrack) {
  return state.dailyLogs
    .filter((log) => log.track === trackId)
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))[0] || null;
}

function formLabel(form) {
  return {
    context: "课文长句",
    quiz: "做题反馈",
    listening: "听力朗读",
    speaking: "口语复述",
    writing: "默写输出"
  }[form] || "课文长句";
}

function preferredCard(card, form) {
  if (form === "context") return Boolean(card.context);
  if (form === "quiz") return card.type === "choice" || card.type === "input";
  if (form === "listening") return Boolean(card.speak);
  if (form === "speaking") return card.type === "self";
  if (form === "writing") return card.type === "input" || card.type === "arrange";
  return Boolean(card.context);
}

function sessionSizeForEnergy(energy) {
  if (energy === "light") return 10;
  if (energy === "intense") return 24;
  return 18;
}

// 拆句上线日期。这之前一张阅读卡包含 ~5 句，答一张的工作量约等于现在的 5 张，
// 所以旧记录的"每天答了几题"和现在不是一个量纲，不能直接拿来推算题量。
const READING_SPLIT_DATE = "2026-07-24";

// 近 N 个练习日每天实际答了多少题（只统计有练习的日子，今天不算——今天还没结束）。
// 用中位数而不是平均：偶尔一天猛刷 60 题不该把之后每天的题量都抬上去。
function recentDailyVolume(trackId, days = 7) {
  const today = todayKey();
  const counts = {};
  for (const item of state.history || []) {
    if (!item || !item.date || item.date === today) continue;
    if (item.date < READING_SPLIT_DATE) continue; // 拆句前的记录量纲不同，不参与推算
    if (trackId && item.track !== trackId) continue;
    counts[item.date] = (counts[item.date] || 0) + 1;
  }
  const recent = Object.keys(counts).sort().slice(-days).map((date) => counts[date]);
  if (!recent.length) return { days: 0, median: 0, average: 0 };
  const sorted = [...recent].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  const average = Math.round(recent.reduce((sum, value) => sum + value, 0) / recent.length);
  return { days: recent.length, median, average };
}

// 每轮题量：默认用手动设定值（设置里可改）。
// 切到"自动"时才按实际刷题量推算——但只看拆句之后的记录，量纲才对得上。
function adaptiveSessionSize(trackId, energy) {
  const base = sessionSizeForEnergy(energy);
  if ((state.sessionSizeMode || "manual") === "manual") {
    const manual = Number(state.manualSessionSize) || DEFAULT_MANUAL_SESSION_SIZE;
    return { size: Math.max(4, Math.min(60, manual)), volume: recentDailyVolume(trackId), manual: true };
  }
  const volume = recentDailyVolume(trackId);
  if (volume.days < 2) return { size: base, volume };
  const factor = energy === "light" ? 0.6 : energy === "intense" ? 1.15 : 0.85;
  // 一天的量通常分几段通勤刷完，所以单轮只取日均的一部分；再和固定档位平均一下做平滑
  const fromVolume = volume.median * factor;
  const size = Math.round(fromVolume * 0.7 + base * 0.3);
  return { size: Math.max(8, Math.min(40, size)), volume };
}

// 每日目标：以近几天实际刷题量（全科目合计）为准，比日均高一点点，
// 让进度条既够得着又有推着走的作用。数据不足 3 天时用 state.dailyGoal。
function effectiveDailyGoal() {
  // 手动模式：每日目标跟着手动题量走（一天大致一轮多一点）
  if ((state.sessionSizeMode || "manual") === "manual") {
    const manual = Number(state.manualSessionSize) || DEFAULT_MANUAL_SESSION_SIZE;
    return Math.max(4, Math.min(80, manual));
  }
  const fallback = state.dailyGoal > 0 ? state.dailyGoal : defaultState().dailyGoal;
  const volume = recentDailyVolume(null);
  if (volume.days < 3) return fallback;
  return Math.max(8, Math.min(60, Math.round(volume.median * 1.1)));
}

// ===== 课次推进模型 =====

function currentLessonState() {
  var lp = state.lessonProgress || {};
  var lesson = Number(lp.currentLesson || japaneseSourceProfile.currentLesson || MINNA_LESSON_BASELINE);
  var record = lp.lessons && lp.lessons[lesson] ? lp.lessons[lesson] : null;
  var previewLesson = Number(lp.previewLesson || lesson + 1);
  return {
    lesson: lesson, previewLesson: previewLesson,
    advanceMode: lp.advanceMode || "auto",
    mastery: record ? record.overall : japaneseSourceProfile.masteryEstimate,
    record: record,
    canPreview: Boolean(record ? record.canPreview : false),
    canAdvance: Boolean(record ? record.canAdvance : false),
    // 记录可能来自别的设备或旧版本，字段不一定齐；这里兜底成数组，
    // 否则调用方一律要写 cls.blockers?.length
    blockers: record && Array.isArray(record.blockers) ? record.blockers : [],
    lastAdvanceAt: lp.lastAdvanceAt || "",
    lastAdvanceReason: lp.lastAdvanceReason || ""
  };
}

function ensureLessonRecord(lessonNum) {
  state.lessonProgress = state.lessonProgress || {};
  state.lessonProgress.lessons = state.lessonProgress.lessons || {};
  var key = String(lessonNum);
  if (!state.lessonProgress.lessons[key]) {
    state.lessonProgress.lessons[key] = {
      lesson: lessonNum,
      status: lessonNum <= (state.lessonProgress.currentLesson || MINNA_LESSON_BASELINE) ? "active" : "locked",
      vocab: { total:0,seen:0,known:0,fuzzy:0,forgot:0,mastery:0 },
      grammar: { total:0,seen:0,known:0,fuzzy:0,forgot:0,mastery:0 },
      reading: { total:0,seen:0,good:0,hard:0,again:0,mastery:0 },
      retention: { due:0,overdue:0,stable:0,mastery:0 },
      overall: 0, canPreview: false, canAdvance: false, blockers: [],
      updatedAt: new Date().toISOString()
    };
  }
  return state.lessonProgress.lessons[key];
}

function lessonForCard(card) {
  if (!card) return currentLessonState().lesson;
  if (typeof card.lesson === "number") return card.lesson;
  var tags = card.tags || [];
  for (var i = 0; i < tags.length; i++) {
    var m = String(tags[i]).match(/^lesson-(\d+)$/);
    if (m) return parseInt(m[1], 10);
  }
  return currentLessonState().lesson;
}

// P1: 统一评分映射 — 按钮传 good/hard/again，映射到掌握度模型的 good/hard/again
function normalizeRatingForMastery(rating) {
  if (rating === "good" || rating === "easy") return "good";
  if (rating === "hard") return "hard";
  return "again";
}

function updateLessonProgressFromCard(card, rating) {
  if (!card || card.track !== "japanese") return;
  var lesson = lessonForCard(card);
  var rec = ensureLessonRecord(lesson);
  rec.updatedAt = new Date().toISOString();
  var n = normalizeRatingForMastery(rating);
  if (card.type === "reading" || card.module === "jp-reading") {
    rec.reading.seen += 1; rec.reading.total = Math.max(rec.reading.total, rec.reading.seen);
    if (n === "good") rec.reading.good += 1;
    else if (n === "hard") rec.reading.hard += 1;
    else rec.reading.again += 1;
  } else if (card.module === "jp-vocab" || (card.tags||[]).indexOf("vocab") >= 0) {
    rec.vocab.seen += 1; rec.vocab.total = Math.max(rec.vocab.total, rec.vocab.seen);
    if (n === "good") rec.vocab.known += 1;
    else if (n === "hard") rec.vocab.fuzzy += 1;
    else rec.vocab.forgot += 1;
  } else if (card.module === "jp-grammar" || (card.tags||[]).some(function(t){return t==="grammar"||t==="sentence-pattern"||t==="conjugation";})) {
    rec.grammar.seen += 1; rec.grammar.total = Math.max(rec.grammar.total, rec.grammar.seen);
    if (n === "good") rec.grammar.known += 1;
    else if (n === "hard") rec.grammar.fuzzy += 1;
    else rec.grammar.forgot += 1;
  }
  recalcLessonMastery(rec);
  maybeAdvanceLesson();
  var cls = currentLessonState();
  japaneseSourceProfile.currentLesson = cls.lesson;
  japaneseSourceProfile.masteryEstimate = cls.mastery;
}

function boundedMastery(v) { return Math.max(0, Math.min(1, v || 0)); }

function recalcLessonMastery(rec) {
  if (!rec) return;
  var vs = rec.vocab.known + rec.vocab.fuzzy + rec.vocab.forgot;
  var vm = vs ? rec.vocab.known / vs : 0;
  rec.vocab.mastery = Math.round(vm * 100) / 100;
  var gs = rec.grammar.known + rec.grammar.fuzzy + rec.grammar.forgot;
  var gm = gs ? rec.grammar.known / gs : 0;
  rec.grammar.mastery = Math.round(gm * 100) / 100;
  var rs = rec.reading.good + rec.reading.hard + rec.reading.again;
  var rm = rs ? rec.reading.good / rs : 0;
  rec.reading.mastery = Math.round(rm * 100) / 100;
  rec.overall = Math.round((vm * 0.50 + gm * 0.50) * 100) / 100;
}

function maybeAdvanceLesson() {
  state.lessonProgress = state.lessonProgress || {};
  var cls = currentLessonState();
  var rec = cls.record;
  if (!rec || state.lessonProgress.advanceMode === "manual") return;
  var lesson = cls.lesson;
  rec.blockers = [];
  // 样本量门槛：只答 1 道题就 100% 不算掌握。没有这道闸，一次答对就能推一课
  // （实测曾靠 ~50 次答题从第 17 课连推到第 19 课）。
  var vocabSamples = rec.vocab.known + rec.vocab.fuzzy + rec.vocab.forgot;
  var grammarSamples = rec.grammar.known + rec.grammar.fuzzy + rec.grammar.forgot;
  var enoughSamples = vocabSamples >= MIN_VOCAB_SAMPLES && grammarSamples >= MIN_GRAMMAR_SAMPLES;
  if (vocabSamples < MIN_VOCAB_SAMPLES) rec.blockers.push("词汇练习太少(" + vocabSamples + "/" + MIN_VOCAB_SAMPLES + " 题)");
  if (grammarSamples < MIN_GRAMMAR_SAMPLES) rec.blockers.push("语法练习太少(" + grammarSamples + "/" + MIN_GRAMMAR_SAMPLES + " 题)");
  if (rec.vocab.mastery < 0.80) rec.blockers.push("词汇掌握不足(" + Math.round(rec.vocab.mastery * 100) + "% / 需80%)");
  if (rec.grammar.mastery < 0.80) rec.blockers.push("语法掌握不足(" + Math.round(rec.grammar.mastery * 100) + "% / 需80%)");
  rec.canPreview = rec.vocab.mastery >= 0.50 || rec.grammar.mastery >= 0.50;
  rec.canAdvance = enoughSamples && rec.vocab.mastery >= 0.80 && rec.grammar.mastery >= 0.80;
  if (rec.canAdvance && lesson < 50) {
    state.lessonProgress.currentLesson = lesson + 1;
    state.lessonProgress.previewLesson = lesson + 2;
    state.lessonProgress.lastAdvanceAt = new Date().toISOString();
    state.lessonProgress.lastAdvanceReason = "词汇 " + Math.round(rec.vocab.mastery * 100) + "% + 语法 " + Math.round(rec.grammar.mastery * 100) + "% 均≥80%，推进到第 " + (lesson + 1) + " 课";
    rec.status = "completed";
    ensureLessonRecord(lesson + 1).status = "active";
    state.lessonAdvanceNotice = "已推进到第 " + (lesson + 1) + " 课！可在设置中生成新课题目。";
  }
}

// ===== 课次推进模型 end =====

function extractLearningSignals(text) {
  const normalized = String(text || "")
    .replace(/[，。！？；：、,.!?;:"“”‘’（）()]/g, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const stop = new Set(["今天", "学习", "老师", "内容", "练习", "觉得", "比较", "还是", "the", "and", "that", "with", "for", "this"]);
  const counts = {};
  for (const token of normalized) {
    if (token.length < 2 || stop.has(token.toLowerCase())) continue;
    counts[token] = (counts[token] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([token]) => token);
}

function cardMatchesSignals(card, signals) {
  if (!signals?.length) return false;
  const haystack = [
    card.prompt,
    card.answer,
    card.explanation,
    card.context?.title,
    ...(Array.isArray(card.context?.body) ? card.context.body : [card.context?.body || ""]),
    ...cardTags(card)
  ]
    .join(" ")
    .toLowerCase();
  return signals.some((signal) => haystack.includes(String(signal).toLowerCase()));
}

function pushBucket(target, bucket, seen, limit) {
  let count = 0;
  for (const card of bucket) {
    if (count >= limit) break;
    if (seen.has(card.id)) continue;
    target.push(card);
    seen.add(card.id);
    count += 1;
  }
}

// 产出题 = 要自己写出来/排出来的题（input / arrange），再认题 = 选择题。
// 数据显示产出题正确率比选择题低 40 个百分点，瓶颈在"写不出"而不是"认不出"，
// 所以词汇/语法桶里按比例把产出题排到前面，让配额优先给产出题。
// 不是全换成产出题：全是产出题会太挫败，选择题还承担着"认脸"的作用。
function productionFirst(list, ratio) {
  const share = typeof ratio === "number" ? ratio : (Number(state.productionRatio) || DEFAULT_PRODUCTION_RATIO);
  if (share <= 0) return list;
  const production = [];
  const recognition = [];
  for (const card of list) {
    if (card.type === "input" || card.type === "arrange") production.push(card);
    else recognition.push(card);
  }
  if (!production.length || !recognition.length) return list;
  // 按 share 交错：share=0.5 → 产出/再认轮流；share=0.7 → 大约每 3 题里 2 题产出
  const out = [];
  let pi = 0;
  let ri = 0;
  let credit = 0;
  while (pi < production.length || ri < recognition.length) {
    credit += share;
    if (credit >= 1 && pi < production.length) { out.push(production[pi++]); credit -= 1; }
    else if (ri < recognition.length) out.push(recognition[ri++]);
    else if (pi < production.length) out.push(production[pi++]);
  }
  return out;
}

function buildSmartQueue(pool, profile) {
  const seen = new Set();
  const queue = [];
  const available = pool.filter(isAvailable);
  const isJapanese = state.activeTrack === "japanese";
  const isEnglish = state.activeTrack === "english";
  const isLight = profile.dailyLog?.energy === "light";

  // 阅读卡：type === "reading" 或模块为 reading 相关
  const readingCards = available.filter(function(card) {
    return card.type === "reading" || card.module === "jp-reading" || card.module === "en-reading";
  });
  // 到期阅读卡优先
  const dueReading = readingCards.filter(function(card) { return cardProgress(card.id) && isDue(card); });
  // 新阅读卡：教材原文（本地加载）优先，其次课文原文，AI生成最后；同来源按课次从当前课往前排
  const newReading = readingCards
    .filter(function(card) { return !cardProgress(card.id); })
    .sort(function(a, b) {
      var order = { "textbook": 3, "builtin-lesson": 2, "ai-generated": 1 };
      var aOrder = order[a.source] || 0;
      var bOrder = order[b.source] || 0;
      if (aOrder !== bOrder) return bOrder - aOrder;
      return (b.lesson || 0) - (a.lesson || 0);
    });
  // 今日相关
  const todayExact = available.filter(function(card) { return card.sourceLogId === profile.dailyLog?.id; });
  const todaySignal = available.filter(function(card) { return cardMatchesSignals(card, profile.dailySignals); });
  const today = [...todayExact, ...todaySignal];
  // 单词卡：jp-vocab / en-vocab 或带 vocab 标签
  const wordCards = available.filter(function(card) {
    return card.module === "jp-vocab" || card.module === "en-vocab" || (card.tags || []).some(function(t) { return t === "vocab"; });
  });
  const dueWords = wordCards.filter(function(card) { return cardProgress(card.id) && isDue(card); });
  // 没做过的词汇卡也要能进队列：课本目录题绝大多数是没做过的，
  // 只收"到期"的话这个桶几乎是空的，配额会被后面的阅读卡吃掉。
  const newWords = wordCards.filter(function(card) { return !cardProgress(card.id); });
  // 语法卡（日语专用）
  const grammarCards = isJapanese ? available.filter(function(card) {
    return card.module === "jp-grammar" || (card.tags || []).some(function(t) { return t === "grammar" || t === "sentence-pattern" || t === "conjugation"; });
  }) : [];
  const dueGrammar = grammarCards.filter(function(card) { return cardProgress(card.id) && isDue(card); });
  const newGrammar = grammarCards.filter(function(card) { return !cardProgress(card.id); });
  // 弱项
  const weak = available
    .filter(function(card) { return weakScore(card) > 0 || profile.weakTags.some(function(tag) { return cardTags(card).includes(tag); }); })
    .sort(function(a, b) { return weakScore(b) - weakScore(a); });
  // 未见过的新上下文
  const newContext = available.filter(function(card) { return !cardProgress(card.id) && card.context; });
  // 偏慢模块
  const slowSet = new Set(profile.slowModules || []);
  const slow = available.filter(function(card) { return slowSet.has(card.module); });
  const remaining = shuffle(available);
  const slots = smartSlots(profile.sessionSize, profile.dailyLog, isJapanese, isEnglish, isLight);

  // 阅读 → 单词 → 语法 三个核心桶排最前，保证 50%/30%/20% 的配比真的落得下去。
  // 弱项优先改成"桶内排序"而不是单独占配额：弱项桶是全模块混排的，阅读卡数量占绝对优势
  // （拆句后 200+ 张），让它单独占配额的话语法桶永远排不进 sessionSize 之内。
  const weakFirst = function(list) {
    return [...list].sort(function(a, b) { return weakScore(b) - weakScore(a); });
  };
  pushBucket(queue, weakFirst(dueReading), seen, slots.dueReading);
  pushBucket(queue, newReading, seen, slots.newReading);
  pushBucket(queue, productionFirst(weakFirst(dueWords).concat(newWords)), seen, slots.dueWords);
  if (isJapanese) {
    pushBucket(queue, productionFirst(weakFirst(dueGrammar).concat(newGrammar)), seen, slots.dueGrammar);
  }
  // 以下是补充桶：核心桶没填满时才用得上
  pushBucket(queue, today, seen, slots.today);
  pushBucket(queue, slow, seen, slots.slow);
  pushBucket(queue, weak, seen, slots.weak);
  pushBucket(queue, newContext, seen, slots.newContext);
  pushBucket(queue, remaining, seen, profile.sessionSize);
  return queue;
}

function smartSlots(sessionSize, log, isJapanese, isEnglish, isLight) {
  var hasDailyLog = Boolean(log?.content || log?.difficulty);
  if (isJapanese) {
    // 日语 Minna 教材驱动：阅读 50% / 单词 30% / 语法 20%（轻量：45/35/20）
    var readingPct = isLight ? 0.45 : 0.50;
    var wordPct = isLight ? 0.35 : 0.30;
    var grammarPct = isLight ? 0.20 : 0.20;
    return {
      dueReading: Math.max(3, Math.round(sessionSize * readingPct * 0.6)),
      newReading: Math.max(2, Math.round(sessionSize * readingPct * 0.4)),
      slow: Math.max(1, Math.round(sessionSize * 0.08)),
      today: hasDailyLog ? Math.max(3, Math.round(sessionSize * 0.15)) : Math.max(1, Math.round(sessionSize * 0.06)),
      dueWords: Math.max(2, Math.round(sessionSize * wordPct)),
      weak: Math.max(2, Math.round(sessionSize * 0.12)),
      dueGrammar: Math.max(1, Math.round(sessionSize * grammarPct)),
      newContext: Math.max(1, Math.round(sessionSize * 0.06))
    };
  }
  if (isEnglish) {
    // 英语阅读驱动：阅读词汇 60% / 单词 40%
    return {
      dueReading: Math.max(3, Math.round(sessionSize * 0.35)),
      newReading: Math.max(2, Math.round(sessionSize * 0.25)),
      slow: Math.max(1, Math.round(sessionSize * 0.08)),
      today: hasDailyLog ? Math.max(2, Math.round(sessionSize * 0.12)) : Math.max(1, Math.round(sessionSize * 0.06)),
      dueWords: Math.max(2, Math.round(sessionSize * 0.40)),
      weak: Math.max(2, Math.round(sessionSize * 0.10)),
      dueGrammar: 0,
      newContext: Math.max(1, Math.round(sessionSize * 0.06))
    };
  }
  // 其他科目保持原逻辑
  return {
    dueReading: Math.max(3, Math.round(sessionSize * 0.35)),
    newReading: Math.max(2, Math.round(sessionSize * 0.15)),
    slow: Math.max(2, Math.round(sessionSize * 0.18)),
    today: hasDailyLog ? Math.max(3, Math.round(sessionSize * 0.28)) : Math.max(1, Math.round(sessionSize * 0.12)),
    dueWords: Math.max(2, Math.round(sessionSize * 0.15)),
    weak: Math.max(2, Math.round(sessionSize * 0.22)),
    dueGrammar: 0,
    newContext: Math.max(1, Math.round(sessionSize * 0.1))
  };
}

// 今日每个题组的答题速度（毫秒）：从带 ms 的历史里按模块聚合。
function moduleSpeedToday(trackId) {
  const key = todayKey();
  const buckets = {};
  for (const item of state.history) {
    if (item.track !== trackId || item.date !== key || typeof item.ms !== "number") continue;
    (buckets[item.module] = buckets[item.module] || []).push(item.ms);
  }
  const result = {};
  for (const [moduleId, list] of Object.entries(buckets)) {
    const avg = Math.round(list.reduce((sum, value) => sum + value, 0) / list.length);
    result[moduleId] = { count: list.length, avg };
  }
  return result;
}

function learningProfile(trackId) {
  const track = getTrack(trackId);
  const trackCards = allCards().filter((card) => card.track === trackId);
  const attempts = state.history.filter((item) => item.track === trackId);
  const failed = attempts.filter((item) => !item.correct);
  const weakTagCounts = {};
  const dailyLog = latestDailyLog(trackId);
  const dailySignals = dailyLog
    ? [...new Set([...(dailyLog.signals || []), ...extractLearningSignals(`${dailyLog.content || ""} ${dailyLog.difficulty || ""}`)])]
    : [];
  const preferredForm = dailyLog?.form || "context";
  const sizing = adaptiveSessionSize(trackId, dailyLog?.energy);
  const sessionSize = sizing.size;
  const dailyVolume = sizing.volume;
  const n1Status = trackId === "japanese" ? japaneseN1Status() : null;

  for (const item of failed) {
    const card = allCards().find((entry) => entry.id === item.cardId);
    if (!card) continue;
    for (const tag of cardTags(card)) {
      weakTagCounts[tag] = (weakTagCounts[tag] || 0) + 1;
    }
  }

  const weakTags = Object.entries(weakTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const moduleRows = track.modules.map((module) => {
    const moduleCards = trackCards.filter((card) => card.module === module.id);
    const moduleAttempts = attempts.filter((item) => item.module === module.id);
    return {
      id: module.id,
      name: module.name,
      attempts: moduleAttempts.length,
      accuracy: accuracy(moduleAttempts),
      unseen: moduleCards.filter((card) => !cardProgress(card.id)).length,
      due: moduleCards.filter(isDue).length,
      n1Share: n1Status ? n1Status.phase.mix[n1ModuleCategory(module.id)] || 0 : 0
    };
  });

  const speedByModule = moduleSpeedToday(trackId);
  for (const row of moduleRows) {
    const speed = speedByModule[row.id];
    row.avgMs = speed ? speed.avg : null;
    row.speedCount = speed ? speed.count : 0;
  }
  const timedRows = moduleRows.filter((row) => row.speedCount >= 2 && row.avgMs);
  const speedBaseline = timedRows.length
    ? [...timedRows.map((row) => row.avgMs)].sort((a, b) => a - b)[Math.floor(timedRows.length / 2)]
    : null;
  const slowModules = speedBaseline ? timedRows.filter((row) => row.avgMs > speedBaseline * 1.25).map((row) => row.id) : [];
  const slowModuleNames = slowModules.map((id) => track.modules.find((module) => module.id === id)?.name || id);

  const readingModule = track.modules.find((module) => /reading|passage/.test(module.id))?.id;
  const weakModule = moduleRows.find((row) => row.attempts >= 2 && row.accuracy !== null && row.accuracy < 75);
  const unseenModule = moduleRows.find((row) => row.unseen > 0);
  const phaseFocusCategory = n1Status
    ? Object.entries(n1Status.phase.mix).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;
  const phaseModule = phaseFocusCategory
    ? moduleRows.find((row) => n1ModuleCategory(row.id) === phaseFocusCategory)?.id
    : null;
  const focusModule = weakModule?.id || phaseModule || readingModule || unseenModule?.id || "all";

  const strategy = [
    `保底复习：先处理到期卡，避免遗忘滚大`,
    dailyLog ? `今日内容：围绕「${shortText(dailyLog.content || dailyLog.difficulty || "今日记录", 22)}」出题` : "今日内容：还没有记录，先用课文长句建立语境",
    weakTags.length ? `弱项修补：优先 ${weakTags.join("、")}` : "弱项修补：先积累几次答题数据",
    `形式偏好：今天偏向 ${formLabel(preferredForm)}`,
    sizing.manual
      ? `强度：${sessionSize} 题（手动设定，可在设置→教材与进度里改）`
      : dailyVolume.days >= 2
        ? `强度：${sessionSize} 题左右（近 ${dailyVolume.days} 个练习日中位数 ${dailyVolume.median} 题，已按你的刷题量调整）`
        : `强度：${sessionSize} 题左右（再练 ${2 - dailyVolume.days} 天就能按你的刷题量自动调整）`,
    slowModuleNames.length ? `节奏：${slowModuleNames.join("、")} 今天偏慢，已多排练习` : ""
  ].filter(Boolean);
  if (n1Status) {
    const mixText = Object.entries(n1Status.phase.mix)
      .map(([category, percent]) => `${n1CategoryLabel(category)}${percent}%`)
      .join(" · ");
    strategy.unshift(`N1路线：第 ${n1Status.week} 周 · ${n1Status.phase.title} · 还剩 ${n1Status.remainingWeeks} 周`);
    strategy.push(`本阶段配比：${mixText}`);
  }

  let advice = dailyLog
    ? `今天按「${formLabel(preferredForm)}」来练，先贴近你记录的学习内容，再穿插到期复习和弱项。`
    : "先记录今天学了什么，智能推荐会更像给你定制，而不是泛泛地抽题。";
  if (n1Status) {
    advice = dailyLog
      ? `N1 第 ${n1Status.week} 周：${n1Status.phase.title}。今天围绕你的记录练「${formLabel(preferredForm)}」，同时补 ${n1Status.phase.focus.slice(0, 2).join("、")}。`
      : `N1 第 ${n1Status.week} 周：${n1Status.phase.title}。先写今日记录，系统会按本阶段目标把基础、读解和听解排进队列。`;
  }
  if (attempts.length >= 6 && weakTags.length && dailyLog) {
    advice = `今天重点是「${formLabel(preferredForm)}」加弱项 ${weakTags.join("、")}，推荐队列会先放今日内容和错题变体。`;
    if (n1Status) {
      advice += ` N1阶段仍按「${n1Status.phase.title}」推进。`;
    }
  } else if (attempts.length >= 6 && moduleRows.every((row) => row.accuracy === null || row.accuracy >= 80)) {
    advice = "当前正确率不错，可以增加未见长句和自评复述题，别只停在会选答案。";
    if (n1Status) {
      advice += ` 本周建议多拿「${n1Status.phase.focus[0]}」开刀。`;
    }
  }

  // 日语错因归因：按题组 + 按细粒度标签两层归类
  const jpReasonLabels = { "jp-vocab": "词汇", "jp-grammar": "语法", "jp-sentence": "组句", "jp-reading": "课文长句" };
  const jpTagReasonLabels = {
    "kanji-reading": "汉字读音", "particle": "助词", "conjugation": "变形",
    "word-order": "语序", "te-form": "て形", "sentence-pattern": "句型",
    "vocab": "词义", "grammar": "语法点", "reading": "课文理解",
    "existence": "存在句", "comparison": "比较"
  };
  const errorReasonCounts = {};
  const tagReasonCounts = {};
  if (trackId === "japanese") {
    for (const item of failed) {
      // 按 module 归类（粗粒度）
      const label = jpReasonLabels[item.module] || "其他";
      errorReasonCounts[label] = (errorReasonCounts[label] || 0) + 1;
      // 按 tags 归类（细粒度）
      const card = allCards().find((c) => c.id === item.cardId);
      if (card) {
        const tags = cardTags(card);
        for (const tag of tags) {
          const tagLabel = jpTagReasonLabels[tag];
          if (tagLabel) {
            tagReasonCounts[tagLabel] = (tagReasonCounts[tagLabel] || 0) + 1;
          }
        }
      }
    }
  }
  const errorReasons = Object.entries(errorReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }));
  const tagReasons = Object.entries(tagReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));

  return {
    track,
    attempts,
    errorReasons,
    tagReasons,
    weakTags,
    moduleRows,
    focusModule,
    dailyLog,
    dailySignals,
    preferredForm,
    sessionSize,
    dailyVolume,
    slowModules,
    slowModuleNames,
    n1Status,
    strategy,
    advice
  };
}

function weakScore(card) {
  const progress = cardProgress(card.id);
  if (!progress) return 0;
  return (progress.wrong || 0) * 3 + (progress.lapses || 0) * 4 - (progress.correct || 0);
}

function resetAnswerState() {
  state.selected = null;
  state.typed = "";
  state.arranged = [];
  state.submitted = false;
  state.lastResult = null;
  state.sampleOpen = false;
  state.translationOpen = false;
  state.analysisOpen = false;
  state.revealAnswer = false;
  state.readingChatInput = "";
  state.readingAiMessage = "";
  state.readingAiBusy = false;
  const card = getCard();
  state.tokenOrder = card && card.type === "arrange" ? shuffledOrder(card.tokens.length) : [];
  state.optionOrder = card && card.type === "choice" ? shuffledOrder(card.options.length) : [];
  state.cardShownAt = Date.now();
}

function focusPracticeSoon() {
  if (typeof window === "undefined" || !window.matchMedia?.("(max-width: 680px)").matches) return;
  window.requestAnimationFrame?.(() => {
    app.querySelector?.(".card")?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function todayHistory() {
  const key = todayKey();
  return state.history.filter((item) => item.date === key);
}

function statsForTrack(trackId) {
  const trackCards = allCards().filter((card) => card.track === trackId);
  const due = trackCards.filter(isDue).length;
  const seen = trackCards.filter((card) => cardProgress(card.id)).length;
  const attempts = state.history.filter((item) => item.track === trackId);
  const correct = attempts.filter((item) => item.correct).length;
  const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;
  const mastery = trackCards.length
    ? Math.round(
        (trackCards.reduce((sum, card) => {
          const progress = cardProgress(card.id);
          return sum + Math.min(progress?.interval || 0, 30) / 30;
        }, 0) /
          trackCards.length) *
          100
      )
    : 0;
  return { total: trackCards.length, due, seen, attempts: attempts.length, accuracy, mastery };
}

function trackCardsByModule(track) {
  return [
    { id: "all", name: "全部题型" },
    ...track.modules
  ];
}

function showToast(message) {
  state.toast = message;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    state.toast = "";
    render();
  }, 2600);
}

function render() {
  const track = getTrack();
  const stats = statsForTrack(track.id);
  const today = todayHistory();
  const goal = effectiveDailyGoal();
  const goalDone = Math.min(today.length, goal);
  const goalPercent = Math.round((goalDone / goal) * 100);
  document.documentElement.style.setProperty("--track-color", track.color);
  // 教材进度显示（日语）
  const minnaInfo = track.id === "japanese"
    ? `<span class="chip">${japaneseSourceProfile.displayName} 第 ${japaneseSourceProfile.currentLesson} 课</span>
       <span class="chip">掌握约 ${Math.round(japaneseSourceProfile.masteryEstimate * 100)}%</span>`
    : "";

  app.innerHTML = `
    ${renderUpdateBanner()}
    <aside class="sidebar">
      <div class="brand">
        <h1>三线学习训练器</h1>
        <p>智能模式 · 短文阅读驱动</p>
      </div>
      <nav class="track-list" aria-label="学习科目">
        ${tracks.map(renderTrackButton).join("")}
      </nav>
      <section class="side-section" data-view="practice">
        <h2>${track.id === "japanese" ? "阅读驱动" : track.id === "english" ? "阅读词汇" : "题组"}</h2>
        <div class="module-list">
          ${trackCardsByModule(track).map(renderModuleButton).join("")}
        </div>
      </section>
      <section class="side-section" data-view="practice">
        <h2>智能模式</h2>
        <div class="mode-row" role="group" aria-label="学习任务">
          ${renderTaskTabs()}
        </div>
        ${minnaInfo ? `<div class="chip-row" style="margin-top:8px">${minnaInfo}</div>` : ""}
      </section>
    </aside>
    <main class="main${state.viewAnim ? " view-enter" : ""}">
      <header class="topbar" data-view="practice">
        <div>
          <h2>${escapeHtml(track.name)} · ${taskLabel(state.activeTask || "reading")}</h2>
          <p>${escapeHtml(track.summary)}</p>
          <button class="plain-button primary mobile-start" data-action="task-start" data-task="${state.activeTask || "reading"}">开始${taskLabel(state.activeTask || "reading")}</button>
        </div>
        <div class="goal-box">
          <div class="goal-line">
            <span>今日完成</span>
            <b>${goalDone}/${goal}</b>
          </div>
          <div class="meter" aria-hidden="true">
            <div class="meter-fill" style="--meter: ${goalPercent}%"></div>
          </div>
        </div>
        <button class="icon-button desktop-settings-btn" data-action="open-settings" title="设置" aria-label="打开设置">⚙</button>
      </header>
      <div class="grid">
        ${renderPracticeCard()}
        <div class="side-stack">
          ${renderLearningOverviewPanel(stats)}
          ${renderVocabPanel()}
          ${renderGrammarPanel()}
          ${renderVocabCatalogPanel()}
          ${renderGrammarCatalogPanel()}
        </div>
      </div>
    </main>
    ${renderTabbar()}
    ${state.settingsOpen ? renderSettingsWindow() : ""}
    ${state.toast ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>` : ""}
  `;

  app.dataset.view = state.activeView || "practice";
  state.viewAnim = false;
  bindEvents();
  bindSelectionListener();
}

// ===== 设置窗口 =====
function renderUpdateBanner() {
  if (!isUpdateReady()) return "";
  return '<div class="update-banner" role="status">' +
    '<span>有新版本可用</span>' +
    '<button class="plain-button primary" data-action="apply-update">立即更新</button>' +
    '</div>';
}

function renderSettingsWindow() {
  var section = state.settingsSection || "ai";
  var sections = [
    { id: "ai", label: "AI 与模型", icon: "⚡" },
    { id: "sync", label: "数据同步", icon: "☁" },
    { id: "textbook", label: "教材与进度", icon: "📚" },
    { id: "data", label: "数据管理", icon: "💾" },
    { id: "custom", label: "自定义题", icon: "✏" },
    { id: "privacy", label: "隐私安全", icon: "🔒" }
  ];
  return '<div class="settings-overlay" data-action="close-settings"><div class="settings-window" onclick="event.stopPropagation()">' +
    '<div class="settings-head"><h2>设置</h2><button class="icon-button" data-action="close-settings" aria-label="关闭">✕</button></div>' +
    '<div class="settings-body">' +
    '<nav class="settings-nav">' +
    sections.map(function(s) {
      return '<button class="settings-nav-btn' + (s.id === section ? " is-active" : "") + '" data-action="settings-section" data-section="' + s.id + '"><span>' + s.icon + '</span> ' + s.label + '</button>';
    }).join("") +
    '</nav>' +
    '<div class="settings-content">' + renderSettingsSection(section) + '</div>' +
    '</div></div></div>';
}

function renderSettingsSection(section) {
  switch (section) {
    case "ai": return renderAiSettings();
    case "sync": return renderSyncSettings();
    case "textbook": return renderTextbookSettings();
    case "data": return renderDataSettings();
    case "custom": return renderCustomSettings();
    case "privacy": return renderPrivacySettings();
    default: return "";
  }
}

function renderAiSettings() {
  var provider = state.aiProvider || "deepseek";
  var analyzeProvider = state.analyzeProvider || "deepseek";
  var hasKey = Boolean(state.deepseekKey);
  var isJapanese = state.activeTrack === "japanese";
  var trackName = getTrack(state.activeTrack).name;
  return '<h3>AI 与模型</h3>' +
    '<div class="settings-form">' +
    '<label>DeepSeek API Key <small>（推荐，手机电脑都能用）</small><input type="password" data-action="deepseek-key" value="' + escapeHtml(state.deepseekKey || "") + '" placeholder="sk-..." /></label>' +
    '<p class="daily-meta">' + (hasKey ? "✓ Key 已设置" : "填 Key 后可直接在手机上用 DeepSeek 生成题和解析") + '</p>' +
    '<div class="form-grid">' +
    '<label>出题来源<select data-action="ai-provider">' + renderSelectOption("deepseek", "DeepSeek API", provider) + renderSelectOption("local", "本地 DeepSeek 8B", provider) + '</select></label>' +
    '<label>解析来源（日语）<select data-action="analyze-provider">' + renderSelectOption("deepseek", "DeepSeek API", analyzeProvider) + renderSelectOption("local", "本地 DeepSeek 8B", analyzeProvider) + '</select></label>' +
    '</div>' +
    '<label>本地代理地址<input data-action="ai-proxy-url" value="' + escapeHtml(state.aiProxyUrl || "http://127.0.0.1:8799") + '" placeholder="http://127.0.0.1:8799" /></label>' +
    '<div class="form-grid">' +
    '<button class="plain-button primary full-button" data-action="ai-generate">' + (isJapanese ? "按教材进度生成练习" : "按词汇进度生成练习") + '</button>' +
    '<button class="plain-button full-button" data-action="ai-diagnose">生成' + escapeHtml(trackName) + '诊断</button>' +
    '</div>' +
    '<p class="daily-meta">AI 操作统一放在设置窗口：按当前教材/错题/收藏词生成题，或分析近期学习数据。</p>' +
    '<p class="daily-meta">' + escapeHtml(state.aiMessage || "暂无 AI 状态。") + '</p>' +
    '</div>';
}

function renderSyncSettings() {
  var git = state.gitSync || {};
  var hasToken = Boolean(git.token);
  var hasGist = Boolean(git.gistId);
  return '<h3>数据同步</h3>' +
    '<div class="settings-form">' +
    '<h4>GitHub 云同步</h4>' +
    '<p class="daily-meta">私有 Gist 保存学习进度，手机电脑自动同步。</p>' +
    '<label>GitHub Token <small>（仅需 gist 权限）</small><input type="password" data-action="git-token" value="' + escapeHtml(git.token || "") + '" placeholder="ghp_..." /></label>' +
    '<p class="daily-meta">' + (hasToken ? "✓ Token 已设置 · " + (hasGist ? "✓ Gist 已关联" : "尚未创建云端") : "需要 GitHub Token") + '</p>' +
    (hasGist ? '<p class="daily-meta">Gist ID: ' + escapeHtml(String(git.gistId).slice(0, 12) + "…") + '</p>' : "") +
    '<label>文件名<input data-action="git-filename" value="' + escapeHtml(git.filename || "triad-learning-data.json") + '" /></label>' +
    '<div class="chip-row">' +
    '<label class="chip"><input type="checkbox" data-action="git-auto"' + (git.auto !== false ? " checked" : "") + ' /> 自动同步</label>' +
    '</div>' +
    '<div class="form-grid">' +
    (hasToken && !hasGist ? '<button class="plain-button primary full-button" data-action="git-create">创建云端</button>' : "") +
    '<button class="plain-button" data-action="git-pull">从云端拉取</button>' +
    '<button class="plain-button" data-action="git-push">上传本机</button>' +
    '</div>' +
    (git.lastSync ? '<p class="daily-meta">上次同步：' + escapeHtml(git.lastSync) + '</p>' : "") +
    '<p class="daily-meta" id="git-sync-status">' + escapeHtml(git.status || "") + '</p>' +
    '<h4 style="margin-top:18px">手动同步</h4>' +
    '<p class="daily-meta">没有 GitHub？也可以手动导出/导入。</p>' +
    '<button class="plain-button full-button" data-action="export-backup">生成备份</button>' +
    '<button class="plain-button full-button" data-action="copy-backup">复制备份</button>' +
    '<button class="plain-button full-button" data-action="download-backup">下载备份</button>' +
    '<label style="margin-top:8px">粘贴备份文本导入<textarea data-action="sync-text" rows="3" placeholder="粘贴 JSON…"></textarea></label>' +
    '<button class="plain-button primary full-button" data-action="import-backup">导入并合并</button>' +
    '</div>';
}

function renderTextbookSettings() {
  var p = japaneseSourceProfile;
  var cls = currentLessonState();
  var rec = cls.record;
  var sizeMode = state.sessionSizeMode || "manual";
  var manualSize = Number(state.manualSessionSize) || DEFAULT_MANUAL_SESSION_SIZE;
  var productionRatio = Number(state.productionRatio) || DEFAULT_PRODUCTION_RATIO;
  return '<h3>教材与进度</h3>' +
    '<div class="settings-form">' +
    '<div class="chip-row"><span class="chip">' + p.displayName + '</span><span class="chip">第 ' + cls.lesson + ' 课</span><span class="chip">掌握 ' + Math.round(cls.mastery * 100) + '%</span>' +
    (cls.canAdvance ? '<span class="chip" style="color:var(--green)">可推进到第' + cls.previewLesson + '课</span>' : '') +
    '</div>' +
    (cls.lastAdvanceReason ? '<p class="daily-meta" style="color:var(--green)">' + cls.lastAdvanceReason + '</p>' : '') +
    (cls.blockers.length ? '<p class="daily-meta" style="color:var(--red)">障碍：' + cls.blockers.join('、') + '</p>' : '') +
    '<p class="daily-meta">推进条件：词汇和语法各练满 ' + MIN_VOCAB_SAMPLES + ' / ' + MIN_GRAMMAR_SAMPLES + ' 题，且两项掌握度都 ≥ 80%。词汇或语法 ≥ 50% 即可预览下一课。</p>' +
    (rec ? '<div style="margin-top:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:0.8rem">' +
    '<span>词汇 ' + Math.round(rec.vocab.mastery*100) + '%</span>' +
    '<span>语法 ' + Math.round(rec.grammar.mastery*100) + '%</span>' +
    '<span>阅读 ' + Math.round(rec.reading.mastery*100) + '%</span>' +
    '<span>保持 ' + Math.round(rec.retention.mastery*100) + '%</span>' +
    '</div>' : '') +
    '<label>当前课次<input type="number" data-action="lesson-number" value="' + cls.lesson + '" min="1" max="50" /></label>' +
    '<label>推进模式<select data-action="lesson-advance-mode">' +
    '<option value="auto"' + (state.lessonProgress?.advanceMode !== "manual" ? " selected" : "") + '>自动推进</option>' +
    '<option value="manual"' + (state.lessonProgress?.advanceMode === "manual" ? " selected" : "") + '>手动控制</option>' +
    '</select></label>' +
    '<h3 style="margin-top:18px">每轮题量</h3>' +
    '<div class="form-grid">' +
    '<label>题量模式<select data-action="session-size-mode">' +
    renderSelectOption("manual", "手动设定", sizeMode) +
    renderSelectOption("auto", "按刷题量自动", sizeMode) +
    '</select></label>' +
    '<label>每轮题数<input type="number" data-action="manual-session-size" value="' + manualSize + '" min="4" max="60"' + (sizeMode === "manual" ? "" : " disabled") + ' /></label>' +
    '</div>' +
    '<p class="daily-meta">' + (sizeMode === "manual"
      ? '当前每轮 ' + manualSize + ' 题，「今日完成」目标同步为 ' + effectiveDailyGoal() + ' 题。'
      : '按最近 7 个练习日的中位数推算（只统计 ' + READING_SPLIT_DATE + ' 拆句之后的记录，之前一题含多句，量纲不同）。') + '</p>' +
    '<label>产出题占比 <small>（词汇/语法题里"自己写答案"的比例）</small>' +
    '<select data-action="production-ratio">' +
    renderSelectOption("0.3", "30% · 以选择题为主", String(productionRatio)) +
    renderSelectOption("0.6", "60% · 偏重产出（推荐）", String(productionRatio)) +
    renderSelectOption("0.8", "80% · 主要靠回忆", String(productionRatio)) +
    '</select></label>' +
    '<p class="daily-meta">你的产出题正确率比选择题低约 40 个百分点，瓶颈在"写不出"而不是"认不出"，所以默认偏重产出题。觉得太挫败可以调低。</p>' +
    '<p class="daily-meta">教材索引状态：data/minna/ 示例文件已创建（待人工整理实际词库和语法库）。</p>' +
    '<h3 style="margin-top:18px">应用版本</h3>' +
    '<p class="daily-meta">当前版本 <b>' + APP_VERSION + '</b>' + (isUpdateReady() ? ' · <span style="color:var(--green)">有新版本待安装</span>' : '') + '</p>' +
    '<button class="plain-button" data-action="' + (isUpdateReady() ? 'apply-update">立即更新' : 'check-update">检查更新') + '</button>' +
    '<p class="daily-meta">手机主屏 App 会在每次切回前台时自动检查更新，发现新版本后顶部会出现横幅，点一下即可，<b>不需要删除图标重新添加</b>（删掉会连同步 token 一起丢）。</p>' +
    '</div>';
}

function renderDataSettings() {
  var exportText = state.syncText || "";
  return '<h3>数据管理</h3>' +
    '<div class="settings-form">' +
    '<button class="plain-button full-button" data-action="export-backup">生成备份</button>' +
    '<button class="plain-button full-button" data-action="copy-backup">复制备份</button>' +
    '<button class="plain-button full-button" data-action="download-backup">下载备份</button>' +
    (exportText ? '<p class="daily-meta" style="margin-top:8px">备份已生成，可复制或下载。</p>' : "") +
    '<label style="margin-top:12px">粘贴备份文本导入<textarea data-action="sync-text" rows="3" placeholder="粘贴 JSON…"></textarea></label>' +
    '<button class="plain-button primary full-button" data-action="import-backup">导入并合并</button>' +
    '<hr style="margin:16px 0;border-color:var(--line)" />' +
    '<p class="daily-meta">清理运行缓存不会删除学习进度（存在 localStorage），仅重载页面。</p>' +
    '<button class="plain-button full-button" data-action="clear-cache">清理缓存并重载</button>' +
    '</div>';
}

function renderCustomSettings() {
  return '<h3>自定义题</h3>' +
    '<div class="settings-form">' +
    '<p class="daily-meta">手动添加填空题或粘贴课文/长句作为上下文。</p>' +
    '<form data-action="custom-form">' +
    '<label>题目<input name="prompt" required placeholder="例：写出…的意思" /></label>' +
    '<div class="form-grid"><label>答案<input name="answer" required placeholder="正确答案" /></label>' +
    '<label>标签<input name="tags" placeholder="vocab, grammar, custom" /></label></div>' +
    '<label>课文/长句原文（可选）<textarea name="context" rows="2" placeholder="粘贴原文作为上下文…"></textarea></label>' +
    '<label>简短解释（可选）<input name="explanation" placeholder="为什么这样答" /></label>' +
    '<button class="plain-button primary full-button" type="submit">加入题库</button>' +
    '</form></div>';
}

function renderPrivacySettings() {
  return '<h3>隐私与安全</h3>' +
    '<div class="settings-form">' +
    '<ul class="strategy-list">' +
    '<li>DeepSeek API Key 只存在当前浏览器 localStorage，不进入备份 JSON。</li>' +
    '<li>GitHub Token 只存在当前浏览器 localStorage，不进入备份 JSON。</li>' +
    '<li>教材 PDF（minasang/）不上传、不进仓库。</li>' +
    '<li>导出备份时不包含 Key 和 Token。</li>' +
    '<li>GitHub Gist 可设为私有，只有知道 token 的人能访问。</li>' +
    '<li>如果担心 token 暴露，可用手动"生成备份/导入合并"替代云同步。</li>' +
    '</ul></div>';
}

// ===== 设置窗口 end =====

function renderTabbar() {
  return `
    <nav class="tabbar" aria-label="主导航">
      ${renderTab("practice", "练习", "✎")}
      ${renderTab("vocab", "生词", "▤")}
      ${renderTab("progress", "进度", "▲")}
      <button class="tab-button${state.settingsOpen ? " is-active" : ""}" data-action="open-settings">
        <span class="tab-icon" aria-hidden="true">⚙</span>
        <span>设置</span>
      </button>
    </nav>
  `;
}

function renderTab(view, label, icon) {
  const active = (state.activeView || "practice") === view ? " is-active" : "";
  return `
    <button class="tab-button${active}" data-action="view" data-tab="${view}">
      <span class="tab-icon" aria-hidden="true">${icon}</span>
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function renderTrackButton(track) {
  const stats = statsForTrack(track.id);
  const active = track.id === state.activeTrack ? " is-active" : "";
  return `
    <button class="track-button${active}" data-action="track" data-track="${track.id}" style="--track-color: ${track.color}">
      <span class="track-mark">${escapeHtml(track.mark)}</span>
      <span>
        <span class="track-title">${escapeHtml(track.name)}</span>
        <span class="track-level">${escapeHtml(track.level)}</span>
      </span>
      <span class="track-due">${stats.due}</span>
    </button>
  `;
}

function renderModuleButton(module) {
  const active = module.id === state.activeModule ? " is-active" : "";
  return `<button class="module-button${active}" data-action="module" data-module="${module.id}">${escapeHtml(module.name)}</button>`;
}

function renderModeButton(mode, label) {
  const active = mode === state.mode ? " is-active" : "";
  return `<button class="mode-button${active}" data-action="mode" data-mode="${mode}">${escapeHtml(label)}</button>`;
}

// 三项主任务切换：替代旧模式按钮
function taskLabel(task) {
  return { reading: "短文阅读", vocab: "词汇题", grammar: "语法题" }[task] || task;
}

function taskIcon(task) {
  return { reading: "📖", vocab: "📝", grammar: "📐" }[task] || "";
}

function renderTaskTab(task) {
  var active = (state.activeTask || "reading") === task ? " is-active" : "";
  return `<button class="mode-button task-tab${active}" data-action="task-start" data-task="${task}">${taskIcon(task)} ${taskLabel(task)}</button>`;
}

function renderTaskTabs() {
  var track = getTrack();
  var tasks = track.id === "japanese" ? ["reading", "vocab", "grammar"] :
              track.id === "english" ? ["reading", "vocab"] :
              ["reading"];
  return tasks.map(renderTaskTab).join("");
}

function renderCommutePanel() {
  const active = getCommuteSegment();
  const evening = state.commuteDirection === "evening";
  const route = evening ? "东大前 → 王子 → 赤羽 → 南与野" : "南与野 → 赤羽 → 王子 → 东大前";
  return `
    <section class="commute-panel" data-view="practice">
      <div class="commute-head">
        <div>
          <h3>通勤模式</h3>
          <p>${escapeHtml(route)}</p>
        </div>
        <button class="plain-button primary commute-start" data-action="commute-start" data-segment="${active.id}">开始本段</button>
      </div>
      <div class="commute-dir" role="group" aria-label="通勤方向">
        <button class="dir-button${evening ? "" : " is-active"}" data-action="commute-dir" data-dir="morning">上班</button>
        <button class="dir-button${evening ? " is-active" : ""}" data-action="commute-dir" data-dir="evening">下班·疲惫</button>
      </div>
      <div class="commute-route" aria-label="通勤路线">
        ${currentCommuteSegments().map(renderCommuteButton).join("")}
      </div>
      <p class="commute-hint">${escapeHtml(active.hint)} · 约 ${active.size} 题${evening ? " · 下班模式更轻" : ""}</p>
    </section>
  `;
}

function renderCommuteButton(segment) {
  const active = segment.id === state.activeCommuteSegment ? " is-active" : "";
  return `
    <button class="commute-button${active}" data-action="commute-segment" data-segment="${segment.id}">
      <b>${escapeHtml(segment.name)}</b>
      <span>${escapeHtml(segment.route)}</span>
    </button>
  `;
}

function renderPracticeCard() {
  const card = getCard();
  if (!card) {
    return `
      <section class="card" data-view="practice">
        <div class="empty-state">
          <div>
            <h3>准备开始</h3>
            <p>建议先用智能推荐，系统会把课文长句和到期错题排在前面。</p>
            <div class="start-actions">
              <button class="plain-button primary" data-action="adaptive-start">智能推荐</button>
              <button class="plain-button" data-action="start">当前模式</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  const track = getTrack(card.track);
  const moduleName = track.modules.find((module) => module.id === card.module)?.name || "自定义";
  const remaining = state.queue.length ? `${state.queue.indexOf(card.id) + 1}/${state.queue.length}` : "1/1";
  const commute = state.mode === "commute" ? getCommuteSegment() : null;

  return `
    <section class="card" data-view="practice">
      <div class="card-header">
        <div class="tag-row">
          ${commute ? `<span class="tag">${escapeHtml(commute.name)}</span>` : ""}
          ${state.mode === "commute" || card.track !== state.activeTrack ? `<span class="tag">${escapeHtml(track.name)}</span>` : ""}
          <span class="tag">${escapeHtml(moduleName)}</span>
          <span class="tag">${escapeHtml(typeLabel(card.type))}</span>
          <span class="tag">${remaining}</span>
        </div>
        <div class="action-row" style="grid-auto-flow: column;">
          ${card.track === "japanese" && card.type !== "reading" ? `<button class="icon-button" data-action="analyze" title="解析这句日语（在 设置→数据同步 填 DeepSeek Key，手机也能直接用）">解析</button>` : ""}
          ${card.track === "japanese" && card.type !== "reading" ? `<button class="icon-button" data-action="chatgpt-analyze" title="没有 Key 时：复制提示词到 ChatGPT 解析">问GPT</button>` : ""}
          ${card.type !== "self" && card.type !== "reading" ? `<button class="icon-button" data-action="reveal" title="显示答案">答案</button>` : ""}
          <button class="icon-button" data-action="skip" title="跳过">跳</button>
        </div>
      </div>
      <div class="card-body">
        ${renderContextBlock(card)}
        <h3 class="prompt">${escapeHtml(card.prompt)}</h3>
        ${card.subprompt ? `<p class="subprompt">${escapeHtml(card.subprompt)}</p>` : ""}
        ${renderAnswerArea(card)}
        ${renderAnswerReveal(card)}
        ${renderFeedback(card)}
        ${renderAnalysisBlock(card)}
        ${renderChatGptPasteBlock(card)}
      </div>
      <div class="card-footer">
        ${renderFooter(card)}
      </div>
    </section>
  `;
}

function typeLabel(type) {
  return {
    choice: "选择",
    input: "填空",
    arrange: "组句",
    self: "自评",
    reading: "阅读"
  }[type] || "练习";
}

function renderContextBlock(card) {
  if (!card.context) return "";
  const body = Array.isArray(card.context.body) ? card.context.body : [card.context.body];
  const notes = card.context.notes || [];
  return `
    <section class="context-block">
      <div class="context-head">
        <strong>${escapeHtml(card.context.title || "课文/长句")}</strong>
        ${
          card.context.translation
            ? `<button class="plain-button context-toggle" data-action="toggle-translation">${state.translationOpen ? "收起译文" : "译文"}</button>`
            : ""
        }
      </div>
      ${
        card.type === "arrange" && !state.submitted
          ? `<div class="context-text"><p class="context-hidden">（组句完成后显示原句）</p></div>`
          : `<div class="context-text">${body.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>`
      }
      ${
        notes.length
          ? `<div class="context-notes">${notes.map((note) => `<span>${escapeHtml(note)}</span>`).join("")}</div>`
          : ""
      }
      ${
        state.translationOpen && card.context.translation
          ? `<p class="context-translation">${escapeHtml(card.context.translation)}</p>`
          : ""
      }
    </section>
  `;
}

function readingCardText(card) {
  if (!Array.isArray(card.sentences)) return japaneseTextFor(card);
  return card.sentences.map((sentence) => normalizeReadingSentence(sentence).text).join("\n");
}

// 统一阅读卡句子字段：兼容旧格式 jp/kana/zh → 新格式 text/reading/translation
function normalizeReadingSentence(sentence) {
  if (!sentence || typeof sentence !== "object") return { text: "", reading: "", translation: "", grammar: [], words: [] };
  return {
    text: sentence.text || sentence.jp || "",
    reading: sentence.reading || sentence.kana || "",
    translation: sentence.translation || sentence.zh || "",
    grammar: Array.isArray(sentence.grammar) ? sentence.grammar : [],
    words: (Array.isArray(sentence.words) ? sentence.words : []).map(function(w) {
      return {
        text: w.text || w.jp || w.word || "",
        reading: w.reading || w.kana || "",
        meaning: w.meaning || w.zh || "",
        tags: Array.isArray(w.tags) ? w.tags : []
      };
    })
  };
}

function readingKnowledgeBoundary() {
  const profile = learningProfile("japanese");
  const status = profile.n1Status || japaneseN1Status();
  const weak = [
    ...(profile.tagReasons || []).map((item) => item.label),
    ...(profile.weakTags || [])
  ].slice(0, 5);
  const jpVocabBank = (state.vocabBank || []).filter(function(item) { return item.track === "japanese"; });
  const vocabSource = jpVocabBank.length ? jpVocabBank : (state.jpVocab || []);
  const vocabForgotten = vocabSource
    .filter((item) => item.status === "forgot" || (item.lapses || 0) > 0)
    .slice(-5)
    .map((item) => item.word);
  return {
    week: status.week,
    phase: status.phase.title,
    phaseFocus: status.phase.focus,
    weak,
    vocabForgotten
  };
}

function renderReadingLab(card) {
  const sentences = Array.isArray(card.sentences) ? card.sentences : [];
  const chat = state.readingChat?.[card.id] || [];
  const boundary = readingKnowledgeBoundary();
  const isAiGenerated = card.source === "ai-generated";
  return `
    <div class="reading-lab">
      <div class="reading-brief">
        <div>
          <span>${escapeHtml(card.level || "N1 bridge")}${card.sentenceTotal ? ` · ${escapeHtml(card.passageTitle || "")} 第 ${card.sentenceNo}/${card.sentenceTotal} 句` : ""}${isAiGenerated ? ' <span class="badge-ai-gen">🤖 AI生成</span>' : ""}</span>
          <strong>${escapeHtml(card.summary || "读懂这一句：先看日文，再看假名和翻译。")}</strong>
        </div>
        <button class="plain-button" data-action="reading-ai-passage">按我的边界生成新短文</button>
      </div>
      <div class="reading-boundary">
        <span>第 ${boundary.week} 周</span>
        <span>${escapeHtml(boundary.phase)}</span>
        ${
          boundary.weak.length
            ? boundary.weak.map((item) => `<span>弱项：${escapeHtml(item)}</span>`).join("")
            : `<span>弱项：继续积累</span>`
        }
      </div>
      <article class="reading-passage">
        ${sentences.map((sentence, index) => renderReadingSentence(card, sentence, index)).join("")}
      </article>
      <div class="reading-toolbar">
        <button class="plain-button" data-action="collect-selection">收藏选中文本</button>
        <button class="plain-button" data-action="speak">${sentences.length > 1 ? "朗读全文" : "朗读本句"}</button>
      </div>
      ${renderSelectionFloatingBar()}
      ${renderReadingChat(card, chat)}
      ${state.readingAiMessage ? `<p class="daily-meta">${escapeHtml(state.readingAiMessage)}</p>` : ""}
    </div>
  `;
}

function renderReadingSentence(card, sentence, index) {
  const s = normalizeReadingSentence(sentence);
  const words = s.words;
  return `
    <section class="reading-sentence" data-card-id="${escapeHtml(card.id)}" data-sentence-index="${index}">
      <div class="sentence-index">${card.sentenceNo || index + 1}</div>
      <div class="sentence-body">
        <p class="sentence-jp">${escapeHtml(s.text)}</p>
        <p class="sentence-kana">${escapeHtml(s.reading)}</p>
        <p class="sentence-zh">${escapeHtml(s.translation)}</p>
        ${
          s.grammar.length
            ? `<div class="sentence-grammar">${s.grammar.map(function(item) {
                var pattern = String(item).split("=")[0].trim();
                var payload = encodeURIComponent(JSON.stringify({
                  pattern: pattern,
                  meaning: String(item),
                  connection: "",
                  sourceSentence: s.text,
                  sourceCardId: card.id
                }));
                // 已收藏的语法点要常亮，否则点完看不出收没收藏过（和 word-chip 的 is-saved 一致）
                var saved = findGrammarPoint(pattern);
                return `<button class="grammar-chip${saved ? " is-saved" : ""}" data-action="collect-grammar" data-grammar="${payload}" title="${saved ? "已收藏，点击更新" : "点击收藏语法点"}">${saved ? "✓ " : ""}${escapeHtml(item)}</button>`;
              }).join("")}</div>`
            : ""
        }
        ${
          words.length
            ? `<div class="word-chip-row">${words.map(function(word, wi) { return renderWordChip(card, s, word, index); }).join("")}</div>`
            : ""
        }
      </div>
    </section>
  `;
}

// P6: 增加 index 参数，payload 含 lesson 和 sentenceIndex
function renderWordChip(card, sentence, word, index) {
  var s = normalizeReadingSentence(sentence);
  var saved = findJpVocab(word.text);
  var cls = currentLessonState();
  var payload = encodeURIComponent(JSON.stringify({
    word: word.text,
    reading: word.reading || "",
    meaning: word.meaning || "",
    sentence: s.text || "",
    sourceCardId: card.id,
    sentenceIndex: typeof index === "number" ? index : -1,
    lesson: card.lesson || cls.lesson,
    tags: (word.tags || []).concat(["minna", "lesson-" + (card.lesson || cls.lesson)])
  }));
  return `
    <button class="word-chip${saved ? (saved.meaning === "待解析" ? " is-pending" : " is-saved") : ""}" data-action="collect-word" data-word="${payload}" title="${escapeHtml(word.reading || "")} ${escapeHtml(word.meaning || "")}">
      <b>${escapeHtml(word.text)}</b>
      <small>${escapeHtml(word.reading || "")} · ${escapeHtml(word.meaning || "")}</small>
    </button>
  `;
}

function renderSelectionFloatingBar() {
  var draft = state.selectionDraft;
  if (!draft) return "";
  return `
    <div class="selection-float-bar">
      <span>已选：<b>${escapeHtml(draft.text)}</b></span>
      <button class="plain-button primary" data-action="float-collect-word">收藏词</button>
      <button class="plain-button" data-action="float-dismiss">取消</button>
    </div>
  `;
}

var _selectionBound = false;
function bindSelectionListener() {
  if (_selectionBound || typeof document === "undefined") return;
  _selectionBound = true;
  document.addEventListener("pointerup", function(e) {
    var sentenceEl = e.target.closest(".reading-sentence");
    if (!sentenceEl) {
      if (state.selectionDraft) { state.selectionDraft = null; render(); }
      return;
    }
    if (e.target.closest("[data-action]")) return;
    var sel = window.getSelection();
    var text = String(sel || "").trim();
    if (!text || text.length > 30) {
      if (state.selectionDraft) { state.selectionDraft = null; render(); }
      return;
    }
    var cardId = sentenceEl.dataset.cardId;
    var sentenceIndex = parseInt(sentenceEl.dataset.sentenceIndex, 10);
    var card = getCard(cardId) || {};
    var sentences = Array.isArray(card.sentences) ? card.sentences : [];
    var s = sentences[sentenceIndex];
    var sourceSentence = s ? normalizeReadingSentence(s).text : readingCardText(card);
    state.selectionDraft = {
      text: text,
      cardId: cardId,
      sentenceIndex: sentenceIndex,
      sourceSentence: sourceSentence
    };
    render();
  });
}

function renderReadingChat(card, chat) {
  return `
    <section class="reading-chat">
      <h4>AI 实时追问</h4>
      <div class="chat-log">
        ${
          chat.length
            ? chat.map((item) => `<div class="chat-msg ${escapeHtml(item.role)}"><b>${item.role === "user" ? "我" : "AI"}</b><p>${escapeHtml(item.content).replace(/\n/g, "<br>")}</p></div>`).join("")
            : `<p class="daily-meta">可以问：这句为什么用「一方で」？请按我现在水平改写下一段。这个词和N1有什么关系？</p>`
        }
      </div>
      <form class="chat-form" data-action="reading-chat-form">
        <input data-action="reading-chat-input" value="${escapeHtml(state.readingChatInput || "")}" placeholder="问 AI：这句怎么理解？请出下一段。" ${state.readingAiBusy ? "disabled" : ""} />
        <button class="plain-button primary" type="submit" ${state.readingAiBusy ? "disabled" : ""}>发送</button>
      </form>
    </section>
  `;
}

function renderAnswerArea(card) {
  if (card.type === "reading") {
    return renderReadingLab(card);
  }

  if (card.type === "choice") {
    const order =
      state.optionOrder && state.optionOrder.length === card.options.length
        ? state.optionOrder
        : card.options.map((_, index) => index);
    return `
      <div class="answer-area">
        ${order.map((index) => renderOption(card, card.options[index])).join("")}
      </div>
    `;
  }

  if (card.type === "input") {
    return `
      <div class="answer-area">
        <label class="sr-only" for="typed-answer">答案</label>
        <input id="typed-answer" class="text-answer" value="${escapeHtml(state.typed)}" data-action="typed" placeholder="输入答案" ${state.submitted ? "disabled" : ""} />
      </div>
    `;
  }

  if (card.type === "arrange") {
    const selectedIndexes = new Set(state.arranged.map((item) => item.index));
    return `
      <div class="answer-area">
        <div class="token-answer" aria-label="已选择">
          ${
            state.arranged.length
              ? state.arranged.map((item, index) => `<button class="token-button" data-action="untoken" data-index="${index}">${escapeHtml(item.text)}</button>`).join("")
              : `<span class="tag">点击词块组句</span>`
          }
        </div>
        <div class="token-bank" aria-label="词块">
          ${(state.tokenOrder && state.tokenOrder.length === card.tokens.length ? state.tokenOrder : card.tokens.map((_, index) => index))
            .map((index) => {
              const token = card.tokens[index];
              const disabled = selectedIndexes.has(index) || state.submitted ? "disabled" : "";
              return `<button class="token-button" data-action="token" data-index="${index}" ${disabled}>${escapeHtml(token)}</button>`;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  if (card.type === "self") {
    return `
      <div class="answer-area">
        <ul class="weak-list">
          ${card.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        ${
          state.sampleOpen
            ? `<div class="feedback good"><strong>参考回答</strong>${escapeHtml(card.sample)}</div>`
            : `<button class="plain-button" data-action="sample">显示参考回答</button>`
        }
      </div>
    `;
  }

  return "";
}

function renderOption(card, option) {
  const isSelected = state.selected === option;
  let status = "";
  if (state.submitted) {
    if (option === card.answer) status = " is-correct";
    else if (isSelected) status = " is-wrong";
  } else if (isSelected) {
    status = " is-selected";
  }
  return `<button class="option-button${status}" data-action="option" data-option="${escapeHtml(option)}" ${state.submitted ? "disabled" : ""}>${escapeHtml(option)}</button>`;
}

function renderFeedback(card) {
  if (!state.submitted) return "";
  const good = state.lastResult?.correct;
  const accepted = card.type === "input" ? `<br>答案：${escapeHtml(card.answer)}` : "";
  const arranged = card.type === "arrange" ? `<br>目标：${escapeHtml(card.answer.join(" "))}` : "";
  return `
    <div class="feedback ${good ? "good" : "bad"}">
      <strong>${good ? "答对了" : "这题先收进复习"}</strong>
      ${escapeHtml(card.explanation || "")}${accepted}${arranged}
    </div>
  `;
}

function renderAnswerReveal(card) {
  if (!state.revealAnswer || state.submitted) return "";
  let answer = "";
  if (card.type === "choice" || card.type === "input") answer = card.answer;
  else if (card.type === "arrange") answer = card.answer.join(" ");
  else if (card.type === "self") answer = card.sample || "";
  const alts =
    card.type === "input" && card.accepted?.length > 1
      ? `（也接受：${card.accepted.filter((item) => item !== card.answer).join("、")}）`
      : "";
  return `
    <div class="feedback analysis">
      <strong>答案</strong>${escapeHtml(answer)}${escapeHtml(alts)}
      ${card.explanation ? `<br>${escapeHtml(card.explanation)}` : ""}
    </div>
  `;
}

function renderAnalysisBlock(card) {
  if (card.track !== "japanese") return "";
  if (state.analyzing) {
    return `<div class="feedback analysis"><strong>解析中…</strong>正在解析这句日语，请稍候。</div>`;
  }
  var cached = state.analyses && state.analyses[card.id];
  if (!state.analysisOpen || !cached) return "";
  var providerLabel = cached.provider === "deepseek-direct" ? "DeepSeek 直连" : cached.provider === "chatgpt" ? "ChatGPT" : cached.provider === "deepseek" ? "DeepSeek（代理）" : "本地模型";
  return ""
    + "<div class=\"feedback analysis\">"
    + "<strong>日语解析（" + escapeHtml(providerLabel) + "）</strong>"
    + "<div class=\"analysis-text\">" + escapeHtml(cached.text).replace(/\n/g, "<br>") + "</div>"
    + "</div>";
}

function renderChatGptPasteBlock(card) {
  if (card.track !== "japanese") return "";
  if (!state.chatGptPendingPrompt || state.chatGptPendingCardId !== card.id) return "";
  return ""
    + "<div class=\"feedback chatgpt-paste\">"
    + "<strong>ChatGPT 解析</strong>"
    + "<p class=\"daily-meta\">提示词已复制到剪贴板。在 ChatGPT 中粘贴并获取解析后，将结果粘贴到下方：</p>"
    + "<textarea id=\"chatgpt-paste-area\" rows=\"4\" placeholder=\"将 ChatGPT 的解析结果粘贴到这里…\"></textarea>"
    + "<button class=\"plain-button primary\" data-action=\"chatgpt-paste\" style=\"margin-top:6px\">保存解析结果</button>"
    + "</div>";
}

function japaneseTextFor(card) {
  if (card.type === "reading") return readingCardText(card);
  if (card.speak) return String(card.speak);
  if (card.context?.body) {
    return Array.isArray(card.context.body) ? card.context.body.join(" ") : String(card.context.body);
  }
  if (card.type === "arrange" && Array.isArray(card.answer)) return card.answer.join("");
  return String(card.prompt || "");
}

// === DeepSeek API 直连（不经过代理，手机/电脑都能用）===
function deepseekKeyAvailable() {
  return Boolean(state.deepseekKey && String(state.deepseekKey).trim().length >= 10);
}

async function callDeepSeekDirect(systemPrompt, userPrompt, temperature) {
  var key = String(state.deepseekKey || "").trim();
  if (!key) throw new Error("未设置 DeepSeek API key");
  var res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: temperature != null ? temperature : 0.7,
      stream: false
    })
  });
  if (!res.ok) {
    var detail = await res.text().catch(function() { return ""; });
    var err = new Error("DeepSeek API " + res.status);
    err.detail = detail.slice(0, 300);
    throw err;
  }
  var data = await res.json();
  return data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "";
}

async function callDeepSeekAnalyze(text) {
  var up = "学习者目标：一年内通过JLPT N1，但当前基础仍在初级阶段。请解析下面这句日语，既讲清当前句子，也指出它和N1读解/听解能力的关系。\n用简洁中文输出，分这几块（每块用小标题，之间空行）：\n1. 假名读音：给整句标注假名。\n2. 逐词拆解：每个词写「词 — 词性 — 意思」，一行一个。\n3. 语法点：助词、动词变形、句型，挑重点讲。\n4. N1连接：这句里哪个表达以后会在N1阅读/听力中反复出现。\n5. 自然翻译：一句通顺的中文。\n不要输出 JSON 或代码块，直接用纯文本和换行。\n\n句子：" + text;
  var raw = await callDeepSeekDirect("你是耐心的日语老师，用中文为初级学习者讲解。", up, 0.3);
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractJsonFromText(raw) {
  var cleaned = String(raw).replace(/<think>[\s\S]*?<\/think>/gi, "");
  var fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  var jsonStr = fenced ? fenced[1] : cleaned;
  var start = jsonStr.indexOf("{");
  var end = jsonStr.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("没有返回 JSON");
  return JSON.parse(jsonStr.slice(start, end + 1).replace(/,(\s*[}\]])/g, "$1"));
}

// 大家的日语教材上下文：供 AI prompt 使用
function minnaPromptContext() {
  var p = japaneseSourceProfile;
  var cls = currentLessonState();
  var forgotWords = (state.vocabBank || []).filter(function(item) {
    return item.track === "japanese" && (item.status === "forgot" || (item.lapses || 0) > 0);
  }).slice(-8).map(function(item) { return item.word + "(" + (item.meaning || "") + ")"; });
  var forgotGrammar = (state.grammarBank || []).filter(function(item) {
    return item.status === "forgot" || (item.lapses || 0) > 0;
  }).slice(-5).map(function(item) { return item.pattern; });
  return [
    "当前教材：《" + p.displayName + "》第 " + cls.lesson + " 课。",
    "已学课次范围：第 1-" + cls.lesson + " 课，掌握约 " + Math.round(cls.mastery * 100) + "%。",
    "下一课：" + cls.previewLesson + " 课（仅供 preview，不作为主要考点）。",
    (cls.canAdvance ? "已满足推进条件，可适度引入第 " + cls.previewLesson + " 课内容。" : "尚未满足推进条件，请聚焦第 " + cls.lesson + " 课及前置课。"),
    (cls.blockers.length ? "当前障碍：" + cls.blockers.join("、") : ""),
    "优先语法：" + p.priorityGrammar.join("、"),
    forgotWords.length ? "最近忘词：" + forgotWords.join("、") : "",
    forgotGrammar.length ? "最近忘记语法：" + forgotGrammar.join("、") : "",
    "严格要求：只使用第 1-" + cls.lesson + " 课已学词汇和句型，允许少量下一课 preview（必须标记）。不要生成 N1/N2 难度内容，严格限制在课本范围内。"
  ].filter(Boolean).join("\n");
}

function n1PromptContext(trackId) {
  if (trackId !== "japanese") return "";
  var status = japaneseN1Status();
  var phase = status.phase;
  var mix = Object.entries(phase.mix).map(function(entry) {
    return n1CategoryLabel(entry[0]) + entry[1] + "%";
  }).join("、");
  var minnaCtx = minnaPromptContext();
  return [
    "学习目标：从「" + japaneseN1Goal.currentLevel + "」在一年内达到「" + japaneseN1Goal.targetLevel + "」。",
    "当前进度：第 " + status.week + " 周，阶段「" + phase.title + "」，距离目标约 " + status.remainingWeeks + " 周。",
    "阶段目标：" + phase.goal,
    "阶段重点：" + phase.focus.join("、"),
    "本阶段训练配比：" + mix,
    "## 教材现状\n" + minnaCtx,
    "出题原则：必须照顾当前初级基础，不要直接堆过难N1题；每题都要让学习者知道该补哪个基础点，以及它怎样通向N1。"
  ].join("\n");
}

function buildDeepSeekGeneratePrompt(body) {
  var trackName = body.trackName || "学习";
  var weakTags = Array.isArray(body.weakTags) ? body.weakTags : [];
  var count = body.count || 6;
  var isJapanese = body.track === "japanese" || state.activeTrack === "japanese";
  var minnaCtx = isJapanese ? minnaPromptContext() : "";
  // 从生词和语法银行获取上下文
  var recentVocab = (state.vocabBank || []).filter(function(item) {
    return item.track === (body.track || state.activeTrack) && (item.lapses || 0) > 0;
  }).slice(-6).map(function(item) { return item.word; });
  var recentGrammar = isJapanese ? (state.grammarBank || []).filter(function(item) {
    return (item.lapses || 0) > 0;
  }).slice(-4).map(function(item) { return item.pattern; }) : [];

  var currentLesson = japaneseSourceProfile.currentLesson;
  if (isJapanese) {
    return "你是《大家的日语》第 " + currentLesson + " 课的出题教师。请为这一课生成一整套练习题，不要照抄教材原文。\n\n" +
      "## 教材进度\n" + minnaCtx + "\n\n" +
      (weakTags.length ? "薄弱标签：" + weakTags.join("、") + "\n" : "") +
      (recentVocab.length ? "最近忘词：" + recentVocab.join("、") + "\n" : "") +
      (recentGrammar.length ? "最近忘记语法：" + recentGrammar.join("、") + "\n" : "") +
      "\n## 出题要求\n" +
      "请生成以下三类题目，合计约 " + count + " 道：\n\n" +
      "1. 短文阅读题（reading）：生成 5-10 篇原创短文，每篇 3-5 句。\n" +
      "   - 主要使用第 " + currentLesson + " 课的新词和新语法，辅以第 1-" + (currentLesson - 1) + " 课已学内容\n" +
      "   - 每句必须给 jp（原文）、kana（假名）、zh（中文）、grammar 数组、words 数组\n" +
      "   - words 每项包含 text, reading, meaning, tags\n\n" +
      "2. 单词题（vocab）：为第 " + currentLesson + " 课的每个新单词生成 1 道题。\n" +
      "   - 题型：填空(input) / 选择释义(choice) / 写假名(input)\n" +
      "   - 每道题必须给 explanation\n\n" +
      "3. 语法题（grammar）：为第 " + currentLesson + " 课的每个新语法点生成 1-2 道题。\n" +
      "   - 题型：填空(input) / 组句(arrange) / 选择正确用法(choice)\n" +
      "   - 每道题必须给 explanation\n\n" +
      "严格限制：不要出现超过第 " + (currentLesson + 1) + " 课的词汇和语法。不要生成 N1/N2 难度内容。\n" +
      "choice 的 answer 必须是 options 中的一项；arrange 的 answer 是正确顺序 tokens 数组。\n" +
      "字符串内部不要出现真实换行，需要换行就拆成数组多个元素。\n" +
      "\n只输出一个 JSON 对象，不要任何额外文字或 Markdown 代码块，格式：\n" +
      '{"cards":[{"module":"jp-reading","type":"reading","prompt":"阅读短文：标题","lesson":' + currentLesson + ',"level":"课本","summary":"本文练习...","sentences":[{"jp":"...","kana":"...","zh":"...","grammar":["语法点"],"words":[{"text":"単語","reading":"たんご","meaning":"单词","tags":["minna","lesson-' + currentLesson + '"]}]}]},{"module":"jp-vocab","type":"input","prompt":"「単語」的意思是？","lesson":' + currentLesson + ',"answer":"...","accepted":["..."],"explanation":"...","tags":["minna","vocab","lesson-' + currentLesson + '"]},{"module":"jp-grammar","type":"choice","prompt":"选择正确的助词：...","lesson":' + currentLesson + ',"options":["A","B","C","D"],"answer":"A","explanation":"...","tags":["minna","grammar","lesson-' + currentLesson + '"]}]}';
  }
  return "你是一个严谨的语言学习出题助手。请根据学习者的当前状态生成 " + count + " 道原创练习题，不要照抄任何教材或真题原文。\n\n" +
    "科目：" + trackName + "\n" +
    "薄弱标签：" + (weakTags.join("、") || "（从答题数据自动推断）") + "\n" +
    (recentVocab.length ? "最近忘词：" + recentVocab.join("、") + "\n" : "") +
    "\n要求：\n" +
    "- 英语题围绕词汇在语境中的使用，优先复现忘记的词。\n" +
    "- 英语 reading 类型短文卡：2-4句，带原文/中文/关键词。\n" +
    "- 多用填空(input)、组句(arrange)、自评(self)，少用纯选择(choice)。\n" +
    "- 每题给一句简短中文解释。\n" +
    "- choice 的 answer 必须是 options 中的一项；arrange 的 answer 是正确顺序 tokens 数组。\n" +
    "- 字符串内部不要出现真实换行，需要换行就拆成数组多个元素。\n" +
    "\n只输出一个 JSON 对象，不要任何额外文字或 Markdown 代码块，格式：\n" +
    '{"cards":[{"module":"en-reading","type":"reading","prompt":"阅读短文：...","summary":"...","sentences":[{"text":"...","reading":"...","translation":"...","words":[{"text":"...","meaning":"...","tags":["academic"]}]}]},{"module":"en-vocab","type":"input","prompt":"...","answer":"...","accepted":["..."],"explanation":"...","tags":["vocab","english"]}]}';
}

function buildDeepSeekDiagnosisPrompt(body) {
  var trackName = body.trackName || "日语";
  var profile = body.profile || {};
  var recentErrors = body.recentErrors || [];
  var dailyLogs = body.dailyLogs || [];
  var errorDetails = recentErrors.map(function(e) {
    return "[" + ((e.tags || []).join(",") || "") + "] Q:" + String(e.prompt || "").slice(0, 80)
      + " | 正解:" + String(e.answer || "").slice(0, 40)
      + " | 答:" + String(e.userAnswer || "").slice(0, 40);
  }).join("\n");
  var logSummaries = dailyLogs.map(function(l) {
    return String(l.date || "") + ": " + String(l.content || "").slice(0, 80)
      + (l.difficulty ? " / 难点:" + String(l.difficulty).slice(0, 50) : "");
  }).join("\n");
  var moduleRows = (profile.moduleRows || []).map(function(r) {
    return "- " + r.name + ": 正确率" + (r.accuracy == null ? "未练" : r.accuracy + "%")
      + ", 到期" + r.due + "张"
      + (r.avgMs ? ", 均速" + (r.avgMs / 1000).toFixed(1) + "秒" : "");
  }).join("\n");
  var minnaCtx = minnaPromptContext();
  return `你是经验丰富的日语学习诊断教练。请分析以下${trackName}学习数据，输出个性化诊断。严格围绕《大家的日语》课本内容，不要涉及 N1/N2 难度。

${minnaCtx ? "## 教材进度\n" + minnaCtx + "\n" : ""}
## 学习档案
- 错因归类：${(profile.errorReasons || []).map(function(r) { return r.label + "(" + r.count + "次)"; }).join("、") || "暂无"}
- 细粒度弱点：${(profile.tagReasons || []).map(function(r) { return r.label + "(" + r.count + "次)"; }).join("、") || "暂无"}
- 薄弱标签：${(profile.weakTags || []).join("、") || "暂无"}
- 偏慢题组：${(profile.slowModuleNames || []).join("、") || "无"}
- 各题组数据：
${moduleRows || "暂无"}

## 最近错题
${errorDetails || "暂无错题记录"}

## 最近日志
${logSummaries || "暂无日志"}

请只输出 JSON：
{
  "diagnosis": {
    "summary": "用2-4句话总结当前课本学习的主要瓶颈",
    "patterns": [
      {"category": "弱点类别名", "detail": "具体错误模式、根因、下一步", "cards": ["相关卡片id"]}
    ],
    "recommendations": [
      "可执行建议1",
      "可执行建议2"
    ],
    "focusCards": [
      {"module":"jp-grammar","type":"choice|input|arrange|self","prompt":"针对弱点的原创练习题","options":["choice需要"],"answer":"正确答案","explanation":"解释","tokens":["arrange需要"],"accepted":["input需要"],"tags":["minna"]}
    ]
  }
}

规则：
- patterns 2-4个，必须具体到助词、变形、接续、长句切分、听解反应或输出复述。
- recommendations 2-4条，每条都要能今天执行。
- focusCards 3-6道，优先填空、组句、读解和复述，难度严格限制在课本范围内。
- 只输出 JSON，不要 Markdown。`;
}

async function callDeepSeekGenerate(body) {
  var prompt = buildDeepSeekGeneratePrompt(body || {});
  var raw = await callDeepSeekDirect("你是严谨的学习出题助手，只输出 JSON。", prompt, 0.6);
  return extractJsonFromText(raw);
}

async function callDeepSeekDiagnose(body) {
  var prompt = buildDeepSeekDiagnosisPrompt(body || {});
  var raw = await callDeepSeekDirect("你是经验丰富的日语学习诊断教练，只输出 JSON。", prompt, 0.45);
  return extractJsonFromText(raw);
}

function readingPayload(card) {
  return {
    id: card.id,
    prompt: card.prompt,
    level: card.level || "",
    summary: card.summary || "",
    text: readingCardText(card),
    sentences: (card.sentences || []).map((sentence) => {
      const s = normalizeReadingSentence(sentence);
      return {
        text: s.text,
        reading: s.reading,
        translation: s.translation,
        grammar: s.grammar || [],
        words: s.words || []
      };
    })
  };
}

function readingLearningPayload() {
  const boundary = readingKnowledgeBoundary();
  const jpVocabForAi = (state.vocabBank || []).filter(function(item) { return item.track === "japanese"; });
  const vocabSource = jpVocabForAi.length ? jpVocabForAi : (state.jpVocab || []);
  const recentVocab = vocabSource.slice(-30).map((item) => ({
    word: item.word,
    reading: item.reading,
    meaning: item.meaning,
    status: item.status,
    lapses: item.lapses || 0
  }));
  const recentHistory = state.history
    .filter((item) => item.track === "japanese")
    .slice(-30)
    .map((item) => ({ cardId: item.cardId, module: item.module, rating: item.rating, correct: item.correct }));
  return { boundary, recentVocab, recentHistory };
}

function buildReadingChatPrompt(card, question) {
  const payload = readingPayload(card);
  const learning = readingLearningPayload();
  return `你是我的日语阅读教练。我正在用”阅读短文 + 逐句解析 + 收藏生词”的方式学习《大家的日语》，当前基础在初级阶段。

请根据我的问题回答，必须贴合当前短文，不要泛泛讲课。

## 我的知识边界
${JSON.stringify(learning, null, 2)}

## 当前短文
${JSON.stringify(payload, null, 2)}

## 我的问题
${question}

回答要求：
- 用中文讲清楚，必要时保留日语例句。
- 如果问题涉及语法，说明接续、含义、常见误区。
- 如果问题涉及生词，给假名、中文、1个相近表达或反义表达。
- 最后给一个很短的“下一步练习”。`;
}

function buildReadingPassagePrompt() {
  var learning = readingLearningPayload();
  var minnaCtx = minnaPromptContext();
  return "你是日语分级阅读编辑。请基于我的教材进度和知识边界，创作一篇原创日语短文，作为下一张阅读训练卡。\n\n" +
    "## 教材进度\n" + minnaCtx + "\n\n" +
    "## 我的知识边界\n" + JSON.stringify(learning, null, 2) + "\n\n" +
    "要求：\n" +
    "- **必须主要使用《大家的日语》第 1-" + japaneseSourceProfile.currentLesson + " 课已学词汇和句型。**\n" +
    "- 难度严格限制在课本范围内。每篇只引入 0-1 个 preview 词汇（标记 preview 标签）。不要使用 N1/N2 难度的表达。\n" +
    "- 优先复现我标记忘记的词、忘记的语法点。\n" +
    "- 3-5句，每句自然、短而清楚。\n" +
    "- 每句必须给 jp（原文）、kana（假名）、zh（中文）、grammar 数组、words 数组。\n" +
    "- grammar 解释必须优先说明第 1-" + japaneseSourceProfile.currentLesson + " 课基础句型。\n" +
    "- words 每项包含 text, reading, meaning, tags。\n" +
    "- **不要直接复写教材原文。**\n" +
    "- 只输出 JSON，不要 Markdown。\n" +
    "\n格式：\n" +
    '{"card":{"prompt":"阅读短文：标题","level":"N4 → N3","summary":"这篇短文练什么","sentences":[{"jp":"日语句子。","kana":"假名读音。","zh":"中文翻译。","grammar":["语法点1"],"words":[{"text":"単語","reading":"たんご","meaning":"单词","tags":["minna","lesson-16"]}]}]}}';
}

async function askReadingAi(card, question) {
  if (deepseekKeyAvailable()) {
    const raw = await callDeepSeekDirect("你是耐心、准确的日语阅读教练。", buildReadingChatPrompt(card, question), 0.35);
    return { reply: raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(), provider: "deepseek-direct" };
  }
  const url = String(state.aiProxyUrl || "").replace(/\/+$/, "");
  if (!url) throw new Error("缺少本地代理地址，或在设置里填 DeepSeek Key 直连");
  const res = await fetch(url + "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: state.aiProvider || "deepseek",
      mode: "reading-chat",
      question,
      reading: readingPayload(card),
      learning: readingLearningPayload()
    })
  });
  if (!res.ok) throw new Error("代理返回 " + res.status);
  const data = await res.json();
  return { reply: String(data.reply || ""), provider: data.provider || "deepseek" };
}

async function requestReadingPassage() {
  if (deepseekKeyAvailable()) {
    const raw = await callDeepSeekDirect("你是日语分级阅读编辑，只输出 JSON。", buildReadingPassagePrompt(), 0.55);
    return extractJsonFromText(raw);
  }
  const url = String(state.aiProxyUrl || "").replace(/\/+$/, "");
  if (!url) throw new Error("缺少本地代理地址，或在设置里填 DeepSeek Key 直连");
  const res = await fetch(url + "/reading-passage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: state.aiProvider || "deepseek",
      learning: readingLearningPayload()
    })
  });
  if (!res.ok) throw new Error("代理返回 " + res.status);
  return res.json();
}

async function analyzeCurrentCard() {
  var card = getCard();
  if (!card || card.track !== "japanese") return;
  // 已有解析：切换显示/隐藏
  if (state.analyses && state.analyses[card.id]) {
    state.analysisOpen = !state.analysisOpen;
    render();
    return;
  }
  var text = japaneseTextFor(card);
  if (!text) {
    showToast("这张卡没有可解析的日语句子");
    return;
  }

  // 优先 DeepSeek 直连
  if (deepseekKeyAvailable()) {
    state.analyzing = true; state.analysisOpen = true; render();
    try {
      var analysisText = await callDeepSeekAnalyze(text);
      if (!analysisText) throw new Error("解析为空");
      state.analyses = state.analyses || {};
      state.analyses[card.id] = { text: analysisText, provider: "deepseek-direct", at: new Date().toISOString() };
      state.analyzing = false; state.analysisOpen = true;
      saveState(); render(); scheduleCloudSync();
      return;
    } catch (e) {
      state.analyzing = false; render();
      showToast("DeepSeek 直连解析失败：" + (e.message || e));
      return;
    }
  }

  // 回退：本地代理
  var url = String(state.aiProxyUrl || "").replace(/\/+$/, "");
  if (!url) { showToast("手机上解析：到「设置 → 数据同步」填一个 DeepSeek Key 即可直连（很便宜）；电脑上也可填本地代理地址。"); return; }
  state.analyzing = true; state.analysisOpen = true; render();
  try {
    var resp = await fetch(url + "/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: state.analyzeProvider || "deepseek", text: text })
    });
    if (!resp.ok) throw new Error("代理返回 " + resp.status);
    var payload = await resp.json();
    var at = String(payload.analysis || "").trim();
    if (!at) throw new Error("解析为空");
    state.analyses = state.analyses || {};
    state.analyses[card.id] = { text: at, provider: payload.provider || "local", at: new Date().toISOString() };
    state.analyzing = false; state.analysisOpen = true;
    saveState(); render(); scheduleCloudSync();
  } catch (e) {
    state.analyzing = false; render();
    showToast("解析失败：" + (e.message || e) + "。手机上到「设置 → 数据同步」填 DeepSeek Key 即可直连解析；电脑上确保本地代理在运行。");
  }
}

// === ChatGPT 剪贴板解析（A 方案：手机端不用 API key）===
function chatGptPromptFor(card) {
  var text = japaneseTextFor(card);
  var ctx = card.context ? card.context.body.join("\n") : "";
  var p = "请解析下面这句日语，面向以中文为母语的初级学习者。用简洁中文输出，分这几块：\n1. 假名读音\n2. 逐词拆解（词—词性—意思）\n3. 语法点\n4. 自然翻译\n";
  if (ctx) p += "\n这句出自以下课文语境：\n" + ctx + "\n";
  p += "\n句子：" + text;
  return p;
}

async function handleChatGptAnalyze() {
  var card = getCard();
  if (!card || card.track !== "japanese") return;
  if (state.analyses && state.analyses[card.id]) { state.analysisOpen = !state.analysisOpen; render(); return; }
  var text = japaneseTextFor(card);
  if (!text) { showToast("这张卡没有可解析的日语句子"); return; }
  var prompt = chatGptPromptFor(card);
  try {
    await navigator.clipboard.writeText(prompt);
    showToast("解析提示词已复制到剪贴板，正在跳转 ChatGPT…");
  } catch (e) {
    state.chatGptPendingPrompt = prompt;
    state.chatGptPendingCardId = card.id;
    render();
    showToast("请手动复制下方提示词，粘贴到 ChatGPT");
    return;
  }
  state.chatGptPendingPrompt = prompt;
  state.chatGptPendingCardId = card.id;
  saveState();
  render();
  setTimeout(function() {
    try { window.open("https://chatgpt.com/", "_blank"); } catch (e) {}
  }, 300);
}

function handleChatGptPaste() {
  var ta = document.getElementById("chatgpt-paste-area");
  if (!ta) return;
  var result = (ta.value || "").trim();
  if (!result) { showToast("请先粘贴 ChatGPT 的解析结果"); return; }
  var cardId = state.chatGptPendingCardId;
  if (!cardId) { showToast("没有待保存的解析"); return; }
  state.analyses = state.analyses || {};
  state.analyses[cardId] = { text: result, provider: "chatgpt", at: new Date().toISOString() };
  state.chatGptPendingPrompt = "";
  state.chatGptPendingCardId = "";
  state.analysisOpen = true;
  ta.value = "";
  saveState();
  render();
  scheduleCloudSync();
  showToast("ChatGPT 解析已保存，已同步到云端");
}

function renderFooter(card) {
  if (state.submitted || card.type === "self" || card.type === "reading") {
    return `
      <div class="rating-row">
        <button class="rating-button again" data-action="rate" data-rating="again">忘了</button>
        <button class="rating-button hard" data-action="rate" data-rating="hard">模糊</button>
        <button class="rating-button good" data-action="rate" data-rating="good">会了</button>
      </div>
    `;
  }

  return `
    <button class="plain-button" data-action="reset-card">重来</button>
    <button class="plain-button primary" data-action="submit">提交</button>
  `;
}

function renderStatsPanel(stats) {
  return `
    <section class="stats-panel" data-view="progress">
      <h3 class="panel-title">进度</h3>
      <div class="stat-grid">
        <div class="stat"><b>${stats.due}</b><span>到期</span></div>
        <div class="stat"><b>${stats.seen}/${stats.total}</b><span>已见</span></div>
        <div class="stat"><b>${stats.accuracy}%</b><span>正确率</span></div>
        <div class="stat"><b>${stats.mastery}%</b><span>掌握度</span></div>
      </div>
    </section>
  `;
}

function renderDailyPanel() {
  const log = latestDailyLog(state.activeTrack);
  const isJapanese = state.activeTrack === "japanese";
  const contentPlaceholder = isJapanese
    ? "例：て形/ない形复习；N1表达 からといって；短文里看到了 導入する、著しい"
    : "例：第15课 てもいいですか / 土木 settlement 长句 / 事实与对象";
  const difficultyPlaceholder = isJapanese
    ? "例：动词变形慢；は/が混；长句主干找不到；听到正式表达反应慢"
    : "例：て形变化慢；overfitting/generalize 不会用；事实和对象容易混";
  return `
    <section class="custom-panel daily-panel" data-view="today">
      <h3 class="panel-title">今日记录</h3>
      <form data-action="daily-form">
        <label>
          今天学了什么
          <textarea name="content" placeholder="${escapeHtml(contentPlaceholder)}" required>${escapeHtml(log?.content || "")}</textarea>
        </label>
        <div class="form-grid">
          <label>
            形式
            <select name="form">
              ${renderSelectOption("context", "课文长句", log?.form || "context")}
              ${renderSelectOption("quiz", "做题反馈", log?.form || "context")}
              ${renderSelectOption("listening", "听力朗读", log?.form || "context")}
              ${renderSelectOption("speaking", "口语复述", log?.form || "context")}
              ${renderSelectOption("writing", "默写输出", log?.form || "context")}
            </select>
          </label>
          <label>
            状态
            <select name="energy">
              ${renderSelectOption("light", "轻量", log?.energy || "normal")}
              ${renderSelectOption("normal", "正常", log?.energy || "normal")}
              ${renderSelectOption("intense", "加强", log?.energy || "normal")}
            </select>
          </label>
        </div>
        <label>
          今天卡住的点
          <textarea name="difficulty" placeholder="${escapeHtml(difficultyPlaceholder)}">${escapeHtml(log?.difficulty || "")}</textarea>
        </label>
        <button class="plain-button primary" type="submit">保存今日策略</button>
      </form>
      ${
        log
          ? `<p class="daily-meta">已记录 ${escapeHtml(log.date)} · ${escapeHtml(formLabel(log.form))} · 关键词：${escapeHtml((log.signals || []).slice(0, 4).join("、") || "待积累")}</p>`
          : `<p class="daily-meta">保存后，智能推荐会优先围绕今天的内容和形式出题。</p>`
      }
    </section>
  `;
}

function renderN1PlanPanel() {
  if (state.activeTrack !== "japanese") return "";
  var status = japaneseN1Status();
  var p = japaneseSourceProfile;
  // N1 收敛为后台长期目标：只显示简短状态，不占主界面
  return '<section class="tool-panel" data-view="progress">' +
    '<h3 class="panel-title">当前进度</h3>' +
    '<div class="chip-row" style="margin-bottom:10px">' +
    '<span class="chip">' + p.displayName + ' 第 ' + p.currentLesson + ' 课</span>' +
    '<span class="chip">掌握约 ' + Math.round(p.masteryEstimate * 100) + '%</span>' +
    '<span class="chip">第 ' + status.week + ' 周</span>' +
    '</div>' +
    '<p class="daily-meta">当前主线：巩固《大家的日语》第 1-' + p.currentLesson + ' 课。' +
    '掌握度达 50% 后自动开放第 ' + (p.currentLesson + 1) + ' 课。</p>' +
    '<p class="daily-meta" style="margin-top:4px">长期目标：一年内向 JLPT N1 推进（' + japaneseN1Goal.startDate + ' → ' + japaneseN1Goal.targetDate + '）。</p>' +
    '</section>';
}

function renderLearningOverviewPanel(stats) {
  var track = getTrack(state.activeTrack);
  var profile = learningProfile(track.id);
  var today = todayHistory().filter(function(item) { return item.track === track.id; });
  var goal = effectiveDailyGoal();
  var goalDone = Math.min(today.length, goal);
  var currentTask = state.activeTask || "reading";
  var vocabItems = (state.vocabBank || []).filter(function(item) { return item.track === track.id; });
  var forgottenVocab = vocabItems.filter(function(item) {
    return item.status === "forgot" || item.status === "fuzzy" || (item.lapses || 0) > 0;
  });
  var weakGrammar = track.id === "japanese"
    ? (state.grammarBank || []).filter(function(item) {
        return item.status === "forgot" || item.status === "fuzzy" || (item.lapses || 0) > 0;
      })
    : [];
  var diagnosis = state.diagnosis?.[track.id];
  var weakTags = (profile.weakTags || []).slice(0, 3);
  var nextAdvice = stats.due > 0
    ? "先处理 " + stats.due + " 张到期卡，再继续新短文。"
    : weakTags.length
      ? "下一轮优先补：" + weakTags.join("、") + "。"
      : "继续用短文阅读积累新词和语法痕迹。";
  // P4: 右侧总览改读 currentLessonState()，与设置页一致
  var cls = track.id === "japanese" ? currentLessonState() : null;
  var lessonChips = cls
    ? '<span class="overview-chip">' + escapeHtml(japaneseSourceProfile.displayName) + ' 第 ' + cls.lesson + ' 课</span>' +
      '<span class="overview-chip">掌握 ' + Math.round(cls.mastery * 100) + '%</span>' +
      '<span class="overview-chip">' + (cls.canAdvance ? '可推进' : (cls.canPreview ? '可预览第' + cls.previewLesson + '课' : '巩固中')) + '</span>'
    : '<span class="overview-chip">阅读词汇主线</span>';
  if (cls && cls.blockers.length) {
    nextAdvice = "先补：" + cls.blockers.slice(0, 2).join("、");
  }
  var bankLines = track.id === "japanese"
    ? [
        "生词：" + vocabItems.length + " 个，待回炉 " + forgottenVocab.length + " 个",
        "语法弱项：" + weakGrammar.length + " 个",
        "弱点标签：" + (weakTags.length ? weakTags.join("、") : "继续积累")
      ]
    : track.id === "english"
      ? [
          "生词：" + vocabItems.length + " 个，待回炉 " + forgottenVocab.length + " 个",
          "弱点标签：" + (weakTags.length ? weakTags.join("、") : "继续积累")
        ]
      : [
          "弱点标签：" + (weakTags.length ? weakTags.join("、") : "继续积累")
        ];
  var diagnosisLine = diagnosis?.summary
    ? "最近诊断：" + shortText(diagnosis.summary, 42)
    : "最近诊断：暂无，可在设置中生成";

  return `
    <section class="tool-panel overview-panel" aria-label="学习总览">
      <div class="overview-head">
        <div>
          <span class="overview-kicker">学习总览</span>
          <h3>${escapeHtml(track.name)} · ${escapeHtml(taskLabel(currentTask))}</h3>
        </div>
        <button class="icon-button overview-settings" data-action="open-settings" title="设置" aria-label="打开设置">⚙</button>
      </div>
      <div class="overview-chips">${lessonChips}</div>
      <div class="overview-stat-grid">
        <div class="overview-stat"><b>${goalDone}/${goal}</b><span>今日</span></div>
        <div class="overview-stat"><b>${stats.accuracy}%</b><span>正确率</span></div>
        <div class="overview-stat"><b>${stats.due}</b><span>到期</span></div>
        <div class="overview-stat"><b>${stats.seen}/${stats.total}</b><span>已见</span></div>
      </div>
      <div class="overview-lines">
        ${bankLines.map(function(line) { return '<p>' + escapeHtml(line) + '</p>'; }).join("")}
        <p>${escapeHtml(diagnosisLine)}</p>
        <p>${escapeHtml(nextAdvice)}</p>
      </div>
      <div class="overview-actions">
        <button class="plain-button primary full-button" data-action="task-start" data-task="${escapeHtml(currentTask)}">开始${escapeHtml(taskLabel(currentTask))}</button>
      </div>
    </section>
  `;
}

function renderSelectOption(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderProfilePanel() {
  const profile = learningProfile(state.activeTrack);
  const focus = profile.moduleRows.find((row) => row.id === profile.focusModule);
  return `
    <section class="tool-panel" data-view="progress">
      <h3 class="panel-title">学习档案</h3>
      <p class="profile-advice">${escapeHtml(profile.advice)}</p>
      ${profile.errorReasons?.length ? `<p class="profile-advice">近期日语错因（题组）：${profile.errorReasons.map((reason) => `${escapeHtml(reason.label)} ${reason.count}`).join(" · ")}</p>` : ""}
      ${profile.tagReasons?.length ? `<p class="profile-advice">细粒度弱点：${profile.tagReasons.map((reason) => `${escapeHtml(reason.label)} ${reason.count}`).join(" · ")}</p>` : ""}
      <div class="chip-row">
        <span class="chip">重点：${escapeHtml(focus?.name || "综合复习")}</span>
        <span class="chip">形式：${escapeHtml(formLabel(profile.preferredForm))}</span>
        <span class="chip">${profile.sessionSize} 题</span>
        ${
          profile.weakTags.length
            ? profile.weakTags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")
            : `<span class="chip">先积累 6 次练习</span>`
        }
      </div>
      <ol class="strategy-list">
        ${profile.strategy.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ol>
      <ul class="module-snapshot">
        ${profile.moduleRows
          .map((row) => {
            const score = row.accuracy === null ? "未练" : `${row.accuracy}%`;
            const speed = row.avgMs ? ` · ${(row.avgMs / 1000).toFixed(1)}s/题${profile.slowModules.includes(row.id) ? " 偏慢" : ""}` : "";
            const share = row.n1Share ? ` · 阶段目标 ${row.n1Share}%` : "";
            return `<li><span>${escapeHtml(row.name)}</span><b>${score}</b><small>未见 ${row.unseen} · 到期 ${row.due}${speed}${share}</small></li>`;
          })
          .join("")}
      </ul>
      <button class="plain-button primary full-button" data-action="adaptive-start">按档案练</button>
    </section>
  `;
}

function renderWeakPanel() {
  const weak = filteredCards()
    .filter((card) => weakScore(card) > 0)
    .sort((a, b) => weakScore(b) - weakScore(a))
    .slice(0, 4);

  return `
    <section class="tool-panel" data-view="progress">
      <h3 class="panel-title">弱项</h3>
      <ul class="weak-list">
        ${
          weak.length
            ? weak
                .map((card) => {
                  const progress = cardProgress(card.id);
                  return `<li>${escapeHtml(shortText(card.prompt, 46))}<small>错 ${progress?.wrong || 0} 次 · 间隔 ${progress?.interval || 0} 天</small></li>`;
                })
                .join("")
            : `<li>当前题组没有明显弱项。<small>做几轮后这里会自动变化。</small></li>`
        }
      </ul>
    </section>
  `;
}

function renderHistoryPanel() {
  const recent = state.history.slice(-5).reverse();
  return `
    <section class="tool-panel" data-view="progress">
      <h3 class="panel-title">最近</h3>
      <ul class="history-list">
        ${
          recent.length
            ? recent
                .map((item) => {
                  const card = allCards().find((entry) => entry.id === item.cardId);
                  return `<li>${item.correct ? "✓" : "×"} ${escapeHtml(shortText(card?.prompt || item.cardId, 42))}<small>${escapeHtml(item.rating)} · ${escapeHtml(item.date)}</small></li>`;
                })
                .join("")
            : `<li>还没有练习记录。<small>开始后会显示最近表现。</small></li>`
        }
      </ul>
    </section>
  `;
}

function renderCustomPanel() {
  return `
    <section class="custom-panel" data-view="settings">
      <h3 class="panel-title">自定义题</h3>
      <form data-action="custom-form">
        <label>
          科目
          <select name="track">
            ${tracks.map((track) => `<option value="${track.id}" ${track.id === state.activeTrack ? "selected" : ""}>${escapeHtml(track.name)}</option>`).join("")}
          </select>
        </label>
        <label>
          题目
          <textarea name="prompt" required placeholder="例：settlement 在土木工程里是什么意思？"></textarea>
        </label>
        <label>
          课文/长句
          <textarea name="context" placeholder="可粘贴老师课文、英文长句或哲学段落，每行一句。"></textarea>
        </label>
        <label>
          答案
          <input name="answer" required placeholder="例：沉降" />
        </label>
        <label>
          解释
          <textarea name="explanation" placeholder="例：指地基或结构的下沉。"></textarea>
        </label>
        <button class="plain-button primary" type="submit">加入题库</button>
      </form>
    </section>
  `;
}

function renderSyncPanel() {
  const config = state.gitSync || defaultState().gitSync;
  return `
    <section class="custom-panel sync-panel" data-view="settings">
      <h3 class="panel-title">数据同步</h3>
      <div class="cloud-box">
        <h4>DeepSeek API（直连，推荐）</h4>
        <p class="daily-meta">前端直接调 DeepSeek API，不需代理，手机和电脑都能用。Key 只存浏览器，不进备份、不进仓库。<a href="https://platform.deepseek.com/api_keys" target="_blank">获取 key</a>（¥1/百万tokens，极便宜）。</p>
        <label>
          DeepSeek API Key
          <input type="password" data-action="deepseek-key" value="${escapeHtml(String(state.deepseekKey || ""))}" placeholder="sk-…" autocomplete="off" />
        </label>
      </div>
      <div class="cloud-box">
        <h4>GitHub 云同步</h4>
        <p class="daily-meta">适合电车上使用：网页放 GitHub Pages，进度放私有 Gist。Token 只保存在当前浏览器。</p>
        <label>
          GitHub Token
          <input type="password" data-action="github-token" value="${escapeHtml(config.token || "")}" placeholder="只需要 gist 权限" autocomplete="off" />
        </label>
        <div class="form-grid">
          <label>
            Gist ID
            <input data-action="github-gist-id" value="${escapeHtml(config.gistId || "")}" placeholder="空白时可创建" />
          </label>
          <label>
            文件名
            <input data-action="github-filename" value="${escapeHtml(config.filename || "triad-learning-data.json")}" />
          </label>
        </div>
        <label class="check-row">
          <input type="checkbox" data-action="github-auto" ${config.auto ? "checked" : ""} />
          联网时自动同步
        </label>
        <div class="sync-actions cloud-actions">
          <button class="plain-button" data-action="save-github-sync">保存配置</button>
          <button class="plain-button" data-action="create-gist">创建云端</button>
          <button class="plain-button primary" data-action="sync-github">立即同步</button>
        </div>
        <div class="sync-actions cloud-actions">
          <button class="plain-button" data-action="pull-github">从云端拉取</button>
          <button class="plain-button" data-action="push-github">上传本机</button>
        </div>
        <p class="daily-meta">${escapeHtml(config.status || "还未连接 GitHub。")}</p>
        ${config.lastSync ? `<p class="daily-meta">上次同步：${escapeHtml(config.lastSync)}</p>` : ""}
      </div>
      <div class="sync-actions">
        <button class="plain-button" data-action="export-data">生成备份</button>
        <button class="plain-button" data-action="copy-data">复制</button>
        <button class="plain-button" data-action="download-data">下载</button>
      </div>
      <label>
        备份文本
        <textarea data-action="sync-text" placeholder="在这里生成备份，或粘贴另一台设备导出的备份。">${escapeHtml(state.syncText || "")}</textarea>
      </label>
      <button class="plain-button primary full-button" data-action="import-data">导入并合并</button>
      <p class="daily-meta">${escapeHtml(state.syncMessage || "手机和电脑各自保存 localStorage；用这里每天互传学习进度。")}</p>
    </section>
  `;
}

function shortText(text, length) {
  const value = String(text);
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function bindEvents() {
  app.querySelectorAll("[data-action]").forEach((element) => {
    const action = element.dataset.action;
    if (action === "custom-form") {
      element.addEventListener("submit", handleCustomSubmit);
    } else if (action === "vocab-form") {
      element.addEventListener("submit", handleVocabSubmit);
    } else if (action === "daily-form") {
      element.addEventListener("submit", handleDailySubmit);
    } else if (action === "reading-chat-form") {
      element.addEventListener("submit", handleReadingChatSubmit);
    } else if (action === "reading-chat-input") {
      element.addEventListener("input", (event) => {
        state.readingChatInput = event.target.value;
      });
    } else if (action === "ai-url" || action === "ai-proxy-url") {
      element.addEventListener("input", (event) => {
        state.aiProxyUrl = event.target.value.trim();
      });
    } else if (action === "ai-provider") {
      element.addEventListener("change", (event) => {
        state.aiProvider = event.target.value;
        saveState();
      });
    } else if (action === "analyze-provider") {
      element.addEventListener("change", (event) => {
        state.analyzeProvider = event.target.value;
        saveState();
      });
    } else if (action === "sync-text") {
      element.addEventListener("input", (event) => {
        state.syncText = event.target.value;
      });
    } else if (action === "deepseek-key") {
      element.addEventListener("input", (event) => {
        state.deepseekKey = event.target.value.trim();
      });
    } else if (action === "github-token" || action === "git-token") {
      element.addEventListener("input", (event) => {
        state.gitSync.token = event.target.value.trim();
      });
    } else if (action === "github-gist-id") {
      element.addEventListener("input", (event) => {
        state.gitSync.gistId = event.target.value.trim();
      });
    } else if (action === "github-filename" || action === "git-filename") {
      element.addEventListener("input", (event) => {
        state.gitSync.filename = event.target.value.trim() || "triad-learning-data.json";
      });
    } else if (action === "github-auto" || action === "git-auto") {
      element.addEventListener("change", (event) => {
        state.gitSync.auto = event.target.checked;
        saveState();
      });
    } else if (action === "lesson-number") {
      element.addEventListener("change", (event) => {
        var v = parseInt(event.target.value, 10);
        if (v > 0 && v <= 50) {
          state.lessonProgress = state.lessonProgress || {};
          state.lessonProgress.currentLesson = v;
          state.lessonProgress.previewLesson = v + 1;
          state.lessonProgress.lastAdvanceReason = "手动切换到第 " + v + " 课";
          ensureLessonRecord(v).status = "active";
          japaneseSourceProfile.currentLesson = v;
          japaneseSourceProfile.masteryEstimate = currentLessonState().mastery;
          saveState();
          render();
        }
      });
    } else if (action === "lesson-mastery") {
      element.addEventListener("change", (event) => {
        var v = parseFloat(event.target.value);
        if (v >= 0 && v <= 1) { japaneseSourceProfile.masteryEstimate = v; saveState(); }
      });
    } else if (action === "lesson-advance-mode") {
      element.addEventListener("change", (event) => {
        state.lessonProgress = state.lessonProgress || {};
        state.lessonProgress.advanceMode = event.target.value === "manual" ? "manual" : "auto";
        saveState();
      });
    } else if (action === "session-size-mode") {
      element.addEventListener("change", (event) => {
        state.sessionSizeMode = event.target.value === "auto" ? "auto" : "manual";
        saveState();
        render();
      });
    } else if (action === "production-ratio") {
      element.addEventListener("change", (event) => {
        var v = parseFloat(event.target.value);
        if (v >= 0 && v <= 1) {
          state.productionRatio = v;
          saveState();
          render();
          showToast("产出题占比已设为 " + Math.round(v * 100) + "%");
        }
      });
    } else if (action === "manual-session-size") {
      element.addEventListener("change", (event) => {
        var v = parseInt(event.target.value, 10);
        if (v >= 4 && v <= 60) {
          state.manualSessionSize = v;
          saveState();
          render();
          showToast("每轮题量已设为 " + v + " 题");
        }
      });
    } else if (action === "typed") {
      element.addEventListener("input", (event) => {
        state.typed = event.target.value;
      });
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submitAnswer();
      });
    } else {
      element.addEventListener("click", handleAction);
    }
  });
}

function handleAction(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;

  if (action === "view") {
    state.activeView = button.dataset.tab;
    state.viewAnim = true;
    saveState();
    render();
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    return;
  }

  // 设置窗口
  if (action === "open-settings" || action === "open-settings-section") {
    state.settingsOpen = true;
    if (button.dataset.section) { state.settingsSection = button.dataset.section; }
    render();
    return;
  }
  if (action === "close-settings") {
    state.settingsOpen = false;
    render();
    return;
  }
  if (action === "settings-section") {
    state.settingsSection = button.dataset.section;
    render();
    return;
  }

  if (action === "track") {
    state.activeTrack = button.dataset.track;
    state.activeModule = "all";
    state.currentId = null;
    state.queue = [];
    resetAnswerState();
    saveState();
    render();
    return;
  }

  if (action === "module") {
    state.activeModule = button.dataset.module;
    state.currentId = null;
    state.queue = [];
    resetAnswerState();
    saveState();
    render();
    return;
  }

  if (action === "mode") {
    buildQueue(button.dataset.mode);
    return;
  }

  if (action === "start") {
    buildQueue(state.mode);
    return;
  }

  if (action === "adaptive-start" || action === "smart-start") {
    buildQueue("adaptive");
    return;
  }

  if (action === "task-start") {
    var task = button.dataset.task || "reading";
    state.activeTask = task;
    buildQueue("adaptive");
    return;
  }

  if (action === "option") {
    state.selected = button.dataset.option;
    render();
    return;
  }

  if (action === "token") {
    const card = getCard();
    const index = Number(button.dataset.index);
    state.arranged.push({ index, text: card.tokens[index] });
    render();
    return;
  }

  if (action === "untoken" && !state.submitted) {
    const index = Number(button.dataset.index);
    state.arranged.splice(index, 1);
    render();
    return;
  }

  if (action === "submit") {
    submitAnswer();
    return;
  }

  if (action === "reset-card") {
    resetAnswerState();
    render();
    return;
  }

  if (action === "rate") {
    rateCurrent(button.dataset.rating);
    return;
  }

  if (action === "apply-update") {
    applyAppUpdate();
    return;
  }

  if (action === "check-update") {
    checkForAppUpdate(true);
    return;
  }

  if (action === "skip") {
    moveNext(false);
    return;
  }

  if (action === "speak") {
    speakCurrent();
    return;
  }

  if (action === "analyze") {
    analyzeCurrentCard();
    return;
  }
  if (action === "chatgpt-analyze") {
    handleChatGptAnalyze();
    return;
  }
  if (action === "chatgpt-paste") {
    handleChatGptPaste();
    return;
  }

  if (action === "reveal") {
    state.revealAnswer = true;
    render();
    return;
  }

  if (action === "sample") {
    state.sampleOpen = true;
    render();
    return;
  }

  if (action === "toggle-translation") {
    state.translationOpen = !state.translationOpen;
    render();
    return;
  }

  if (action === "collect-word") {
    collectWordPayload(button.dataset.word);
    return;
  }

  if (action === "collect-selection") {
    collectSelectedJapaneseText();
    return;
  }

  if (action === "float-collect-word") {
    if (state.selectionDraft) {
      var draft = state.selectionDraft;
      var cls = currentLessonState();
      collectJpVocab({
        word: draft.text,
        reading: "",
        meaning: "待解析",
        sentence: draft.sourceSentence,
        sourceCardId: draft.cardId,
        sentenceIndex: draft.sentenceIndex,
        lesson: cls.lesson,
        tags: ["selected", "minna", "lesson-" + cls.lesson]
      });
      state.selectionDraft = null;
    }
    return;
  }

  if (action === "float-dismiss") {
    state.selectionDraft = null;
    render();
    return;
  }

  if (action === "vocab-edit") {
    var editWord = button.dataset.word;
    var newReading = prompt("假名（可留空）：", "");
    var newMeaning = prompt("释义：", "");
    if (newMeaning && newMeaning.trim()) {
      var editItem = findJpVocab(editWord);
      if (editItem) {
        editItem.reading = newReading || editItem.reading || "";
        editItem.meaning = newMeaning.trim();
        editItem.updatedAt = new Date().toISOString();
        var editVb = (state.vocabBank || []).find(function(v) {
          return v.track === "japanese" && normalizeJapaneseWord(v.word) === normalizeJapaneseWord(editWord);
        });
        if (editVb) {
          editVb.reading = editItem.reading;
          editVb.meaning = editItem.meaning;
          editVb.updatedAt = editItem.updatedAt;
        }
        var editCardId = "jp-vocab-custom-" + normalizeJapaneseWord(editWord);
        state.customCards = state.customCards.filter(function(card) { return card.id !== editCardId; });
        maybeCreateJpVocabCard(editItem);
        saveState(); render(); scheduleCloudSync();
        showToast("已补充释义：" + editWord);
      }
    }
    return;
  }

  if (action === "vocab-delete") {
    var delWord = button.dataset.word;
    var nw = normalizeJapaneseWord(delWord);
    state.jpVocab = (state.jpVocab || []).filter(function(item) {
      return normalizeJapaneseWord(item.word) !== nw;
    });
    state.vocabBank = (state.vocabBank || []).filter(function(item) {
      return !(item.track === "japanese" && normalizeJapaneseWord(item.word) === nw);
    });
    var delCardId = "jp-vocab-custom-" + nw;
    state.customCards = state.customCards.filter(function(card) { return card.id !== delCardId; });
    saveState(); render(); scheduleCloudSync();
    showToast("已删除：" + delWord);
    return;
  }

  if (action === "vocab-enrich") {
    enrichVocabFromAi(button.dataset.word, button.dataset.sentence || "");
    return;
  }

  if (action === "collect-grammar") {
    try {
      var grammarData = JSON.parse(decodeURIComponent(button.dataset.grammar || ""));
      collectGrammarPoint(grammarData);
    } catch (e) { showToast("收藏语法失败：数据不完整"); }
    return;
  }

  if (action === "grammar-mark") {
    markGrammarPoint(button.dataset.pattern, button.dataset.status);
    return;
  }

  if (action === "vocab-mark") {
    markJpVocab(button.dataset.word, button.dataset.status);
    return;
  }

  if (action === "catalog-lesson") {
    state.catalogLesson = Number(button.dataset.lesson) || 1;
    saveState();
    render();
    return;
  }

  if (action === "catalog-word-mark") {
    markCatalogWord(button.dataset.word, button.dataset.status);
    return;
  }

  if (action === "catalog-grammar-mark") {
    markCatalogGrammar(button.dataset.pattern, button.dataset.status);
    return;
  }

  if (action === "reading-ai-passage") {
    generateReadingPassageFromAi();
    return;
  }

  if (action === "export-data" || action === "export-backup") {
    exportDataToText();
    render();
    return;
  }

  if (action === "copy-data" || action === "copy-backup") {
    copySyncText();
    return;
  }

  if (action === "download-data" || action === "download-backup") {
    downloadSyncText();
    return;
  }

  if (action === "import-data" || action === "import-backup") {
    importDataFromText();
    return;
  }

  if (action === "save-github-sync") {
    saveGitSyncConfig();
    return;
  }

  if (action === "create-gist" || action === "git-create") {
    createGitHubGist();
    return;
  }

  if (action === "sync-github") {
    syncWithGitHub();
    return;
  }

  if (action === "pull-github" || action === "git-pull") {
    pullFromGitHub();
    return;
  }

  if (action === "push-github" || action === "git-push") {
    pushToGitHub();
    return;
  }

  if (action === "clear-cache") {
    if (typeof caches !== "undefined") {
      caches.keys().then(function(keys) { return Promise.all(keys.map(function(k) { return caches.delete(k); })); });
    }
    if (typeof window !== "undefined") { window.location.reload(); }
    return;
  }

  if (action === "ai-generate") {
    generateAiCards();
    return;
  }
  if (action === "ai-diagnose") {
    handleDiagnose();
  }
}

function submitAnswer() {
  const card = getCard();
  if (!card || state.submitted) return;
  let correct = false;

  if (card.type === "choice") {
    if (!state.selected) return;
    correct = state.selected === card.answer;
  }

  if (card.type === "input") {
    const accepted = [card.answer, ...(card.accepted || [])].map(normalize);
    correct = accepted.includes(normalize(state.typed));
  }

  if (card.type === "arrange") {
    const answer = state.arranged.map((item) => item.text).join(" ");
    correct = normalize(answer) === normalize(card.answer.join(" "));
  }

  state.submitted = true;
  state.lastResult = { correct };
  render();
}

function rateCurrent(rating) {
  const card = getCard();
  if (!card) return;
  const correct = card.type === "self" || card.type === "reading" ? rating !== "again" : Boolean(state.lastResult?.correct);
  // 学习速度：本张卡从出现到评分的耗时（毫秒），上限 5 分钟，避免把放下手机的发呆算进去。
  const ms = state.cardShownAt ? Math.min(Date.now() - state.cardShownAt, 5 * 60 * 1000) : null;
  const progress = schedule(card, rating, correct);
  maybeCreateReinforcement(card, rating, correct);
  state.history.push({
    date: todayKey(),
    time: new Date().toISOString(),
    cardId: card.id,
    track: card.track,
    module: card.module,
    rating,
    correct,
    ms
  });
  state.history = state.history.slice(-HISTORY_LIMIT);
  // 课次掌握度更新（仅日语）
  if (card.track === "japanese") updateLessonProgressFromCard(card, rating);
  if (progress && progress.repeatToday) {
    moveNext(false, progress.repeatGap);
  } else {
    moveNext(true);
  }
  scheduleCloudSync();
}

function maybeCreateReinforcement(card, rating, correct) {
  if (correct && rating === "good") return;
  if (card.originId) return;
  const progress = state.progress[card.id];
  const pressure = (progress?.wrong || 0) + (progress?.lapses || 0);
  if (pressure < 2 && rating !== "again") return;
  if (state.generatedCards.some((item) => item.originId === card.id)) return;

  const reinforcement = buildReinforcementCard(card);
  if (!reinforcement) return;
  state.generatedCards.push(reinforcement);
  state.generatedCards = state.generatedCards.slice(-80);
}

function buildReinforcementCard(card) {
  const base = {
    id: `reinforce-${card.id}-${Date.now()}`,
    originId: card.id,
    track: card.track,
    module: card.module,
    context: card.context,
    tags: [...new Set([...cardTags(card), "reinforcement"])],
    explanation: `这是根据你的错题自动生成的巩固题。${card.explanation || ""}`
  };

  if (card.type === "choice" && String(card.answer).length <= 28) {
    return {
      ...base,
      type: "input",
      prompt: `不看选项，直接写答案：${card.prompt}`,
      answer: card.answer,
      accepted: [card.answer],
      speak: card.speak
    };
  }

  if (card.type === "arrange") {
    const sentence = card.answer.join(" ");
    return {
      ...base,
      type: "input",
      prompt: "默写刚才那条长句或组句答案。",
      answer: sentence,
      accepted: [sentence],
      speak: card.speak || sentence
    };
  }

  return {
    ...base,
    type: "self",
    prompt: `复述并解释：${card.prompt}`,
    subprompt: "先看课文或长句，再用自己的话说一遍。",
    checklist: ["是否说出核心答案", "是否回到课文或长句中的用法", "是否能举一个相似例子"],
    sample: card.explanation || String(card.answer || "回到上下文复述这张卡。"),
    speak: card.speak
  };
}

// 当天重复上限：同一张卡一天最多出 4 次，防止一道题把整轮队列占满。
const SAME_DAY_MAX_REPS = 4;

// 当天是否还要再出这张卡，以及隔多久／隔几题再出。
// 判据是"掌握状况"：评分 + 累计正确率 + 见过的次数。已经稳的卡当天就不再重复。
// 返回 { repeat, minutes, gap }：minutes 用于 SRS 到期时间，gap 用于本轮队列里插回的位置。
function sameDayPlan(progress, rating) {
  const reps = progress.reps || 0;
  const accuracy = reps ? (progress.correct || 0) / reps : 0;
  const todayReps = progress.todayReps || 0;
  if (todayReps >= SAME_DAY_MAX_REPS) return { repeat: false, minutes: 0, gap: 0 };

  if (rating === "again") return { repeat: true, minutes: 10, gap: 3 };
  if (rating === "hard") {
    // 记得吃力：当天一定再见一次，除非已经反复练了很多遍且正确率不低
    if (reps <= 5 || accuracy < 0.75) return { repeat: true, minutes: 30, gap: 7 };
    return { repeat: false, minutes: 0, gap: 0 };
  }
  // good：新卡当天巩固一次；正确率还没起来的也再来一次；稳定的直接进跨天队列
  if (reps <= 1) return { repeat: true, minutes: 90, gap: 12 };
  if (accuracy < 0.7) return { repeat: true, minutes: 120, gap: 15 };
  return { repeat: false, minutes: 0, gap: 0 };
}

function schedule(card, rating, correct) {
  const previous = state.progress[card.id] || {
    interval: 0,
    ease: 2.4,
    reps: 0,
    lapses: 0,
    correct: 0,
    wrong: 0,
    due: Date.now()
  };
  const progress = { ...previous };
  progress.reps += 1;
  progress.correct += correct ? 1 : 0;
  progress.wrong += correct ? 0 : 1;
  // 当天出现次数：跨天自动归零
  const today = todayKey();
  progress.todayReps = progress.todayDate === today ? (progress.todayReps || 0) + 1 : 1;
  progress.todayDate = today;

  if (rating === "again") {
    progress.interval = 0;
    progress.ease = Math.max(1.3, progress.ease - 0.2);
    progress.lapses += 1;
  } else if (rating === "hard") {
    progress.interval = Math.max(1, Math.round((progress.interval || 1) * 1.35));
    progress.ease = Math.max(1.3, progress.ease - 0.05);
  } else {
    progress.interval = progress.interval ? Math.round(progress.interval * progress.ease) : 1;
    progress.ease = Math.min(3.1, progress.ease + 0.05);
  }

  // 没掌握的卡先在当天内重复，掌握了才按天数排下一次
  const plan = sameDayPlan(progress, rating);
  progress.repeatToday = plan.repeat;
  progress.repeatGap = plan.gap;
  // 不再当天重复时至少推到第二天（again 的 interval 是 0，兜到 1 天）
  progress.due = plan.repeat
    ? Date.now() + plan.minutes * 60 * 1000
    : Date.now() + Math.max(1, progress.interval) * DAY;

  progress.lastSeen = Date.now();
  state.progress[card.id] = progress;
  return progress;
}

// 当天重复：把刚答过的卡插回队列靠后的位置（而不是直接扔掉），
// gap 由 sameDayPlan 按掌握状况给出——越不熟，隔的题数越少。
function requeueForToday(queue, cardId, gap) {
  const rest = (queue || []).filter((id) => id !== cardId);
  if (!rest.length) return rest; // 队列已空就不再当天重复，避免同一张卡连着出两次
  const at = Math.min(Math.max(1, gap || 8), rest.length);
  rest.splice(at, 0, cardId);
  return rest;
}

function moveNext(removeCurrent, requeueGap) {
  const current = state.currentId;
  if (current) {
    if (removeCurrent) {
      state.queue = state.queue.filter((id) => id !== current);
    } else if (typeof requeueGap === "number") {
      state.queue = requeueForToday(state.queue, current, requeueGap);
    } else {
      state.queue = state.queue.filter((id) => id !== current);
      state.queue.push(current);
    }
  }
  state.currentId = state.queue[0] || null;
  resetAnswerState();
  saveState();
  render();
  focusPracticeSoon();
}

function speakCurrent() {
  const card = getCard();
  if (!card || !("speechSynthesis" in window)) return;
  // 阅读卡要读日文句子本身：card.prompt 是中文标题（"读句子：病院で（1/5）"），拿它朗读会读出中文
  const text = card.type === "reading"
    ? readingCardText(card)
    : (card.speak || contextSpeakText(card.context) || card.prompt);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = card.track === "japanese" ? "ja-JP" : "en-US";
  utterance.rate = card.track === "japanese" ? 0.86 : 0.92;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function contextSpeakText(context) {
  if (!context?.body) return "";
  return Array.isArray(context.body) ? context.body.join(" ") : String(context.body);
}

function handleCustomSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const trackId = String(data.get("track"));
  const track = getTrack(trackId);
  const prompt = String(data.get("prompt") || "").trim();
  const answer = String(data.get("answer") || "").trim();
  const explanation = String(data.get("explanation") || "").trim();
  const contextText = String(data.get("context") || "").trim();
  if (!prompt || !answer) return;

  state.customCards.push({
    id: `custom-${Date.now()}`,
    track: trackId,
    module: track.modules[0]?.id || "custom",
    type: "input",
    prompt,
    answer,
    accepted: [answer],
    explanation: explanation || "自定义题。",
    context: contextText
      ? {
          title: "我的课文/长句",
          body: contextText.split(/\n+/).filter(Boolean),
          translation: ""
        }
      : undefined,
    tags: ["custom", contextText ? "reading" : "recall"]
  });
  form.reset();
  saveState();
  render();
  scheduleCloudSync();
  showToast("已加入题库");
}

function handleVocabSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const word = String(data.get("word") || "").trim();
  const meaning = String(data.get("meaning") || "").trim();
  const example = String(data.get("example") || "").trim();
  if (!word || !meaning) return;

  const base = Date.now();
  const context = example ? { title: "例句", body: [example], translation: "", notes: [] } : undefined;
  // 正向：看英文写中文意思
  state.customCards.push({
    id: `vocab-${base}`,
    track: "english",
    module: "en-vocab",
    type: "input",
    word,
    prompt: `「${word}」是什么意思？（中文）`,
    answer: meaning,
    accepted: [meaning],
    speak: word,
    context,
    explanation: `生词：${word} = ${meaning}`,
    tags: ["vocab", "custom", "english"]
  });
  // 反向：看中文意思默写英文单词
  state.customCards.push({
    id: `vocab-${base}-r`,
    track: "english",
    module: "en-vocab",
    type: "input",
    word,
    prompt: `「${meaning}」对应的英语单词？`,
    answer: word,
    accepted: [word],
    speak: word,
    context,
    explanation: `生词：${word} = ${meaning}`,
    tags: ["vocab", "custom", "english", "reverse"]
  });
  // 同步写入 vocabBank
  state.vocabBank = state.vocabBank || [];
  const now = new Date().toISOString();
  state.vocabBank.push({
    id: `vocab-en-${base}`,
    track: "english",
    word,
    reading: "",
    meaning,
    sourceSentence: example,
    sourceCardId: `vocab-${base}`,
    tags: ["vocab", "english"],
    status: "new",
    correct: 0,
    lapses: 0,
    createdAt: now,
    updatedAt: now
  });
  state.vocabBank = state.vocabBank.slice(-500);
  form.reset();
  saveState();
  render();
  scheduleCloudSync();
  showToast(`已加入生词：${word}（正反两张卡）`);
}

async function handleReadingChatSubmit(event) {
  event.preventDefault();
  const card = getCard();
  if (!card || card.type !== "reading") return;
  const question = String(state.readingChatInput || "").trim();
  if (!question) return;
  state.readingChat = state.readingChat || {};
  const list = state.readingChat[card.id] || [];
  state.readingChat[card.id] = [...list, { role: "user", content: question, at: new Date().toISOString() }];
  state.readingChatInput = "";
  state.readingAiBusy = true;
  state.readingAiMessage = "AI 正在结合你的知识边界解析…";
  saveState();
  render();
  try {
    const result = await askReadingAi(card, question);
    state.readingChat[card.id].push({ role: "assistant", content: result.reply || "没有返回内容。", provider: result.provider, at: new Date().toISOString() });
    state.readingAiMessage = "";
  } catch (error) {
    state.readingChat[card.id].push({ role: "assistant", content: "解析失败：" + (error.message || error), provider: "error", at: new Date().toISOString() });
    state.readingAiMessage = "AI 对话失败：" + String(error.message || error).slice(0, 120);
  } finally {
    state.readingAiBusy = false;
    saveState();
    render();
    scheduleCloudSync();
  }
}

async function generateReadingPassageFromAi() {
  if (state.readingAiBusy) return;
  state.readingAiBusy = true;
  state.readingAiMessage = "AI 正在根据你的忘词、弱项和课本进度编辑新短文…";
  render();
  try {
    const data = await requestReadingPassage();
    const raw = data.card || data;
    const card = normalizeReadingCard(raw);
    state.generatedCards = [
      ...state.generatedCards.filter((item) => item.id !== card.id),
      card
    ].slice(-180);
    state.currentId = card.id;
    state.queue = [card.id, ...state.queue.filter((id) => id !== card.id)];
    resetAnswerState();
    state.readingAiBusy = false;
    state.readingAiMessage = "已生成新短文，并按你的当前边界加入题库。";
    saveState();
    render();
    scheduleCloudSync();
  } catch (error) {
    state.readingAiMessage = "生成短文失败：" + String(error.message || error).slice(0, 140);
    state.readingAiBusy = false;
    render();
  }
}

function normalizeReadingCard(raw) {
  const sentences = Array.isArray(raw.sentences) ? raw.sentences : [];
  if (!sentences.length) throw new Error("AI 没有返回有效短文");
  const now = Date.now();
  return {
    id: `ai-reading-${now}`,
    aiSourceLogId: `reading-${now}`,
    track: "japanese",
    module: "jp-reading",
    type: "reading",
    prompt: String(raw.prompt || "阅读短文：AI定制短文"),
    level: String(raw.level || "N1 bridge"),
    source: "ai",
    summary: String(raw.summary || "根据你的学习边界生成。"),
    sentences: sentences.slice(0, 6).map((sentence) => ({
      jp: String(sentence.jp || ""),
      kana: String(sentence.kana || ""),
      zh: String(sentence.zh || ""),
      grammar: Array.isArray(sentence.grammar) ? sentence.grammar.map(String).slice(0, 5) : [],
      words: Array.isArray(sentence.words)
        ? sentence.words.map((word) => ({
            text: String(word.text || ""),
            reading: String(word.reading || ""),
            meaning: String(word.meaning || ""),
            tags: Array.isArray(word.tags) ? word.tags.map(String) : []
          })).filter((word) => word.text)
        : []
    })).filter((sentence) => sentence.jp),
    tags: ["reading-lab", "ai", "adaptive", ...((raw.tags || []).map ? raw.tags.map(String) : [])]
  };
}

// P6: 优先查 vocabBank，回退到旧 jpVocab
function findJpVocabIn(vocabBank, jpVocab, word) {
  var key = normalizeJapaneseWord(word);
  return (vocabBank || []).find(function(item) {
    return item.track === "japanese" && normalizeJapaneseWord(item.word) === key;
  }) || (jpVocab || []).find(function(item) {
    return normalizeJapaneseWord(item.word) === key;
  }) || null;
}

function findJpVocab(word) {
  return findJpVocabIn(state.vocabBank, state.jpVocab, word);
}

// 语法点查重：阅读卡里的 chip 文本是「pattern = 说明」，只取 = 前面的部分和语法银行比对。
// 全角/半角空格在不同数据源里不统一，先归一化再比。
function normalizeGrammarPattern(pattern) {
  return String(pattern || "").split("=")[0].replace(/[\s　]+/g, "").trim();
}

function findGrammarPointIn(grammarBank, pattern) {
  var key = normalizeGrammarPattern(pattern);
  if (!key) return null;
  return (grammarBank || []).find(function (item) {
    return normalizeGrammarPattern(item && item.pattern) === key;
  }) || null;
}

function findGrammarPoint(pattern) {
  return findGrammarPointIn(state.grammarBank, pattern);
}

function normalizeJapaneseWord(word) {
  return String(word || "").trim().replace(/\s+/g, "");
}

function collectWordPayload(encoded) {
  try {
    const data = JSON.parse(decodeURIComponent(encoded || ""));
    collectJpVocab(data);
  } catch {
    showToast("收藏失败：词条数据不完整");
  }
}

function collectSelectedJapaneseText() {
  var selected = typeof window !== "undefined" ? String(window.getSelection?.() || "").trim() : "";
  if (!selected) { showToast("先选中短文里的词或短句，再点收藏"); return; }
  var card = getCard() || {};
  // 识别选区所在句子
  var sentenceIndex = -1;
  var sourceSentence = readingCardText(card);
  if (typeof window !== "undefined") {
    var sel = window.getSelection?.();
    if (sel && sel.rangeCount > 0) {
      var node = sel.getRangeAt(0).startContainer;
      var sentenceEl = node?.parentElement?.closest?.(".reading-sentence");
      if (sentenceEl) {
        var idx = sentenceEl.dataset.sentenceIndex;
        if (idx !== undefined) { sentenceIndex = parseInt(idx, 10); }
        var sentences = Array.isArray(card.sentences) ? card.sentences : [];
        var s = sentences[sentenceIndex];
        if (s) { sourceSentence = normalizeReadingSentence(s).text; }
      }
    }
  }
  var cls = currentLessonState();
  collectJpVocab({
    word: selected,
    reading: "",
    meaning: "待解析",
    sentence: sourceSentence,
    sourceCardId: card.id || "",
    sentenceIndex: sentenceIndex >= 0 ? sentenceIndex : undefined,
    lesson: cls.lesson,
    tags: ["selected", "minna", "lesson-" + cls.lesson]
  });
}

function collectJpVocab(raw) {
  const word = normalizeJapaneseWord(raw.word);
  if (!word) return;
  state.jpVocab = state.jpVocab || [];
  state.vocabBank = state.vocabBank || [];
  const existing = findJpVocab(word);
  const now = new Date().toISOString();
  // R6: 保存 lesson 和 sentenceIndex
  var lessonVal = raw.lesson || currentLessonState().lesson;
  var sentIdxVal = typeof raw.sentenceIndex === "number" ? raw.sentenceIndex : -1;
  if (existing) {
    existing.reading = existing.reading || raw.reading || "";
    existing.meaning = existing.meaning === "待解析" ? (raw.meaning || existing.meaning) : (existing.meaning || raw.meaning || "");
    existing.sentence = existing.sentence || raw.sentence || "";
    existing.lesson = existing.lesson || lessonVal;
    if (sentIdxVal >= 0 && existing.sentenceIndex === undefined) existing.sentenceIndex = sentIdxVal;
    existing.updatedAt = now;
    // 同步更新 vocabBank
    var vb = state.vocabBank.find(function(item) { return item.track === "japanese" && normalizeJapaneseWord(item.word) === word; });
    if (vb) {
      vb.reading = vb.reading || raw.reading || "";
      vb.meaning = vb.meaning === "待解析" ? (raw.meaning || vb.meaning) : (vb.meaning || raw.meaning || "");
      vb.sourceSentence = vb.sourceSentence || raw.sentence || "";
      vb.lesson = vb.lesson || lessonVal;
      if (sentIdxVal >= 0 && vb.sentenceIndex === undefined) vb.sentenceIndex = sentIdxVal;
      vb.updatedAt = now;
    }
    showToast("已更新生词：" + word);
  } else {
    var newItem = {
      id: "jp-word-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      word: word,
      reading: raw.reading || "",
      meaning: raw.meaning || "待解析",
      sentence: raw.sentence || "",
      sourceCardId: raw.sourceCardId || "",
      lesson: lessonVal,
      sentenceIndex: sentIdxVal >= 0 ? sentIdxVal : undefined,
      tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
      status: "new",
      correct: 0,
      lapses: 0,
      createdAt: now,
      updatedAt: now
    };
    state.jpVocab.push(newItem);
    // 同步写入 vocabBank
    state.vocabBank.push({
      id: newItem.id, track: "japanese",
      word: newItem.word, reading: newItem.reading,
      meaning: newItem.meaning, sourceSentence: newItem.sentence,
      sourceCardId: newItem.sourceCardId,
      lesson: newItem.lesson, sentenceIndex: newItem.sentenceIndex,
      tags: newItem.tags, status: newItem.status,
      correct: newItem.correct, lapses: newItem.lapses,
      createdAt: newItem.createdAt, updatedAt: newItem.updatedAt
    });
    maybeCreateJpVocabCard(newItem);
    showToast(`已收藏生词：${word}`);
  }
  state.jpVocab = state.jpVocab.slice(-300);
  state.vocabBank = state.vocabBank.slice(-500);
  saveState();
  render();
  scheduleCloudSync();
}

function maybeCreateJpVocabCard(item) {
  if (!item || !item.word) return;
  const id = `jp-vocab-custom-${normalizeJapaneseWord(item.word)}`;
  state.customCards = state.customCards.filter(function(c) { return c.id !== id; });
  if (!item.meaning || item.meaning === "待解析") {
    state.customCards.push({
      id,
      track: "japanese",
      module: "jp-vocab",
      type: "self-assessment",
      word: item.word,
      prompt: `你记得「${item.word}」的意思吗？`,
      answer: "请在生词本中补充释义后再练习",
      speak: item.word,
      context: item.sentence ? { title: "收藏语境", body: [item.sentence], translation: "", notes: ["待解析 — 请点击生词本中的「补充释义」按钮"] } : undefined,
      explanation: "这个词还没有释义，请在生词本中补充。",
      tags: ["vocab", "custom", "japanese", "reading-lab", "pending"]
    });
    return;
  }
  state.customCards.push({
    id,
    track: "japanese",
    module: "jp-vocab",
    type: "input",
    word: item.word,
    prompt: `阅读生词「${item.word}」是什么意思？`,
    answer: item.meaning,
    accepted: [item.meaning],
    speak: item.word,
    context: item.sentence ? { title: "收藏生词语境", body: [item.sentence], translation: "", notes: [item.reading || ""] } : undefined,
    explanation: `${item.word}${item.reading ? `（${item.reading}）` : ""} = ${item.meaning}`,
    tags: ["vocab", "custom", "japanese", "reading-lab"]
  });
}

// 日语语法银行：从阅读卡 grammar 字段收藏语法点
function collectGrammarPoint(raw) {
  if (!raw || !raw.pattern) return;
  state.grammarBank = state.grammarBank || [];
  var existing = findGrammarPointIn(state.grammarBank, raw.pattern);
  var now = new Date().toISOString();
  if (existing) {
    existing.meaning = existing.meaning || raw.meaning || "";
    existing.connection = existing.connection || raw.connection || "";
    existing.sourceSentence = existing.sourceSentence || raw.sourceSentence || "";
    existing.updatedAt = now;
    showToast("已更新语法点：" + raw.pattern);
  } else {
    state.grammarBank.push({
      id: "grammar-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      pattern: raw.pattern,
      meaning: raw.meaning || "",
      connection: raw.connection || "",
      sourceSentence: raw.sourceSentence || "",
      sourceCardId: raw.sourceCardId || "",
      status: "new",
      lapses: 0,
      createdAt: now,
      updatedAt: now
    });
    showToast("已收藏语法点：" + raw.pattern);
  }
  state.grammarBank = state.grammarBank.slice(-200);
  saveState();
  render();
  scheduleCloudSync();
}

// 从课本词汇目录标记：不在生词本时先加入，再标记状态
function markCatalogWord(word, status) {
  var entry = vocabCatalog.find(function (item) { return item.word === word; });
  if (!entry) return;
  state.vocabBank = state.vocabBank || [];
  var now = new Date().toISOString();
  var vb = state.vocabBank.find(function (item) {
    return item.track === "japanese" && normalizeJapaneseWord(item.word) === normalizeJapaneseWord(word);
  });
  if (!vb) {
    vb = {
      id: "vocab-jp-catalog-" + normalizeJapaneseWord(word),
      track: "japanese",
      word: entry.word,
      reading: entry.reading !== entry.word ? entry.reading : "",
      meaning: entry.meaning,
      sourceSentence: "",
      tags: ["vocab", "catalog"].concat(entry.tags || []),
      status: "new",
      correct: 0,
      lapses: 0,
      createdAt: now
    };
    state.vocabBank.push(vb);
  }
  vb.status = status === "known" ? "known" : "forgot";
  vb.updatedAt = now;
  if (vb.status === "known") vb.correct = (vb.correct || 0) + 1;
  else vb.lapses = (vb.lapses || 0) + 1;
  state.vocabBank = state.vocabBank.slice(-500);
  saveState();
  render();
  scheduleCloudSync();
  showToast((vb.status === "known" ? "已标记掌握：" : "已加入生词本并标记忘了：") + word);
}

// 从课本语法目录标记：不在语法银行时先加入，再标记状态
function markCatalogGrammar(pattern, status) {
  var entry = grammarCatalog.find(function (item) { return item.pattern === pattern; });
  if (!entry) return;
  state.grammarBank = state.grammarBank || [];
  var now = new Date().toISOString();
  var gb = state.grammarBank.find(function (item) { return item.pattern === pattern; });
  if (!gb) {
    gb = {
      id: "grammar-catalog-" + state.grammarBank.length + "-" + Date.now(),
      pattern: entry.pattern,
      meaning: entry.meaning || "",
      connection: entry.connection || "",
      lesson: entry.lesson,
      tags: ["grammar", "catalog"].concat(entry.tags || []),
      status: "new",
      correct: 0,
      lapses: 0,
      createdAt: now
    };
    state.grammarBank.push(gb);
  }
  gb.status = status === "known" ? "known" : "forgot";
  gb.updatedAt = now;
  if (gb.status === "known") gb.correct = (gb.correct || 0) + 1;
  else gb.lapses = (gb.lapses || 0) + 1;
  saveState();
  render();
  scheduleCloudSync();
  showToast((gb.status === "known" ? "已标记掌握：" : "已加入语法银行并标记忘了：") + pattern);
}

function markGrammarPoint(pattern, status) {
  var item = (state.grammarBank || []).find(function(g) { return g.pattern === pattern; });
  if (!item) return;
  item.status = status === "known" ? "known" : "forgot";
  item.updatedAt = new Date().toISOString();
  if (item.status === "known") item.correct = (item.correct || 0) + 1;
  else item.lapses = (item.lapses || 0) + 1;
  saveState();
  render();
  scheduleCloudSync();
}

function markJpVocab(word, status) {
  const item = findJpVocab(word);
  if (!item) return;
  item.status = status === "known" ? "known" : "forgot";
  item.updatedAt = new Date().toISOString();
  if (item.status === "known") item.correct = (item.correct || 0) + 1;
  else item.lapses = (item.lapses || 0) + 1;
  // 同步更新 vocabBank
  state.vocabBank = state.vocabBank || [];
  const vb = state.vocabBank.find(function(entry) { return entry.track === "japanese" && normalizeJapaneseWord(entry.word) === normalizeJapaneseWord(word); });
  if (vb) {
    vb.status = item.status;
    vb.updatedAt = item.updatedAt;
    if (item.status === "known") vb.correct = (vb.correct || 0) + 1;
    else vb.lapses = (vb.lapses || 0) + 1;
  }
  saveState();
  render();
  scheduleCloudSync();
}

async function enrichVocabFromAi(word, sentence) {
  var item = findJpVocab(word);
  if (!item) { showToast("找不到该词"); return; }
  if (!deepseekKeyAvailable()) { showToast("请先设置 DeepSeek API key"); return; }
  showToast("AI 解析中…");
  try {
    var prompt = sentence
      ? "请解析日语词「" + word + "」在以下语境中的意思：\n" + sentence + "\n\n请用 JSON 返回：{\"reading\":\"假名\",\"meaning\":\"中文释义(简短)\"}"
      : "请解析日语词「" + word + "」的最常用含义。\n请用 JSON 返回：{\"reading\":\"假名\",\"meaning\":\"中文释义(简短)\"}";
    var raw = await callDeepSeekDirect("你是简洁的日语词典。只返回 JSON，不要其他内容。", prompt, 0.2);
    raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    var parsed = extractJsonFromText(raw);
    if (parsed && parsed.meaning) {
      item.reading = parsed.reading || item.reading || "";
      item.meaning = parsed.meaning;
      item.updatedAt = new Date().toISOString();
      var vb = (state.vocabBank || []).find(function(v) {
        return v.track === "japanese" && normalizeJapaneseWord(v.word) === normalizeJapaneseWord(word);
      });
      if (vb) { vb.reading = item.reading; vb.meaning = item.meaning; vb.updatedAt = item.updatedAt; }
      var cardId = "jp-vocab-custom-" + normalizeJapaneseWord(word);
      state.customCards = state.customCards.filter(function(c) { return c.id !== cardId; });
      maybeCreateJpVocabCard(item);
      saveState(); render(); scheduleCloudSync();
      showToast("AI 解析完成：" + item.meaning);
    } else {
      showToast("AI 返回格式异常，请手动补充");
    }
  } catch (e) {
    showToast("AI 解析失败：" + (e.message || e));
  }
}

function handleDailySubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const trackId = state.activeTrack;
  const date = todayKey();
  const existing = state.dailyLogs.find((log) => log.track === trackId && log.date === date);
  const content = String(data.get("content") || "").trim();
  const difficulty = String(data.get("difficulty") || "").trim();
  if (!content && !difficulty) return;

  const log = {
    id: existing?.id || `daily-${trackId}-${date}`,
    track: trackId,
    date,
    content,
    difficulty,
    form: String(data.get("form") || "context"),
    energy: String(data.get("energy") || "normal"),
    signals: extractLearningSignals(`${content} ${difficulty}`),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.dailyLogs = [
    log,
    ...state.dailyLogs.filter((item) => item.id !== log.id)
  ].slice(0, 90);

  state.generatedCards = [
    ...state.generatedCards.filter((card) => card.sourceLogId !== log.id),
    ...buildDailyCards(log)
  ].slice(-120);

  state.activeView = "practice";
  saveState();
  buildQueue("adaptive");
  scheduleCloudSync();
  showToast("已保存今日记录，按今天的内容排好了练习");
}

function persistedState() {
  const { queue, currentId, selected, typed, arranged, tokenOrder, optionOrder, revealAnswer, cardShownAt, analysisOpen, analyzing, submitted, lastResult, sampleOpen, translationOpen, syncText, syncMessage, aiMessage, toast, viewAnim, chatGptPendingPrompt, chatGptPendingCardId, readingChatInput, readingAiBusy, readingAiMessage, ...persisted } = state;
  return {
    ...persisted,
    // 安全：敏感字段不进入备份/Gist JSON
    deepseekKey: "",
    gitSync: persisted.gitSync ? { ...persisted.gitSync, token: "" } : undefined
  };
}

function exportSnapshot() {
  return {
    app: "triad-learning-trainer",
    version: 2,
    exportedAt: new Date().toISOString(),
    data: persistedState()
  };
}

function exportDataToText() {
  state.syncText = JSON.stringify(exportSnapshot(), null, 2);
  state.syncMessage = "已生成备份。可以复制到 iPhone，或下载后用 AirDrop/文件传过去。";
}

async function copySyncText() {
  if (!state.syncText) exportDataToText();
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(state.syncText);
      state.syncMessage = "已复制备份文本。";
    } else {
      state.syncMessage = "当前浏览器不能自动复制，请手动选中文本复制。";
    }
  } catch {
    state.syncMessage = "复制失败，请手动选中文本复制。";
  }
  render();
}

function downloadSyncText() {
  if (!state.syncText) exportDataToText();
  try {
    const blob = new Blob([state.syncText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `learning-backup-${todayKey()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    state.syncMessage = "已下载备份文件。";
  } catch {
    state.syncMessage = "下载失败，可以复制备份文本手动保存。";
  }
  render();
}

function importDataFromText() {
  try {
    const snapshot = JSON.parse(state.syncText || "");
    const incoming = snapshot.data || snapshot;
    mergeImportedState(incoming);
    state.syncMessage = "导入完成，已合并两台设备的学习记录。";
    state.syncText = "";
    saveState();
    render();
    scheduleCloudSync();
  } catch {
    state.syncMessage = "导入失败：请确认粘贴的是完整 JSON 备份。";
    render();
  }
}

function gitConfig() {
  const defaults = defaultState().gitSync;
  state.gitSync = state.gitSync || {};
  for (const [key, value] of Object.entries(defaults)) {
    if (state.gitSync[key] === undefined) state.gitSync[key] = value;
  }
  state.gitSync.filename = state.gitSync.filename || "triad-learning-data.json";
  return state.gitSync;
}

function saveGitSyncConfig() {
  const config = gitConfig();
  config.enabled = Boolean(config.token);
  config.status = config.enabled
    ? "GitHub 配置已保存。可以创建云端或立即同步。"
    : "请先填写 GitHub Token。";
  saveState();
  render();
}

function githubReady(requireGist = true) {
  const config = gitConfig();
  if (!config.token) {
    config.status = "缺少 GitHub Token。";
    saveState();
    render();
    return false;
  }
  if (requireGist && !config.gistId) {
    config.status = "缺少 Gist ID。可以先点“创建云端”。";
    saveState();
    render();
    return false;
  }
  config.enabled = true;
  return true;
}

function githubHeaders() {
  return {
    Authorization: `Bearer ${gitConfig().token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json"
  };
}

function gistPayload() {
  const config = gitConfig();
  return {
    description: "Triad learning trainer sync data",
    public: false,
    files: {
      [config.filename]: {
        content: JSON.stringify(exportSnapshot(), null, 2)
      }
    }
  };
}

async function createGitHubGist() {
  if (!githubReady(false)) return;
  const config = gitConfig();
  config.status = "正在创建私有 Gist...";
  saveState();
  render();
  try {
    const response = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: githubHeaders(),
      body: JSON.stringify(gistPayload())
    });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    const gist = await response.json();
    config.gistId = gist.id;
    config.enabled = true;
    config.lastSync = new Date().toLocaleString();
    config.status = "云端已创建并上传当前数据。";
    saveState();
  } catch (error) {
    config.status = `创建失败：${error.message}`;
  }
  render();
}

function extractGistSnapshot(gist) {
  const config = gitConfig();
  const file = gist.files?.[config.filename] || Object.values(gist.files || {}).find((entry) => entry.filename?.endsWith(".json"));
  if (!file?.content) throw new Error("Gist 中没有可用的 JSON 数据文件");
  const snapshot = JSON.parse(file.content);
  return snapshot.data || snapshot;
}

async function pullFromGitHub(options = {}) {
  if (!githubReady(true)) return;
  const config = gitConfig();
  if (!options.silent) {
    config.status = "正在从 GitHub 拉取...";
    saveState();
    render();
  }
  try {
    const response = await fetch(`https://api.github.com/gists/${encodeURIComponent(config.gistId)}`, {
      headers: githubHeaders()
    });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    const gist = await response.json();
    mergeImportedState(extractGistSnapshot(gist));
    config.lastSync = new Date().toLocaleString();
    config.status = "已从云端拉取并合并。";
    saveState();
  } catch (error) {
    config.status = `拉取失败：${error.message}`;
  }
  if (options.render !== false) render();
}

async function pushToGitHub(options = {}) {
  if (!githubReady(false)) return;
  const config = gitConfig();
  if (!config.gistId) {
    await createGitHubGist();
    return;
  }
  if (!options.silent) {
    config.status = "正在上传到 GitHub...";
    saveState();
    render();
  }
  try {
    const response = await fetch(`https://api.github.com/gists/${encodeURIComponent(config.gistId)}`, {
      method: "PATCH",
      headers: githubHeaders(),
      body: JSON.stringify(gistPayload())
    });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    config.enabled = true;
    config.lastSync = new Date().toLocaleString();
    config.status = "已上传本机数据到云端。";
    saveState();
  } catch (error) {
    config.status = `上传失败：${error.message}`;
  }
  if (options.render !== false) render();
}

async function syncWithGitHub(options = {}) {
  const config = gitConfig();
  if (!githubReady(false)) return;
  if (cloudSyncInFlight) return;
  cloudSyncInFlight = true;
  if (!options.silent) {
    config.status = "正在云同步：先拉取合并，再上传...";
    saveState();
    render();
  }
  try {
    if (!config.gistId) {
      await createGitHubGist();
    } else {
      await pullFromGitHub({ silent: true, render: false });
      await pushToGitHub({ silent: true, render: false });
      config.status = "云同步完成。";
      config.lastSync = new Date().toLocaleString();
      saveState();
    }
  } finally {
    cloudSyncInFlight = false;
    if (options.render !== false) render();
  }
}

function scheduleCloudSync() {
  const config = gitConfig();
  if (!config.auto || !config.enabled || !config.token || !config.gistId) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    config.status = "当前离线，本机已保存；下次联网可同步。";
    saveState();
    return;
  }
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    syncWithGitHub({ silent: true });
  }, 2500);
}

function syncOnStartup() {
  const config = gitConfig();
  if (!config.auto || !config.enabled || !config.token || !config.gistId) return;
  setTimeout(() => {
    syncWithGitHub({ silent: true });
  }, 800);
}

function mergeImportedState(incoming) {
  if (!incoming || typeof incoming !== "object") throw new Error("Invalid backup");
  state.progress = mergeProgress(state.progress, incoming.progress || {});
  state.customCards = mergeById(state.customCards, incoming.customCards || []);
  state.generatedCards = mergeById(state.generatedCards, incoming.generatedCards || []).slice(-160);
  state.dailyLogs = mergeById(state.dailyLogs, incoming.dailyLogs || [], "updatedAt").slice(0, 120);
  state.history = mergeHistory(state.history, incoming.history || []).slice(-HISTORY_LIMIT);
  state.analyses = { ...(state.analyses || {}), ...(incoming.analyses || {}) };
  state.diagnosis = { ...(state.diagnosis || {}), ...(incoming.diagnosis || {}) };
  state.jpVocab = mergeById(state.jpVocab || [], incoming.jpVocab || [], "updatedAt").slice(-300);
  state.vocabBank = mergeById(state.vocabBank || [], incoming.vocabBank || [], "updatedAt").slice(-500);
  state.grammarBank = mergeById(state.grammarBank || [], incoming.grammarBank || [], "updatedAt").slice(-200);
  state.readingChat = { ...(state.readingChat || {}), ...(incoming.readingChat || {}) };
  state.dailyGoal = Number(incoming.dailyGoal || state.dailyGoal) || state.dailyGoal;
  state.sessionSizeMode = incoming.sessionSizeMode || state.sessionSizeMode;
  state.manualSessionSize = Number(incoming.manualSessionSize) || state.manualSessionSize;
  state.productionRatio = Number(incoming.productionRatio) || state.productionRatio;
  state.activeCommuteSegment = incoming.activeCommuteSegment || state.activeCommuteSegment;
  state.lessonProgress = mergeLessonProgress(state.lessonProgress, incoming.lessonProgress);
}

function mergeById(local, incoming, timeKey = "createdAt") {
  const map = new Map();
  for (const item of [...local, ...incoming]) {
    if (!item?.id) continue;
    const existing = map.get(item.id);
    if (!existing || String(item[timeKey] || item.updatedAt || "").localeCompare(String(existing[timeKey] || existing.updatedAt || "")) >= 0) {
      map.set(item.id, item);
    }
  }
  return [...map.values()];
}

// 课次进度合并。以前这块完全不参与同步，手机和电脑各记各的，
// 结果同一个人在三台设备上分别停在第 16/17/19 课。
// 规则：currentLesson 取两边最大（只前进不后退，和 applyLessonBaseline 一致）；
// 每课的掌握度记录按 updatedAt 取新的那份——不做累加，否则同一轮练习同步两次会被重复计数。
function mergeLessonProgress(local, incoming) {
  const base = local || {};
  if (!incoming || typeof incoming !== "object") return base;
  const lessons = { ...(base.lessons || {}) };
  for (const [key, rec] of Object.entries(incoming.lessons || {})) {
    const existing = lessons[key];
    if (!existing || String(rec.updatedAt || "").localeCompare(String(existing.updatedAt || "")) > 0) {
      lessons[key] = rec;
    }
  }
  // 对方设备可能跑着旧版本，记录字段不一定齐（实测缺 blockers 会让总览页直接崩），
  // 先补齐结构再重算派生掌握度，避免两边算法版本不同导致数值不一致。
  const emptyVocab = { total: 0, seen: 0, known: 0, fuzzy: 0, forgot: 0, mastery: 0 };
  const emptyReading = { total: 0, seen: 0, good: 0, hard: 0, again: 0, mastery: 0 };
  for (const [key, rec] of Object.entries(lessons)) {
    lessons[key] = {
      lesson: Number(rec.lesson) || Number(key) || 0,
      status: rec.status || "active",
      overall: rec.overall || 0,
      canPreview: Boolean(rec.canPreview),
      canAdvance: Boolean(rec.canAdvance),
      updatedAt: rec.updatedAt || "",
      ...rec,
      vocab: { ...emptyVocab, ...(rec.vocab || {}) },
      grammar: { ...emptyVocab, ...(rec.grammar || {}) },
      reading: { ...emptyReading, ...(rec.reading || {}) },
      retention: { due: 0, overdue: 0, stable: 0, mastery: 0, ...(rec.retention || {}) },
      blockers: Array.isArray(rec.blockers) ? rec.blockers : []
    };
    recalcLessonMastery(lessons[key]);
  }

  const localLesson = Number(base.currentLesson) || 0;
  const incomingLesson = Number(incoming.currentLesson) || 0;
  const currentLesson = Math.max(localLesson, incomingLesson) || localLesson || incomingLesson;
  const newer = String(incoming.lastAdvanceAt || "").localeCompare(String(base.lastAdvanceAt || "")) > 0;
  return {
    ...base,
    lessons,
    currentLesson,
    previewLesson: Math.max(Number(base.previewLesson) || 0, Number(incoming.previewLesson) || 0, currentLesson + 1),
    // 推进模式是学习偏好，跟着最近一次改动走
    advanceMode: newer ? (incoming.advanceMode || base.advanceMode) : (base.advanceMode || incoming.advanceMode),
    lastAdvanceAt: newer ? incoming.lastAdvanceAt : base.lastAdvanceAt,
    lastAdvanceReason: newer ? incoming.lastAdvanceReason : base.lastAdvanceReason
  };
}

function mergeProgress(local, incoming) {
  const merged = { ...local };
  for (const [cardId, progress] of Object.entries(incoming || {})) {
    const existing = merged[cardId];
    if (!existing || (progress.reps || 0) > (existing.reps || 0) || (progress.lastSeen || 0) > (existing.lastSeen || 0)) {
      merged[cardId] = progress;
    }
  }
  return merged;
}

function mergeHistory(local, incoming) {
  const map = new Map();
  for (const item of [...local, ...incoming]) {
    const key = item.time || `${item.date}-${item.cardId}-${item.rating}`;
    map.set(key, item);
  }
  return [...map.values()].sort((a, b) => String(a.time || a.date).localeCompare(String(b.time || b.date)));
}

function buildDailyCards(log) {
  const track = getTrack(log.track);
  const moduleId = track.modules.find((module) => /reading|passage/.test(module.id))?.id || track.modules[0]?.id || "custom";
  const lines = splitLearningLines(log.content).slice(0, 3);
  const context = {
    title: `今日内容 · ${log.date}`,
    body: lines.length ? lines : [log.content || log.difficulty],
    translation: "",
    notes: [
      `形式：${formLabel(log.form)}`,
      log.difficulty ? `难点：${shortText(log.difficulty, 20)}` : "先复述，再做题"
    ]
  };
  const cards = [];

  if (log.track === "japanese") {
    cards.push(buildDailyReadingCard(log, lines, context));
  }

  lines.forEach((line, index) => {
    cards.push({
      id: `daily-${log.track}-${log.date}-retell-${index}`,
      sourceLogId: log.id,
      track: log.track,
      module: moduleId,
      type: "self",
      prompt: `复述今天这句：${shortText(line, 42)}`,
      subprompt: "先看上下文，再用自己的话说一遍或写一遍。",
      context,
      checklist: dailyChecklist(log.track, log.form),
      sample: line,
      speak: log.track === "english" || log.track === "japanese" ? line : "",
      explanation: "这是根据你的今日记录自动生成的复述题，帮助把当天内容转成可回忆材料。",
      tags: ["daily", "context", log.form, ...log.signals]
    });

    if (log.form === "writing" || log.form === "context") {
      cards.push({
        id: `daily-${log.track}-${log.date}-write-${index}`,
        sourceLogId: log.id,
        track: log.track,
        module: moduleId,
        type: "input",
        prompt: `默写今日关键句：${shortText(line, 18)}...`,
        context,
        answer: line,
        accepted: [line],
        speak: log.track === "english" || log.track === "japanese" ? line : "",
        explanation: "不用追求一次完全写对，先把长句结构从眼熟变成能主动输出。",
        tags: ["daily", "writing", "context", ...log.signals]
      });
    }
  });

  if (log.difficulty) {
    cards.push({
      id: `daily-${log.track}-${log.date}-difficulty`,
      sourceLogId: log.id,
      track: log.track,
      module: moduleId,
      type: "self",
      prompt: `解释今天卡住的点：${shortText(log.difficulty, 48)}`,
      subprompt: "说出哪里难、正确用法是什么、下次如何判断。",
      context,
      checklist: ["是否说清卡点", "是否给出正确例子", "是否说明下次怎么识别"],
      sample: log.difficulty,
      explanation: "把模糊难点说出来，比单纯重看一遍更能形成记忆。",
      tags: ["daily", "weakness", ...log.signals]
    });
  }

  return cards;
}

function buildDailyReadingCard(log, lines, context) {
  const sourceLines = lines.length ? lines : splitLearningLines(`${log.content || ""}。${log.difficulty || ""}`).slice(0, 3);
  const fallback = sourceLines.length ? sourceLines : [log.content || log.difficulty || "今日は日本語を勉強しました。"];
  return {
    id: `daily-${log.track}-${log.date}-reading-lab`,
    sourceLogId: log.id,
    track: "japanese",
    module: "jp-reading",
    type: "reading",
    prompt: `今日阅读：${shortText(log.content || log.difficulty || "学习记录", 24)}`,
    level: "按今日记录",
    source: "daily",
    summary: "把今日记录转换成逐句阅读。AI 可以继续按你的知识边界改写下一篇。",
    context,
    sentences: fallback.slice(0, 4).map((line) => ({
      jp: line,
      kana: "点击下方 AI 追问，可让 AI 给这句标假名。",
      zh: "先根据你自己的理解翻译；不确定处直接问 AI。",
      grammar: ["今日记录句", log.difficulty ? `难点：${shortText(log.difficulty, 28)}` : "找主干、助词和动词变形"],
      words: (log.signals || []).slice(0, 4).map((word) => ({ text: word, reading: "", meaning: "待解析", tags: ["daily"] }))
    })),
    tags: ["daily", "reading-lab", "context", ...log.signals]
  };
}

function splitLearningLines(text) {
  return String(text || "")
    .replace(/[。！？.!?]/g, "$&\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 4)
    .slice(0, 6);
}

function dailyChecklist(trackId, form) {
  if (form === "listening") return ["是否听出关键词", "是否能跟读一遍", "是否能说出句子大意"];
  if (form === "speaking") return ["是否不用看全文也能复述", "是否说出一个例句", "是否卡顿少于三次"];
  if (form === "writing") return ["是否写出核心结构", "是否检查助词/搭配", "是否能改写一个相似句"];
  if (trackId === "tractatus") return ["是否抓住概念关系", "是否能举例", "是否避免只背术语"];
  return ["是否理解上下文", "是否说出关键词", "是否能造一个相似句"];
}

function renderAiPanel() {
  var isJapanese = state.activeTrack === "japanese";
  return `
    <section class="custom-panel ai-panel" data-view="practice">
      <h3 class="panel-title">AI 出题</h3>
      <p class="daily-meta">${isJapanese
        ? "根据《大家的日语》第" + japaneseSourceProfile.currentLesson + "课、vocabBank 忘词、grammarBank 弱项和答题记录自动生成原创练习题。"
        : "根据当前词汇进度、错题和收藏词自动生成原创练习题。"}</p>
      <button class="plain-button primary full-button" data-action="ai-generate">
        ${isJapanese ? "按教材进度与错题生成练习" : "按词汇进度与错题生成练习"}
      </button>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <button class="plain-button" data-action="open-settings-section" data-section="ai">
          ⚙ AI 设置
        </button>
        <button class="plain-button" data-action="ai-diagnose">
          🔍 学习诊断
        </button>
      </div>
      <p class="daily-meta" style="margin-top:6px">${escapeHtml(state.aiMessage || "双击 start-learning.bat 启动代理。在设置中配置 DeepSeek Key 或本地模型。")}</p>
    </section>
  `;
}

function renderDiagnosisPanel() {
  const trackId = state.activeTrack;
  const cached = state.diagnosis?.[trackId];
  const hasDiagnosis = cached && cached.summary;
  const trackName = getTrack(trackId).name;
  let body = "";
  if (hasDiagnosis) {
    body = `
      <div class="diagnosis-result">
        <p class="diagnosis-meta">上次诊断：${cached.at ? new Date(cached.at).toLocaleString("zh-CN") : "未知"} · ${escapeHtml(cached.provider || "")}</p>
        <div class="diagnosis-summary">
          <h4>📋 诊断摘要</h4>
          <p>${escapeHtml(cached.summary)}</p>
        </div>
        ${cached.patterns?.length ? `
        <div class="diagnosis-patterns">
          <h4>🔍 问题模式</h4>
          <ul>${cached.patterns.map((p) => `<li><b>${escapeHtml(p.category)}</b>：${escapeHtml(p.detail)}</li>`).join("")}</ul>
        </div>` : ""}
        ${cached.recommendations?.length ? `
        <div class="diagnosis-recommendations">
          <h4>💡 改进建议</h4>
          <ol>${cached.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ol>
        </div>` : ""}
        ${typeof cached.focusCardCount === "number" ? `<p class="daily-meta">已生成 ${cached.focusCardCount} 道针对性练习题，已进入智能推荐队列。</p>` : ""}
      </div>`;
  }
  return `
    <section class="custom-panel ai-panel" data-view="practice">
      <h3 class="panel-title">学习诊断（DeepSeek / 本地模型）</h3>
      <p class="daily-meta">
        把近期的答题数据发给 AI，让它分析你的薄弱模式并生成针对性练习。诊断结果通过 Gist 同步到手机。
        ${hasDiagnosis ? "" : "建议数天诊断一次，每次积累一些答题后再做。需要在电脑上启动 proxy/ai-proxy.mjs。"}
      </p>
      <label>
        诊断学科
        <select data-action="diagnosis-track" disabled>${["japanese","english","tractatus"].map((id) => renderSelectOption(id, getTrack(id).name, trackId)).join("")}</select>
      </label>
      <button class="plain-button primary full-button" data-action="ai-diagnose">
        ${hasDiagnosis ? `重新诊断 ${trackName}` : `生成 ${trackName} 诊断`}
      </button>
      <p class="daily-meta">${escapeHtml(state.aiMessage || "")}</p>
      ${body}
    </section>
  `;
}

async function handleDiagnose() {
  var trackId = state.activeTrack;
  var track = getTrack(trackId);
  var profile = learningProfile(trackId);
  var allHistory = state.history.filter(function(h) { return h.track === trackId; });
  var recentErrors = allHistory
    .filter(function(h) { return !h.correct; })
    .slice(-20)
    .map(function(h) {
      var card = allCards().find(function(c) { return c.id === h.cardId; });
      return {
        prompt: card ? card.prompt || "" : "",
        answer: card ? card.answer || "" : "",
        userAnswer: h.rating === "again" ? "(忘了)" : "(错)",
        explanation: card ? card.explanation || "" : "",
        tags: card ? cardTags(card) : []
      };
    });
  var dailyLogs = state.dailyLogs
    .filter(function(l) { return l.track === trackId; })
    .slice(-3)
    .map(function(l) { return { date: l.date || "", content: l.content || "", difficulty: l.difficulty || "" }; });

  var profilePayload = {
    errorReasons: profile.errorReasons,
    tagReasons: profile.tagReasons,
    weakTags: profile.weakTags,
    slowModuleNames: profile.slowModuleNames,
    moduleRows: profile.moduleRows.map(function(r) { return { name: r.name, accuracy: r.accuracy, due: r.due, avgMs: r.avgMs }; }),
    advice: profile.advice
  };

  // DeepSeek 直连优先
  if (deepseekKeyAvailable()) {
    state.aiMessage = "正在通过 DeepSeek API 直连诊断…"; saveState();
    try {
      var dData = await callDeepSeekDiagnose({ track: trackId, trackName: track.name, profile: profilePayload, recentErrors: recentErrors, dailyLogs: dailyLogs });
      var diag = dData.diagnosis || {};
      var focusCards = Array.isArray(diag.focusCards) ? diag.focusCards : [];

      // 保存诊断结果（DeepSeek 直连）
      state.diagnosis = state.diagnosis || {};
      state.diagnosis[trackId] = {
        summary: diag.summary || "", patterns: diag.patterns || [],
        recommendations: diag.recommendations || [], focusCardCount: focusCards.length,
        at: new Date().toISOString(), provider: "deepseek-direct"
      };

      if (focusCards.length) {
        var now = Date.now();
        var normalized = focusCards.map(function(raw, i) { return normalizeAiCard(raw, trackId, "diag-" + trackId + "-" + now + "-" + i, "diag-" + now); });
        state.generatedCards = [
          ...state.generatedCards.filter(function(card) { return !card.aiSourceLogId || !String(card.aiSourceLogId).startsWith("diag-"); }),
          ...normalized
        ].slice(-160);
      }

      saveState(); scheduleCloudSync();
      state.aiMessage = "诊断完成（DeepSeek 直连）：" + (diag.summary ? diag.summary.slice(0, 60) + "…" : "已生成") + "  |  " + (focusCards.length ? "+" + focusCards.length + " 道针对性题" : "");
      return;
    } catch (e) {
      state.aiMessage = "DeepSeek 直连诊断失败：" + (e.message || e) + "。尝试回退代理…";
      saveState();
    }
  }

  // 回退本地代理
  var url = (state.aiProxyUrl || "http://127.0.0.1:8799").replace(/\/+$/, "");
  state.aiMessage = "正在通过代理诊断…"; saveState();
  try {
    var res = await fetch(url + "/diagnose", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: state.aiProvider || "deepseek", track: trackId, trackName: track.name,
        profile: profilePayload, recentErrors: recentErrors, dailyLogs: dailyLogs
      })
    });
    if (!res.ok) { var errText = await res.text(); throw new Error("代理返回 " + res.status + "：" + errText.slice(0, 200)); }
    var data = await res.json();
    var diag2 = data.diagnosis || {};
    var focusCards2 = Array.isArray(diag2.focusCards) ? diag2.focusCards : [];

    state.diagnosis = state.diagnosis || {};
    state.diagnosis[trackId] = {
      summary: diag2.summary || "", patterns: diag2.patterns || [],
      recommendations: diag2.recommendations || [], focusCardCount: focusCards2.length,
      at: new Date().toISOString(), provider: data.provider || "deepseek"
    };

    if (focusCards2.length) {
      var now2 = Date.now();
      var normalized2 = focusCards2.map(function(raw, i) { return normalizeAiCard(raw, trackId, "diag-" + trackId + "-" + now2 + "-" + i, "diag-" + now2); });
      state.generatedCards = [
        ...state.generatedCards.filter(function(card) { return !card.aiSourceLogId || !String(card.aiSourceLogId).startsWith("diag-"); }),
        ...normalized2
      ].slice(-160);
    }

    saveState(); scheduleCloudSync();
    state.aiMessage = "诊断完成：" + (diag2.summary ? diag2.summary.slice(0, 60) + "…" : "已生成") + "  |  " + (focusCards2.length ? "+" + focusCards2.length + " 道针对性题" : "");
  } catch (e) {
    state.aiMessage = "诊断失败：" + (e.message || e).slice(0, 120);
    saveState();
  }
}

function renderVocabPanel() {
  if (state.activeTrack === "japanese") return renderJapaneseVocabPanel();
  if (state.activeTrack !== "english") return "";
  // 英语生词：从 vocabBank 读取（也兼容旧 customCards）
  const vbWords = (state.vocabBank || []).filter(function(item) { return item.track === "english"; });
  const recent = vbWords.slice(-6).reverse().map(function(item) { return item.word; }).filter(Boolean);
  const cardWords = state.customCards.filter(function(card) { return card.module === "en-vocab" && !card.tags?.includes("reverse"); });
  const totalCount = vbWords.length || cardWords.length;
  return `
    <section class="custom-panel vocab-panel" data-view="vocab">
      <h3 class="panel-title">英语生词复习</h3>
      <p class="daily-meta">从阅读中遇到的新词加进来，会自动变成填空复习题，并进入智能推荐和同步。</p>
      <form data-action="vocab-form">
        <div class="form-grid">
          <label>单词<input name="word" required placeholder="settlement" autocomplete="off" /></label>
          <label>释义<input name="meaning" required placeholder="沉降" autocomplete="off" /></label>
        </div>
        <label>例句（可选）<input name="example" placeholder="The foundation showed excessive settlement." autocomplete="off" /></label>
        <button class="plain-button primary full-button" type="submit">加入生词本</button>
      </form>
      <p class="daily-meta">已收 ${totalCount} 个生词。${recent.length ? `最近：${escapeHtml(recent.join("、"))}` : ""}</p>
    </section>
  `;
}

function renderJapaneseVocabPanel() {
  var vbWords = (state.vocabBank || []).filter(function(item) { return item.track === "japanese"; });
  var allWords = vbWords.length ? vbWords.slice().reverse() : (state.jpVocab || []).slice().reverse();
  var pendingCount = allWords.filter(function(w) { return !w.meaning || w.meaning === "待解析"; }).length;
  var words = allWords.slice(0, 20);
  return `
    <section class="custom-panel vocab-panel" data-view="vocab">
      <h3 class="panel-title">日语阅读生词 <small>(${allWords.length} 词${pendingCount ? "，" + pendingCount + " 待解析" : ""})</small></h3>
      <p class="daily-meta">在阅读短文里点词或选词即可收藏。点「补充释义」可手动添加或调用 AI 解析。</p>
      <ul class="jp-vocab-list">
        ${
          words.length
            ? words.map(function(item) {
              var isPending = !item.meaning || item.meaning === "待解析";
              var statusCls = item.status === "known" ? " status-known" : item.status === "forgot" ? " status-forgot" : "";
              var sourceTag = item.source === "selected" || (item.tags && item.tags.indexOf("selected") >= 0) ? '<span class="vocab-source">选词</span>' : "";
              return `
              <li class="${isPending ? "vocab-pending" : ""}${statusCls}">
                <div>
                  <b>${escapeHtml(item.word)}</b>${sourceTag}
                  <span>${isPending ? '<em class="pending-label">待解析</em>' : escapeHtml([item.reading, item.meaning].filter(Boolean).join(" · "))}</span>
                </div>
                <div class="mini-actions">
                  ${isPending ? `
                    <button class="plain-button primary" data-action="vocab-edit" data-word="${escapeHtml(item.word)}">补充释义</button>
                    <button class="plain-button" data-action="vocab-enrich" data-word="${escapeHtml(item.word)}" data-sentence="${escapeHtml(item.sentence || item.sourceSentence || "")}">AI解析</button>
                  ` : `
                    <button class="plain-button" data-action="vocab-mark" data-word="${escapeHtml(item.word)}" data-status="forgot">忘了</button>
                    <button class="plain-button" data-action="vocab-mark" data-word="${escapeHtml(item.word)}" data-status="known">掌握</button>
                    <button class="plain-button" data-action="vocab-edit" data-word="${escapeHtml(item.word)}">编辑</button>
                  `}
                  <button class="plain-button danger" data-action="vocab-delete" data-word="${escapeHtml(item.word)}">删除</button>
                </div>
              </li>
            `; }).join("")
            : `<li><div><b>还没有收藏</b><span>去阅读短文里点词或选词。</span></div></li>`
        }
      </ul>
    </section>
  `;
}

function renderGrammarPanel() {
  if (state.activeTrack !== "japanese") return "";
  var items = (state.grammarBank || []).slice(-10).reverse();
  return `
    <section class="custom-panel grammar-panel" data-view="vocab">
      <h3 class="panel-title">日语语法银行 <small>(${(state.grammarBank || []).length} 条)</small></h3>
      <p class="daily-meta">在阅读短文里点语法点即可收藏。标记「忘了」的语法点会优先进入智能推荐。</p>
      <ul class="jp-vocab-list">
        ${
          items.length
            ? items.map(function(g) { return `
              <li>
                <div>
                  <b>${escapeHtml(g.pattern)}</b>
                  <span>${escapeHtml(g.meaning || g.connection || "待解析")}</span>
                </div>
                <div class="mini-actions">
                  <button class="plain-button" data-action="grammar-mark" data-pattern="${escapeHtml(g.pattern)}" data-status="forgot">忘了</button>
                  <button class="plain-button" data-action="grammar-mark" data-pattern="${escapeHtml(g.pattern)}" data-status="known">掌握</button>
                </div>
              </li>
            `; }).join("")
            : `<li><div><b>还没有收藏</b><span>去阅读短文里点语法点。</span></div></li>`
        }
      </ul>
    </section>
  `;
}

// 课本词汇目录：按课浏览 1-17 课全部词汇，可标记忘了/掌握（写入 vocabBank 进入出题）
function renderVocabCatalogPanel() {
  if (state.activeTrack !== "japanese" || !vocabCatalog.length) return "";
  var cls = currentLessonState();
  var activeLesson = Number(state.catalogLesson) || cls.lesson;
  var lessons = [];
  for (var l = 1; l <= Math.max(cls.lesson, 16); l += 1) lessons.push(l);
  var words = vocabCatalog.filter(function (item) { return item.lesson === activeLesson; });
  var bankIndex = {};
  (state.vocabBank || []).forEach(function (item) {
    if (item.track === "japanese" && item.word) bankIndex[item.word] = item.status || "";
  });
  return `
    <section class="custom-panel vocab-panel" data-view="vocab">
      <h3 class="panel-title">课本词汇目录 <small>(共 ${vocabCatalog.length} 词 · 第 ${activeLesson} 课 ${words.length} 词)</small></h3>
      <p class="daily-meta">《大家的日语》1-17 课词汇全部载入。点「忘了」加入生词本并优先出题。</p>
      <div class="chip-row catalog-lesson-row">
        ${lessons.map(function (l) {
          return `<button class="plain-button lesson-chip${l === activeLesson ? " is-active" : ""}" data-action="catalog-lesson" data-lesson="${l}">${l}</button>`;
        }).join("")}
      </div>
      <ul class="jp-vocab-list">
        ${words.map(function (item) {
          var status = bankIndex[item.word] || "";
          var statusCls = status === "known" ? " status-known" : status === "forgot" ? " status-forgot" : "";
          return `
            <li class="${statusCls}">
              <div>
                <b>${escapeHtml(item.word)}</b>
                <span>${escapeHtml([item.reading !== item.word ? item.reading : "", item.meaning, item.partOfSpeech].filter(Boolean).join(" · "))}</span>
              </div>
              <div class="mini-actions">
                <button class="plain-button" data-action="catalog-word-mark" data-word="${escapeHtml(item.word)}" data-status="forgot">忘了</button>
                <button class="plain-button" data-action="catalog-word-mark" data-word="${escapeHtml(item.word)}" data-status="known">掌握</button>
              </div>
            </li>
          `;
        }).join("")}
      </ul>
    </section>
  `;
}

// 课本语法目录：1-17 课全部句型，可标记忘了/掌握（写入 grammarBank 进入出题）
function renderGrammarCatalogPanel() {
  if (state.activeTrack !== "japanese" || !grammarCatalog.length) return "";
  var cls = currentLessonState();
  var activeLesson = Number(state.catalogLesson) || cls.lesson;
  var items = grammarCatalog.filter(function (item) { return item.lesson === activeLesson; });
  var bankIndex = {};
  (state.grammarBank || []).forEach(function (item) {
    if (item.pattern) bankIndex[item.pattern] = item.status || "";
  });
  return `
    <section class="custom-panel grammar-panel" data-view="vocab">
      <h3 class="panel-title">课本语法目录 <small>(共 ${grammarCatalog.length} 条 · 第 ${activeLesson} 课 ${items.length} 条)</small></h3>
      <p class="daily-meta">与上方词汇目录共用课次选择。点「忘了」的语法点会优先出题。</p>
      <ul class="jp-vocab-list">
        ${items.map(function (item) {
          var status = bankIndex[item.pattern] || "";
          var statusCls = status === "known" ? " status-known" : status === "forgot" ? " status-forgot" : "";
          return `
            <li class="${statusCls}">
              <div>
                <b>${escapeHtml(item.pattern)}</b>
                <span>${escapeHtml(item.meaning || "")}${item.example ? `<br><em>${escapeHtml(item.example)}</em>` : ""}</span>
              </div>
              <div class="mini-actions">
                <button class="plain-button" data-action="catalog-grammar-mark" data-pattern="${escapeHtml(item.pattern)}" data-status="forgot">忘了</button>
                <button class="plain-button" data-action="catalog-grammar-mark" data-pattern="${escapeHtml(item.pattern)}" data-status="known">掌握</button>
              </div>
            </li>
          `;
        }).join("")}
      </ul>
    </section>
  `;
}

async function generateAiCards() {
  var profile = learningProfile(state.activeTrack);
  var track = getTrack(state.activeTrack);
  var aiSourceId = "ai-" + Date.now();
  // P5: 显式构造 aiSource，传 track/lesson/lessonRange/signals
  var cls = state.activeTrack === "japanese" ? currentLessonState() : null;
  var aiSource = {
    id: aiSourceId,
    track: state.activeTrack,
    signals: profile.weakTags || [],
    lesson: cls ? cls.lesson : undefined,
    lessonRange: cls ? { from: 1, to: cls.lesson } : undefined,
    previewLesson: cls ? cls.previewLesson : undefined
  };

  // DeepSeek 直连优先
  if (deepseekKeyAvailable()) {
    state.aiMessage = "正在通过 DeepSeek API 直连生成题目…"; render();
    try {
      var parsed = await callDeepSeekGenerate({
        track: state.activeTrack,
        trackName: track.name,
        weakTags: profile.weakTags, count: 20
      });
      var incoming = Array.isArray(parsed.cards) ? parsed.cards : [];
      var cards = incoming.map(function(c, i) { return normalizeAiCard(c, aiSource, i); }).filter(Boolean);
      if (!cards.length) throw new Error("没有解析到有效题目");
      state.generatedCards = [
        ...state.generatedCards.slice(-120),
        ...cards
      ].slice(-160);
      state.aiMessage = "已用 DeepSeek 直连生成 " + cards.length + " 道题，加入题库；下次同步会上传到手机。";
      saveState(); buildQueue("adaptive"); scheduleCloudSync();
      return;
    } catch (e) {
      state.aiMessage = "DeepSeek 直连生成失败：" + (e.message || e) + "。尝试回退代理…";
      render();
    }
  }

  // 回退本地代理
  var url = String(state.aiProxyUrl || "").replace(/\/+$/, "");
  if (!url) { state.aiMessage = "请设置 DeepSeek API key（推荐）或本地代理地址"; render(); return; }
  state.aiMessage = "正在请求本地代理生成题目…"; render();
  try {
    var resp = await fetch(url + "/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: state.aiProvider || "deepseek", track: state.activeTrack,
        trackName: track.name,
        weakTags: profile.weakTags, count: 20
      })
    });
    if (!resp.ok) throw new Error("代理返回 " + resp.status);
    var payload = await resp.json();
    var incoming2 = Array.isArray(payload.cards) ? payload.cards : [];
    var cards2 = incoming2.map(function(c, i) { return normalizeAiCard(c, aiSource, i); }).filter(Boolean);
    if (!cards2.length) throw new Error("没有解析到有效题目，可重试一次");
    state.generatedCards = [
      ...state.generatedCards.slice(-120),
      ...cards2
    ].slice(-160);
    state.aiMessage = "已用「" + (payload.provider === "local" ? "本地 DeepSeek 8B" : "DeepSeek API") + "」生成 " + cards2.length + " 道题。";
    saveState(); buildQueue("adaptive"); scheduleCloudSync();
  } catch (e) {
    state.aiMessage = "生成失败：" + (e.message || e) + "。请确认代理在运行或设置 DeepSeek API key。";
    render();
  }
}

function normalizeAiCard(raw, logOrTrack, index, sourceLogId) {
  if (!raw || typeof raw !== "object") return null;
  var log;
  if (typeof logOrTrack === "string") {
    log = { track: logOrTrack, id: sourceLogId || "ai-" + logOrTrack, signals: [], lesson: currentLessonState().lesson };
  } else if (logOrTrack && typeof logOrTrack === "object") {
    log = logOrTrack;
    // 兜底：无 track 时从当前 state 推断
    if (!log.track) log.track = state.activeTrack || "japanese";
  } else {
    log = { track: state.activeTrack || "japanese", id: "ai-" + Date.now(), signals: [], lesson: currentLessonState().lesson };
  }
  if (!log.track) return null;
  var track = getTrack(log.track);
  const moduleId =
    track.modules.find((module) => module.id === raw.module)?.id ||
    track.modules.find((module) => /reading|passage/.test(module.id))?.id ||
    track.modules[0]?.id ||
    "custom";
  const type = ["choice", "input", "arrange", "self", "reading"].includes(raw.type) ? raw.type : "input";
  const prompt = String(raw.prompt || "").trim();
  if (!prompt) return null;
  const cardId = typeof index === "string" ? index : `ai-${log.track}-${Date.now()}-${index}`;
  const sourceId = sourceLogId || log.id || cardId;

  const base = {
    id: cardId,
    aiSourceLogId: sourceId,
    sourceLogId: sourceId,
    track: log.track,
    module: moduleId,
    type,
    prompt,
    explanation: String(raw.explanation || "由 AI 代理根据教材进度生成。").trim(),
    tags: ["ai", "smart", ...(Array.isArray(raw.tags) ? raw.tags.map(String) : []), ...(log.signals || []), ...(log.lesson ? ["lesson-" + log.lesson] : [])]
  };
  // P5: 保存 lesson 元数据
  if (log.lesson) base.lesson = log.lesson;
  if (log.lessonRange) base.lessonRange = log.lessonRange;
  // R3: 只有实际 lesson > 当前课次才标 preview，不要因为 previewLesson 存在就全标
  if (raw.preview !== undefined) {
    base.preview = Boolean(raw.preview);
  } else if (raw.lesson && log.lesson && Number(raw.lesson) > Number(log.lesson)) {
    base.preview = true;
  }
  if (raw.speak) base.speak = String(raw.speak);
  if (raw.context && (raw.context.body || raw.context.title)) {
    base.context = {
      title: String(raw.context.title || "AI 课文/长句"),
      body: Array.isArray(raw.context.body) ? raw.context.body.map(String) : [String(raw.context.body || "")],
      translation: String(raw.context.translation || ""),
      notes: Array.isArray(raw.context.notes) ? raw.context.notes.map(String) : []
    };
  }

  if (type === "choice") {
    const options = Array.isArray(raw.options) ? raw.options.map(String).filter(Boolean) : [];
    const answer = String(raw.answer || "");
    if (options.length < 2 || !options.includes(answer)) return null;
    return { ...base, options, answer };
  }
  if (type === "arrange") {
    const tokens = Array.isArray(raw.tokens) ? raw.tokens.map(String).filter(Boolean) : [];
    if (tokens.length < 2) return null;
    const answer = Array.isArray(raw.answer) && raw.answer.length ? raw.answer.map(String) : tokens;
    return { ...base, tokens, answer };
  }
  if (type === "self") {
    const checklist =
      Array.isArray(raw.checklist) && raw.checklist.length
        ? raw.checklist.map(String)
        : ["是否抓住要点", "是否能举一个例子", "是否能用自己的话说出来"];
    return { ...base, subprompt: String(raw.subprompt || "说完后自评。"), checklist, sample: String(raw.sample || raw.answer || "") };
  }
  // R4: reading AI 卡保留 lesson/lessonRange/preview/tags 元数据
  if (type === "reading") {
    var readingCard = normalizeReadingCard(raw);
    return {
      ...readingCard,
      id: base.id, aiSourceLogId: base.aiSourceLogId, sourceLogId: base.sourceLogId,
      lesson: base.lesson, lessonRange: base.lessonRange, preview: base.preview,
      tags: [...new Set([...(readingCard.tags || []), ...(base.tags || [])])]
    };
  }
  const answer = String(raw.answer || "").trim();
  if (!answer) return null;
  const accepted = Array.isArray(raw.accepted) && raw.accepted.length ? raw.accepted.map(String) : [answer];
  return { ...base, answer, accepted };
}

// ===== 应用更新（iOS 主屏 App 免删除重装）=====
// iPhone 上把网页「添加到主屏幕」后，App 是被"恢复"而不是重新打开的，页面可能好几天不重载，
// 所以光靠 network-first 的 SW 发现不了新版本。这里做三件事：
// ① 每次切回前台主动 registration.update() 查新版本；
// ② 新版本装好后停在 waiting，页面弹条提示；
// ③ 用户点「立即更新」→ 通知 SW skipWaiting → controllerchange 时自动刷新一次。
// 这样就不用删图标重装，token 也不会跟着 localStorage 一起丢。
let swRegistration = null;
let updateReady = false;
let updateReloading = false;

function isUpdateReady() { return updateReady; }

function markUpdateReady() {
  if (updateReady) return;
  updateReady = true;
  render();
}

function checkForAppUpdate(manual) {
  if (!swRegistration) {
    if (manual) showToast("当前环境不支持自动更新，请手动刷新页面");
    return;
  }
  if (manual) showToast("正在检查更新…");
  swRegistration.update()
    .then(function () {
      if (!manual) return;
      // update() 完成时新版本可能还在 installing，稍等一下再看结论
      setTimeout(function () {
        showToast(updateReady ? "发现新版本，点顶部横幅更新" : "已经是最新版本（" + APP_VERSION + "）");
      }, 1200);
    })
    .catch(function () { if (manual) showToast("检查更新失败，请确认网络"); });
}

function applyAppUpdate() {
  const waiting = swRegistration && swRegistration.waiting;
  if (!waiting) { location.reload(); return; }
  waiting.postMessage({ type: "SKIP_WAITING" });
  showToast("正在更新…");
  // 兜底：万一 controllerchange 没来，3 秒后强制刷新
  setTimeout(function () { if (!updateReloading) { updateReloading = true; location.reload(); } }, 3000);
}

function registerServiceWorker() {
  if (typeof navigator === "undefined" || typeof location === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  const secureEnough = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!secureEnough) return;

  // updateViaCache:"none" —— SW 脚本本身绝不走 HTTP 缓存，否则可能一直拿到旧的 service-worker.js
  navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" })
    .then(function (registration) {
      swRegistration = registration;
      if (registration.waiting && navigator.serviceWorker.controller) markUpdateReady();
      registration.addEventListener("updatefound", function () {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", function () {
          // controller 存在说明这是"升级"而不是首次安装，首次安装不该弹更新提示
          if (installing.state === "installed" && navigator.serviceWorker.controller) markUpdateReady();
        });
      });
    })
    .catch(function () { /* 不支持或注册失败时静默降级为普通网页 */ });

  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (updateReloading) return;
    updateReloading = true;
    location.reload();
  });

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") checkForAppUpdate(false);
    });
  }
  // 长时间开着不切走的情况，兜一次定时检查
  setInterval(function () { checkForAppUpdate(false); }, 30 * 60 * 1000);
}

if (typeof document !== "undefined") {
  render();
  registerServiceWorker();
  syncOnStartup();
  loadLocalTextbookReadings();
}

// 让纯逻辑可以在 Node 里被 require 进行单元测试（浏览器中 module 未定义，自动跳过）。
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
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
    vocabCatalog,
    grammarCatalog,
    pickDistractors,
    buildVocabCardsFromCatalog,
    buildGrammarCardsFromBank,
    buildLessonReadingCard,
    splitReadingCardBySentence,
    splitReadingCards,
    normalizeGrammarPattern,
    findGrammarPointIn,
    sameDayPlan,
    requeueForToday,
    sessionSizeForEnergy,
    defaultState,
    ensureLessonRecord,
    maybeAdvanceLesson,
    currentLessonState,
    applyLessonBaseline,
    MINNA_LESSON_BASELINE,
    lessonGateOk,
    japaneseReadingLabCards,
    aiReadingCards
  };
}
