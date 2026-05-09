<script setup lang="ts">
import { homeCards } from '@/dataset/home'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getUser } from '../utils/auth'

const router = useRouter()
const user = ref(getUser())

const cards = homeCards.map((card) => {
  if (!card.route) {
    return {
      ...card,
      onClick: undefined,
    }
  }

  const route = card.route

  return {
    ...card,
    onClick: () => router.push(route),
  }
})
</script>

<template>
  <main class="home-page">
    <section class="home-shell">
      <div class="home-header-card">
        <p class="home-badge">FireBird Client</p>
        <h1>欢迎回来</h1>
          <p class="home-description">保持登录页面的卡片风格，以下内容作为首页功能入口占位。</p>
          <p class="profile-row">
            用户名：{{ user?.username || '-' }} | ID：{{ user?.id || '-' }} | 角色：{{ user?.role || '-' }}
          </p>
      </div>

      <section class="card-grid">
        <article
          v-for="card in cards"
          :key="card.title"
          class="feature-card"
          :class="{ clickable: card.onClick }"
          @click="card.onClick?.()"
        >
          <h2>{{ card.title }}</h2>
          <p>{{ card.description }}</p>
          <span>{{ card.actionText }}</span>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
}

.home-shell {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

.home-header-card,
.feature-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  box-sizing: border-box;
}

.home-header-card {
  padding: 40px 32px;
  margin-bottom: 24px;
}

.home-badge {
  margin: 0 0 12px;
  color: #2563eb;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-header-card h1 {
  margin: 0;
  color: #0f172a;
  font-size: 36px;
}

.home-description {
  margin: 16px 0 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.6;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
}

.feature-card {
  padding: 28px 24px;
}

.feature-card h2 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
}

.feature-card p {
  margin: 14px 0 20px;
  color: #475569;
  line-height: 1.7;
}

.feature-card span {
  color: #2563eb;
  font-weight: 700;
}

.clickable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.28);
}
</style>
