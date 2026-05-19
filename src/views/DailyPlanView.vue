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
  min-height: 100dvh;
  padding: 0;
  margin: 0;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #7c3aed 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.container-shell {
  width: 100%;
  max-width: 900px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 32px;
  box-shadow: 0 25px 80px -12px rgba(102, 126, 234, 0.4), 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #9333ea 100%);
  padding: 40px 32px 32px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  animation: pulse 4s ease-in-out infinite;
}

.hero::after {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -10%;
  width: 150px;
  height: 150px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  animation: pulse 3s ease-in-out infinite 1s;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.date-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.date-pill {
  font-size: 16px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.25);
  padding: 10px 24px;
  border-radius: 999px;
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.date-pill:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(1.05);
}

.quote-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.hero h1 {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -1px;
  color: white;
  margin: 0 0 12px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
}

.sub-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 400;
  position: relative;
  z-index: 1;
}

.stats {
  display: flex;
  gap: 20px;
  padding: 24px 32px;
  background: linear-gradient(180deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%);
}

.stat-card {
  background: white;
  border-radius: 20px;
  padding: 20px 24px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
  flex: 1;
  text-align: center;
  border: 1px solid rgba(102, 126, 234, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.stat-card:hover::before {
  transform: scaleX(1);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.15);
}

.stat-number {
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  color: transparent;
  line-height: 1.2;
  transition: transform 0.3s ease;
}

.stat-card:hover .stat-number {
  transform: scale(1.1);
}

.stat-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #8898aa;
  font-weight: 600;
  margin-top: 4px;
}

.add-task {
  padding: 24px 32px;
  display: flex;
  gap: 16px;
  align-items: center;
  background: rgba(102, 126, 234, 0.03);
  border-bottom: 1px solid rgba(102, 126, 234, 0.1);
}

.add-task input {
  flex: 1;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 24px;
  background: white;
  outline: none;
  color: #1f2a3e;
  transition: all 0.3s ease;
  padding: 16px 24px;
  font-size: 15px;
}

.add-task input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.add-task button {
  padding: 16px 32px;
  border-radius: 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 15px;
}

.add-task button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
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
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.add-task button,
.secondary-btn {
  padding: 12px 18px;
  border-radius: 24px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.secondary-btn {
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  color: #667eea;
}

.secondary-btn:hover {
  background: rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.task-list-container {
  padding: 16px 32px 24px;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 600;
  color: #5a6e8a;
  padding: 0 8px;
}

.tasks {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-item {
  background: white;
  border-radius: 20px;
  padding: 16px 20px;
  display: flex;
  gap: 16px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.06);
  border: 2px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.task-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #667eea, #764ba2);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.task-item:hover::before,
.task-item.expanded::before {
  transform: scaleY(1);
}

.task-item:hover,
.task-item.expanded {
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.12);
  transform: translateY(-2px);
}

.task-item.completed {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%);
  border-color: rgba(34, 197, 94, 0.2);
}

.task-item.completed::before {
  background: linear-gradient(180deg, #22c55e, #16a34a);
  transform: scaleY(1);
}

.task-check {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #d1d9e6;
  background: white;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 14px;
  font-weight: 700;
}

.task-check:hover {
  border-color: #667eea;
  transform: scale(1.1);
}

.task-check.completed {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border-color: #22c55e;
  animation: checkAnim 0.3s ease;
}

@keyframes checkAnim {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}

.task-check:hover {
  border-color: #667eea;
  transform: scale(1.05);
}

.task-check.completed {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  border-color: #22c55e;
  box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-title-input {
  flex: 1;
  border: none;
  background: transparent;
  font-weight: 600;
  font-size: 16px;
  color: #1e2f41;
  padding: 6px 0;
  outline: none;
}

.task-title-input.completed {
  text-decoration: line-through;
  color: #92a1bc;
}

.task-tag {
  font-size: 12px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  padding: 5px 12px;
  border-radius: 999px;
  color: #667eea;
  font-weight: 600;
  white-space: nowrap;
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #b7c2da;
  font-size: 22px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.task-detail-panel {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(102, 126, 234, 0.1);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-detail-panel {
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
  padding: 48px 20px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-radius: 24px;
  color: #8698b5;
  font-weight: 500;
  border: 2px dashed rgba(102, 126, 234, 0.2);
}

.empty-state strong {
  display: block;
  margin-bottom: 12px;
  color: #667eea;
  font-size: 18px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.tool-grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 20px;
  padding: 0 32px 32px;
}

.tool-card {
  background: white;
  border-radius: 24px;
  padding: 20px;
  border: 1px solid rgba(102, 126, 234, 0.1);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.06);
}

.tool-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.tool-header h2 {
  margin: 4px 0 0;
  font-size: 18px;
  color: #1f2b48;
  font-weight: 700;
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
  transition: all 0.2s ease;
}

.date-item:hover {
  border-color: #667eea;
}

.date-item.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-color: transparent;
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
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  color: #667eea;
  padding: 8px 16px;
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
