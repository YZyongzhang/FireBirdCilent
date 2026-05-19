<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getUsers, banUser, unbanUser } from '@/utils/user'
import { getUser } from '@/utils/auth'
import type { User } from '@/utils/user'

const router = useRouter()
const user = getUser()

const users = ref<User[]>([])
const activeTab = ref<'all' | 'banned'>('all')
const loading = ref(false)
const error = ref('')
const actionLoading = ref<{ [key: string]: boolean }>({})

onMounted(() => {
  if (user?.role !== 'admin') {
    router.push('/secondhand')
    return
  }
  fetchUsers()
})

async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    const res = await getUsers({ page: 1, size: 100 })
    if (res.status === 'ok' && res.data) {
      users.value = res.data.users || []
    } else {
      error.value = res.message || '获取用户列表失败'
    }
  } catch (e: any) {
    error.value = e.message || '获取用户列表失败'
  } finally {
    loading.value = false
  }
}

async function handleBan(user: User) {
  if (!confirm(`确定要封禁用户 ${user.username} 吗？`)) return

  actionLoading.value[user.id] = true
  try {
    const res = await banUser(user.id)
    if (res.status === 'ok') {
      alert(res.message || '封禁成功')
      fetchUsers()
    } else {
      alert(res.message || '操作失败')
    }
  } catch (e: any) {
    alert('操作失败: ' + (e.message || '网络错误'))
  } finally {
    actionLoading.value[user.id] = false
  }
}

async function handleUnban(user: User) {
  if (!confirm(`确定要解封用户 ${user.username} 吗？`)) return

  actionLoading.value[user.id] = true
  try {
    const res = await unbanUser(user.id)
    if (res.status === 'ok') {
      alert(res.message || '解封成功')
      fetchUsers()
    } else {
      alert(res.message || '操作失败')
    }
  } catch (e: any) {
    alert('操作失败: ' + (e.message || '网络错误'))
  } finally {
    actionLoading.value[user.id] = false
  }
}

function goBack() {
  router.push('/secondhand')
}

function getRoleBadge(role: string) {
  const badgeMap: { [key: string]: { text: string; class: string } } = {
    user: { text: '普通用户', class: 'badge-user' },
    seller: { text: '商家', class: 'badge-seller' },
    admin: { text: '管理员', class: 'badge-admin' },
  }
  return badgeMap[role] || { text: role, class: '' }
}

const currentUsers = computed(() => {
  if (activeTab.value === 'banned') {
    return users.value.filter(u => u.banned)
  }
  return users.value
})
</script>

<template>
  <div class="admin-users-page">
    <header class="page-header">
      <div class="header-content">
        <button class="btn-back" @click="goBack">← 返回二手市场</button>
        <h1 class="page-title">用户管理</h1>
        <div class="header-right">
          <span class="admin-badge">管理员</span>
        </div>
      </div>
    </header>

    <main class="page-content">
      <div class="content-card">
        <div class="card-header">
          <h2>用户列表</h2>
          <div class="tabs">
            <button 
              :class="{ active: activeTab === 'all' }" 
              @click="activeTab = 'all'"
            >
              全部用户
              <span class="tab-count">{{ users.length }}</span>
            </button>
            <button 
              :class="{ active: activeTab === 'banned' }" 
              @click="activeTab = 'banned'"
            >
              已封禁
              <span class="tab-count banned">{{ users.filter(u => u.banned).length }}</span>
            </button>
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button @click="fetchUsers" class="btn-retry">重试</button>
        </div>

        <div v-else-if="currentUsers.length === 0" class="empty-state">
          <p>{{ activeTab === 'banned' ? '暂无封禁用户' : '暂无用户' }}</p>
        </div>

        <div v-else class="users-table-wrapper">
          <table class="users-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>角色</th>
                <th>状态</th>
                <th>信用分</th>
                <th>联系方式</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="userItem in currentUsers" :key="userItem.id" class="user-row">
                <td>
                  <div class="user-info-cell">
                    <div class="user-avatar">
                      {{ userItem.username?.charAt(0).toUpperCase() }}
                    </div>
                    <span class="username">{{ userItem.username }}</span>
                  </div>
                </td>
                <td>
                  <span :class="['role-badge', getRoleBadge(userItem.role).class]">
                    {{ getRoleBadge(userItem.role).text }}
                  </span>
                </td>
                <td>
                  <span v-if="userItem.banned" class="status-badge banned">已封禁</span>
                  <span v-else class="status-badge normal">正常</span>
                </td>
                <td>
                  <span :class="['credit-score', userItem.creditScore && userItem.creditScore < 60 ? 'low' : '']">
                    {{ userItem.creditScore ?? 100 }}分
                  </span>
                </td>
                <td>{{ userItem.phone || '-' }}</td>
                <td>
                  <button
                    v-if="!userItem.banned && userItem.role !== 'admin'"
                    class="btn-action btn-ban"
                    :disabled="actionLoading[userItem.id]"
                    @click="handleBan(userItem)"
                  >
                    {{ actionLoading[userItem.id] ? '处理中...' : '封禁' }}
                  </button>
                  <button
                    v-else-if="userItem.banned"
                    class="btn-action btn-unban"
                    :disabled="actionLoading[userItem.id]"
                    @click="handleUnban(userItem)"
                  >
                    {{ actionLoading[userItem.id] ? '处理中...' : '解封' }}
                  </button>
                  <span v-else class="action-disabled">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-users-page {
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
  max-width: 1100px;
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
  max-width: 1100px;
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
  color: #1e1b4b;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tabs button {
  padding: 8px 16px;
  background: #f8fafc;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tabs button:hover:not(:disabled) {
  background: #f1f5f9;
}

.tabs button.active {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
}

.tab-count {
  font-size: 12px;
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.tab-count.banned {
  background: rgba(239, 68, 68, 0.2);
}

.tabs button.active .tab-count {
  background: rgba(255, 255, 255, 0.2);
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #64748b;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 3px solid #e2e8f0;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-retry {
  margin-top: 16px;
  padding: 10px 24px;
  background: #7c3aed;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-retry:hover {
  background: #6d28d9;
}

.users-table-wrapper {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table thead {
  background: #f8fafc;
}

.users-table th {
  padding: 14px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.users-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.2s;
}

.users-table tbody tr:hover {
  background: #f8fafc;
}

.users-table td {
  padding: 14px 16px;
  font-size: 14px;
  color: #374151;
}

.user-info-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.username {
  font-weight: 500;
  color: #1e1b4b;
}

.role-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.badge-user {
  background: #e0f2fe;
  color: #0369a1;
}

.badge-seller {
  background: #fef3c7;
  color: #b45309;
}

.badge-admin {
  background: #fce7f3;
  color: #be185d;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.normal {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.banned {
  background: #fee2e2;
  color: #dc2626;
}

.credit-score {
  font-weight: 600;
  color: #15803d;
}

.credit-score.low {
  color: #dc2626;
}

.btn-action {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ban {
  background: #fee2e2;
  color: #dc2626;
}

.btn-ban:hover:not(:disabled) {
  background: #fecaca;
}

.btn-unban {
  background: #dcfce7;
  color: #15803d;
}

.btn-unban:hover:not(:disabled) {
  background: #bbf7d0;
}

.action-disabled {
  color: #cbd5e1;
  font-size: 13px;
}
</style>
