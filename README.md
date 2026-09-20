# atoms-lite

用一句话生成一个能打开、能改、能记下数据的网页应用。

你注册后在首页写下要做什么。系统先给出这一轮的范围，你确认后，它写出页面并在右侧预览。预览里产生的数据会留下来，刷新不会丢。之后可以再说一句改这个应用，也可以发布一个公开地址。

## 技术栈

- Next.js 15（App Router）与 React 19
- TypeScript、Tailwind CSS
- Neon Postgres 与 Drizzle
- Vercel AI SDK，模型为 DeepSeek `deepseek-flash`
- Vitest

生成出来的应用是静态 HTML、CSS 和 JavaScript。它不自带服务器。需要记住的数据通过页面里的 `window.atomslite.db` 写回本平台的数据库。

## 本地运行

需要 Node.js 20 或以上、一个 Postgres 连接串，以及 DeepSeek 的 API Key。

```bash
npm install
cp .env.example .env
```

编辑 `.env`：

| 变量 | 作用 |
|---|---|
| `DATABASE_URL` | Postgres 连接串 |
| `SESSION_SECRET` | 登录会话签名 |
| `DEEPSEEK_API_KEY` | 模型调用 |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` |
| `LLM_MODEL_FLASH` | 默认 `deepseek-flash` |
| `NEXT_PUBLIC_APP_URL` | 本地打开地址，默认 `http://localhost:3000` |
| `APP_PUBLIC_URL` | 发布链接使用的线上地址 |

建表并启动：

```bash
npx drizzle-kit push
npm run dev
```

打开 http://localhost:3000 。先注册（姓名、邮箱、至少 8 位密码），再在首页输入一句需求。

常用命令：

```bash
npm test
npm run lint
npm run build
```

## 怎么用

1. 首页写下要做的应用，发送。
2. 看这一轮的范围。同意后，页面会在右侧预览里出现。
3. 左侧是对话。过程可以收起。底部可以再说一句，改当前这个应用。
4. 右上角可以看代码，也可以发布。发布后的地址形如 `{APP_PUBLIC_URL}/published/短码`。

当前线上站点：https://atoms-lite-l43x6zxw.edgeone.cool/

这个站点部署在 EdgeOne，加速区域不含中国大陆。大陆网络访问项目域名时，需要在控制台用「预览」签发短期链接，有效期约 3 小时。本地运行没有这个限制。
