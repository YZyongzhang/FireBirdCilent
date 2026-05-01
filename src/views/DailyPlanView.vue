<script setup lang="ts">
import { computed, ref, watch } from 'vue'

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

const storageKey = 'firebird-daily-plans'

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

const plansByDate = ref<Record<string, DailyPlan>>({
  [todayKey]: createPlan(todayKey),
})
const selectedDate = ref(todayKey)
const exportFormat = ref<'markdown' | 'json'>('markdown')
const exportMode = ref<'single' | 'range' | 'manual'>('single')
const exportStartDate = ref(todayKey)
const exportEndDate = ref(todayKey)
const manualSelectedDates = ref<string[]>([todayKey])

const loadState = () => {
  const stored = localStorage.getItem(storageKey)

  if (!stored) {
    return
  }

  const parsed = JSON.parse(stored) as {
    plansByDate?: Record<string, DailyPlan>
  }

  if (parsed.plansByDate && Object.keys(parsed.plansByDate).length) {
    plansByDate.value = parsed.plansByDate
  }
}

loadState()

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
const completedCount = computed(() => currentPlan.value?.tasks.filter((task) => task.done).length ?? 0)
const isCurrentPlanFullyDone = computed(() => {
  if (!currentPlan.value) {
    return false
  }

  return currentPlan.value.tasks.length > 0 && currentPlan.value.tasks.every((task) => task.done)
})
const formattedSelectedDate = computed(() => {
  if (!currentPlan.value?.date) {
    return ''
  }

  return new Date(`${currentPlan.value.date}T00:00:00`).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
})

watch(
  plansByDate,
  () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        plansByDate: plansByDate.value,
      }),
    )
  },
  { deep: true, immediate: true },
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

const createDatePlan = () => {
  ensurePlan(selectedDate.value)
}

const toggleDayCompleted = () => {
  if (!currentPlan.value) {
    return
  }

  plansByDate.value = {
    ...plansByDate.value,
    [selectedDate.value]: {
      ...currentPlan.value,
      completed: !currentPlan.value.completed,
    },
  }
}

const updateTask = (taskId: string, patch: Partial<DailyTask>) => {
  if (!currentPlan.value) {
    return
  }

  plansByDate.value = {
    ...plansByDate.value,
    [selectedDate.value]: {
      ...currentPlan.value,
      tasks: currentPlan.value.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
    },
  }
}

const addTask = () => {
  if (!currentPlan.value) {
    return
  }

  plansByDate.value = {
    ...plansByDate.value,
    [selectedDate.value]: {
      ...currentPlan.value,
      tasks: [
        ...currentPlan.value.tasks,
        {
          id: createId(),
          title: '新的计划事项',
          time: '',
          done: false,
          note: '',
        },
      ],
    },
  }
}

const removeTask = (taskId: string) => {
  if (!currentPlan.value) {
    return
  }

  plansByDate.value = {
    ...plansByDate.value,
    [selectedDate.value]: {
      ...currentPlan.value,
      tasks: currentPlan.value.tasks.filter((task) => task.id !== taskId),
    },
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
    <section class="daily-plan-shell">
      <header class="hero-card">
        <div>
          <p class="page-badge">Daily Plan</p>
          <h1>每日计划</h1>
          <p class="page-description">按日期安排任务、补充说明，并将单日或多日计划导出保存。</p>
        </div>
        <div class="date-card">
          <span>当前日期</span>
          <strong>{{ formattedSelectedDate }}</strong>
        </div>
      </header>

      <section class="toolbar-grid">
        <article class="summary-card">
          <p class="section-badge">概览</p>
          <h2>当日进度</h2>
          <div class="summary-number">{{ completedCount }}/{{ currentPlan?.tasks.length ?? 0 }}</div>
          <p class="summary-text">任务完成状态：{{ isCurrentPlanFullyDone ? '全部完成' : '进行中' }}</p>
          <button type="button" class="primary-button" @click="toggleDayCompleted">
            {{ currentPlan?.completed ? '标记为未完成' : '标记当日计划完成' }}
          </button>
        </article>

        <article class="control-card">
          <p class="section-badge">日期计划</p>
          <h2>选择或创建日期</h2>
          <label class="field-label">
            <span>计划日期</span>
            <input :value="selectedDate" type="date" @input="selectDate(($event.target as HTMLInputElement).value)" />
          </label>
          <div class="control-actions">
            <button type="button" class="primary-button" @click="createDatePlan">创建当天计划</button>
          </div>
          <div class="date-chip-list">
            <button
              v-for="date in sortedDates"
              :key="date"
              type="button"
              class="date-chip"
              :class="{ active: date === selectedDate }"
              @click="selectDate(date)"
            >
              {{ date }}
            </button>
          </div>
        </article>
      </section>

      <section class="content-grid">
        <article class="export-card">
          <p class="section-badge">导出</p>
          <h2>导出计划</h2>

          <label class="field-label">
            <span>导出格式</span>
            <select v-model="exportFormat">
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
            </select>
          </label>

          <label class="field-label">
            <span>导出方式</span>
            <select v-model="exportMode">
              <option value="single">单日导出</option>
              <option value="range">按日期区间</option>
              <option value="manual">手动多选日期</option>
            </select>
          </label>

          <template v-if="exportMode === 'range'">
            <label class="field-label">
              <span>开始日期</span>
              <input v-model="exportStartDate" type="date" />
            </label>
            <label class="field-label">
              <span>结束日期</span>
              <input v-model="exportEndDate" type="date" />
            </label>
          </template>

          <div v-if="exportMode === 'manual'" class="manual-date-list">
            <label v-for="date in sortedDates" :key="date" class="manual-date-item">
              <input :checked="manualSelectedDates.includes(date)" type="checkbox" @change="toggleManualDate(date)" />
              <span>{{ date }}</span>
            </label>
          </div>

          <button type="button" class="primary-button export-button" @click="exportPlans">导出计划</button>
        </article>

        <article class="tasks-card">
          <div class="tasks-header">
            <div>
              <p class="section-badge">任务列表</p>
              <h2>{{ currentPlan?.date || '未选择日期' }}</h2>
            </div>
            <button type="button" class="primary-button" @click="addTask">新增计划</button>
          </div>

          <div class="task-list">
            <article v-for="task in currentPlan?.tasks ?? []" :key="task.id" class="task-item" :class="{ done: task.done }">
              <div class="task-top-row">
                <label class="task-check">
                  <input :checked="task.done" type="checkbox" @change="updateTask(task.id, { done: !task.done })" />
                  <span>完成</span>
                </label>
                <button type="button" class="link-button" @click="removeTask(task.id)">删除</button>
              </div>

              <label class="field-label">
                <span>计划标题</span>
                <input :value="task.title" type="text" @input="updateTask(task.id, { title: ($event.target as HTMLInputElement).value })" />
              </label>

              <label class="field-label">
                <span>时间安排</span>
                <input :value="task.time" type="text" placeholder="例如 10:00 - 11:00" @input="updateTask(task.id, { time: ($event.target as HTMLInputElement).value })" />
              </label>

              <label class="field-label">
                <span>补充说明</span>
                <textarea :value="task.note" rows="4" placeholder="写下这项计划的补充说明..." @input="updateTask(task.id, { note: ($event.target as HTMLTextAreaElement).value })"></textarea>
              </label>
            </article>

            <p v-if="!(currentPlan?.tasks.length ?? 0)" class="empty-text">当前日期还没有计划，点击“新增计划”开始安排。</p>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped>
.daily-plan-page {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #60a5fa 100%);
}

.daily-plan-shell {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.hero-card,
.summary-card,
.control-card,
.export-card,
.tasks-card {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  box-sizing: border-box;
}

.hero-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 36px 32px;
  margin-bottom: 24px;
}

.page-badge,
.section-badge {
  margin: 0 0 12px;
  color: #2563eb;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-card h1,
.summary-card h2,
.control-card h2,
.export-card h2,
.tasks-card h2 {
  margin: 0;
  color: #0f172a;
}

.hero-card h1 {
  font-size: 36px;
}

.page-description,
.summary-text,
.empty-text,
.field-label span,
.task-check span {
  color: #475569;
  line-height: 1.6;
}

.page-description {
  margin: 16px 0 0;
  max-width: 560px;
}

.date-card {
  min-width: 220px;
  padding: 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.date-card span {
  display: block;
  margin-bottom: 8px;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.date-card strong {
  color: #0f172a;
  font-size: 18px;
  line-height: 1.6;
}

.toolbar-grid,
.content-grid {
  display: grid;
  gap: 24px;
  margin-bottom: 24px;
}

.toolbar-grid {
  grid-template-columns: 280px minmax(0, 1fr);
}

.content-grid {
  grid-template-columns: 320px minmax(0, 1fr);
}

.summary-card,
.control-card,
.export-card,
.tasks-card {
  padding: 28px;
}

.summary-number {
  margin: 12px 0;
  color: #2563eb;
  font-size: 48px;
  font-weight: 800;
}

.summary-text,
.empty-text {
  margin: 0 0 18px;
}

.primary-button,
.date-chip,
select,
input,
textarea,
.link-button {
  border-radius: 12px;
  font-size: 14px;
  box-sizing: border-box;
}

.primary-button,
.date-chip,
.link-button {
  border: none;
  cursor: pointer;
}

.primary-button {
  min-height: 44px;
  padding: 0 18px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
  font-weight: 700;
}

.control-actions,
.export-button {
  margin-top: 16px;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.field-label span,
.task-check span {
  font-size: 14px;
  font-weight: 700;
}

select,
input,
textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

select,
input {
  min-height: 44px;
  padding: 0 14px;
}

textarea {
  padding: 14px;
  resize: vertical;
}

select:focus,
input:focus,
textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
}

.date-chip-list,
.manual-date-list,
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-chip-list {
  margin-top: 18px;
}

.date-chip {
  padding: 12px 14px;
  background: #eff6ff;
  color: #1d4ed8;
  text-align: left;
}

.date-chip.active {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
}

.manual-date-item,
.task-check {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tasks-header,
.task-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.tasks-header {
  margin-bottom: 18px;
}

.task-item {
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%);
}

.task-item.done {
  opacity: 0.82;
}

.link-button {
  padding: 0;
  background: transparent;
  color: #dc2626;
  font-weight: 700;
}

@media (max-width: 960px) {
  .hero-card {
    flex-direction: column;
  }

  .date-card {
    min-width: 0;
    width: 100%;
  }

  .toolbar-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
