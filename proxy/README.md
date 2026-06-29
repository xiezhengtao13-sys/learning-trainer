# 本地 AI 出题代理

这个小代理让学习程序可以"根据今日记录自动出题"，并支持在 **本地模型 / DeepSeek API** 之间切换。
DeepSeek 的 key 只留在你电脑上（不进前端、不进 GitHub、不进聊天）；本地模型则完全离线、不需要密钥。

## 工作方式

```
浏览器(学习程序)  --POST /generate {provider}-->  本地代理  --->  DeepSeek API  或  本机模型(Ollama 等)
       ^                                                                     |
       +---------------------- 返回校验后的题目 JSON ------------------------+
```

生成的题进入题库的 `generatedCards`，会**随 GitHub Gist 同步到手机**。正确用法是：
在**电脑上**生成题，手机在通勤时直接练。

## 准备

- Node 18 或更高（用到内置 fetch）。检查：`node --version`
- 二选一（或都配）：
  - **DeepSeek**：一个 DeepSeek API key。
  - **本地模型**：装 [Ollama](https://ollama.com)，`ollama serve` 后 `ollama pull qwen2.5`（或任意模型）。
    也可用 LM Studio 等任何 OpenAI 兼容的本地服务。

## 启动

在项目根目录：

**用 DeepSeek（PowerShell）**
```powershell
$env:DEEPSEEK_API_KEY="你的key"
node proxy/ai-proxy.mjs
```

**用本地模型（PowerShell）**
```powershell
$env:AI_PROVIDER="local"
node proxy/ai-proxy.mjs
```

**bash**
```bash
DEEPSEEK_API_KEY=你的key node proxy/ai-proxy.mjs      # DeepSeek
AI_PROVIDER=local node proxy/ai-proxy.mjs             # 本地模型
```

看到 `AI 出题代理已启动：http://127.0.0.1:8799` 即成功。
自检：浏览器打开 http://127.0.0.1:8799/health ，会列出两种来源是否就绪。

> 同时配好两种来源时，可以在网页里随时切换；`AI_PROVIDER` 只是默认值，前端选的来源会覆盖它。

## 在网页里用

1. 先在「今日记录」里写下今天学了什么、卡在哪，保存。
2. 在「AI 出题（本地代理）」面板里选 **出题来源**（本地模型 / DeepSeek），地址保持 `http://127.0.0.1:8799`。
3. 点「用今日记录生成题」。生成的题会加入题库并在下次同步时上传。

> **混合内容提示**：发布版网页是 HTTPS，部分浏览器（尤其 Safari）会拦截 HTTPS 页面访问本地 http 代理。
> 如果点了没反应，改用本地网页：在项目目录跑 `python -m http.server 8787`，浏览器打开
> `http://localhost:8787/`，再用 AI 出题即可（http→http，不会被拦）。Chrome 通常直接放行 127.0.0.1。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `AI_PROVIDER` | `deepseek` | 默认来源：`deepseek` 或 `local`（前端可覆盖） |
| `PORT` | `8799` | 代理端口 |
| `DEEPSEEK_API_KEY` | （用 DeepSeek 时必填） | 你的 key，只在本机环境变量里 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | DeepSeek 模型名 |
| `DEEPSEEK_API_URL` | `https://api.deepseek.com/chat/completions` | DeepSeek 接口 |
| `LOCAL_MODEL` | `qwen2.5` | 本地模型名 |
| `LOCAL_API_URL` | `http://127.0.0.1:11434/v1/chat/completions` | 本地 OpenAI 兼容接口（默认 Ollama） |

## 安全

- DeepSeek key 只从环境变量读取，代码和仓库里没有 key。
- 别把 key 写进文件后提交；如果你用 `.env`，仓库已在 `.gitignore` 忽略它。
- 代理只监听 `127.0.0.1`（本机），外部访问不到。
- 本地模型整条链路都在你电脑上，不联网、不需要密钥。
