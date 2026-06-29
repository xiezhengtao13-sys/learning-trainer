// 本地 DeepSeek 出题代理。仅在你自己的电脑上运行，API key 只通过环境变量读取，
// 绝不写进前端、仓库或聊天。
//
// 启动（PowerShell）：
//   $env:DEEPSEEK_API_KEY="你的key"; node proxy/deepseek-proxy.mjs
// 启动（bash）：
//   DEEPSEEK_API_KEY=你的key node proxy/deepseek-proxy.mjs
//
// 需要 Node 18+（用到内置 fetch）。

import http from "node:http";

const PORT = Number(process.env.PORT || 8799);
const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

if (!API_KEY) {
  console.error("[错误] 缺少环境变量 DEEPSEEK_API_KEY。");
  console.error("  PowerShell:  $env:DEEPSEEK_API_KEY=\"你的key\"; node proxy/deepseek-proxy.mjs");
  console.error("  bash:        DEEPSEEK_API_KEY=你的key node proxy/deepseek-proxy.mjs");
  process.exit(1);
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

只输出一个 JSON 对象，不要任何额外文字或 Markdown 代码块，格式：
{"cards":[
  {"type":"input","prompt":"...","answer":"...","accepted":["..."],"explanation":"...","context":{"title":"...","body":["..."],"translation":"...","notes":["..."]}},
  {"type":"choice","prompt":"...","options":["A","B","C","D"],"answer":"A","explanation":"..."},
  {"type":"arrange","prompt":"...","tokens":["...","..."],"answer":["...","..."],"explanation":"..."},
  {"type":"self","prompt":"...","subprompt":"...","checklist":["...","..."],"sample":"...","explanation":"..."}
]}`;
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("模型没有返回 JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "GET" && req.url.startsWith("/health")) {
    send(res, 200, { ok: true, model: MODEL });
    return;
  }
  if (req.method !== "POST" || !req.url.startsWith("/generate")) {
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
    try {
      const apiRes = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "你是严谨的学习出题助手，只输出 JSON。" },
            { role: "user", content: buildPrompt(body) }
          ],
          temperature: 0.7,
          stream: false
        })
      });
      if (!apiRes.ok) {
        const detail = await apiRes.text();
        return send(res, 502, { error: `DeepSeek ${apiRes.status}`, detail: detail.slice(0, 500) });
      }
      const data = await apiRes.json();
      const text = data?.choices?.[0]?.message?.content || "";
      const parsed = extractJson(text);
      const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
      console.log(`[generate] track=${body.track || "?"} -> ${cards.length} 题`);
      send(res, 200, { cards });
    } catch (error) {
      console.error("[generate] 失败:", error.message);
      send(res, 500, { error: String(error.message || error) });
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`DeepSeek 代理已启动：http://127.0.0.1:${PORT}`);
  console.log(`模型：${MODEL}  |  健康检查：http://127.0.0.1:${PORT}/health`);
});
