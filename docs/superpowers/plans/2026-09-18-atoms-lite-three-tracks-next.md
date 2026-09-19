# 三线并行：首轮做完、增量修改、工作台轨迹

> 2026-09-18。三个窗口只读自己那一份。
> 模型一律 `deepseek-flash`。不要再加说话的角色。校验仍是程序。

## 三条线

| 线 | 文档 | 做完是什么 |
|---|---|---|
| 1 首轮 | [2026-09-18-track-1-first-gen.md](./2026-09-18-track-1-first-gen.md) | 新生成的应用功能做全，数据只走 `window.atomslite.db`，不再写出 `localStorage` |
| 2 增量 | [2026-09-18-track-2-modify.md](./2026-09-18-track-2-modify.md) | 同一项目再说一句话会新开一轮，真的改文件，并用 `verifyApplication` 拦住没改到或改坏 |
| 3 工作台 | [2026-09-18-track-3-timeline.md](./2026-09-18-track-3-timeline.md) | 左栏是整件事的时间线；底部输入调用线 2 的接口 |

## 接线约定

线 2 拥有这个接口，线 3 只调用、不改实现：

`POST /api/projects/:id/modify`

请求体：`{ "prompt": "再加一个删除按钮" }`

成功 `200`：

```json
{
  "roundId": "uuid",
  "roundIndex": 2,
  "status": "done",
  "verifyResult": "ok",
  "changedFiles": ["index.html", "scripts/app.js"]
}
```

失败时 `status` 为 `failed`，`verifyResult` 写原因，HTTP 仍是 `200`。未登录 `401`。不是自己的项目 `404`。计划还在 `waiting_approval`，或已有步骤 `running`，返回 `409`，body `{ "error": "not_ready" }`。

`prompt` 去掉空白后至少 1 个字，最多 2000。空的返回 `400`。

这一轮写入：

- 新的 `rounds` 行，`index` 为该项目现有最大 index + 1，`intentKind` 为 `modify`，`prompt` 为用户这句话
- 把 `projects.currentRoundId` 指到这一轮
- 一条 `messages`，`role=user`，`kind=text`，`content` 为 `{ "text": "<prompt>" }`
- 一条 `steps`，`key=modify`，`agentRole=工程师`，`seq=1`
- 改过的文件用现有 `upsertProjectFiles` 写回。不要新建表，不要改 `lib/db/schema.ts`

线 1 不要碰这个接口。线 3 不要实现它。三份汇报回来后再看要不要把首轮校验也接上 `verifyApplication`。

## 共用禁令

不要 commit，不要 push，不要部署。不要改 `package.json`，不要改 `lib/db/schema.ts`，不要改 `.env`。不要再起开发服务器。不要加终端页。不要做积分、社区、SEO、可视化编辑、自定义域名。

预览里那层假的 `localStorage`（`lib/sandbox/bridge-sdk.ts`）这轮留着，给已经生成的旧页面兜底。三条线都不要删它。

## 汇报格式

```
线：1 | 2 | 3
结果：完成 | 部分完成 | 停住

做完了什么
-

改过的文件
-

确认没改的文件
-

怎么验的
- 命令：
- 结果：

没验的
-

给接线用的接口
-

停住的原因
- 无
```
