<script setup lang="ts">
<<<<<<< HEAD
import { defaultDailyTaskSeeds, initialDailyPlansByDate } from '@/dataset/dailyPlan'
import { computed, ref, watch } from 'vue'
=======
import { computed, ref, watch, onMounted } from 'vue'
import axios from 'axios'
import { API_BASE } from '../config'
import { getUser } from '../utils/auth'
>>>>>>> 6c6f264bc2bbda5ae25d5e975363cac41984c874

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

const createDefaultTasks = (): DailyTask[] =>
  defaultDailyTaskSeeds.map((task) => ({
    id: createId(),
    title: task.title,
    time: task.time,
    done: false,
    note: task.note,
  }))

const createPlan = (date: string): DailyPlan => ({
  date,
  completed: false,
  tasks: createDefaultTasks(),
})

<<<<<<< HEAD
const plansByDate = ref<Record<string, DailyPlan>>(
  Object.fromEntries(
    Object.entries(initialDailyPlansByDate).map(([date, plan]) => [
      date,
      {
        ...plan,
        tasks: plan.tasks.map((task) => ({ ...task })),
      },
    ]),
  ),
)
=======
const plansByDate = ref<Record<string, DailyPlan>>({})
>>>>>>> 6c6f264bc2bbda5ae25d5e975363cac41984c874
const selectedDate = ref(todayKey)
const exportFormat = ref<'markdown' | 'json'>('markdown')
const exportMode = ref<'single' | 'range' | 'manual'>('single')
const exportStartDate = ref(todayKey)
const exportEndDate = ref(todayKey)
const manualSelectedDates = ref<string[]>([todayKey])
const expandedTaskId = ref('')
const quickTaskTitle = ref('')

<<<<<<< HEAD
=======
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

>>>>>>> 6c6f264bc2bbda5ae25d5e975363cac41984c874
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

<<<<<<< HEAD
=======
// Note: persistence moved to backend via API calls below

>>>>>>> 6c6f264bc2bbda5ae25d5e975363cac41984c874
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
<<<<<<< HEAD
    <section class="workspace-shell">
      <aside class="sidebar-panel">
        <div class="sidebar-header">
          <p class="panel-badge">日期导航</p>
          <h1>每日计划</h1>
          <p class="sidebar-description">从左侧选择日期，只查看当天计划，避免页面内容无限增长。</p>
        </div>

        <label class="field-label">
          <span>计划日期</span>
          <input :value="selectedDate" type="date" @input="selectDate(($event.target as HTMLInputElement).value)" />
        </label>

        <button type="button" class="primary-btn full-width" @click="createDatePlan">创建当前日期计划</button>

        <div class="date-list-shell">
          <div class="date-list-header">
            <span>全部日期</span>
            <strong>{{ sortedDates.length }}</strong>
          </div>

          <div class="date-list">
            <button
              v-for="date in sortedDates"
              :key="date"
              type="button"
              class="date-item"
              :class="{ active: date === selectedDate }"
              @click="selectDate(date)"
            >
              <span>{{ date }}</span>
              <small>{{ plansByDate[date]?.tasks.length ?? 0 }} 项</small>
            </button>
          </div>
        </div>
      </aside>

      <section class="main-panel">
        <header class="hero-panel">
          <div>
            <p class="panel-badge">当前计划</p>
            <h2>{{ formattedSelectedDate }}</h2>
            <p class="hero-description">当前主区域只展示所选日期的任务、备注和时间安排。</p>
          </div>
          <div class="hero-status">
            <span>{{ currentPlan?.completed ? '当日已完成' : '当日进行中' }}</span>
=======
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
>>>>>>> 6c6f264bc2bbda5ae25d5e975363cac41984c874
            <button type="button" class="secondary-btn" @click="toggleDayCompleted">
              {{ currentPlan?.completed ? '取消完成' : '标记完成' }}
            </button>
          </div>
        </header>

        <section class="stats-grid">
          <article class="stat-card">
            <span>全部任务</span>
            <strong>{{ totalCount }}</strong>
          </article>
          <article class="stat-card">
            <span>已完成</span>
            <strong>{{ completedCount }}</strong>
          </article>
          <article class="stat-card">
            <span>进行中</span>
            <strong>{{ pendingCount }}</strong>
          </article>
        </section>

        <section class="quick-add-panel">
          <input
            v-model="quickTaskTitle"
            type="text"
            placeholder="写一个计划，比如“完成报告”或“晨跑 30 分钟”"
            @keyup.enter="addQuickTask"
          />
          <button type="button" class="primary-btn" @click="addQuickTask">添加计划</button>
        </section>

        <section class="content-grid">
          <article class="tasks-panel">
            <div class="panel-head">
              <div>
                <p class="panel-badge">任务清单</p>
                <h3>当前日期任务</h3>
              </div>
              <button type="button" class="secondary-btn" @click="addTask()">新增空白计划</button>
            </div>

            <div class="tasks-list">
              <article
                v-for="task in currentPlan?.tasks ?? []"
                :key="task.id"
                class="task-item"
                :class="{ completed: task.done, expanded: expandedTaskId === task.id }"
                @click="toggleTaskExpanded(task.id)"
              >
                <button type="button" class="task-check" :class="{ completed: task.done }" @click.stop="updateTask(task.id, { done: !task.done })">
                  {{ task.done ? '✓' : '' }}
                </button>

                <div class="task-main">
                  <div class="task-row">
                    <input
                      class="task-title-input"
                      :class="{ completed: task.done }"
                      :value="task.title"
                      type="text"
                      @click.stop
                      @input="updateTask(task.id, { title: ($event.target as HTMLInputElement).value })"
                    />
                    <span class="task-tag">{{ task.time || '未设置时间' }}</span>
                    <button type="button" class="delete-btn" @click.stop="removeTask(task.id)">×</button>
                  </div>

                  <div v-if="expandedTaskId === task.id" class="task-detail-panel" @click.stop>
                    <label class="field-label">
                      <span>时间安排</span>
                      <input
                        :value="task.time"
                        type="text"
                        placeholder="例如 10:00 - 11:00"
                        @input="updateTask(task.id, { time: ($event.target as HTMLInputElement).value })"
                      />
                    </label>

                    <label class="field-label">
                      <span>补充说明</span>
                      <textarea
                        :value="task.note"
                        rows="4"
                        placeholder="写下这项计划的备注说明..."
                        @input="updateTask(task.id, { note: ($event.target as HTMLTextAreaElement).value })"
                      ></textarea>
                    </label>
                  </div>
                </div>
              </article>

              <div v-if="!(currentPlan?.tasks.length ?? 0)" class="empty-state">
                <strong>当前日期暂无任务</strong>
                <p>先从上方快速新增一项计划，或创建一个空白计划。</p>
              </div>
            </div>
          </article>

          <aside class="tools-panel">
            <div class="panel-head compact-head">
              <div>
                <p class="panel-badge">辅助功能</p>
                <h3>导出与范围</h3>
              </div>
            </div>

            <div class="tool-card">
              <label class="field-label compact-field">
                <span>导出格式</span>
                <select v-model="exportFormat">
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                </select>
              </label>

              <label class="field-label compact-field">
                <span>导出方式</span>
                <select v-model="exportMode">
                  <option value="single">单日</option>
                  <option value="range">区间</option>
                  <option value="manual">多选</option>
                </select>
              </label>

              <div v-if="exportMode === 'range'" class="range-grid">
                <label class="field-label compact-field">
                  <span>开始</span>
                  <input v-model="exportStartDate" type="date" />
                </label>
                <label class="field-label compact-field">
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

              <button type="button" class="primary-btn full-width compact-top" @click="exportPlans">导出计划</button>
            </div>
          </aside>
        </section>
      </section>
    </section>
  </main>
</template>

<style scoped>
.daily-plan-page {
  min-height: 100vh;
  padding: 0;
  background: linear-gradient(145deg, #edf4ff 0%, #e5ebf5 100%);
}

.workspace-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  background: rgba(255, 255, 255, 0.45);
}

.sidebar-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 28px 22px;
  background: rgba(255, 255, 255, 0.86);
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  box-sizing: border-box;
}

.sidebar-header h1,
.hero-panel h2,
.panel-head h3 {
  margin: 0;
  color: #1f2b48;
}

.sidebar-header h1 {
  font-size: 30px;
  margin-bottom: 8px;
}

.sidebar-description,
.hero-description,
.empty-state p,
.date-item small,
.field-label span,
.hero-status span {
  color: #5a6e8a;
  line-height: 1.5;
}

.panel-badge {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label span {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

input,
textarea,
select,
button {
  font: inherit;
}

input,
textarea,
select {
  width: 100%;
  border: 1px solid #d6deec;
  border-radius: 18px;
  background: #fff;
  color: #1f2a3e;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input,
select {
  min-height: 44px;
  padding: 0 14px;
}

textarea {
  padding: 12px 14px;
  resize: vertical;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #8ba0c7;
  box-shadow: 0 0 0 3px rgba(99, 128, 180, 0.18);
}

.primary-btn,
.secondary-btn,
.date-item,
.task-check,
.delete-btn {
  border: none;
  cursor: pointer;
}

.primary-btn,
.secondary-btn {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  font-weight: 700;
}

.primary-btn {
  background: #2c3e66;
  color: #fff;
}

.secondary-btn {
  background: #eef2fa;
  color: #2c3e66;
}

.full-width {
  width: 100%;
}

.date-list-shell {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  padding: 16px;
  border-radius: 24px;
  background: rgba(240, 245, 255, 0.8);
}

.date-list-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  color: #4a5b7a;
  font-size: 13px;
  font-weight: 700;
}

.date-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}

.date-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  text-align: left;
  border-radius: 18px;
  background: #fff;
  color: #2c3e66;
  border: 1px solid #e7eef9;
}

.date-item span {
  font-weight: 700;
}

.date-item.active {
  background: #2c3e66;
  color: #fff;
}

.date-item.active small {
  color: rgba(255, 255, 255, 0.78);
}

.main-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
}

.hero-panel,
.stat-card,
.quick-add-panel,
.tasks-panel,
.tools-panel,
.tool-card {
  background: rgba(255, 255, 255, 0.86);
  border-radius: 28px;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.06);
}

.hero-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px;
}

.hero-panel h2 {
  font-size: 28px;
  margin-bottom: 8px;
}

.hero-status {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 18px 20px;
}

.stat-card span {
  display: block;
  margin-bottom: 8px;
  color: #6a7b9b;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
}

.stat-card strong {
  color: #2c3e66;
  font-size: 34px;
}

.quick-add-panel {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 18px 20px;
}

.quick-add-panel input {
  flex: 1;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) 320px;
  gap: 18px;
  min-height: 0;
  flex: 1;
}

.tasks-panel,
.tools-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 20px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.compact-head {
  margin-bottom: 12px;
}

.panel-head h3 {
  font-size: 22px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.task-item {
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 22px;
  background: #fff;
  border: 1px solid #eef2fa;
  transition: 0.2s;
  cursor: pointer;
}

.task-item:hover,
.task-item.expanded {
  border-color: #cdd9f0;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.04);
  transform: translateY(-1px);
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
  font-weight: 600;
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

.tool-card {
  padding: 18px;
  min-height: 0;
}

.range-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.compact-field {
  margin-top: 10px;
}

.manual-date-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
  max-height: 220px;
  overflow: auto;
}

.manual-date-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #4a5b7a;
}

.compact-top {
  margin-top: 14px;
}

.empty-state {
  text-align: center;
  padding: 42px 20px;
  background: #f8fbff;
  border-radius: 24px;
  color: #8698b5;
}

.empty-state strong {
  display: block;
  margin-bottom: 8px;
  color: #4a5b7a;
}

@media (max-width: 1100px) {
  .workspace-shell {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .workspace-shell {
    grid-template-columns: 1fr;
  }

  .sidebar-panel {
    border-right: none;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  }

  .main-panel {
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .main-panel {
    padding: 16px;
  }

  .hero-panel,
  .quick-add-panel,
  .panel-head,
  .hero-status,
  .task-row {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-grid,
  .range-grid {
    grid-template-columns: 1fr;
  }
}
</style>
