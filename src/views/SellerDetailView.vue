<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getSellerById, getItems, getConversation, sendMessage, getOrdersBySeller, shipOrder, type Item, type Message, type Order } from '@/utils/secondhand'
import { getUser } from '@/utils/auth'
import type { User } from '@/utils/user'

const router = useRouter()
const route = useRoute()
const user = getUser()

const seller = ref<User | null>(null)
const items = ref<Item[]>([])
const orders = ref<Order[]>([])
const loading = ref(false)
const sellerLoading = ref(false)
const ordersLoading = ref(false)
const error = ref('')

// 聊天相关
const showChat = ref(false)
const chatMessages = ref<Message[]>([])
const chatLoading = ref(false)
const newMessage = ref('')

// 弹窗相关
const showOrdersModal = ref(false)

onMounted(() => {
  if (user?.role !== 'admin') {
    router.push('/secondhand')
    return
  }
  const sellerId = route.params.sellerId
  if (sellerId) {
    fetchSeller(Number(sellerId))
    fetchSellerItems(Number(sellerId))
    fetchSellerOrders(Number(sellerId))
  }
})

async function fetchSeller(sellerId: number) {
  sellerLoading.value = true
  error.value = ''
  try {
    const res = await getSellerById(sellerId)
    if (res.status === 'ok' && res.data) {
      seller.value = res.data
    } else {
      error.value = res.message || '获取商家信息失败'
    }
  } catch (e: any) {
    error.value = e.message || '获取商家信息失败'
  } finally {
    sellerLoading.value = false
  }
}

async function fetchSellerItems(sellerId: number) {
  loading.value = true
  try {
    const res = await getItems({ page: 1, size: 50 })
    items.value = res.items.filter((item: Item) => item.seller?.id === sellerId && item.status === 'available')
  } catch (e) {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function fetchSellerOrders(sellerId: number) {
  ordersLoading.value = true
  try {
    const res = await getOrdersBySeller(sellerId)
    orders.value = res.orders || []
  } catch (e) {
    orders.value = []
  } finally {
    ordersLoading.value = false
  }
}

function goBack() {
  router.push('/admin/sellers')
}

function goToSecondhand() {
  router.push('/secondhand')
}

function viewItemDetail(item: Item) {
  router.push('/secondhand/item/' + item.id)
}

function openOrdersModal() {
  showOrdersModal.value = true
}

function closeOrdersModal() {
  showOrdersModal.value = false
}

async function handleShipOrder(order: Order) {
  const trackingNumber = prompt('请输入物流单号：')
  if (!trackingNumber) return
  
  try {
    await shipOrder(order.orderId, trackingNumber)
    order.status = 'shipped'
    order.trackingNumber = trackingNumber
  } catch (e) {
    console.error('发货失败:', e)
  }
}

async function contactSeller() {
  if (!seller.value) return
  showChat.value = true
  chatMessages.value = []
  await fetchChatHistory()
}

async function fetchChatHistory() {
  if (!seller.value) return
  chatLoading.value = true
  try {
    const conversationId = `admin_${seller.value.id}`
    const res = await getConversation(seller.value.id, conversationId)
    if (res.messages) {
      chatMessages.value = res.messages
    }
  } catch (e) {
    console.error('获取聊天记录失败:', e)
  } finally {
    chatLoading.value = false
  }
}

async function sendChatMessage() {
  if (!newMessage.value.trim() || !seller.value) return
  
  const content = newMessage.value.trim()
  newMessage.value = ''
  
  try {
    const conversationId = `admin_${seller.value.id}`
    const res = await sendMessage({
      toUserId: seller.value.id,
      content,
      itemId: conversationId,
      itemTitle: '系统消息'
    })
    if (res.status === 'ok') {
      chatMessages.value.push({
        id: Date.now(),
        fromUserId: Number(user?.id) || 0,
        fromUsername: user?.username || 'admin',
        toUserId: seller.value.id,
        content,
        date: new Date().toISOString()
      })
    }
  } catch (e) {
    console.error('发送消息失败:', e)
  }
}

function closeChat() {
  showChat.value = false
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待付款',
    paid: '待发货',
    shipped: '已发货',
    delivered: '待确认',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

function getStatusClass(status: string): string {
  return `status-${status}`
}
</script>

<template>
  <div class="seller-detail-page">
    <header class="page-header">
      <div class="header-content">
        <button class="btn-back" @click="goBack">← 返回商家列表</button>
        <h1 class="page-title">商家详情</h1>
        <button class="btn-home" @click="goToSecondhand">二手市场</button>
      </div>
    </header>

    <main class="page-content">
      <div v-if="sellerLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button @click="goBack" class="btn-retry">返回</button>
      </div>

      <template v-else-if="seller">
        <div class="seller-profile-card">
          <div class="profile-header">
            <div class="profile-avatar">
              {{ seller.username?.charAt(0).toUpperCase() }}
            </div>
            <div class="profile-basic">
              <h2 class="profile-name">{{ seller.username }}</h2>
              <span class="profile-badge">商家</span>
            </div>
            <button class="btn-contact" @click="contactSeller">
              💬 联系商家
            </button>
          </div>

          <div class="profile-details">
            <div class="detail-item" v-if="seller.businessType">
              <span class="detail-icon">📦</span>
              <span class="detail-label">经营类型</span>
              <span class="detail-value">{{ seller.businessType }}</span>
            </div>
            <div class="detail-item" v-if="seller.phone">
              <span class="detail-icon">📱</span>
              <span class="detail-label">手机号</span>
              <span class="detail-value">{{ seller.phone }}</span>
            </div>
            <div class="detail-item" v-if="seller.address">
              <span class="detail-icon">🏠</span>
              <span class="detail-label">地址</span>
              <span class="detail-value">{{ seller.address }}</span>
            </div>
          </div>

          <div class="profile-description" v-if="seller.description">
            <h3>商家简介</h3>
            <p>{{ seller.description }}</p>
          </div>
        </div>

        <!-- 售卖信息模块 -->
        <div class="orders-section" @click="openOrdersModal">
          <div class="section-header">
            <h3>📋 售卖信息</h3>
            <span class="orders-count">{{ orders.length }} 笔订单</span>
          </div>
          <div class="orders-summary">
            <div class="summary-item">
              <span class="summary-label">待发货</span>
              <span class="summary-value pending">{{ orders.filter(o => o.status === 'paid').length }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">已发货</span>
              <span class="summary-value shipped">{{ orders.filter(o => o.status === 'shipped').length }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">已完成</span>
              <span class="summary-value completed">{{ orders.filter(o => o.status === 'completed').length }}</span>
            </div>
          </div>
        </div>

        <div class="products-section">
          <div class="section-header">
            <h3>在售商品</h3>
            <span class="product-count">{{ items.length }} 件</span>
          </div>

          <div v-if="loading" class="loading-state small">
            <div class="spinner small"></div>
          </div>

          <div v-else-if="items.length === 0" class="empty-products">
            <p>暂无在售商品</p>
          </div>

          <div v-else class="products-grid">
            <div
              v-for="item in items"
              :key="item.id"
              class="product-card"
              @click="viewItemDetail(item)"
            >
              <div class="product-image">
                <img :src="item.thumb || '/placeholder.png'" :alt="item.title" />
              </div>
              <div class="product-info">
                <h4 class="product-title">{{ item.title }}</h4>
                <p class="product-price">¥{{ item.price }}</p>
                <span class="product-category">{{ item.category }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 订单弹窗 -->
      <div v-if="showOrdersModal" class="modal-overlay" @click.self="closeOrdersModal">
        <div class="modal modal-large">
          <button class="close" @click="closeOrdersModal">关闭</button>
          <h2>商家售卖订单</h2>
          <div v-if="ordersLoading" class="loading">加载中...</div>
          <div v-else-if="orders.length === 0" class="empty">暂无订单</div>
          <div v-else class="orders-list">
            <div v-for="order in orders" :key="order.orderId" class="order-item">
              <div class="order-header">
                <span class="order-id">订单号：{{ order.orderId }}</span>
                <span class="order-status" :class="getStatusClass(order.status)">
                  {{ getStatusText(order.status) }}
                </span>
              </div>
              <div class="order-info">
                <div class="info-row">
                  <span class="info-label">下单时间</span>
                  <span class="info-value">{{ order.date }}</span>
                </div>
                <div v-if="order.trackingNumber" class="info-row">
                  <span class="info-label">物流单号</span>
                  <span class="info-value">{{ order.trackingNumber }}</span>
                </div>
                <div class="info-row total">
                  <span class="info-label">订单金额</span>
                  <span class="info-value">¥{{ order.totalAmount }}</span>
                </div>
              </div>
              <div class="order-actions" v-if="order.status === 'paid'">
                <button class="btn-ship" @click.stop="handleShipOrder(order)">发货</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 聊天窗口 -->
      <div v-if="showChat" class="chat-overlay" @click.self="closeChat">
        <div class="chat-modal">
          <div class="chat-header">
            <h3>💬 与 {{ seller?.username }} 聊天</h3>
            <button class="chat-close" @click="closeChat">✕</button>
          </div>
          <div class="chat-messages">
            <div v-if="chatLoading" class="chat-loading">加载中...</div>
            <div v-else-if="chatMessages.length === 0" class="chat-empty">
              暂无消息，开始对话吧！
            </div>
            <div
              v-for="msg in chatMessages"
              :key="msg.id"
              class="chat-message"
              :class="{ 'is-self': msg.fromUserId === user?.id }"
            >
              <div class="message-content">
                <span class="message-sender">{{ msg.fromUsername }}</span>
                <p>{{ msg.content }}</p>
                <span class="message-time">{{ msg.date }}</span>
              </div>
            </div>
          </div>
          <div class="chat-input">
            <input
              v-model="newMessage"
              type="text"
              placeholder="输入消息..."
              @keyup.enter="sendChatMessage"
            />
            <button class="btn-send" @click="sendChatMessage">发送</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.seller-detail-page {
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

.btn-back,
.btn-home {
  padding: 10px 20px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover,
.btn-home:hover {
  background: #e2e8f0;
  color: #475569;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e1b4b;
}

.page-content {
  max-width: 900px;
  margin: 0 auto;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  color: #64748b;
}

.loading-state.small {
  padding: 40px 20px;
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

.spinner.small {
  width: 30px;
  height: 30px;
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

.seller-profile-card {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(76, 29, 149, 0.15);
}

.profile-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f1f5f9;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
  font-size: 36px;
  font-weight: 700;
  border-radius: 20px;
  margin-right: 20px;
}

.profile-basic {
  flex: 1;
}

.profile-name {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.profile-badge {
  display: inline-block;
  padding: 4px 12px;
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.btn-contact {
  padding: 14px 28px;
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
}

.btn-contact:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(124, 58, 237, 0.4);
}

.profile-details {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}

.detail-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.detail-icon {
  font-size: 20px;
  margin-right: 12px;
}

.detail-label {
  color: #64748b;
  font-size: 14px;
  margin-right: 12px;
}

.detail-value {
  color: #1e293b;
  font-size: 15px;
  font-weight: 600;
}

.profile-description {
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
}

.profile-description h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.profile-description p {
  margin: 0;
  color: #475569;
  font-size: 15px;
  line-height: 1.6;
}

.products-section {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(76, 29, 149, 0.15);
}

/* 售卖信息模块样式 */
.orders-section {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(76, 29, 149, 0.15);
  cursor: pointer;
  transition: all 0.25s ease;
}

.orders-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(76, 29, 149, 0.2);
}

.orders-section .section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f1f5f9;
}

.orders-section h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.orders-count {
  color: #64748b;
  font-size: 14px;
}

.orders-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.summary-item {
  text-align: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.summary-label {
  display: block;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
}

.summary-value.pending {
  color: #d97706;
}

.summary-value.shipped {
  color: #3b82f6;
}

.summary-value.completed {
  color: #16a34a;
}

/* 订单弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 800px;
}

.modal .close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  background: #f1f5f9;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  color: #64748b;
}

.modal h2 {
  margin: 0;
  padding: 24px;
  padding-right: 50px;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  border-bottom: 2px solid #f1f5f9;
  position: relative;
}

.modal .loading,
.modal .empty {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
}

.orders-list {
  padding: 16px;
}

.order-item {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.order-item:last-child {
  margin-bottom: 0;
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.order-id {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.order-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.order-status.pending {
  background: #fef3c7;
  color: #d97706;
}

.order-status.paid {
  background: #dbeafe;
  color: #2563eb;
}

.order-status.shipped {
  background: #e0e7ff;
  color: #4f46e5;
}

.order-status.delivered {
  background: #d1fae5;
  color: #059669;
}

.order-status.completed {
  background: #d1fae5;
  color: #059669;
}

.order-status.cancelled {
  background: #fee2e2;
  color: #dc2626;
}

.order-info {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.info-label {
  color: #64748b;
  font-size: 13px;
}

.info-value {
  color: #1e293b;
  font-size: 13px;
  font-weight: 500;
}

.info-row.total {
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.info-row.total .info-value {
  font-size: 16px;
  font-weight: 700;
  color: #7c3aed;
}

.order-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-ship {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-ship:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

/* 聊天窗口样式 */
.chat-overlay {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.product-count {
  color: #64748b;
  font-size: 14px;
}

.empty-products {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.product-card {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
}

.product-card:hover {
  border-color: #7c3aed;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.15);
}

.product-image {
  width: 100%;
  height: 160px;
  overflow: hidden;
  background: #f1f5f9;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  padding: 16px;
}

.product-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-price {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: #7c3aed;
}

.product-category {
  display: inline-block;
  padding: 4px 10px;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 6px;
  font-size: 12px;
}

/* 聊天窗口样式 */
.chat-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.chat-modal {
  width: 90%;
  max-width: 600px;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
}

.chat-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.chat-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.chat-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.chat-messages {
  height: 400px;
  overflow-y: auto;
  padding: 20px;
  background: #f8fafc;
}

.chat-loading,
.chat-empty {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
}

.chat-message {
  margin-bottom: 16px;
}

.chat-message.is-self {
  text-align: right;
}

.message-content {
  display: inline-block;
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
}

.chat-message:not(.is-self) .message-content {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px 16px 16px 4px;
}

.chat-message.is-self .message-content {
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
  border-radius: 16px 16px 4px 16px;
}

.message-sender {
  display: block;
  font-size: 12px;
  margin-bottom: 4px;
}

.chat-message:not(.is-self) .message-sender {
  color: #64748b;
}

.chat-message.is-self .message-sender {
  color: rgba(255, 255, 255, 0.8);
}

.message-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.chat-message:not(.is-self) .message-content p {
  color: #1e293b;
}

.message-time {
  display: block;
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.6;
}

.chat-input {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-top: 2px solid #f1f5f9;
}

.chat-input input {
  flex: 1;
  padding: 14px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.chat-input input:focus {
  outline: none;
  border-color: #7c3aed;
}

.btn-send {
  padding: 14px 28px;
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-send:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}
</style>