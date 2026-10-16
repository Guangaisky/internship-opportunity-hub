import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import express from 'express'
import { DatabaseSync } from 'node:sqlite'

const dataDirectory = join(process.cwd(), 'server', 'data')
mkdirSync(dataDirectory, { recursive: true })
const db = new DatabaseSync(join(dataDirectory, 'jobs.db'))
db.exec(`CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY, title TEXT NOT NULL, company TEXT NOT NULL, city TEXT NOT NULL, tags TEXT NOT NULL, status TEXT NOT NULL DEFAULT '未投递')`)
if (db.prepare('SELECT COUNT(*) AS count FROM jobs').get().count === 0) {
  const insert = db.prepare('INSERT INTO jobs (title, company, city, tags) VALUES (?, ?, ?, ?)');
  [['Vue 前端实习生','星河科技','杭州','Vue 3,JavaScript'],['前端开发实习生','云帆网络','上海','HTML,CSS'],['Web 前端实习生','青橙教育','北京','Vue 3,Git'],['React 前端实习生','北辰数据','深圳','React,TypeScript'],['前端工程化实习生','远航软件','杭州','Vite,Git'],['前端实习生','麦田智能','广州','JavaScript,CSS']].forEach((job) => insert.run(...job))
}
const app = express()
app.get('/api/jobs', (request, response) => {
  const keyword = `%${String(request.query.keyword || '').trim()}%`, page = Math.max(1, Number(request.query.page) || 1), pageSize = 3
  const where = 'title LIKE ? OR company LIKE ? OR city LIKE ?'
  const total = db.prepare(`SELECT COUNT(*) AS count FROM jobs WHERE ${where}`).get(keyword, keyword, keyword).count
  const items = db.prepare(`SELECT * FROM jobs WHERE ${where} ORDER BY id LIMIT ? OFFSET ?`).all(keyword, keyword, keyword, pageSize, (page - 1) * pageSize).map((job) => ({ ...job, tags: job.tags.split(',') }))
  response.json({ data: { items, total, page, pageSize } })
})
app.use(express.json())
app.patch('/api/jobs/:id', (request, response) => {
  const status = request.body?.status
  if (!['未投递', '已收藏', '已投递'].includes(status)) return response.status(400).json({ error: '状态不正确' })
  const result = db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, Number(request.params.id))
  if (!result.changes) return response.status(404).json({ error: '岗位不存在' })
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(Number(request.params.id))
  response.json({ data: { ...job, tags: job.tags.split(',') } })
})
app.listen(3001, () => console.log('Job API is running at http://localhost:3001'))
