# 本地 DeepSeek 出题代理

这个小代理让学习程序可以"根据今日记录自动出题"，同时保证 **API key 只留在你电脑上**，不进前端、不进 GitHub、不进聊天。

## 工作方式

```
浏览器(学习程序)  --POST /generate-->  本地代理(读 DEEPSEEK_API_KEY)  --->  DeepSeek API
       ^                                                                     |
       +---------------------- 返回校验后的题目 JSON ------------------------+
```

生成的题进入题库的 `generatedCards`，会**随 GitHub Gist 同步到手机**。所以正确用法是：
在**电脑上**生成题，手机在通勤时直接练——手机和电车上都不需要接触 API key。

## 准备

- Node 18 或更高（用到内置 fetch）。检查：`node --version`
- 一个 DeepSeek API key。

## 启动

在项目根目录：

**PowerShell**
```powershell
$env:DEEPSEEK_API_KEY="你的key"
node proxy/deepseek-proxy.mjs
```

**bash / macOS / Linux**
```bash
DEEPSEEK_API_KEY=你的key node proxy/deepseek-proxy.mjs
```

看到 `DeepSeek 代理已启动：http://127.0.0.1:8799` 就成功了。
自检：浏览器打开 http://127.0.0.1:8799/health 应返回 `{"ok":true,...}`。

## 在网页里用

1. 先在「今日记录」里写下今天学了什么、卡在哪，保存。
2. 找到「AI 出题（本地代理）」面板，地址保持 `http://127.0.0.1:8799`。
3. 点「用今日记录生成题」。生成的题会加入题库并在下次同步时上传。

> **混合内容提示**：发布版网页是 HTTPS，部分浏览器（尤其 Safari）会拦截 HTTPS 页面访问本地 http 代理。
> 如果点了没反应，改用本地网页：在项目目录跑 `python -m http.server 8787`，浏览器打开
> `http://localhost:8787/`，再用 AI 出题即可（http→http，不会被拦）。Chrome 通常直接放行 127.0.0.1。

## 可选环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | （必填） | 你的 key，只在本机环境变量里 |
| `PORT` | `8799` | 代理端口 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 模型名 |
| `DEEPSEEK_API_URL` | `https://api.deepseek.com/chat/completions` | 接口地址 |

## 安全

- key 只从环境变量读取，代码和仓库里没有 key。
- 别把 key 写进文件后提交；如果你用 `.env`，仓库已在 `.gitignore` 忽略它。
- 代理只监听 `127.0.0.1`（本机），外部访问不到。
