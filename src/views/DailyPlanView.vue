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
const expandedTaskId = ref('')

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

const toggleTaskExpanded = (taskId: string) => {
  expandedTaskId.value = expandedTaskId.value === taskId ? '' : taskId
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

  const newTask = {
    id: createId(),
    title: '新的计划事项',
    time: '',
    done: false,
    note: '',
  }

  plansByDate.value = {
    ...plansByDate.value,
    [selectedDate.value]: {
      ...currentPlan.value,
      tasks: [...currentPlan.value.tasks, newTask],
    },
  }
  expandedTaskId.value = newTask.id
}

const removeTask = (taskId: string) => {
  if (!currentPlan.value) {
    return
  }

  const nextTasks = currentPlan.value.tasks.filter((task) => task.id !== taskId)

  plansByDate.value = {
    ...plansByDate.value,
    [selectedDate.value]: {
      ...currentPlan.value,
      tasks: nextTasks,
    },
  }

  if (expandedTaskId.value === taskId) {
    expandedTaskId.value = nextTasks[0]?.id ?? ''
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
          <p class="page-description">聚焦当天重点任务，点击计划即可展开时间和备注细节。</p>
        </div>
        <div class="date-card">
          <span>当前日期</span>
          <strong>{{ formattedSelectedDate }}</strong>
        </div>
      </header>

      <section class="toolbar-grid">
        <article class="summary-card compact-card">
          <p class="section-badge">概览</p>
          <h2>进度</h2>
          <div class="summary-number">{{ completedCount }}/{{ currentPlan?.tasks.length ?? 0 }}</div>
          <p class="summary-text">{{ currentPlan?.completed ? '当日计划已完成' : '继续推进今日安排' }}</p>
          <button type="button" class="ghost-button" @click="toggleDayCompleted">
            {{ currentPlan?.completed ? '取消完成' : '标记完成' }}
          </button>
        </article>

        <article class="control-card compact-card">
          <div class="compact-card-header">
            <div>
              <p class="section-badge">日期</p>
              <h2>选择计划日</h2>
            </div>
            <button type="button" class="ghost-button" @click="createDatePlan">创建</button>
          </div>

          <label class="field-label inline-field">
            <span>日期</span>
            <input :value="selectedDate" type="date" @input="selectDate(($event.target as HTMLInputElement).value)" />
          </label>

          <div class="date-chip-list compact-chip-list">
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
        <article class="export-card compact-card">
          <div class="compact-card-header">
            <div>
              <p class="section-badge">导出</p>
              <h2>导出计划</h2>
            </div>
            <button type="button" class="ghost-button" @click="exportPlans">导出</button>
          </div>

          <label class="field-label inline-field">
            <span>格式</span>
            <select v-model="exportFormat">
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
            </select>
          </label>

          <label class="field-label inline-field">
            <span>方式</span>
            <select v-model="exportMode">
              <option value="single">单日</option>
              <option value="range">区间</option>
              <option value="manual">多选</option>
            </select>
          </label>

          <template v-if="exportMode === 'range'">
            <label class="field-label inline-field">
              <span>开始</span>
              <input v-model="exportStartDate" type="date" />
            </label>
            <label class="field-label inline-field">
              <span>结束</span>
              <input v-model="exportEndDate" type="date" />
            </label>
          </template>

          <div v-if="exportMode === 'manual'" class="manual-date-list compact-manual-list">
            <label v-for="date in sortedDates" :key="date" class="manual-date-item">
              <input :checked="manualSelectedDates.includes(date)" type="checkbox" @change="toggleManualDate(date)" />
              <span>{{ date }}</span>
            </label>
          </div>
        </article>

        <article class="tasks-card focus-card">
          <div class="tasks-header">
            <div>
              <p class="section-badge">任务列表</p>
              <h2>{{ currentPlan?.date || '未选择日期' }}</h2>
            </div>
            <button type="button" class="primary-button" @click="addTask">新增计划</button>
          </div>

          <div class="task-list compact-task-list">
            <article
              v-for="task in currentPlan?.tasks ?? []"
              :key="task.id"
              class="task-item"
              :class="{ done: task.done, expanded: expandedTaskId === task.id }"
            >
              <button type="button" class="task-summary" @click="toggleTaskExpanded(task.id)">
                <div class="task-summary-main">
                  <label class="task-check" @click.stop>
                    <input :checked="task.done" type="checkbox" @change="updateTask(task.id, { done: !task.done })" />
                    <span>{{ task.done ? '已完成' : '待完成' }}</span>
                  </label>

                  <input
                    class="task-title-input"
                    :value="task.title"
                    type="text"
                    @click.stop
                    @input="updateTask(task.id, { title: ($event.target as HTMLInputElement).value })"
                  />
                </div>

                <div class="task-summary-side">
                  <span class="task-time-pill">{{ task.time || '未设置时间' }}</span>
                  <span class="task-expand-indicator">{{ expandedTaskId === task.id ? '收起' : '展开' }}</span>
                </div>
              </button>

              <div v-if="expandedTaskId === task.id" class="task-detail-panel">
                <label class="field-label">
                  <span>时间安排</span>
                  <input :value="task.time" type="text" placeholder="例如 10:00 - 11:00" @input="updateTask(task.id, { time: ($event.target as HTMLInputElement).value })" />
                </label>

                <label class="field-label">
                  <span>补充说明</span>
                  <textarea :value="task.note" rows="4" placeholder="写下这项计划的补充说明..." @input="updateTask(task.id, { note: ($event.target as HTMLTextAreaElement).value })"></textarea>
                </label>

                <div class="task-detail-actions">
                  <button type="button" class="link-button" @click="removeTask(task.id)">删除这条计划</button>
                </div>
              </div>
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
  padding: 20px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.18), transparent 28%),
    linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #60a5fa 100%);
}

.daily-plan-shell {
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
}

.hero-card,
.summary-card,
.control-card,
.export-card,
.tasks-card {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
  box-sizing: border-box;
}

.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 28px;
  margin-bottom: 18px;
}

.page-badge,
.section-badge {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 12px;
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
  font-size: 30px;
}

.page-description,
.summary-text,
.empty-text,
.field-label span,
.task-check span,
.task-expand-indicator {
  color: #475569;
  line-height: 1.5;
}

.page-description {
  margin: 10px 0 0;
  max-width: 520px;
  font-size: 14px;
}

.date-card {
  min-width: 200px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.date-card span {
  display: block;
  margin-bottom: 6px;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.date-card strong {
  color: #0f172a;
  font-size: 16px;
  line-height: 1.5;
}

.toolbar-grid,
.content-grid {
  display: grid;
  gap: 18px;
  margin-bottom: 18px;
}

.toolbar-grid {
  grid-template-columns: 220px minmax(0, 1fr);
}

.content-grid {
  grid-template-columns: 260px minmax(0, 1fr);
}

.compact-card,
.focus-card {
  padding: 20px;
}

.focus-card {
  padding: 22px;
}

.summary-number {
  margin: 10px 0;
  color: #2563eb;
  font-size: 40px;
  font-weight: 800;
}

.summary-text,
.empty-text {
  margin: 0 0 14px;
}

.primary-button,
.ghost-button,
.date-chip,
select,
input,
textarea,
.link-button,
.task-summary {
  border-radius: 12px;
  font-size: 14px;
  box-sizing: border-box;
}

.primary-button,
.ghost-button,
.date-chip,
.link-button,
.task-summary {
  border: none;
}

.primary-button,
.ghost-button,
.date-chip,
.link-button {
  cursor: pointer;
}

.primary-button {
  min-height: 40px;
  padding: 0 16px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
  font-weight: 700;
}

.ghost-button {
  min-height: 36px;
  padding: 0 14px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-weight: 700;
}

.compact-card-header,
.tasks-header,
.task-detail-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tasks-header {
  margin-bottom: 16px;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
}

.inline-field {
  margin-top: 12px;
}

.field-label span,
.task-check span {
  font-size: 13px;
  font-weight: 700;
}

select,
input,
textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

select,
input {
  min-height: 40px;
  padding: 0 12px;
}

textarea {
  padding: 12px;
  resize: vertical;
}

select:focus,
input:focus,
textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.date-chip-list,
.manual-date-list,
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.compact-chip-list {
  margin-top: 14px;
  max-height: 180px;
  overflow: auto;
}

.date-chip {
  padding: 10px 12px;
  background: #eff6ff;
  color: #1d4ed8;
  text-align: left;
  font-weight: 700;
}

.date-chip.active {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
}

.compact-manual-list {
  margin-top: 12px;
  max-height: 180px;
  overflow: auto;
}

.manual-date-item,
.task-check {
  display: flex;
  align-items: center;
  gap: 10px;
}

.compact-task-list {
  gap: 12px;
}

.task-item {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98) 0%, rgba(239, 246, 255, 0.92) 100%);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.task-item:hover,
.task-item.expanded {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow: 0 18px 34px rgba(37, 99, 235, 0.12);
}

.task-item.done {
  background: linear-gradient(180deg, rgba(240, 253, 244, 0.98) 0%, rgba(220, 252, 231, 0.9) 100%);
}

.task-summary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.task-summary-main,
.task-summary-side {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-summary-main {
  min-width: 0;
  flex: 1;
}

.task-summary-side {
  flex-shrink: 0;
}

.task-title-input {
  border: none;
  background: transparent;
  min-height: auto;
  padding: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  box-shadow: none;
}

.task-title-input:focus {
  box-shadow: none;
}

.task-time-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.task-expand-indicator {
  font-size: 12px;
  font-weight: 700;
}

.task-detail-panel {
  padding: 0 18px 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.link-button {
  padding: 0;
  background: transparent;
  color: #dc2626;
  font-weight: 700;
}

@media (max-width: 960px) {
  .daily-plan-page {
    padding: 14px;
  }

  .hero-card {
    flex-direction: column;
    align-items: flex-start;
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

@media (max-width: 720px) {
  .task-summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .task-summary-side {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
