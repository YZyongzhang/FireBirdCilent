<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import axios from 'axios'
import { API_BASE } from '../config'
import { getUser } from '../utils/auth'

interface DailyTask {
  id: string
  title: string
  time: string
  done: boolean
  note: string
}

interface DailyPlan {
  date: string
  completed: boolean
  tasks: DailyTask[]
}

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const formatDateKey = (date: Date) => date.toISOString().slice(0, 10)
const todayKey = formatDateKey(new Date())

const createDefaultTasks = (): DailyTask[] => [
  { id: createId(), title: '整理今日重点事项', time: '09:00 - 09:30', done: false, note: '' },
  { id: createId(), title: '推进核心功能开发', time: '10:00 - 12:00', done: false, note: '' },
]

const createPlan = (date: string): DailyPlan => ({
  date,
  completed: false,
  tasks: createDefaultTasks(),
})

const plansByDate = ref<Record<string, DailyPlan>>({})
const selectedDate = ref(todayKey)
const exportFormat = ref<'markdown' | 'json'>('markdown')
const exportMode = ref<'single' | 'range' | 'manual'>('single')
const exportStartDate = ref(todayKey)
const exportEndDate = ref(todayKey)
const manualSelectedDates = ref<string[]>([todayKey])
const expandedTaskId = ref('')
const quickTaskTitle = ref('')

const getAuthHeaders = () => {
  const u = getUser()
  if (!u) return {}
  return {
    'X-User-Id': String(u.id),
    'X-User-Username': u.username,
    'X-User-Role': u.role,
  }
}

// Backend sync: fetch all plans from API
const fetchAllPlans = async () => {
  try {
    const res = await axios.get(`${API_BASE}/daily-plans`, { headers: getAuthHeaders() })
    // backend may return either the raw array or an ApiResponse wrapper
    let list: DailyPlan[] = []
    if (Array.isArray(res.data)) list = res.data
    else if (res.data && Array.isArray(res.data.data)) list = res.data.data
    else if (res.data && res.data.status === 'ok' && Array.isArray(res.data.data)) list = res.data.data

    const map: Record<string, DailyPlan> = {}
    list.forEach((p) => (map[p.date] = p))
    // ensure today exists
    if (!map[todayKey]) map[todayKey] = createPlan(todayKey)
    plansByDate.value = map
    // select fallback if needed
    if (!plansByDate.value[selectedDate.value]) {
      selectedDate.value = Object.keys(plansByDate.value).sort()[0] ?? todayKey
    }
  } catch (err) {
    // fallback to local default when backend unavailable
    plansByDate.value = { [todayKey]: createPlan(todayKey) }
  }
}

const fetchPlan = async (date: string) => {
  try {
    const res = await axios.get(`${API_BASE}/daily-plans/${date}`, { headers: getAuthHeaders() })
    // backend may return raw plan or ApiResponse wrapper
    let plan: DailyPlan | null = null
    if (res.data && res.data.date) plan = res.data
    else if (res.data && res.data.data && res.data.data.date) plan = res.data.data
    else if (res.data && res.data.status === 'ok' && res.data.data && res.data.data.date) plan = res.data.data

    if (plan) {
      plansByDate.value = { ...plansByDate.value, [date]: plan }
    }
  } catch (err) {
    // ignore
  }
}

onMounted(() => {
  fetchAllPlans()
})

const sortedDates = computed(() => Object.keys(plansByDate.value).sort((left, right) => left.localeCompare(right)))

const ensurePlan = (date: string) => {
  if (plansByDate.value[date]) {
    return
  }

  plansByDate.value = {
    ...plansByDate.value,
    [date]: createPlan(date),
  }
}

if (!plansByDate.value[selectedDate.value]) {
  const fallbackDate = sortedDates.value[0] ?? todayKey
  ensurePlan(fallbackDate)
  selectedDate.value = fallbackDate
}

const currentPlan = computed(() => plansByDate.value[selectedDate.value] ?? null)
const totalCount = computed(() => currentPlan.value?.tasks.length ?? 0)
const completedCount = computed(() => currentPlan.value?.tasks.filter((task) => task.done).length ?? 0)
const pendingCount = computed(() => totalCount.value - completedCount.value)
const formattedSelectedDate = computed(() => {
  if (!currentPlan.value?.date) {
    return ''
  }

  return new Date(`${currentPlan.value.date}T00:00:00`).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
})

// Note: persistence moved to backend via API calls below

watch(
  currentPlan,
  (plan) => {
    if (!plan?.tasks.length) {
      expandedTaskId.value = ''
      return
    }

    const hasExpandedTask = plan.tasks.some((task) => task.id === expandedTaskId.value)

    if (!hasExpandedTask) {
      expandedTaskId.value = plan.tasks[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(selectedDate, (date) => {
  ensurePlan(date)

  if (!manualSelectedDates.value.includes(date)) {
    manualSelectedDates.value = [...manualSelectedDates.value, date].sort((left, right) => left.localeCompare(right))
  }

  if (exportMode.value === 'single') {
    exportStartDate.value = date
    exportEndDate.value = date
  }
})

const selectDate = (date: string) => {
  selectedDate.value = date
}

const toggleDayCompleted = async () => {
  if (!currentPlan.value) return
  try {
    await axios.post(`${API_BASE}/daily-plans/${selectedDate.value}/toggle`, {}, { headers: getAuthHeaders() })
    await fetchPlan(selectedDate.value)
  } catch (err) {
    // optimistic fallback
    plansByDate.value = {
      ...plansByDate.value,
      [selectedDate.value]: {
        ...currentPlan.value,
        completed: !currentPlan.value.completed,
      },
    }
  }
}

const toggleTaskExpanded = (taskId: string) => {
  expandedTaskId.value = expandedTaskId.value === taskId ? '' : taskId
}

const updateTask = async (taskId: string, patch: Partial<DailyTask>) => {
  if (!currentPlan.value) return
  try {
    console.log('进入updatatask')
    console.log('PATCH URL:', `${API_BASE}/daily-plans/${selectedDate.value}/tasks/${taskId}`)
    await axios.patch(`${API_BASE}/daily-plans/${selectedDate.value}/tasks/${taskId}`, patch, { headers: getAuthHeaders() })
    await fetchPlan(selectedDate.value)
  } catch (err) {
    // optimistic local update
    console.log('坏事了')
    plansByDate.value = {
      ...plansByDate.value,
      [selectedDate.value]: {
        ...currentPlan.value,
        tasks: currentPlan.value.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
      },
    }
  }
}

const createTask = (title: string) => ({
  id: createId(),
  title,
  time: '',
  done: false,
  note: '',
})

const addTask = async (title = '新的计划事项') => {

  if (!currentPlan.value) return

  try {

    await axios.post(`${API_BASE}/daily-plans/${selectedDate.value}/tasks`, { title }, { headers: getAuthHeaders() })
    await fetchPlan(selectedDate.value)
    expandedTaskId.value = ''
  } catch (err) {
    // fallback local add
    const newTask = createTask(title)
    plansByDate.value = {
      ...plansByDate.value,
      [selectedDate.value]: {
        ...currentPlan.value,
        tasks: [...currentPlan.value.tasks, newTask],
      },
    }
    expandedTaskId.value = newTask.id
  }
}

const addQuickTask = () => {
  const title = quickTaskTitle.value.trim()
  if (!title) return
  addTask(title)
  quickTaskTitle.value = ''
}

const removeTask = async (taskId: string) => {
  if (!currentPlan.value) return
  try {
    await axios.delete(`${API_BASE}/daily-plans/${selectedDate.value}/tasks/${taskId}`, { headers: getAuthHeaders() })
    await fetchPlan(selectedDate.value)
  } catch (err) {
    const nextTasks = currentPlan.value.tasks.filter((task) => task.id !== taskId)
    plansByDate.value = {
      ...plansByDate.value,
      [selectedDate.value]: {
        ...currentPlan.value,
        tasks: nextTasks,
      },
    }
    if (expandedTaskId.value === taskId) expandedTaskId.value = nextTasks[0]?.id ?? ''
  }
}

const toggleManualDate = (date: string) => {
  if (manualSelectedDates.value.includes(date)) {
    manualSelectedDates.value = manualSelectedDates.value.filter((item) => item !== date)
    return
  }

  manualSelectedDates.value = [...manualSelectedDates.value, date].sort((left, right) => left.localeCompare(right))
}

const getExportDates = () => {
  if (exportMode.value === 'single') {
    return [selectedDate.value]
  }

  if (exportMode.value === 'range') {
    return sortedDates.value.filter((date) => date >= exportStartDate.value && date <= exportEndDate.value)
  }

  return manualSelectedDates.value.slice().sort((left, right) => left.localeCompare(right))
}

const buildMarkdown = (plans: DailyPlan[]) => {
  return plans
    .map((plan) => {
      const title = new Date(`${plan.date}T00:00:00`).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })

      const tasks = plan.tasks.length
        ? plan.tasks
          .map(
            (task) =>
              `- [${task.done ? 'x' : ' '}] ${task.title}${task.time ? `（${task.time}）` : ''}${task.note ? `\n  - 说明：${task.note}` : ''}`,
          )
          .join('\n')
        : '- 暂无计划'

      return `## ${title}\n\n- 日期计划完成：${plan.completed ? '是' : '否'}\n\n${tasks}`
    })
    .join('\n\n')
}

const downloadFile = (content: string, fileName: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const exportPlans = () => {
  const dates = getExportDates()
  const plans = dates.map((date) => plansByDate.value[date]).filter((plan): plan is DailyPlan => Boolean(plan))

  if (!plans.length) {
    return
  }

  const firstDate = dates[0] ?? selectedDate.value
  const lastDate = dates[dates.length - 1] ?? firstDate
  const fileSuffix = plans.length === 1 ? plans[0]!.date : `${firstDate}_to_${lastDate}`

  if (exportFormat.value === 'json') {
    downloadFile(JSON.stringify(plans, null, 2), `daily-plan-${fileSuffix}.json`, 'application/json')
    return
  }

  downloadFile(buildMarkdown(plans), `daily-plan-${fileSuffix}.md`, 'text/markdown;charset=utf-8')
}
</script>

<template>
  <main class="daily-plan-page">
    <section class="container-shell">
      <header class="hero">
        <div class="date-badge">
          <span class="date-pill">{{ formattedSelectedDate }}</span>
          <span class="quote-text">把握今日</span>
        </div>
        <h1>每日计划</h1>
        <p class="sub-text">记录要事 · 逐步完成 · 保持节奏</p>
      </header>

      <section class="stats">
        <article class="stat-card">
          <div class="stat-number">{{ totalCount }}</div>
          <div class="stat-label">全部任务</div>
        </article>
        <article class="stat-card">
          <div class="stat-number">{{ completedCount }}</div>
          <div class="stat-label">已完成</div>
        </article>
        <article class="stat-card">
          <div class="stat-number">{{ pendingCount }}</div>
          <div class="stat-label">进行中</div>
        </article>
      </section>

      <section class="add-task">
        <input v-model="quickTaskTitle" type="text" placeholder="写一个计划，比如“完成报告”或“晨跑 30 分钟”"
          @keyup.enter="addQuickTask" />


        <button type="button" @click="addQuickTask">添加计划</button>
      </section>

      <section class="task-list-container">
        <div class="tasks-header">
          <span>今日待办清单</span>
          <span>点击任务展开时间与备注</span>
        </div>

        <div class="tasks">
          <article v-for="task in currentPlan?.tasks ?? []" :key="task.id" class="task-item"
            :class="{ completed: task.done, expanded: expandedTaskId === task.id }"
            @click="toggleTaskExpanded(task.id)">
            <button type="button" class="task-check" :class="{ completed: task.done }"
              @click.stop="updateTask(task.id, { done: !task.done })">
              {{ task.done ? '✓' : '' }}
            </button>

            <div class="task-main">
              <div class="task-row">
                <!-- <input
                  class="task-title-input"
                  :class="{ completed: task.done }"
                  :value="task.title"
                  type="text"
                  @click.stop
                  @input="updateTask(task.id, { title: ($event.target as HTMLInputElement).value })"
                /> -->
                <input v-model="task.title" class="task-title-input" :class="{ completed: task.done }" type="text"
                  @click.stop @blur="updateTask(task.id, { title: task.title })" />
                <span class="task-tag">{{ task.time || '未设置时间' }}</span>
                <button type="button" class="delete-btn" @click.stop="removeTask(task.id)">×</button>
              </div>

              <div v-if="expandedTaskId === task.id" class="task-detail-panel" @click.stop>
                <label class="detail-field">
                  <span>时间安排</span>
                  <!-- <input
                    :value="task.time"
                    type="text"
                    placeholder="例如 10:00 - 11:00"
                    @input="updateTask(task.id, { time: ($event.target as HTMLInputElement).value })"
                  /> -->
                  <input v-model="task.time" type="text" placeholder="例如 10:00 - 11:00"
                    @blur="updateTask(task.id, { time: task.time })" />
                </label>

                <label class="detail-field">
                  <span>补充说明</span>
                  <!-- <textarea
                    :value="task.note"
                    rows="4"
                    placeholder="写下这项计划的备注说明..."
                    @input="updateTask(task.id, { note: ($event.target as HTMLTextAreaElement).value })"
                  ></textarea> -->
                  <textarea v-model="task.note" rows="4" placeholder="写下这项计划的备注说明..."
                    @blur="updateTask(task.id, { note: task.note })" />
                </label>
              </div>
            </div>
          </article>

          <div v-if="!(currentPlan?.tasks.length ?? 0)" class="empty-state">
            <strong>暂无任务</strong>
            <p>先添加一项今天的计划吧。</p>
          </div>
        </div>
      </section>

      <section class="tool-grid">

        <article class="tool-card wide-card">
          <div class="tool-header">
            <div>
              <p class="tool-title">导出与状态</p>
              <h2>保持完整功能</h2>
            </div>
            <button type="button" class="secondary-btn" @click="toggleDayCompleted">
              {{ currentPlan?.completed ? '取消完成' : '标记完成' }}
            </button>
          </div>

          <div class="export-grid">
            <label class="detail-field compact-field">
              <span>格式</span>
              <select v-model="exportFormat">
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
              </select>
            </label>

            <label class="detail-field compact-field">
              <span>方式</span>
              <select v-model="exportMode">
                <option value="single">单日</option>
                <option value="range">区间</option>
                <option value="manual">多选</option>
              </select>
            </label>
          </div>

          <div v-if="exportMode === 'range'" class="export-grid">
            <label class="detail-field compact-field">
              <span>开始</span>
              <input v-model="exportStartDate" type="date" />
            </label>
            <label class="detail-field compact-field">
              <span>结束</span>
              <input v-model="exportEndDate" type="date" />
            </label>
          </div>

          <div v-if="exportMode === 'manual'" class="manual-date-list">
            <label v-for="date in sortedDates" :key="date" class="manual-date-item">
              <input :checked="manualSelectedDates.includes(date)" type="checkbox" @change="toggleManualDate(date)" />
              <span>{{ date }}</span>
            </label>
          </div>

          <div class="tool-actions">
            <span class="status-pill">{{ currentPlan?.completed ? '当日计划已完成' : '当日计划进行中' }}</span>
            <button type="button" class="secondary-btn" @click="exportPlans">导出计划</button>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped>
.daily-plan-page {
  min-height: 100vh;
  padding: 32px 20px;
  background: linear-gradient(145deg, #f0f7ff 0%, #e9eef5 100%);
  box-sizing: border-box;
}

.container-shell {
  max-width: 860px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(4px);
  border-radius: 40px;
  box-shadow: 0 25px 45px -12px rgba(0, 0, 0, 0.2), 0 2px 5px rgba(0, 0, 0, 0.02);
  overflow: hidden;
}

.hero {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  padding: 28px 32px 20px;
  border-bottom: 1px solid rgba(100, 108, 118, 0.12);
}

.date-badge {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.date-pill {
  font-size: 14px;
  font-weight: 500;
  background: #eef2ff;
  padding: 6px 16px;
  border-radius: 999px;
  color: #2c3e66;
}

.quote-text {
  font-size: 13px;
  color: #5b6e8c;
  font-style: italic;
}

.hero h1 {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.3px;
  background: linear-gradient(135deg, #1f2b48, #2c3e66);
  -webkit-background-clip: text;
  color: transparent;
  margin: 0 0 6px;
}

.sub-text {
  color: #4a5b7a;
  font-size: 14px;
  font-weight: 400;
  border-left: 3px solid #7c8db0;
  padding-left: 12px;
}

.stats {
  display: flex;
  gap: 16px;
  padding: 18px 32px;
  background: rgba(254, 254, 254, 0.8);
  border-bottom: 1px solid #e2e8f0;
}

.stat-card {
  background: #fff;
  border-radius: 24px;
  padding: 12px 18px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  flex: 1;
  text-align: center;
  border: 1px solid #eef2ff;
}

.stat-number {
  font-size: 28px;
  font-weight: 800;
  color: #2c3e66;
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #6a7b9b;
  font-weight: 600;
}

.add-task {
  padding: 20px 32px 8px;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.add-task input,
.detail-field input,
.detail-field textarea,
.detail-field select {
  border: 1.5px solid #e2e8f0;
  border-radius: 22px;
  background: #fff;
  outline: none;
  color: #1f2a3e;
  transition: 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.add-task input {
  flex: 1;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 500;
}

.add-task input:focus,
.detail-field input:focus,
.detail-field textarea:focus,
.detail-field select:focus {
  border-color: #8ba0c7;
  box-shadow: 0 0 0 3px rgba(99, 128, 180, 0.2);
}

.add-task button,
.secondary-btn {
  background: #2c3e66;
  border: none;
  color: #fff;
  padding: 12px 18px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
}

.add-task button:hover,
.secondary-btn:hover,
.date-item:hover {
  transform: translateY(-1px);
}

.task-list-container {
  padding: 8px 28px 24px;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  font-size: 13px;
  font-weight: 600;
  color: #5a6e8a;
  padding: 0 6px;
}

.tasks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  background: #fff;
  border-radius: 22px;
  padding: 14px 16px 14px 18px;
  display: flex;
  gap: 14px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.03);
  border: 1px solid #eef2fa;
  transition: 0.2s;
  cursor: pointer;
}

.task-item:hover,
.task-item.expanded {
  border-color: #cdd9f0;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.05);
  transform: scale(1.01);
}

.task-item.completed {
  background: #f8fbff;
}

.task-check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #b9c4dd;
  background: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  flex-shrink: 0;
  margin-top: 2px;
}

.task-check.completed {
  background: #2c3e66;
  border-color: #2c3e66;
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-title-input {
  flex: 1;
  border: none;
  background: transparent;
  font-weight: 500;
  font-size: 15px;
  color: #1e2f41;
  padding: 0;
  outline: none;
}

.task-title-input.completed {
  text-decoration: line-through;
  color: #92a1bc;
}

.task-tag {
  font-size: 11px;
  background: #f0f3fa;
  padding: 4px 10px;
  border-radius: 999px;
  color: #4a6085;
  font-weight: 600;
  white-space: nowrap;
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #b7c2da;
  font-size: 20px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 999px;
}

.delete-btn:hover {
  color: #e25c5c;
  background: #fff3f0;
}

.task-detail-panel {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #eef2fa;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-field span,
.tool-title {
  font-size: 12px;
  color: #5a6e8a;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-field input,
.detail-field select {
  min-height: 42px;
  padding: 0 14px;
}

.detail-field textarea {
  padding: 12px 14px;
  resize: vertical;
}

.empty-state {
  text-align: center;
  padding: 36px 20px;
  background: #fafcff;
  border-radius: 28px;
  color: #8698b5;
  font-weight: 500;
}

.empty-state strong {
  display: block;
  margin-bottom: 8px;
  color: #4a5b7a;
}

.empty-state p {
  margin: 0;
}

.tool-grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 16px;
  padding: 0 28px 28px;
}

.tool-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 18px;
  border: 1px solid #eef2fa;
}

.tool-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.tool-header h2 {
  margin: 4px 0 0;
  font-size: 18px;
  color: #1f2b48;
}

.secondary-btn {
  background: #eef2fa;
  color: #2c3e66;
}

.date-list,
.manual-date-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  max-height: 220px;
  overflow: auto;
}

.date-item {
  width: 100%;
  text-align: left;
  border: none;
  background: #fff;
  color: #2c3e66;
  padding: 10px 12px;
  border-radius: 16px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #eef2fa;
}

.date-item.active {
  background: #2c3e66;
  color: #fff;
}

.export-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.compact-field {
  margin-top: 10px;
}

.manual-date-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #4a5b7a;
}

.tool-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 14px;
}

.status-pill {
  background: #eef2ff;
  color: #2c3e66;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 720px) {
  .daily-plan-page {
    padding: 16px 12px;
  }

  .stats,
  .tool-grid,
  .export-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .stats {
    gap: 10px;
  }

  .add-task {
    flex-direction: column;
    align-items: stretch;
  }

  .task-row,
  .tool-header,
  .tool-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .task-tag {
    align-self: flex-start;
  }
}
</style>
