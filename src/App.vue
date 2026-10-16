<script setup>
import { onMounted, ref, watch } from 'vue'
const keyword = ref('')
const jobs = ref([]), total = ref(0), page = ref(1), error = ref('')
async function loadJobs() { try { error.value=''; const response=await fetch(`/api/jobs?keyword=${encodeURIComponent(keyword.value)}&page=${page.value}`); const body=await response.json(); jobs.value=body.data.items; total.value=body.data.total } catch { error.value='岗位加载失败，请确认后端已启动。' } }
async function changeStatus(job, status) { try { const response = await fetch(`/api/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); Object.assign(job, body.data) } catch (err) { error.value = err.message } }
watch(keyword, () => { page.value=1; loadJobs() })
onMounted(loadJobs)
</script>
<template>
  <main>
    <header><p>INTERNSHIP FINDER</p><h1>前端实习岗位浏览台</h1><span>搜索岗位、记录投递进度，建立更有节奏的求职过程。</span></header>
    <label class="search">搜索岗位或公司<input v-model="keyword" placeholder="例如：Vue、杭州、科技" /></label>
    <p class="result">找到 {{ total }} 个岗位</p><p v-if="error">{{ error }}</p>
    <section><article v-for="job in jobs" :key="job.id"><div><h2>{{ job.title }}</h2><p>{{ job.company }} · {{ job.city }}</p><span v-for="tag in job.tags" :key="tag" class="tag">{{ tag }}</span></div><div><strong>{{ job.status }}</strong><button @click="changeStatus(job, '已收藏')">收藏</button><button @click="changeStatus(job, '已投递')">投递</button></div></article><p v-if="!jobs.length && !error">没有匹配的岗位，换一个关键词试试。</p></section>
    <button :disabled="page===1" @click="page--;loadJobs()">上一页</button> 第 {{ page }} 页 <button :disabled="page*3>=total" @click="page++;loadJobs()">下一页</button>
  </main>
</template>
<style scoped>
main{max-width:800px;margin:auto;padding:48px 20px;color:#172033}header{padding:30px;border-radius:18px;background:#1d4ed8;color:white}header p{font-weight:700;letter-spacing:.1em}h1{margin:8px 0}.search{display:grid;gap:8px;margin:26px 0;font-weight:700}input{padding:13px;border:1px solid #bfdbfe;border-radius:9px;font:inherit}.result{color:#64748b}article{display:flex;justify-content:space-between;gap:20px;margin:12px 0;padding:20px;border:1px solid #e2e8f0;border-radius:14px}h2,p{margin:0 0 8px}.tag,strong{display:inline-block;padding:4px 8px;margin-right:7px;border-radius:6px;background:#eff6ff;color:#1d4ed8;font-size:.9rem}@media(max-width:560px){main{padding:20px 12px}article{flex-direction:column}}
</style>
