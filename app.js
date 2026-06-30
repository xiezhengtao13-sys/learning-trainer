const STORAGE_KEY = "triad-learning-trainer-v1";
const DAY = 24 * 60 * 60 * 1000;

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

const tracks = [
  {
    id: "japanese",
    name: "日语",
    mark: "日",
    color: "#d05b4f",
    level: "初级 · Minna 1-15",
    summary: "从课文和长句里拆出词汇、语法和表达，少背孤立词。",
    modules: [
      { id: "jp-reading", name: "课文长句" },
      { id: "jp-vocab", name: "词汇反应" },
      { id: "jp-grammar", name: "语法选择" },
      { id: "jp-sentence", name: "组句" }
    ]
  },
  {
    id: "english",
    name: "英语",
    mark: "EN",
    color: "#286bb8",
    level: "IELTS 6.0 · 工程/AI",
    summary: "用工程和 AI 长句做精读、听说复述和学科词汇反应。",
    modules: [
      { id: "en-reading", name: "长句精读" },
      { id: "en-civil", name: "土木词汇" },
      { id: "en-ai", name: "AI 学术英语" },
      { id: "en-ielts", name: "雅思表达" },
      { id: "en-vocab", name: "生词本" }
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
    explanation: "はたらきます 是「工作」。常见句型：会社で はたらきます。"
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
    explanation: "借ります 是从别人那里借来；貸します 是把东西借给别人。"
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
    explanation: "使います 表示使用工具、设备、语言等。例：パソコンを使います。"
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
    explanation: "进入的目标常用 に：部屋に入ります。离开某处常用 を：部屋を出ます。"
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
    explanation: "请求别人做某事：动词て形 + ください。写在某个位置常用 に。"
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
    explanation: "许可表达：动词て形 + もいいですか。禁止是 てはいけません。"
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
    explanation: "正在进行：动词て形 + います。"
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
    explanation: "み/び/に 结尾的一类动词，て形常变为 んで：飲みます -> 飲んで。"
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
    explanation: "礼貌地请求不要做某事：ない形 + でください。"
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
    explanation: "と 表示一起行动的人；へ 表示移动方向。"
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
    explanation: "座る 的て形是 座って；许可询问用 てもいいですか。"
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
    id: "en-ielts-003",
    track: "english",
    module: "en-ielts",
    type: "self",
    prompt: "口语 45 秒：Describe a technology that helps engineers work more efficiently.",
    subprompt: "说完后按自己的表现评分。",
    checklist: [
      "是否说清楚这是什么技术",
      "是否给出一个工程场景",
      "是否用了 efficiency, accuracy, reduce errors 中至少一个表达"
    ],
    sample: "BIM helps engineers coordinate structural, architectural, and mechanical information in one model. It improves efficiency because conflicts can be found before construction starts.",
    speak: "Describe a technology that helps engineers work more efficiently.",
    explanation: "这个题目把技术、工程场景、优点三块说完整就够稳定。"
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
    tags: ["reading", "te-form", "vocab"]
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
    tags: ["reading", "te-form", "verb"]
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
    tags: ["reading", "long-sentence", "te-form"]
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
    explanation: "いそがしい 是「忙」。例：今日は仕事が忙しいです。"
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
    explanation: "便利（べんり）是「方便」。反义是 不便（ふべん）。"
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
    explanation: "安い（やすい）是「便宜」；注意和「安全」的汉字虽同，但读法不同。"
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
    explanation: "时间词：おととい(前天)・きのう(昨天)・きょう(今天)・あした(明天)・あさって(后天)。"
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
    explanation: "想做某事：动词ます形去ます + たいです。对象常用 が（用 を 也可以）。"
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
    explanation: "比较句：AはBより〜です，表示 A 比 B 更…。最后一项意思反了。"
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
    explanation: "一类动词 ない形：き→か + ない。行きます -> 行かない。"
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
    explanation: "できます（会／能）前面的对象用 が：日本語が できます。"
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
    explanation: "住む 用「〜ています」表示持续状态；居住地点用 に。"
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
    explanation: "と 表示一起做事的人；映画を見ます 是固定搭配。"
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
    explanation: "具体时间点用 に：7時に。毎朝 是频率词，不加 に。"
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
    explanation: "い形容词连接用「〜くて」：安い -> 安くて。"
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
    tags: ["reading", "te-form", "vocab"]
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
    tags: ["reading", "te-form", "verb"]
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
    tags: ["reading", "long-sentence", "te-form"]
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
    id: "en-ielts-006",
    track: "english",
    module: "en-ielts",
    type: "self",
    prompt: "口语 45 秒：Describe a place where you often study and why you like it.",
    subprompt: "说完后按自己的表现评分。",
    checklist: [
      "是否说清是什么地方",
      "是否给出两个具体原因",
      "是否用了 quiet, convenient, focus 中至少一个表达"
    ],
    sample: "I often study in the university library because it is quiet and well-equipped. The reading area helps me focus, and I can borrow reference books whenever I need them.",
    speak: "Describe a place where you often study and why you like it.",
    explanation: "地点 + 两个原因 + 一个具体细节，结构稳，时间也够。"
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
    explanation: "教えます（おしえます）表示教授。例：先生は日本語を教えます。"
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
    explanation: "暇（ひま）是「空闲」，反义是 忙しい（いそがしい）。"
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
    explanation: "便利（べんり）⇔ 不便（ふべん）。"
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
    explanation: "有生命的（人、动物）用 います；无生命的用 あります。存在地点用 に。"
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
    explanation: "ます的过去否定：ます -> ませんでした。行きます -> 行きませんでした。"
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
    explanation: "い形容词过去式：楽しい -> 楽しかったです（不是「楽しいでした」）。"
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
    explanation: "静か 是な形容词，直接 + です：静かです（没有 い）。"
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
    explanation: "好き・嫌い・上手・下手 前面的对象用 が。"
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
    explanation: "想要某物：〜が ほしいです。形容词 新しい 直接修饰名词。"
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
    explanation: "提议一起做某事：动词ます形去ます + ましょう。"
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
    explanation: "去做某活动：〜に行きます。旅行に行きます = 去旅行。"
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
    tags: ["reading", "te-form", "transport"]
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
    tags: ["reading", "te-form", "verb"]
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
    tags: ["reading", "long-sentence", "te-form"]
  },
  {
    id: "jp-reading-010",
    track: "japanese",
    module: "jp-reading",
    type: "self",
    prompt: "用日语说说你的一天：几点起床、有没有吃早饭、怎么去学校或公司。",
    subprompt: "说完后按流利度评分。",
    context: {
      title: "小课文：田中さんの一日",
      body: [
        "田中さんは毎朝6時半に起きます。",
        "朝ごはんを食べてから、駅まで歩いて、電車で会社へ行きます。",
        "仕事は9時に始まって、6時に終わります。"
      ],
      translation: "田中每天早上六点半起床。吃完早饭后，走到车站，坐电车去公司。工作九点开始，六点结束。",
      notes: ["可以套用课文的句型", "重点练 〜てから 和 で（交通手段）"]
    },
    checklist: ["是否说出起床时间", "是否用了〜てから 或 で（交通手段）", "是否说了到达的地方"],
    sample: "わたしは毎朝7時に起きます。朝ごはんを食べてから、電車で学校へ行きます。",
    explanation: "把课文换成自己的信息说一遍，是把句型变成自己能用的最快方式。",
    tags: ["reading", "speaking", "te-form"]
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
    id: "en-ielts-009",
    track: "english",
    module: "en-ielts",
    type: "self",
    prompt: "Task 1 口语 30 秒：用一句话概括一张折线图的总体趋势（例如气温逐年上升）。",
    subprompt: "说完后按清晰度评分。",
    checklist: [
      "是否先给 overview（总体趋势）",
      "是否用了 rise / increase / upward trend 等词",
      "是否提到时间范围"
    ],
    sample: "Overall, the temperature showed an upward trend, rising steadily between 2000 and 2020.",
    speak: "Overall, the temperature showed an upward trend, rising steadily between 2000 and 2020.",
    explanation: "Task 1 先说总体趋势（overview），再用一个趋势动词和时间范围支撑。"
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
  }
];

function defaultState() {
  return {
    activeTrack: "japanese",
    activeModule: "all",
    activeView: "practice",
    mode: "due",
    dailyGoal: 18,
    activeCommuteSegment: "platform",
    progress: {},
    customCards: [],
    generatedCards: [],
    analyses: {},
    dailyLogs: [],
    history: [],
    queue: [],
    currentId: null,
    selected: null,
    typed: "",
    arranged: [],
    tokenOrder: [],
    cardShownAt: 0,
    analysisOpen: false,
    analyzing: false,
    submitted: false,
    lastResult: null,
    sampleOpen: false,
    translationOpen: false,
    syncText: "",
    syncMessage: "",
    toast: "",
    aiProxyUrl: "http://127.0.0.1:8799",
    aiProvider: "deepseek",
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
    return { ...base, ...saved, gitSync: { ...base.gitSync, ...(saved.gitSync || {}) }, queue: [], currentId: null, activeView: "practice" };
  } catch {
    return defaultState();
  }
}

function saveState() {
  const { queue, currentId, selected, typed, arranged, tokenOrder, cardShownAt, analysisOpen, analyzing, submitted, lastResult, sampleOpen, translationOpen, syncText, syncMessage, aiMessage, toast, ...persisted } = state;
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

function allCards() {
  return [...cards, ...state.customCards, ...state.generatedCards];
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
  while (tries < 6 && order.every((value, index) => value === index)) {
    order = shuffle(base);
    tries += 1;
  }
  return order;
}

function buildQueue(mode = state.mode) {
  state.mode = mode;
  const pool = filteredCards();
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

function getCommuteSegment(id = state.activeCommuteSegment) {
  return commuteSegments.find((segment) => segment.id === id) || commuteSegments[0];
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

function buildSmartQueue(pool, profile) {
  const seen = new Set();
  const queue = [];
  const available = pool.filter(isAvailable);
  const due = available.filter((card) => cardProgress(card.id) && isDue(card));
  const todayExact = available.filter((card) => card.sourceLogId === profile.dailyLog?.id);
  const todaySignal = available.filter((card) => cardMatchesSignals(card, profile.dailySignals));
  const today = [...todayExact, ...todaySignal];
  const weak = available
    .filter((card) => weakScore(card) > 0 || profile.weakTags.some((tag) => cardTags(card).includes(tag)))
    .sort((a, b) => weakScore(b) - weakScore(a));
  const preferred = available.filter((card) => preferredCard(card, profile.preferredForm));
  const newContext = available.filter((card) => !cardProgress(card.id) && card.context);
  const slowSet = new Set(profile.slowModules || []);
  const slow = available.filter((card) => slowSet.has(card.module));
  const remaining = shuffle(available);
  const slots = smartSlots(profile.sessionSize, profile.dailyLog);

  pushBucket(queue, due, seen, slots.due);
  pushBucket(queue, slow, seen, slots.slow);
  pushBucket(queue, today, seen, slots.today);
  pushBucket(queue, weak, seen, slots.weak);
  pushBucket(queue, preferred, seen, slots.preferred);
  pushBucket(queue, newContext, seen, slots.newContext);
  pushBucket(queue, remaining, seen, profile.sessionSize);
  return queue;
}

function smartSlots(sessionSize, log) {
  const hasDailyLog = Boolean(log?.content || log?.difficulty);
  return {
    due: Math.max(2, Math.round(sessionSize * 0.3)),
    slow: Math.max(2, Math.round(sessionSize * 0.18)),
    today: hasDailyLog ? Math.max(3, Math.round(sessionSize * 0.28)) : Math.max(1, Math.round(sessionSize * 0.12)),
    weak: Math.max(2, Math.round(sessionSize * 0.22)),
    preferred: Math.max(2, Math.round(sessionSize * 0.14)),
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
  const sessionSize = sessionSizeForEnergy(dailyLog?.energy);

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
      due: moduleCards.filter(isDue).length
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
  const focusModule = weakModule?.id || readingModule || unseenModule?.id || "all";

  const strategy = [
    `保底复习：先处理到期卡，避免遗忘滚大`,
    dailyLog ? `今日内容：围绕「${shortText(dailyLog.content || dailyLog.difficulty || "今日记录", 22)}」出题` : "今日内容：还没有记录，先用课文长句建立语境",
    weakTags.length ? `弱项修补：优先 ${weakTags.join("、")}` : "弱项修补：先积累几次答题数据",
    `形式偏好：今天偏向 ${formLabel(preferredForm)}`,
    `强度：${sessionSize} 题左右`,
    slowModuleNames.length ? `节奏：${slowModuleNames.join("、")} 今天偏慢，已多排练习` : ""
  ].filter(Boolean);

  let advice = dailyLog
    ? `今天按「${formLabel(preferredForm)}」来练，先贴近你记录的学习内容，再穿插到期复习和弱项。`
    : "先记录今天学了什么，智能推荐会更像给你定制，而不是泛泛地抽题。";
  if (attempts.length >= 6 && weakTags.length && dailyLog) {
    advice = `今天重点是「${formLabel(preferredForm)}」加弱项 ${weakTags.join("、")}，推荐队列会先放今日内容和错题变体。`;
  } else if (attempts.length >= 6 && moduleRows.every((row) => row.accuracy === null || row.accuracy >= 80)) {
    advice = "当前正确率不错，可以增加未见长句和自评复述题，别只停在会选答案。";
  }

  return {
    track,
    attempts,
    weakTags,
    moduleRows,
    focusModule,
    dailyLog,
    dailySignals,
    preferredForm,
    sessionSize,
    slowModules,
    slowModuleNames,
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
  const card = getCard();
  state.tokenOrder = card && card.type === "arrange" ? shuffledOrder(card.tokens.length) : [];
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
  const goal = state.dailyGoal > 0 ? state.dailyGoal : defaultState().dailyGoal;
  const goalDone = Math.min(today.length, goal);
  const goalPercent = Math.round((goalDone / goal) * 100);
  document.documentElement.style.setProperty("--track-color", track.color);

  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <h1>三线学习训练器</h1>
        <p>课文、长句、错题，随手练。</p>
      </div>
      <nav class="track-list" aria-label="学习科目">
        ${tracks.map(renderTrackButton).join("")}
      </nav>
      <section class="side-section" data-view="practice">
        <h2>题组</h2>
        <div class="module-list">
          ${trackCardsByModule(track).map(renderModuleButton).join("")}
        </div>
      </section>
      <section class="side-section" data-view="practice">
        <h2>模式</h2>
        <div class="mode-row">
          ${renderModeButton("due", "今日到期")}
          ${renderModeButton("adaptive", "智能推荐")}
          ${renderModeButton("weak", "弱项加练")}
          ${renderModeButton("mix", "混合挑战")}
        </div>
      </section>
    </aside>
    <main class="main">
      <header class="topbar" data-view="practice">
        <div>
          <h2>${escapeHtml(track.name)}</h2>
          <p>${escapeHtml(track.summary)}</p>
          <button class="plain-button primary mobile-start" data-action="adaptive-start">开始智能练习</button>
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
      </header>
      ${renderCommutePanel()}
      <div class="grid">
        ${renderPracticeCard()}
        <div class="side-stack">
          ${renderDailyPanel()}
          ${renderVocabPanel()}
          ${renderAiPanel()}
          ${renderStatsPanel(stats)}
          ${renderProfilePanel()}
          ${renderWeakPanel()}
          ${renderHistoryPanel()}
          ${renderCustomPanel()}
          ${renderSyncPanel()}
        </div>
      </div>
    </main>
    ${renderTabbar()}
    ${state.toast ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>` : ""}
  `;

  app.dataset.view = state.activeView || "practice";
  bindEvents();
}

function renderTabbar() {
  return `
    <nav class="tabbar" aria-label="主导航">
      ${renderTab("practice", "练习", "✎")}
      ${renderTab("today", "今日", "◐")}
      ${renderTab("progress", "进度", "▲")}
      ${renderTab("settings", "设置", "⚙")}
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

function renderCommutePanel() {
  const active = getCommuteSegment();
  return `
    <section class="commute-panel" data-view="practice">
      <div class="commute-head">
        <div>
          <h3>通勤模式</h3>
          <p>南与野 → 赤羽 → 王子 → 东大前</p>
        </div>
        <button class="plain-button primary commute-start" data-action="commute-start" data-segment="${active.id}">开始本段</button>
      </div>
      <div class="commute-route" aria-label="通勤路线">
        ${commuteSegments.map(renderCommuteButton).join("")}
      </div>
      <p class="commute-hint">${escapeHtml(active.hint)} · 约 ${active.size} 题</p>
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
          ${card.track === "japanese" ? `<button class="icon-button" data-action="analyze" title="本地模型解析这句日语">解析</button>` : ""}
          ${card.speak ? `<button class="icon-button" data-action="speak" title="朗读">听</button>` : ""}
          <button class="icon-button" data-action="skip" title="跳过">跳</button>
        </div>
      </div>
      <div class="card-body">
        ${renderContextBlock(card)}
        <h3 class="prompt">${escapeHtml(card.prompt)}</h3>
        ${card.subprompt ? `<p class="subprompt">${escapeHtml(card.subprompt)}</p>` : ""}
        ${renderAnswerArea(card)}
        ${renderFeedback(card)}
        ${renderAnalysisBlock(card)}
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
    self: "自评"
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
      <div class="context-text">
        ${body.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </div>
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

function renderAnswerArea(card) {
  if (card.type === "choice") {
    return `
      <div class="answer-area">
        ${card.options.map((option) => renderOption(card, option)).join("")}
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

function renderAnalysisBlock(card) {
  if (card.track !== "japanese") return "";
  if (state.analyzing) {
    return `<div class="feedback analysis"><strong>本地模型解析中…</strong>正在解析这句日语，请稍候。</div>`;
  }
  const cached = state.analyses?.[card.id];
  if (!state.analysisOpen || !cached) return "";
  return `
    <div class="feedback analysis">
      <strong>日语解析（${escapeHtml(cached.provider === "deepseek" ? "DeepSeek" : "本地模型")}）</strong>
      <div class="analysis-text">${escapeHtml(cached.text).replace(/\n/g, "<br>")}</div>
    </div>
  `;
}

function japaneseTextFor(card) {
  if (card.speak) return String(card.speak);
  if (card.context?.body) {
    return Array.isArray(card.context.body) ? card.context.body.join(" ") : String(card.context.body);
  }
  if (card.type === "arrange" && Array.isArray(card.answer)) return card.answer.join("");
  return String(card.prompt || "");
}

async function analyzeCurrentCard() {
  const card = getCard();
  if (!card || card.track !== "japanese") return;
  // 已有解析：切换显示/隐藏
  if (state.analyses?.[card.id]) {
    state.analysisOpen = !state.analysisOpen;
    render();
    return;
  }
  const text = japaneseTextFor(card);
  if (!text) {
    showToast("这张卡没有可解析的日语句子");
    return;
  }
  const url = String(state.aiProxyUrl || "").replace(/\/+$/, "");
  if (!url) {
    showToast("请先在「今日」里填本地代理地址");
    return;
  }
  state.analyzing = true;
  state.analysisOpen = true;
  render();
  try {
    const response = await fetch(`${url}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "local", text })
    });
    if (!response.ok) throw new Error(`代理返回 ${response.status}`);
    const payload = await response.json();
    const analysisText = String(payload.analysis || "").trim();
    if (!analysisText) throw new Error("解析为空");
    state.analyses = {
      ...state.analyses,
      [card.id]: { text: analysisText, provider: payload.provider || "local", at: new Date().toISOString() }
    };
    state.analyzing = false;
    state.analysisOpen = true;
    saveState();
    render();
    scheduleCloudSync();
  } catch (error) {
    state.analyzing = false;
    render();
    showToast(`解析失败：${error.message}。需要本地代理在运行（用 http://localhost 打开网页更稳）。`);
  }
}

function renderFooter(card) {
  if (state.submitted || card.type === "self") {
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
  return `
    <section class="custom-panel daily-panel" data-view="today">
      <h3 class="panel-title">今日记录</h3>
      <form data-action="daily-form">
        <label>
          今天学了什么
          <textarea name="content" placeholder="例：第15课 てもいいですか / 土木 settlement 长句 / 事实与对象" required>${escapeHtml(log?.content || "")}</textarea>
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
          <textarea name="difficulty" placeholder="例：て形变化慢；overfitting/generalize 不会用；事实和对象容易混">${escapeHtml(log?.difficulty || "")}</textarea>
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
            return `<li><span>${escapeHtml(row.name)}</span><b>${score}</b><small>未见 ${row.unseen} · 到期 ${row.due}${speed}</small></li>`;
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
    } else if (action === "ai-url") {
      element.addEventListener("input", (event) => {
        state.aiProxyUrl = event.target.value.trim();
      });
    } else if (action === "ai-provider") {
      element.addEventListener("change", (event) => {
        state.aiProvider = event.target.value;
        saveState();
      });
    } else if (action === "sync-text") {
      element.addEventListener("input", (event) => {
        state.syncText = event.target.value;
      });
    } else if (action === "github-token") {
      element.addEventListener("input", (event) => {
        state.gitSync.token = event.target.value.trim();
      });
    } else if (action === "github-gist-id") {
      element.addEventListener("input", (event) => {
        state.gitSync.gistId = event.target.value.trim();
      });
    } else if (action === "github-filename") {
      element.addEventListener("input", (event) => {
        state.gitSync.filename = event.target.value.trim() || "triad-learning-data.json";
      });
    } else if (action === "github-auto") {
      element.addEventListener("change", (event) => {
        state.gitSync.auto = event.target.checked;
        saveState();
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
    saveState();
    render();
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
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

  if (action === "adaptive-start") {
    buildQueue("adaptive");
    return;
  }

  if (action === "commute-segment") {
    state.activeCommuteSegment = button.dataset.segment;
    saveState();
    render();
    return;
  }

  if (action === "commute-start") {
    buildCommuteQueue(button.dataset.segment);
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

  if (action === "export-data") {
    exportDataToText();
    render();
    return;
  }

  if (action === "copy-data") {
    copySyncText();
    return;
  }

  if (action === "download-data") {
    downloadSyncText();
    return;
  }

  if (action === "import-data") {
    importDataFromText();
    return;
  }

  if (action === "save-github-sync") {
    saveGitSyncConfig();
    return;
  }

  if (action === "create-gist") {
    createGitHubGist();
    return;
  }

  if (action === "sync-github") {
    syncWithGitHub();
    return;
  }

  if (action === "pull-github") {
    pullFromGitHub();
    return;
  }

  if (action === "push-github") {
    pushToGitHub();
    return;
  }

  if (action === "ai-generate") {
    generateAiCards();
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
  const correct = card.type === "self" ? rating !== "again" : Boolean(state.lastResult?.correct);
  // 学习速度：本张卡从出现到评分的耗时（毫秒），上限 5 分钟，避免把放下手机的发呆算进去。
  const ms = state.cardShownAt ? Math.min(Date.now() - state.cardShownAt, 5 * 60 * 1000) : null;
  schedule(card, rating, correct);
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
  state.history = state.history.slice(-400);
  moveNext(true);
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

  if (rating === "again") {
    progress.interval = 0;
    progress.ease = Math.max(1.3, progress.ease - 0.2);
    progress.lapses += 1;
    progress.due = Date.now() + 10 * 60 * 1000;
  } else if (rating === "hard") {
    progress.interval = Math.max(1, Math.round((progress.interval || 1) * 1.35));
    progress.ease = Math.max(1.3, progress.ease - 0.05);
    progress.due = Date.now() + progress.interval * DAY;
  } else {
    progress.interval = progress.interval ? Math.round(progress.interval * progress.ease) : 1;
    progress.ease = Math.min(3.1, progress.ease + 0.05);
    progress.due = Date.now() + progress.interval * DAY;
  }

  progress.lastSeen = Date.now();
  state.progress[card.id] = progress;
}

function moveNext(removeCurrent) {
  if (removeCurrent && state.currentId) {
    state.queue = state.queue.filter((id) => id !== state.currentId);
  } else if (state.currentId) {
    const current = state.currentId;
    state.queue = state.queue.filter((id) => id !== current);
    state.queue.push(current);
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
  const utterance = new SpeechSynthesisUtterance(card.speak || contextSpeakText(card.context) || card.prompt);
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

  state.customCards.push({
    id: `vocab-${Date.now()}`,
    track: "english",
    module: "en-vocab",
    type: "input",
    word,
    prompt: `「${word}」是什么意思？（中文）`,
    answer: meaning,
    accepted: [meaning],
    speak: word,
    context: example ? { title: "例句", body: [example], translation: "", notes: [] } : undefined,
    explanation: `生词：${word} = ${meaning}`,
    tags: ["vocab", "custom", "english"]
  });
  form.reset();
  saveState();
  render();
  scheduleCloudSync();
  showToast(`已加入生词：${word}`);
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
  const { queue, currentId, selected, typed, arranged, tokenOrder, cardShownAt, analysisOpen, analyzing, submitted, lastResult, sampleOpen, translationOpen, syncText, syncMessage, aiMessage, toast, ...persisted } = state;
  return {
    ...persisted,
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
  state.history = mergeHistory(state.history, incoming.history || []).slice(-600);
  state.analyses = { ...(state.analyses || {}), ...(incoming.analyses || {}) };
  state.dailyGoal = Number(incoming.dailyGoal || state.dailyGoal) || state.dailyGoal;
  state.activeCommuteSegment = incoming.activeCommuteSegment || state.activeCommuteSegment;
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
  const log = latestDailyLog(state.activeTrack);
  const provider = state.aiProvider || "deepseek";
  return `
    <section class="custom-panel ai-panel" data-view="today">
      <h3 class="panel-title">AI 出题（本地代理）</h3>
      <p class="daily-meta">在电脑上跑一个本地代理，就能根据「今日记录」自动生成题目，可切换「本地模型 / DeepSeek」。生成的题进入题库，并会随 Gist 同步到手机。密钥只在你电脑上，不进前端、不进聊天。</p>
      <div class="form-grid">
        <label>
          出题来源
          <select data-action="ai-provider">
            ${renderSelectOption("deepseek", "DeepSeek API", provider)}
            ${renderSelectOption("local", "本地模型", provider)}
          </select>
        </label>
        <label>
          本地代理地址
          <input data-action="ai-url" value="${escapeHtml(state.aiProxyUrl || "")}" placeholder="http://127.0.0.1:8799" autocomplete="off" />
        </label>
      </div>
      <button class="plain-button primary full-button" data-action="ai-generate" ${log ? "" : "disabled"}>
        ${log ? `用「${escapeHtml(getTrack(state.activeTrack).name)}」今日记录生成题` : "请先保存今日记录"}
      </button>
      <p class="daily-meta">${escapeHtml(state.aiMessage || "需要先在电脑上启动 proxy/ai-proxy.mjs（见 proxy/README.md）。")}</p>
    </section>
  `;
}

function renderVocabPanel() {
  if (state.activeTrack !== "english") return "";
  const words = state.customCards.filter((card) => card.module === "en-vocab");
  const recent = words.slice(-6).reverse().map((card) => card.word).filter(Boolean);
  return `
    <section class="custom-panel vocab-panel" data-view="today">
      <h3 class="panel-title">英语生词本</h3>
      <p class="daily-meta">把今天遇到的生词加进来，会自动变成填空复习题，并进入智能推荐和同步。</p>
      <form data-action="vocab-form">
        <div class="form-grid">
          <label>单词<input name="word" required placeholder="settlement" autocomplete="off" /></label>
          <label>释义<input name="meaning" required placeholder="沉降" autocomplete="off" /></label>
        </div>
        <label>例句（可选）<input name="example" placeholder="The foundation showed excessive settlement." autocomplete="off" /></label>
        <button class="plain-button primary full-button" type="submit">加入生词本</button>
      </form>
      <p class="daily-meta">已收 ${words.length} 个生词。${recent.length ? `最近：${escapeHtml(recent.join("、"))}` : ""}</p>
    </section>
  `;
}

async function generateAiCards() {
  const log = latestDailyLog(state.activeTrack);
  if (!log) {
    state.aiMessage = "请先在「今日记录」里保存今天学了什么。";
    render();
    return;
  }
  const url = String(state.aiProxyUrl || "").replace(/\/+$/, "");
  if (!url) {
    state.aiMessage = "请先填写本地代理地址，例如 http://127.0.0.1:8799。";
    render();
    return;
  }
  state.aiMessage = "正在请求本地代理生成题目...";
  render();
  try {
    const profile = learningProfile(state.activeTrack);
    const response = await fetch(`${url}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: state.aiProvider || "deepseek",
        track: state.activeTrack,
        trackName: getTrack(state.activeTrack).name,
        content: log.content || "",
        difficulty: log.difficulty || "",
        form: log.form || "context",
        signals: log.signals || [],
        weakTags: profile.weakTags,
        count: 6
      })
    });
    if (!response.ok) throw new Error(`代理返回 ${response.status}`);
    const payload = await response.json();
    const incoming = Array.isArray(payload.cards) ? payload.cards : [];
    const cards = incoming.map((card, index) => normalizeAiCard(card, log, index)).filter(Boolean);
    if (!cards.length) throw new Error("没有解析到有效题目，可重试一次");
    state.generatedCards = [
      ...state.generatedCards.filter((card) => card.aiSourceLogId !== log.id),
      ...cards
    ].slice(-160);
    state.aiMessage = `已用「${payload.provider === "local" ? "本地模型" : "DeepSeek"}」生成 ${cards.length} 道题，加入题库；下次同步会上传到手机。`;
    saveState();
    buildQueue("adaptive");
    scheduleCloudSync();
  } catch (error) {
    state.aiMessage = `生成失败：${error.message}。请确认本地代理在运行、地址正确；HTTPS 页面调本地 http 可能被拦，可改用 http://localhost 打开网页。`;
    render();
  }
}

function normalizeAiCard(raw, log, index) {
  if (!raw || typeof raw !== "object") return null;
  const track = getTrack(log.track);
  const moduleId =
    track.modules.find((module) => module.id === raw.module)?.id ||
    track.modules.find((module) => /reading|passage/.test(module.id))?.id ||
    track.modules[0]?.id ||
    "custom";
  const type = ["choice", "input", "arrange", "self"].includes(raw.type) ? raw.type : "input";
  const prompt = String(raw.prompt || "").trim();
  if (!prompt) return null;

  const base = {
    id: `ai-${log.track}-${Date.now()}-${index}`,
    aiSourceLogId: log.id,
    sourceLogId: log.id,
    track: log.track,
    module: moduleId,
    type,
    prompt,
    explanation: String(raw.explanation || "由本地 AI 代理根据今日记录生成。").trim(),
    tags: ["ai", "daily", ...(Array.isArray(raw.tags) ? raw.tags.map(String) : []), ...(log.signals || [])]
  };
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
  const answer = String(raw.answer || "").trim();
  if (!answer) return null;
  const accepted = Array.isArray(raw.accepted) && raw.accepted.length ? raw.accepted.map(String) : [answer];
  return { ...base, answer, accepted };
}

function registerServiceWorker() {
  if (typeof navigator === "undefined" || typeof location === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  const secureEnough = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!secureEnough) return;
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}

if (typeof document !== "undefined") {
  render();
  registerServiceWorker();
  syncOnStartup();
}

// 让纯逻辑可以在 Node 里被 require 进行单元测试（浏览器中 module 未定义，自动跳过）。
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalize,
    shuffle,
    extractLearningSignals,
    splitLearningLines,
    mergeById,
    mergeProgress,
    mergeHistory
  };
}
