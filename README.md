# 前端实习岗位浏览台

一个用于练习前端实习求职流程的全栈小项目。用户可以搜索岗位、按页浏览，并记录收藏或投递状态。

## 功能

- 按岗位名、公司和城市搜索
- 后端分页：每页 3 条岗位
- 注册和登录；不同账号的投递记录相互隔离
- 收藏、投递、撤销状态写回数据库，刷新页面后仍保留
- 按“全部、已收藏、已投递”筛选自己的记录
- 岗位加载失败提示
- 手机端自适应卡片布局

## 技术栈

- Vue 3 + Vite
- Express
- Node.js 内置 SQLite（`node:sqlite`）
- JavaScript

## 本地运行

先安装依赖：

```bash
npm install
```

打开两个终端，均位于项目目录：

```bash
# 终端 1：启动岗位 API
npm run server

# 终端 2：启动 Vue 前端
npm run dev
```

在浏览器打开前端终端显示的地址。

## 数据流

```text
Vue 页面 → 登录 / 会话令牌 → Express
Vue 页面 → GET /api/jobs（搜索、分页、状态筛选） → Express → SQLite
Vue 页面 → PATCH /api/jobs/:id（收藏、投递、撤销） → Express → SQLite
```

- 第一次启动后端会在 `server/data/jobs.db` 创建 SQLite 数据库，并写入 6 条练习岗位。
- 岗位是项目内的模拟数据，不来自真实招聘网站。
- 岗位是公共数据；`applications` 表保存“用户—岗位—投递状态”的关系，因此每个账号只看到自己的记录。
- 数据库文件不会提交到 Git。

## 接口

| 操作 | 请求 |
| --- | --- |
| 查询岗位 | `GET /api/jobs?keyword=Vue&page=1` |
| 更新状态 | `PATCH /api/jobs/:id`，请求体：`{ "status": "已投递" }` |
| 注册 | `POST /api/auth/register` |
| 登录 | `POST /api/auth/login` |

## 测试

```bash
npm run test:api
```

测试会验证两个用户的投递状态相互隔离，以及“已投递”筛选能正确返回记录。

## 后续计划

- 加入筛选条件和岗位详情
- 支持记录投递日期和面试进度
