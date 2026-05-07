# 离家使用上线说明

## 当前状态

这个项目已经具备两种运行方式：

- 本地运行：`node server.mjs`
- Vercel 部署：静态页面 + `api/` 下的 Node.js Functions

## 本地运行

```bash
cd /Users/xxd/Documents/Codex/2026-05-07/new-chat/apps/web
cp .env.example .env.local
# 把 OPENAI_API_KEY 填进去（可选）
OPENAI_API_KEY=你的key node server.mjs
```

打开：

- `http://127.0.0.1:4173`

## 部署到 Vercel

参考 Vercel 官方文档：

- 部署方式：[Deploying to Vercel](https://vercel.com/docs/deployments)
- `api/` 目录函数：[Using the Node.js Runtime with Vercel Functions](https://vercel.com/docs/functions/runtimes/node-js)

### 推荐方式 1：Git 导入

1. 把 `apps/web` 所在代码推到 GitHub / GitLab / Bitbucket
2. 在 Vercel 创建新项目并导入仓库
3. 把 Root Directory 设成 `apps/web`
4. Framework Preset 选 `Other`
5. Build Command 留空
6. Output Directory 使用根目录 `.`
7. 在 Environment Variables 里添加：
   - `OPENAI_API_KEY`
   - 可选：`OPENAI_VISION_MODEL`
8. 部署后即可获得外网地址

### 推荐方式 2：CLI 部署

```bash
npm i -g vercel
cd /Users/xxd/Documents/Codex/2026-05-07/new-chat/apps/web
vercel --prod
```

首次部署时：

- 需要登录 Vercel
- 需要按提示把当前目录关联到一个 Project
- 部署后会得到一个 `*.vercel.app` 地址

## 上线后的限制

当前版本上线后可以做到：

- 离家后从任何地方打开网页
- 使用 AI 餐食识别（已配置 key 时）
- 本地浏览器内保存数据

当前版本还不能做到：

- 多设备自动同步同一份数据
- 账号登录
- 云端数据库持久化

如果下一步要补齐这些能力，建议接入：

- `Supabase Auth`
- `Supabase Postgres`
- `Supabase Storage`
