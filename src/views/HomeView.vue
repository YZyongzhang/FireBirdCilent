<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUser } from '../utils/auth'
import { logout } from '../router'
import { recharge, getCurrentUser } from '../utils/user'

const router = useRouter()

const user = ref(getUser())
const userBalance = ref(0)

// 充值相关
const showRechargeModal = ref(false)
const rechargeAmount = ref('')
const rechargeLoading = ref(false)

const handleLogout = () => {
  logout()
}

async function fetchUserBalance() {
  try {
    const res = await getCurrentUser()
    if (res.data) {
      userBalance.value = res.data.balance || 0
    }
  } catch (e) {
    console.error('获取用户余额失败:', e)
  }
}

onMounted(() => {
  fetchUserBalance()
})

async function openRechargeModal() {
  showRechargeModal.value = true
}

async function closeRechargeModal() {
  showRechargeModal.value = false
  rechargeAmount.value = ''
}

async function handleRecharge() {
  const amount = parseFloat(rechargeAmount.value)
  if (isNaN(amount) || amount <= 0) {
    alert('请输入有效的充值金额')
    return
  }
  
  rechargeLoading.value = true
  try {
    const res = await recharge(amount)
    if (res.success) {
      userBalance.value = res.balance || 0
      alert(`充值成功！当前余额：${userBalance.value.toFixed(2)}元`)
      closeRechargeModal()
    } else {
      alert(res.message || '充值失败')
    }
  } catch (e) {
    console.error('充值失败:', e)
    alert('充值失败，请稍后重试')
  } finally {
    rechargeLoading.value = false
  }
}

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const currentDate = computed(() => {
  const now = new Date()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
})

const cards = [
  {
    icon: '💭',
    title: '个人思考记录',
    description: '记录和整理你的个人想法、复盘和灵感。',
    actionText: '进入页面',
    onClick: () => router.push('/thoughts'),
    color: '#8b5cf6',
  },
  {
    icon: '🛒',
    title: '二手交易',
    description: '发布与浏览二手商品，发现更多好物。',
    actionText: '进入页面',
    onClick: () => router.push('/secondhand'),
    color: '#22c55e',
  },
  {
    icon: '📅',
    title: '每日计划',
    description: '查看今天的安排、任务优先级和关键提醒。',
    actionText: '进入页面',
    onClick: () => router.push('/daily-plan'),
    color: '#3b82f6',
  },
  {
    icon: '📚',
    title: '资料库',
    description: '收集常用资料、文档和外部链接。',
    actionText: '敬请期待',
    color: '#f59e0b',
    disabled: true,
  },
  {
    icon: '✨',
    title: '灵感卡片',
    description: '捕捉灵感瞬间，记录创意火花。',
    actionText: '敬请期待',
    color: '#ec4899',
    disabled: true,
  },
]
</script>

<template>
  <main class="home-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
    </div>

    <section class="home-shell">
      <!-- 欢迎卡片 -->
      <div class="home-header-card">
        <div class="header-content">
          <div class="header-top">
            <span class="home-badge">🔥 FireBird</span>
            <div class="header-right">
              <span class="date-badge">{{ currentDate }}</span>
              <button class="logout-btn" @click="handleLogout">
                <span class="logout-icon">🚪</span>
                <span>退出登录</span>
              </button>
            </div>
          </div>
          <h1>
            {{ greeting }}，{{ user?.username || '用户' }}
            <span class="wave-hand">👋</span>
          </h1>
          <p class="home-description">
            今天也要保持高效和专注，开启美好的一天！
          </p>
          <div class="profile-info">
            <div class="profile-item">
              <span class="profile-label">用户ID</span>
              <span class="profile-value">{{ user?.id || '-' }}</span>
            </div>
            <div class="profile-divider"></div>
            <div class="profile-item">
              <span class="profile-label">角色</span>
              <span 
                class="profile-value role-tag"
                :class="user?.role"
              >
                {{ user?.role === 'admin' ? '管理员' : user?.role === 'seller' ? '卖家' : '普通用户' }}
              </span>
            </div>
            <div class="profile-divider"></div>
            <div class="profile-item balance-item">
              <span class="profile-label">余额</span>
              <span class="profile-value balance-value">¥{{ userBalance.toFixed(2) }}</span>
              <button class="recharge-btn" @click="openRechargeModal">充值</button>
            </div>
          </div>
        </div>
        <div class="header-decoration">
          <div class="decoration-ring"></div>
          <div class="decoration-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      <!-- 功能卡片网格 -->
      <section class="card-grid">
        <article
          v-for="(card, index) in cards"
          :key="card.title"
          class="feature-card"
          :class="{ clickable: card.onClick, disabled: card.disabled }"
          @click="card.onClick?.()"
          :style="{ '--card-color': card.color, '--animation-delay': `${index * 100}ms` }"
        >
          <div class="card-icon" :style="{ background: `linear-gradient(135deg, ${card.color}20, ${card.color}10)` }">
            {{ card.icon }}
          </div>
          <div class="card-content">
            <h2>{{ card.title }}</h2>
            <p>{{ card.description }}</p>
          </div>
          <div class="card-action">
            <span>{{ card.actionText }}</span>
            <svg v-if="card.onClick" class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </article>
      </section>

      <!-- 底部装饰 -->
      <div class="bottom-decoration">
        <span class="footer-text">Powered by FireBird</span>
        <div class="footer-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </section>

    <!-- 充值弹窗 -->
    <div v-if="showRechargeModal" class="modal-overlay" @click.self="closeRechargeModal">
      <div class="modal recharge-modal">
        <button class="close" @click="closeRechargeModal">×</button>
        <h2>💰 充值</h2>
        <div class="form-group">
          <label>充值金额</label>
          <input 
            v-model="rechargeAmount" 
            type="number" 
            placeholder="请输入充值金额"
            :disabled="rechargeLoading"
          />
        </div>
        <div class="quick-amounts">
          <button 
            v-for="amount in [10, 50, 100, 500]" 
            :key="amount"
            class="quick-btn"
            @click="rechargeAmount = String(amount)"
            :disabled="rechargeLoading"
          >
            ¥{{ amount }}
          </button>
        </div>
        <button 
          class="submit-btn" 
          @click="handleRecharge"
          :disabled="rechargeLoading"
        >
          {{ rechargeLoading ? '充值中...' : '确认充值' }}
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #7c3aed 100%);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.12;
  filter: blur(40px);
  animation: float 25s infinite ease-in-out;
}

.circle-1 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  top: -150px;
  right: -150px;
}

.circle-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  bottom: -100px;
  left: -100px;
  animation-delay: -10s;
}

.circle-3 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #ec4899, #f472b6);
  top: 40%;
  right: 20%;
  animation-delay: -5s;
}

.floating-shape {
  position: absolute;
  border-radius: 20px;
  opacity: 0.08;
  animation: floatShape 15s infinite ease-in-out;
}

.shape-1 {
  width: 120px;
  height: 120px;
  background: #8b5cf6;
  top: 20%;
  left: 10%;
  transform: rotate(45deg);
}

.shape-2 {
  width: 80px;
  height: 80px;
  background: #6366f1;
  bottom: 30%;
  right: 15%;
  border-radius: 50%;
  animation-delay: -7s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(20px, 10px) scale(1.02); }
}

@keyframes floatShape {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(40px, -40px) rotate(180deg); }
}

.home-shell {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* 欢迎卡片 */
.home-header-card {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 
    0 25px 80px rgba(76, 29, 149, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.3) inset;
  box-sizing: border-box;
  padding: 40px;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
  animation: cardFadeIn 0.6s ease-out;
}

.home-header-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(139, 92, 246, 0.04) 90deg,
    transparent 180deg,
    rgba(99, 102, 241, 0.04) 270deg,
    transparent 360deg
  );
  animation: rotate 25s linear infinite;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.header-content {
  position: relative;
  z-index: 1;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.home-badge {
  padding: 6px 16px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border-radius: 20px;
  letter-spacing: 0.05em;
}

.date-badge {
  padding: 6px 16px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  border-radius: 20px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 16px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
}

.logout-btn:hover {
  background: #fee2e2;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
}

.logout-icon {
  font-size: 14px;
}

.home-header-card h1 {
  margin: 0;
  color: #0f172a;
  font-size: 42px;
  font-weight: 700;
  line-height: 1.2;
}

.wave-hand {
  display: inline-block;
  animation: wave 1s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(20deg); }
  75% { transform: rotate(-20deg); }
}

.home-description {
  margin: 16px 0 24px;
  color: #64748b;
  font-size: 16px;
  line-height: 1.6;
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.profile-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.profile-value {
  font-size: 14px;
  color: #334155;
  font-weight: 600;
}

.role-tag {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.role-tag.user {
  background: #dcfce7;
  color: #16a34a;
}

.role-tag.seller {
  background: #fef3c7;
  color: #d97706;
}

.role-tag.admin {
  background: #fecaca;
  color: #dc2626;
}

.profile-divider {
  width: 1px;
  height: 32px;
  background: #e2e8f0;
}

.balance-item {
  position: relative;
}

.balance-value {
  color: #22c55e !important;
  font-size: 18px !important;
}

.recharge-btn {
  position: absolute;
  right: -60px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px 12px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.recharge-btn:hover {
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.header-decoration {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 200px;
  height: 200px;
  pointer-events: none;
}

.decoration-ring {
  position: absolute;
  width: 120px;
  height: 120px;
  border: 2px solid rgba(139, 92, 246, 0.1);
  border-radius: 50%;
  top: 40px;
  right: 40px;
}

.decoration-dots {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 12px;
  right: 20px;
  top: 60px;
}

.decoration-dots span {
  width: 8px;
  height: 8px;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 50%;
}

/* 功能卡片网格 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.feature-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.15);
  box-sizing: border-box;
  padding: 28px;
  position: relative;
  overflow: hidden;
  animation: cardFadeIn 0.5s ease-out backwards;
  animation-delay: var(--animation-delay);
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--card-color), var(--card-color)80);
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 20px;
  transition: transform 0.3s ease;
}

.card-content h2 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
  font-weight: 700;
}

.card-content p {
  margin: 10px 0 24px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
}

.card-action {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-action span {
  color: var(--card-color);
  font-weight: 600;
  font-size: 14px;
}

.arrow-icon {
  width: 16px;
  height: 16px;
  color: var(--card-color);
  transition: transform 0.3s ease;
}

.clickable {
  cursor: pointer;
  transition: all 0.3s ease;
}

.clickable:hover {
  transform: translateY(-6px);
  box-shadow: 0 24px 60px rgba(76, 29, 149, 0.2);
}

.clickable:hover .card-icon {
  transform: scale(1.1);
}

.clickable:hover .arrow-icon {
  transform: translateX(4px);
}

.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.disabled .card-action span {
  color: #94a3b8;
}

/* 底部装饰 */
.bottom-decoration {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 48px;
  padding-bottom: 24px;
}

.footer-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  font-weight: 500;
}

.footer-dots {
  display: flex;
  gap: 6px;
}

.footer-dots span {
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

.footer-dots span:nth-child(2) {
    background: rgba(139, 92, 246, 0.6);
  }

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  position: relative;
}

.modal .close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal .close:hover {
  background: #e2e8f0;
}

.modal h2 {
  margin: 0 0 20px;
  color: #0f172a;
  font-size: 24px;
}

.modal .form-group {
  margin-bottom: 16px;
}

.modal .form-group label {
  display: block;
  margin-bottom: 8px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.modal .form-group input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  transition: all 0.25s ease;
  box-sizing: border-box;
}

.modal .form-group input:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
}

.modal .form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-amounts {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.quick-btn {
  flex: 1;
  height: 40px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.quick-btn:hover:not(:disabled) {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.quick-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal .submit-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.modal .submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}

.modal .submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .home-page {
    padding: 16px;
  }

  .home-header-card {
    padding: 28px 24px;
  }

  .home-header-card h1 {
    font-size: 32px;
  }

  .profile-info {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .profile-divider {
    display: none;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
