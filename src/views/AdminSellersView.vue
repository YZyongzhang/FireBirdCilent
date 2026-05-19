<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getSellers, getPendingSellers, reviewSeller } from '@/utils/secondhand'
import { getUser } from '@/utils/auth'
import type { User } from '@/utils/user'

const router = useRouter()
const user = getUser()

const sellers = ref<User[]>([])
const pendingSellers = ref<User[]>([])
const activeTab = ref<'all' | 'pending'>('all')
const loading = ref(false)
const pendingLoading = ref(false)
const error = ref('')

onMounted(() => {
  if (user?.role !== 'admin') {
    router.push('/secondhand')
    return
  }
  fetchSellers()
  fetchPendingSellers()
})

async function fetchSellers() {
  loading.value = true
  error.value = ''
  try {
    const res = await getSellers()
    if (res.status === 'ok') {
      sellers.value = res.data || []
    } else {
      error.value = res.message || '获取商家列表失败'
    }
  } catch (e: any) {
    error.value = e.message || '获取商家列表失败'
  } finally {
    loading.value = false
  }
}

async function fetchPendingSellers() {
  pendingLoading.value = true
  try {
    const res = await getPendingSellers()
    if (res.status === 'ok') {
      pendingSellers.value = res.data || []
    }
  } catch (e: any) {
    console.error('获取待审核商家失败:', e)
  } finally {
    pendingLoading.value = false
  }
}

async function handleApprove(seller: User) {
  if (!confirm(`确定要通过 ${seller.username} 的商家申请吗？`)) return
  
  try {
    const res = await reviewSeller(Number(seller.id), 'approve')
    if (res.status === 'ok') {
      alert(res.message || '审核通过')
      fetchPendingSellers()
      fetchSellers()
    } else {
      alert(res.message || '操作失败')
    }
  } catch (e: any) {
    alert('审核失败: ' + (e.message || '网络错误'))
  }
}

async function handleReject(seller: User) {
  if (!confirm(`确定要拒绝 ${seller.username} 的商家申请吗？`)) return
  
  try {
    const res = await reviewSeller(Number(seller.id), 'reject')
    if (res.status === 'ok') {
      alert(res.message || '已拒绝')
      fetchPendingSellers()
      fetchSellers()
    } else {
      alert(res.message || '操作失败')
    }
  } catch (e: any) {
    alert('操作失败: ' + (e.message || '网络错误'))
  }
}

function goToSellerDetail(sellerId: number) {
  router.push(`/admin/sellers/${sellerId}`)
}

function goBack() {
  router.push('/secondhand')
}

const currentSellers = computed(() => {
  if (activeTab.value === 'pending') {
    return pendingSellers.value
  }
  return sellers.value
})
</script>

<template>
  <div class="admin-sellers-page">
    <header class="page-header">
      <div class="header-content">
        <button class="btn-back" @click="goBack">← 返回二手市场</button>
        <h1 class="page-title">商家管理</h1>
        <div class="header-right">
          <span class="admin-badge">管理员</span>
        </div>
      </div>
    </header>

    <main class="page-content">
      <div class="content-card">
        <div class="card-header">
          <h2>商家列表</h2>
          <div class="tabs">
            <button 
              :class="{ active: activeTab === 'all' }" 
              @click="activeTab = 'all'"
            >
              全部商家
              <span class="tab-count">{{ sellers.length }}</span>
            </button>
            <button 
              :class="{ active: activeTab === 'pending' }" 
              @click="activeTab = 'pending'"
            >
              待审核
              <span class="tab-count pending">{{ pendingSellers.length }}</span>
            </button>
          </div>
        </div>

        <div v-if="loading || pendingLoading" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button @click="fetchSellers" class="btn-retry">重试</button>
        </div>

        <div v-else-if="currentSellers.length === 0" class="empty-state">
          <p>{{ activeTab === 'pending' ? '暂无待审核商家' : '暂无商家' }}</p>
        </div>

        <div v-else class="sellers-grid">
          <div
            v-for="seller in currentSellers"
            :key="seller.id"
            class="seller-card"
          >
            <div class="seller-avatar">
              {{ seller.username?.charAt(0).toUpperCase() }}
            </div>
            <!-- 大写字母作为默认头像 -->
            <div class="seller-info">
              <div class="seller-name-row">
                <h3 class="seller-name">{{ seller.username }}</h3>
                <span v-if="seller.status === 'pending'" class="status-badge pending">待审核</span>
                <span v-else-if="seller.status === 'approved'" class="status-badge approved">已通过</span>
                <span v-else-if="seller.status === 'rejected'" class="status-badge rejected">已拒绝</span>
              </div>
              <p class="seller-meta" v-if="seller.businessType">
                📦 {{ seller.businessType }}
              </p>
              <p class="seller-meta" v-if="seller.phone">
                📱 {{ seller.phone }}
              </p>
              <p class="seller-meta" v-if="seller.address">
                🏠 {{ seller.address }}
              </p>
              <p class="seller-meta description" v-if="seller.description">
                📝 {{ seller.description }}
              </p>
            </div>
            <div class="seller-actions">
              <button 
                v-if="activeTab === 'pending'" 
                class="btn-approve" 
                @click="handleApprove(seller)"
              >
                ✓ 通过
              </button>
              <button 
                v-if="activeTab === 'pending'" 
                class="btn-reject" 
                @click="handleReject(seller)"
              >
                ✗ 拒绝
              </button>
              <button 
                v-else 
                class="btn-detail" 
                @click="goToSellerDetail(Number(seller.id))"
              >
                详情 →
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-sellers-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #7c3aed 100%);
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(76, 29, 149, 0.2);
}

.btn-back {
  padding: 10px 20px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: #e2e8f0;
  color: #475569;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e1b4b;
}

.header-right {
  display: flex;
  align-items: center;
}

.admin-badge {
  padding: 6px 16px;
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.page-content {
  max-width: 900px;
  margin: 0 auto;
}

.content-card {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(76, 29, 149, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e1b4b;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tabs button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tabs button:hover {
  background: #e2e8f0;
}

.tabs button.active {
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
}

.tab-count {
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  font-size: 12px;
}

.tabs button.active .tab-count {
  background: rgba(255, 255, 255, 0.2);
}

.tab-count.pending {
  background: #fef3c7;
  color: #d97706;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 0.8s infinite linear;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: #dc2626;
}

.btn-retry {
  margin-top: 16px;
  padding: 10px 24px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

.sellers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.seller-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  transition: all 0.25s ease;
}

.seller-card:hover {
  border-color: #7c3aed;
  background: #faf5ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.15);
}

.seller-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.seller-avatar {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
  font-size: 24px;
  font-weight: 700;
  border-radius: 14px;
  margin-right: 16px;
  flex-shrink: 0;
}

.seller-info {
  flex: 1;
  min-width: 0;
}

.seller-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.seller-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.status-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.approved {
  background: #d1fae5;
  color: #059669;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #dc2626;
}

.seller-meta {
  margin: 4px 0;
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seller-meta.description {
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  max-height: 40px;
  line-height: 1.4;
}

.seller-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.btn-approve {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-approve:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-reject {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-reject:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-detail {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-detail:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}
</style>