<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getSellers } from '@/utils/secondhand'
import { getUser } from '@/utils/auth'

const router = useRouter()
const user = getUser()

interface Seller {
  id: number
  username: string
  phone?: string
  address?: string
  businessType?: string
  description?: string
}

const sellers = ref<Seller[]>([])
const loading = ref(false)
const error = ref('')

onMounted(() => {
  if (user?.role !== 'admin') {
    router.push('/secondhand')
    return
  }
  fetchSellers()
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

function goToSellerDetail(sellerId: number) {
  router.push(`/admin/sellers/${sellerId}`)
}

function goBack() {
  router.push('/secondhand')
}
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
          <span class="seller-count">共 {{ sellers.length }} 个商家</span>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button @click="fetchSellers" class="btn-retry">重试</button>
        </div>

        <div v-else-if="sellers.length === 0" class="empty-state">
          <p>暂无商家</p>
        </div>

        <div v-else class="sellers-grid">
          <div
            v-for="seller in sellers"
            :key="seller.id"
            class="seller-card"
            @click="goToSellerDetail(seller.id)"
          >
            <div class="seller-avatar">
              {{ seller.username?.charAt(0).toUpperCase() }}
            </div>
            <div class="seller-info">
              <h3 class="seller-name">{{ seller.username }}</h3>
              <p class="seller-meta" v-if="seller.businessType">
                📦 {{ seller.businessType }}
              </p>
              <p class="seller-meta" v-if="seller.phone">
                📱 {{ seller.phone }}
              </p>
              <p class="seller-meta" v-if="seller.address">
                🏠 {{ seller.address }}
              </p>
            </div>
            <div class="seller-arrow">→</div>
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

.seller-count {
  color: #64748b;
  font-size: 14px;
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
  align-items: center;
  padding: 20px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.seller-card:hover {
  border-color: #7c3aed;
  background: #faf5ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.15);
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

.seller-name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.seller-meta {
  margin: 4px 0;
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seller-arrow {
  font-size: 20px;
  color: #94a3b8;
  margin-left: 12px;
  transition: transform 0.2s ease;
}

.seller-card:hover .seller-arrow {
  transform: translateX(4px);
  color: #7c3aed;
}
</style>