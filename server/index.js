import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import express from 'express'
import { DatabaseSync } from 'node:sqlite'

const starterJobs = [
  ['Vue 前端实习生', '星河科技', '杭州', 'Vue 3,JavaScript'], ['前端开发实习生', '云帆网络', '上海', 'HTML,CSS'],
  ['Web 前端实习生', '青橙教育', '北京', 'Vue 3,Git'], ['React 前端实习生', '北辰数据', '深圳', 'React,TypeScript'],
  ['前端工程化实习生', '远航软件', '杭州', 'Vite,Git'], ['前端实习生', '麦田智能', '广州', 'JavaScript,CSS'],
]
const validUsername = (value) => typeof value === 'string' && /^[\w]{3,32}$/.test(value.trim()) ? value.trim() : null
const validPassword = (value) => typeof value === 'string' && value.length >= 8 && value.length <= 128 ? value : null

export function createApp({ databasePath }) {
  const db = new DatabaseSync(databasePath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY, title TEXT NOT NULL, company TEXT NOT NULL, city TEXT NOT NULL, tags TEXT NOT NULL, status TEXT NOT NULL DEFAULT '未投递');
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS applications (user_id INTEGER NOT NULL, job_id INTEGER NOT NULL, status TEXT NOT NULL, PRIMARY KEY (user_id, job_id));
  `)
  if (db.prepare('SELECT COUNT(*) AS count FROM jobs').get().count === 0) {
    const insert = db.prepare('INSERT INTO jobs (title, company, city, tags) VALUES (?, ?, ?, ?)')
    starterJobs.forEach((job) => insert.run(...job))
  }

  const app = express()
  app.use(express.json())
  const createSession = (user) => {
    const token = randomBytes(32).toString('base64url')
    db.prepare('INSERT INTO sessions VALUES (?, ?)').run(token, user.id)
    return { token, user: { id: user.id, username: user.username } }
  }
  const requireUser = (request, response, next) => {
    const token = request.get('authorization')?.replace(/^Bearer\s+/, '')
    const user = token && db.prepare('SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?').get(token)
    if (!user) return response.status(401).json({ error: '请先登录' })
    request.user = user
    request.token = token
    next()
  }

  app.post('/api/auth/register', (request, response) => {
    const username = validUsername(request.body?.username), password = validPassword(request.body?.password)
    if (!username || !password) return response.status(400).json({ error: '用户名为 3-32 位字母、数字或下划线；密码至少 8 位' })
    const salt = randomBytes(16).toString('hex'), hash = scryptSync(password, salt, 64).toString('hex')
    try {
      const result = db.prepare('INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)').run(username, hash, salt)
      response.status(201).json({ data: createSession({ id: Number(result.lastInsertRowid), username }) })
    } catch (error) {
      if (error.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE') return response.status(409).json({ error: '该用户名已被使用' })
      throw error
    }
  })
  app.post('/api/auth/login', (request, response) => {
    const username = validUsername(request.body?.username), password = validPassword(request.body?.password)
    const user = username && password && db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (!user || !timingSafeEqual(scryptSync(password, user.password_salt, 64), Buffer.from(user.password_hash, 'hex'))) return response.status(401).json({ error: '用户名或密码错误' })
    response.json({ data: createSession(user) })
  })
  app.get('/api/auth/me', requireUser, (request, response) => response.json({ data: request.user }))
  app.post('/api/auth/logout', requireUser, (request, response) => { db.prepare('DELETE FROM sessions WHERE token = ?').run(request.token); response.status(204).end() })

  app.get('/api/jobs', requireUser, (request, response) => {
    const keyword = `%${String(request.query.keyword || '').trim()}%`, page = Math.max(1, Number(request.query.page) || 1), pageSize = 3
    const status = ['已收藏', '已投递'].includes(request.query.status) ? request.query.status : null
    const where = `WHERE (jobs.title LIKE ? OR jobs.company LIKE ? OR jobs.city LIKE ?)${status ? ' AND applications.status = ?' : ''}`
    const parameters = status ? [request.user.id, keyword, keyword, keyword, status] : [request.user.id, keyword, keyword, keyword]
    const total = db.prepare(`SELECT COUNT(*) AS count FROM jobs LEFT JOIN applications ON applications.job_id = jobs.id AND applications.user_id = ? ${where}`).get(...parameters).count
    const items = db.prepare(`SELECT jobs.id, title, company, city, tags, COALESCE(applications.status, '未投递') AS status FROM jobs LEFT JOIN applications ON applications.job_id = jobs.id AND applications.user_id = ? ${where} ORDER BY jobs.id LIMIT ? OFFSET ?`).all(...parameters, pageSize, (page - 1) * pageSize).map((job) => ({ ...job, tags: job.tags.split(',') }))
    response.json({ data: { items, total, page, pageSize } })
  })
  app.patch('/api/jobs/:id', requireUser, (request, response) => {
    const status = request.body?.status
    if (!['未投递', '已收藏', '已投递'].includes(status)) return response.status(400).json({ error: '状态不正确' })
    if (!db.prepare('SELECT id FROM jobs WHERE id = ?').get(Number(request.params.id))) return response.status(404).json({ error: '岗位不存在' })
    if (status === '未投递') db.prepare('DELETE FROM applications WHERE user_id = ? AND job_id = ?').run(request.user.id, Number(request.params.id))
    else db.prepare('INSERT INTO applications (user_id, job_id, status) VALUES (?, ?, ?) ON CONFLICT(user_id, job_id) DO UPDATE SET status = excluded.status').run(request.user.id, Number(request.params.id), status)
    const job = db.prepare('SELECT id, title, company, city, tags FROM jobs WHERE id = ?').get(Number(request.params.id))
    response.json({ data: { ...job, status, tags: job.tags.split(',') } })
  })
  app.closeDatabase = () => db.close()
  return app
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dataDirectory = join(process.cwd(), 'server', 'data')
  mkdirSync(dataDirectory, { recursive: true })
  const app = createApp({ databasePath: join(dataDirectory, 'jobs.db') })
  app.listen(3001, () => console.log('Job API is running at http://localhost:3001'))
}
