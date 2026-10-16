import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp } from './index.js'

test('each user has independent job application statuses', async (context) => {
  const app = createApp({ databasePath: ':memory:' })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  context.after(() => { server.close(); app.closeDatabase() })
  const request = (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options)
  const register = async (username) => (await (await request('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: 'safe-pass-1' }) })).json()).data
  const first = await register('first_user'), second = await register('second_user')
  const headers = { Authorization: `Bearer ${first.token}`, 'Content-Type': 'application/json' }
  const updated = await request('/api/jobs/1', { method: 'PATCH', headers, body: JSON.stringify({ status: '已投递' }) })
  assert.equal(updated.status, 200)
  const appliedJobs = await request('/api/jobs?status=已投递', { headers })
  const appliedData = (await appliedJobs.json()).data
  assert.equal(appliedData.total, 1)
  assert.equal(appliedData.items[0].id, 1)
  const secondJobs = await request('/api/jobs', { headers: { Authorization: `Bearer ${second.token}` } })
  assert.equal((await secondJobs.json()).data.items[0].status, '未投递')
})
