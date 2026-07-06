// 本地 AI 出题代理：支持「本地模型 / DeepSeek API」切换。
// - DeepSeek：API key 只通过 .env 或环境变量读取，绝不写进前端或仓库。
// - 本地模型：指向本机 OpenAI 兼容接口（默认 Ollama），不需要联网或密钥。
//
// 启动（PowerShell）：
//   用 DeepSeek：   node proxy/ai-proxy.mjs（自动读取项目根目录 .env）
//   用本地模型：    $env:AI_PROVIDER="local"; node proxy/ai-proxy.mjs
//   （本地模型需先 `ollama serve` 并 `ollama pull deepseek-r1:8b`，或用 LM Studio 等）
//
// 来源也可由前端按请求指定（body.provider = "deepseek" | "local"），覆盖默认值。
// 需要 Node 18+（用到内置 fetch）。

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    if (process.env[key] !== undefined) continue;
    process.env[key] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(path.resolve(__dirname, "..", ".env"));

const PORT = Number(process.env.PORT || 8799);
const DEFAULT_PROVIDER = (process.env.AI_PROVIDER || "deepseek").toLowerCase();

const PROVIDERS = {
  deepseek: {
    url: process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    needsKey: true
  },
  local: {
    // 默认 Ollama 的 OpenAI 兼容接口；LM Studio 用 http://127.0.0.1:1234/v1/chat/completions
    url: process.env.LOCAL_API_URL || "http://127.0.0.1:11434/v1/chat/completions",
    model: process.env.LOCAL_MODEL || "deepseek-r1:8b",
    apiKey: process.env.LOCAL_API_KEY || "ollama", // Ollama 不校验，占位即可
    needsKey: false
  }
};

function resolveProvider(requested) {
  const name = (requested || DEFAULT_PROVIDER).toLowerCase();
  const cfg = PROVIDERS[name];
  if (!cfg) throw new Error(`未知的 provider：${name}（支持 deepseek / local）`);
  if (cfg.needsKey && !cfg.apiKey) throw new Error(`provider=${name} 缺少 API key，请设置环境变量 DEEPSEEK_API_KEY`);
  return { name, ...cfg };
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function send(res, status, obj) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

async function localProviderStatus() {
  try {
    const tagsUrl = PROVIDERS.local.url.replace(/\/v1\/chat\/completions\/?$/, "/api/tags");
    const response = await fetch(tagsUrl, { method: "GET" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const names = Array.isArray(data.models) ? data.models.map((item) => item.name).filter(Boolean) : [];
    return {
      model: PROVIDERS.local.model,
      url: PROVIDERS.local.url,
      ready: names.some((name) => name === PROVIDERS.local.model || name.startsWith(`${PROVIDERS.local.model}:`)),
      serviceReady: true,
      models: names.slice(0, 12)
    };
  } catch {
    return {
      model: PROVIDERS.local.model,
      url: PROVIDERS.local.url,
      ready: false,
      serviceReady: false,
      models: []
    };
  }
}

function buildPrompt(body) {
  const { trackName = "学习", content = "", difficulty = "", form = "context", weakTags = [], count = 6, n1Context = "" } = body || {};
  return `你是一个语言/哲学学习出题助手。请根据学习者今天的学习记录，生成 ${count} 道**原创**练习题，不要照抄任何教材正文或真题原文。

${n1Context ? `## 日语N1年度目标\n${n1Context}\n` : ""}
科目：${trackName}
今天学了：${content || "（未填）"}
卡住的点：${difficulty || "（未填）"}
偏好形式：${form}
薄弱标签：${weakTags.join("、") || "（无）"}

要求：
- 紧扣"今天学了"和"卡住的点"。
- 日语题优先服务一年通过N1：基础自动化、N2/N1文法接续、长句读解、听解影子跟读、输出复述。
- 日语优先生成 reading 类型短文卡：3-5句原创短文，每句带 kana、zh、grammar、words，帮助逐句解析和收藏生词。
- 如果今天内容很初级，把题做成「初级基础 → N1表达」的桥接题。
- 多用填空(input)、组句(arrange)、自评复述(self)，少用纯选择(choice)。
- 每题给一句简短中文解释(explanation)。
- 适当为题目配 context（课文/长句 body[] + 译文 translation + 要点 notes[]），帮助在语境中记忆。
- choice 题的 answer 必须是 options 中的一项；arrange 的 answer 是正确顺序的 tokens 数组。
- 字符串内部不要出现真实换行，需要换行就拆成数组的多个元素。

只输出一个 JSON 对象，不要任何额外文字或 Markdown 代码块，格式：
{"cards":[
  {"module":"jp-reading","type":"reading","prompt":"阅读短文：...","level":"N3 → N2","summary":"...","sentences":[{"jp":"...","kana":"...","zh":"...","grammar":["..."],"words":[{"text":"...","reading":"...","meaning":"...","tags":["n2"]}]}]},
  {"type":"input","prompt":"...","answer":"...","accepted":["..."],"explanation":"...","context":{"title":"...","body":["..."],"translation":"...","notes":["..."]}},
  {"type":"choice","prompt":"...","options":["A","B","C","D"],"answer":"A","explanation":"..."},
  {"type":"arrange","prompt":"...","tokens":["...","..."],"answer":["...","..."],"explanation":"..."},
  {"type":"self","prompt":"...","subprompt":"...","checklist":["...","..."],"sample":"...","explanation":"..."}
]}`;
}

// 把裸控制字符（小模型常在字符串里塞裸换行/制表符）替换为空格，避免 JSON.parse 失败。
function stripControlChars(input) {
  let out = "";
  for (let i = 0; i < input.length; i += 1) {
    out += input.charCodeAt(i) < 0x20 ? " " : input[i];
  }
  return out;
}

function extractJson(text) {
  // 去掉 think 模型的推理块（如 deepseek-r1 的 <think>...</think>）
  const cleaned = String(text).replace(/<think>[\s\S]*?<\/think>/gi, "");
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : cleaned;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("模型没有返回 JSON");
  // 容错：裸控制字符 -> 空格；去掉尾随逗号。
  const slice = stripControlChars(raw.slice(start, end + 1)).replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(slice);
}

function buildAnalyzePrompt(text) {
  return `学习者目标：一年内通过JLPT N1，但当前基础仍在初级阶段。请解析下面这句日语，既讲清当前句子，也指出它和N1读解/听解能力的关系。用简洁中文输出，分这几块（每块用小标题，之间空行）：
1. 假名读音：给整句标注假名。
2. 逐词拆解：每个词写「词 — 词性 — 意思」，一行一个。
3. 语法点：助词、动词变形、句型，挑重点讲。
4. N1连接：这句里哪个表达以后会在N1阅读/听力中反复出现。
5. 自然翻译：一句通顺的中文。
不要输出 JSON 或代码块，直接用纯文本和换行。

句子：${text}`;
}

function buildDiagnosisPrompt(body) {
  const { trackName = "日语", profile = {}, recentErrors = [], dailyLogs = [], n1Context = "" } = body || {};
  const errorReasons = (profile.errorReasons || []).map((r) => `${r.label}(${r.count}次)`).join("、");
  const tagReasons = (profile.tagReasons || []).map((r) => `${r.label}(${r.count}次)`).join("、");
  const weakTags = (profile.weakTags || []).join("、");
  const slowModules = (profile.slowModuleNames || []).join("、");
  const moduleRows = (profile.moduleRows || [])
    .map((r) => `- ${r.name}: 正确率${r.accuracy ?? "未练"}%, 到期${r.due}张, 均速${r.avgMs ? (r.avgMs / 1000).toFixed(1) + "秒" : "无"}`)
    .join("\n");
  const errorDetails = recentErrors
    .map((e) => `[${e.tags?.join(",") || ""}] Q:${e.prompt?.slice(0, 80)} | 正解:${e.answer?.slice(0, 40)} | 答:${e.userAnswer?.slice(0, 40)}`)
    .join("\n");
  const logSummaries = dailyLogs
    .map((l) => `${l.date}: ${(l.content || "").slice(0, 60)}${l.difficulty ? " / 难点:" + l.difficulty.slice(0, 40) : ""}`)
    .join("\n");

  return `你是经验丰富的语言学习诊断教练。请分析以下${trackName}学习数据，输出一份个性化的学习诊断。

${n1Context ? `## N1年度目标\n${n1Context}\n` : ""}

## 学习档案
- 错因归类（题组）：${errorReasons || "暂无"}
- 弱点细分（标签）：${tagReasons || "暂无"}
- 薄弱标签：${weakTags || "暂无"}
- 偏慢题组：${slowModules || "无"}
- 各题组数据：
${moduleRows}

## 最近错题（最多20条）
${errorDetails || "暂无错题记录"}

## 最近日志
${logSummaries || "暂无日志"}

## 要求
请扮演一位耐心、具体的日语教师（或语言教练），用中文给出诊断。只输出一个 JSON 对象，格式：
{
  "diagnosis": {
    "summary": "用2-4句话总结学习者的主要问题模式（具体、可操作，不要泛泛而谈）",
    "patterns": [
      {"category": "弱点类别名", "detail": "具体描述错误模式和可能的根因", "cards": ["相关卡片id"]}
    ],
    "recommendations": [
      "具体的改进建议1（可操作的练习策略）",
      "具体的改进建议2"
    ],
    "focusCards": [
      {"type":"choice|input|arrange|self","prompt":"针对弱点的练习题题干","options":["仅choice需要"],"answer":"正确答案","explanation":"解释","tokens":["仅arrange需要"],"accepted":["仅input需要"]}
    ]
  }
}

规则：
- patterns 列出2-4个最突出的弱点模式，每个都要引用具体数据，并说明它如何影响N1读解/听解
- recommendations 给2-4条可操作的具体建议，对齐发现的问题模式，必须能今天执行
- focusCards 给3-6道针对诊断出弱点的原创练习题，优先填空(input)、组句(arrange)、读解(choice)和输出复述(self)
- 生成的 focusCards 要紧密结合日语课文/长句语境，不要孤立考词汇；难度从当前基础向N1过渡
- 只输出 JSON，不要 Markdown 代码块或额外文字`;
}

function buildReadingChatPrompt(body) {
  const { question = "", reading = {}, learning = {} } = body || {};
  return `你是我的日语阅读教练。我正在用“阅读短文 + 逐句解析 + 收藏生词”的方式准备JLPT N1，但当前基础仍在初级到中级过渡。

请根据我的问题回答，必须贴合当前短文，不要泛泛讲课。

## 我的知识边界
${JSON.stringify(learning, null, 2)}

## 当前短文
${JSON.stringify(reading, null, 2)}

## 我的问题
${question}

回答要求：
- 用中文讲清楚，必要时保留日语例句。
- 如果问题涉及语法，说明接续、含义、常见误区。
- 如果问题涉及生词，给假名、中文、1个相近表达或反义表达。
- 最后给一个很短的“下一步练习”。`;
}

function buildReadingPassagePrompt(body) {
  const { learning = {} } = body || {};
  return `你是日语分级阅读编辑。请基于我的知识边界，创作一篇原创日语短文，作为下一张阅读训练卡。

## 我的知识边界
${JSON.stringify(learning, null, 2)}

要求：
- 难度从当前基础向N1推进，不要突然过难。
- 优先复现我标记忘记的词、薄弱助词/接续和当前N1阶段重点。
- 3-5句，每句自然、短而清楚。
- 每句必须给 kana、中文 zh、grammar 数组、words 数组。
- words 每项包含 text, reading, meaning, tags。
- 只输出 JSON，不要 Markdown。

格式：
{
  "card": {
    "prompt": "阅读短文：标题",
    "level": "N3 → N2",
    "summary": "这篇短文练什么",
    "sentences": [
      {
        "jp": "日语句子。",
        "kana": "假名读音。",
        "zh": "中文翻译。",
        "grammar": ["语法点1", "语法点2"],
        "words": [{"text":"単語","reading":"たんご","meaning":"单词","tags":["n2"]}]
      }
    ]
  }
}`;
}

async function callModel(provider, systemPrompt, userPrompt, temperature = 0.7) {
  if (provider.name === "local" && provider.url.includes("127.0.0.1:11434")) {
    return callOllamaNative(provider, systemPrompt, userPrompt, temperature);
  }

  let apiRes;
  try {
    apiRes = await fetch(provider.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature,
        stream: false
      })
    });
  } catch (cause) {
    const error = new Error(
      provider.name === "local"
        ? `本地模型连接失败：请先安装并启动 Ollama，再运行 ollama pull ${provider.model}。当前地址：${provider.url}`
        : `${provider.name} 连接失败：${cause.message || cause}`
    );
    error.status = 502;
    throw error;
  }
  if (!apiRes.ok) {
    const detail = await apiRes.text();
    const error = new Error(
      provider.name === "local" && apiRes.status === 404
        ? `本地模型 ${provider.model} 不存在，请先运行 ollama pull ${provider.model}`
        : `${provider.name} ${apiRes.status}`
    );
    error.status = 502;
    error.detail = detail.slice(0, 500);
    throw error;
  }
  const data = await apiRes.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callOllamaNative(provider, systemPrompt, userPrompt, temperature = 0.7) {
  const apiUrl = provider.url.replace(/\/v1\/chat\/completions\/?$/, "/api/chat");
  let apiRes;
  try {
    apiRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false,
        think: false,
        options: {
          temperature,
          num_predict: 1400
        }
      })
    });
  } catch (cause) {
    const error = new Error(`本地模型连接失败：请确认 Ollama 正在运行，且已安装 ${provider.model}。当前地址：${apiUrl}`);
    error.status = 502;
    throw error;
  }

  if (!apiRes.ok) {
    const detail = await apiRes.text();
    const error = new Error(
      apiRes.status === 404
        ? `本地模型 ${provider.model} 不存在，请先运行 ollama pull ${provider.model}`
        : `local ${apiRes.status}`
    );
    error.status = 502;
    error.detail = detail.slice(0, 500);
    throw error;
  }

  const data = await apiRes.json();
  const content = String(data?.message?.content || "").trim();
  if (content) return content;

  const thinking = String(data?.message?.thinking || "").trim();
  if (thinking) {
    const error = new Error(`本地 ${provider.model} 只返回了思考内容，没有返回正文。建议本次切回 DeepSeek API，或改用 qwen3:8b / gemma3:4b。`);
    error.status = 502;
    error.detail = thinking.slice(0, 300);
    throw error;
  }

  throw new Error(`本地 ${provider.model} 返回为空`);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "GET" && req.url.startsWith("/health")) {
    send(res, 200, {
      ok: true,
      defaultProvider: DEFAULT_PROVIDER,
      providers: {
        deepseek: { model: PROVIDERS.deepseek.model, ready: Boolean(PROVIDERS.deepseek.apiKey) },
        local: await localProviderStatus()
      }
    });
    return;
  }
  const isGenerate = req.method === "POST" && req.url.startsWith("/generate");
  const isAnalyze = req.method === "POST" && req.url.startsWith("/analyze");
  const isDiagnose = req.method === "POST" && req.url.startsWith("/diagnose");
  const isChat = req.method === "POST" && req.url.startsWith("/chat");
  const isReadingPassage = req.method === "POST" && req.url.startsWith("/reading-passage");
  if (!isGenerate && !isAnalyze && !isDiagnose && !isChat && !isReadingPassage) {
    send(res, 404, { error: "not found" });
    return;
  }

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 1_000_000) req.destroy();
  });
  req.on("end", async () => {
    let body;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return send(res, 400, { error: "请求体不是合法 JSON" });
    }

    let provider;
    try {
      provider = resolveProvider(body.provider);
    } catch (error) {
      return send(res, 400, { error: String(error.message || error) });
    }

    try {
      if (isChat) {
        const reply = await callModel(provider, "你是耐心、准确的日语阅读教练。", buildReadingChatPrompt(body), 0.35);
        const cleaned = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        console.log(`[chat] provider=${provider.name} -> ${cleaned.length} 字`);
        return send(res, 200, { reply: cleaned, provider: provider.name });
      }
      if (isReadingPassage) {
        const content = await callModel(provider, "你是日语分级阅读编辑，只输出 JSON。", buildReadingPassagePrompt(body), 0.55);
        const parsed = extractJson(content);
        console.log(`[reading-passage] provider=${provider.name}`);
        return send(res, 200, parsed);
      }
      if (isDiagnose) {
        const diagnosisContent = await callModel(provider, "你是经验丰富的语言学习诊断教练，只输出 JSON。", buildDiagnosisPrompt(body), 0.5);
        const parsed = extractJson(diagnosisContent);
        const diag = parsed.diagnosis || {};
        const focusCards = Array.isArray(diag.focusCards) ? diag.focusCards.slice(0, 6) : [];
        console.log(`[diagnose] provider=${provider.name} track=${body.track || "?"} -> ${diag.patterns?.length || 0} patterns, ${focusCards.length} focusCards`);
        return send(res, 200, {
          diagnosis: {
            summary: diag.summary || "",
            patterns: Array.isArray(diag.patterns) ? diag.patterns.slice(0, 4) : [],
            recommendations: Array.isArray(diag.recommendations) ? diag.recommendations.slice(0, 4) : [],
            focusCards
          },
          provider: provider.name
        });
      }
      if (isAnalyze) {
        const text = String(body.text || "").trim();
        if (!text) return send(res, 400, { error: "缺少要解析的 text" });
        const rawAnalysis = await callModel(provider, "你是耐心的日语老师，用中文为初级学习者讲解，忠实于给定句子。", buildAnalyzePrompt(text), 0.3);
        const analysis = rawAnalysis.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        console.log(`[analyze] provider=${provider.name} -> ${analysis.length} 字`);
        return send(res, 200, { analysis, provider: provider.name });
      }
      const content = await callModel(provider, "你是严谨的学习出题助手，只输出 JSON。", buildPrompt(body));
      const parsed = extractJson(content);
      const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
      console.log(`[generate] provider=${provider.name} track=${body.track || "?"} -> ${cards.length} 题`);
      send(res, 200, { cards, provider: provider.name });
    } catch (error) {
      console.error(`[${isChat ? "chat" : isReadingPassage ? "reading-passage" : isDiagnose ? "diagnose" : isAnalyze ? "analyze" : "generate"}] provider=${provider.name} 失败:`, error.message);
      send(res, error.status || 500, { error: String(error.message || error), detail: error.detail });
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`AI 出题代理已启动：http://127.0.0.1:${PORT}`);
  console.log(`默认来源：${DEFAULT_PROVIDER}`);
  console.log(`  - deepseek：${PROVIDERS.deepseek.model}（${PROVIDERS.deepseek.apiKey ? "key 已就绪" : "缺 DEEPSEEK_API_KEY"}）`);
  console.log(`  - local   ：${PROVIDERS.local.model} @ ${PROVIDERS.local.url}`);
  console.log(`健康检查：http://127.0.0.1:${PORT}/health`);
});
