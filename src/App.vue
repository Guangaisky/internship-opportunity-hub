<script setup>
import { onMounted, ref, watch } from 'vue'

const keyword = ref('')
const jobs = ref([])
const total = ref(0)
const page = ref(1)
const statusFilter = ref('all')
const error = ref('')
const username = ref('')
const password = ref('')
const isRegistering = ref(false)
const user = ref(null)
const token = ref(localStorage.getItem('opportunity-hub-token') || '')

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...options.headers, ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}) } })
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(body?.error || '请求失败')
  return body?.data
}

async function loadJobs() {
  if (!user.value) return
  try {
    error.value = ''
    const data = await request(`/api/jobs?keyword=${encodeURIComponent(keyword.value)}&status=${encodeURIComponent(statusFilter.value)}&page=${page.value}`)
    jobs.value = data.items
    total.value = data.total
  } catch (err) { error.value = err.message }
}

async function authenticate() {
  try {
    error.value = ''
    const data = await request(isRegistering.value ? '/api/auth/register' : '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.value, password: password.value }) })
    token.value = data.token
    localStorage.setItem('opportunity-hub-token', data.token)
    user.value = data.user
    password.value = ''
    await loadJobs()
  } catch (err) { error.value = err.message }
}

async function changeStatus(job, status) {
  try {
    const updated = await request(`/api/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    Object.assign(job, updated)
  } catch (err) { error.value = err.message }
}

async function signOut() {
  try { await request('/api/auth/logout', { method: 'POST' }) } catch { /* 本地令牌依然需要清除 */ }
  token.value = ''
  user.value = null
  jobs.value = []
  localStorage.removeItem('opportunity-hub-token')
}

watch([keyword, statusFilter], () => { page.value = 1; loadJobs() })
onMounted(async () => {
  if (!token.value) return
  try { user.value = await request('/api/auth/me'); await loadJobs() } catch { localStorage.removeItem('opportunity-hub-token'); token.value = '' }
})
</script>

<template>
  <main>
    <header><p>INTERNSHIP FINDER</p><h1>前端实习岗位浏览台</h1><span>搜索岗位、记录投递进度，建立更有节奏的求职过程。</span></header>
    <form v-if="!user" class="auth" @submit.prevent="authenticate">
      <h2>{{ isRegistering ? '创建账号' : '登录账号' }}</h2>
      <input v-model="username" placeholder="用户名（3 位以上）" aria-label="用户名" />
      <input v-model="password" type="password" placeholder="密码（至少 8 位）" aria-label="密码" />
      <button type="submit">{{ isRegistering ? '注册并登录' : '登录' }}</button>
      <button type="button" class="secondary" @click="isRegistering = !isRegistering">{{ isRegistering ? '已有账号，去登录' : '没有账号，去注册' }}</button>
    </form>
    <template v-else>
      <p class="account">当前用户：{{ user.username }} <button class="secondary" @click="signOut">退出登录</button></p>
      <label class="search">搜索岗位或公司<input v-model="keyword" placeholder="例如：Vue、杭州、科技" /></label>
      <div class="filters" aria-label="投递状态筛选"><button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button><button :class="{ active: statusFilter === '已收藏' }" @click="statusFilter = '已收藏'">已收藏</button><button :class="{ active: statusFilter === '已投递' }" @click="statusFilter = '已投递'">已投递</button></div>
      <p class="result">找到 {{ total }} 个岗位</p>
      <section><article v-for="job in jobs" :key="job.id"><div><h2>{{ job.title }}</h2><p>{{ job.company }} · {{ job.city }}</p><span v-for="tag in job.tags" :key="tag" class="tag">{{ tag }}</span></div><div class="actions"><strong>{{ job.status }}</strong><button @click="changeStatus(job, '已收藏')">收藏</button><button @click="changeStatus(job, '已投递')">投递</button><button v-if="job.status !== '未投递'" class="secondary" @click="changeStatus(job, '未投递')">撤销</button></div></article><p v-if="!jobs.length && !error">没有匹配的岗位，换一个关键词试试。</p></section>
      <nav aria-label="岗位分页"><button :disabled="page === 1" @click="page--; loadJobs()">上一页</button> 第 {{ page }} 页 <button :disabled="page * 3 >= total" @click="page++; loadJobs()">下一页</button></nav>
    </template>
    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>

<style scoped>
main{max-width:800px;margin:auto;padding:48px 20px;color:#172033}header{padding:30px;border-radius:18px;background:#1d4ed8;color:white}header p{font-weight:700;letter-spacing:.1em}h1{margin:8px 0}.auth,.search{display:grid;gap:10px;margin:26px 0}.auth{max-width:440px}.search{font-weight:700}input{padding:13px;border:1px solid #bfdbfe;border-radius:9px;font:inherit}.filters{display:flex;gap:8px}.filters button{background:#e2e8f0;color:#334155}.filters button.active{background:#2563eb;color:white}.result,.account{color:#64748b;margin:24px 0 12px}.account button{margin-left:8px}button{border:0;border-radius:7px;padding:8px 12px;background:#2563eb;color:white}.secondary{background:#e2e8f0;color:#334155}.error{padding:10px;border-radius:8px;background:#fff1f2;color:#be123c}article{display:flex;justify-content:space-between;gap:20px;margin:12px 0;padding:20px;border:1px solid #e2e8f0;border-radius:14px}h2,p{margin:0 0 8px}.tag,strong{display:inline-block;padding:4px 8px;margin-right:7px;border-radius:6px;background:#eff6ff;color:#1d4ed8;font-size:.9rem}.actions{display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap}.actions strong{width:100%}nav{margin-top:20px;text-align:center}@media(max-width:560px){main{padding:20px 12px}article{flex-direction:column}}
</style>
