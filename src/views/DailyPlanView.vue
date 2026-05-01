<script setup lang="ts">
import { computed, ref } from 'vue'

interface DailyTask {
  id: number
  title: string
  time: string
  done: boolean
}

const today = new Date()
const dateText = computed(() =>
  today.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }),
)

const tasks = ref<DailyTask[]>([
  { id: 1, title: '整理今日重点事项', time: '09:00 - 09:30', done: true },
  { id: 2, title: '推进核心功能开发', time: '10:00 - 12:00', done: false },
  { id: 3, title: '午后复盘与问题处理', time: '14:00 - 15:30', done: false },
  { id: 4, title: '记录结果并准备明日计划', time: '17:00 - 17:30', done: false },
])

const completedCount = computed(() => tasks.value.filter((task) => task.done).length)

const toggleTask = (taskId: number) => {
  tasks.value = tasks.value.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task))
}
</script>

<template>
  <main class="daily-plan-page">
    <section class="daily-plan-shell">
      <header class="hero-card">
        <div>
          <p class="page-badge">Daily Plan</p>
          <h1>每日计划</h1>
          <p class="page-description">聚焦今天最重要的安排，按节奏推进每一项任务。</p>
        </div>
        <div class="date-card">
          <span>今天</span>
          <strong>{{ dateText }}</strong>
        </div>
      </header>

      <section class="content-grid">
        <article class="summary-card">
          <p class="section-badge">概览</p>
          <h2>今日进度</h2>
          <div class="summary-number">{{ completedCount }}/{{ tasks.length }}</div>
          <p class="summary-text">已完成 {{ completedCount }} 项任务，继续保持专注节奏。</p>
        </article>

        <article class="tasks-card">
          <div class="tasks-header">
            <div>
              <p class="section-badge">任务列表</p>
              <h2>今日安排</h2>
            </div>
          </div>

          <div class="task-list">
            <label v-for="task in tasks" :key="task.id" class="task-item" :class="{ done: task.done }">
              <input :checked="task.done" type="checkbox" @change="toggleTask(task.id)" />
              <div>
                <strong>{{ task.title }}</strong>
                <span>{{ task.time }}</span>
              </div>
            </label>
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
  max-width: 1080px;
  margin: 0 auto;
}

.hero-card,
.summary-card,
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
.tasks-card h2 {
  margin: 0;
  color: #0f172a;
}

.hero-card h1 {
  font-size: 36px;
}

.page-description,
.summary-text,
.task-item span {
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

.content-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
}

.summary-card,
.tasks-card {
  padding: 28px;
}

.summary-number {
  margin: 12px 0;
  color: #2563eb;
  font-size: 48px;
  font-weight: 800;
}

.summary-text {
  margin: 0;
}

.tasks-header {
  margin-bottom: 18px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%);
}

.task-item input {
  width: 18px;
  height: 18px;
  margin-top: 3px;
  accent-color: #2563eb;
}

.task-item strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
  font-size: 16px;
}

.task-item span {
  display: block;
  font-size: 14px;
}

.task-item.done strong,
.task-item.done span {
  text-decoration: line-through;
  opacity: 0.7;
}

@media (max-width: 900px) {
  .hero-card {
    flex-direction: column;
  }

  .date-card {
    min-width: 0;
    width: 100%;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
