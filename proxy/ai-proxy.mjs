// 本地 AI 出题代理：支持「本地模型 / DeepSeek API」切换。
// - DeepSeek：API key 只通过环境变量读取，绝不写进前端、仓库或聊天。
// - 本地模型：指向本机 OpenAI 兼容接口（默认 Ollama），不需要联网或密钥。
//
// 启动（PowerShell）：
//   用 DeepSeek：   $env:DEEPSEEK_API_KEY="你的key"; node proxy/ai-proxy.mjs
//   用本地模型：    $env:AI_PROVIDER="local"; node proxy/ai-proxy.mjs
//   （本地模型需先 `ollama serve` 并 `ollama pull qwen2.5`，或用 LM Studio 等）
//
// 来源也可由前端按请求指定（body.provider = "deepseek" | "local"），覆盖默认值。
// 需要 Node 18+（用到内置 fetch）。

import http from "node:http";

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
    model: process.env.LOCAL_MODEL || "qwen2.5",
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

function buildPrompt(body) {
  const { trackName = "学习", content = "", difficulty = "", form = "context", weakTags = [], count = 6 } = body || {};
  return `你是一个语言/哲学学习出题助手。请根据学习者今天的学习记录，生成 ${count} 道**原创**练习题，不要照抄任何教材正文。

科目：${trackName}
今天学了：${content || "（未填）"}
卡住的点：${difficulty || "（未填）"}
偏好形式：${form}
薄弱标签：${weakTags.join("、") || "（无）"}

要求：
- 紧扣"今天学了"和"卡住的点"。
- 多用填空(input)、组句(arrange)、自评复述(self)，少用纯选择(choice)。
- 每题给一句简短中文解释(explanation)。
- 适当为题目配 context（课文/长句 body[] + 译文 translation + 要点 notes[]），帮助在语境中记忆。
- choice 题的 answer 必须是 options 中的一项；arrange 的 answer 是正确顺序的 tokens 数组。
- 字符串内部不要出现真实换行，需要换行就拆成数组的多个元素。

只输出一个 JSON 对象，不要任何额外文字或 Markdown 代码块，格式：
{"cards":[
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
  return `请解析下面这句日语，面向以中文为母语的初级学习者。用简洁中文输出，分这几块（每块用小标题，之间空行）：
1. 假名读音：给整句标注假名。
2. 逐词拆解：每个词写「词 — 词性 — 意思」，一行一个。
3. 语法点：助词、动词变形、句型，挑重点讲。
4. 自然翻译：一句通顺的中文。
不要输出 JSON 或代码块，直接用纯文本和换行。

句子：${text}`;
}

function buildDiagnosisPrompt(body) {
  const { trackName = "日语", profile = {}, recentErrors = [], dailyLogs = [] } = body || {};
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
- patterns 列出2-4个最突出的弱点模式，每个都要引用具体数据
- recommendations 给2-4条可操作的具体建议，对齐发现的问题模式
- focusCards 给3-6道针对诊断出弱点的原创练习题，优先填空(input)和组句(arrange)类型
- 生成的 focusCards 要紧密结合日语课文/长句语境，不要孤立考词汇
- 只输出 JSON，不要 Markdown 代码块或额外文字`;
}

async function callModel(provider, systemPrompt, userPrompt, temperature = 0.7) {
  const apiRes = await fetch(provider.url, {
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
  if (!apiRes.ok) {
    const detail = await apiRes.text();
    const error = new Error(`${provider.name} ${apiRes.status}`);
    error.status = 502;
    error.detail = detail.slice(0, 500);
    throw error;
  }
  const data = await apiRes.json();
  return data?.choices?.[0]?.message?.content || "";
}

const server = http.createServer((req, res) => {
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
        local: { model: PROVIDERS.local.model, url: PROVIDERS.local.url, ready: true }
      }
    });
    return;
  }
  const isGenerate = req.method === "POST" && req.url.startsWith("/generate");
  const isAnalyze = req.method === "POST" && req.url.startsWith("/analyze");
  const isDiagnose = req.method === "POST" && req.url.startsWith("/diagnose");
  if (!isGenerate && !isAnalyze && !isDiagnose) {
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
      console.error(`[${isDiagnose ? "diagnose" : isAnalyze ? "analyze" : "generate"}] provider=${provider.name} 失败:`, error.message);
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
