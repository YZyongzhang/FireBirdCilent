<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getOrders, getItem, getConversation, sendMessage, cancelOrder, confirmOrder, applyReturnOrder, type Order, type Item, type Message } from '@/utils/secondhand'
import { getUser } from '@/utils/auth'

const router = useRouter()
const route = useRoute()
const user = getUser()

const order = ref<Order | null>(null)
const items = ref<Item[]>([])
const loading = ref(false)
const error = ref('')

const showChat = ref(false)
const chatMessages = ref<Message[]>([])
const chatLoading = ref(false)
const newMessage = ref('')
const chatOtherUser = ref<{ id: number; username: string } | null>(null)

onMounted(() => {
  const orderId = route.params.orderId
  if (orderId) {
    fetchOrderDetail(String(orderId))
  }
})

async function fetchOrderDetail(orderId: string) {
  loading.value = true
  error.value = ''
  try {
    const res = await getOrders()
    const foundOrder = res.orders.find((o: Order) => String(o.orderId) === orderId)
    if (foundOrder) {
      order.value = foundOrder
    } else {
      error.value = '订单不存在'
    }
  } catch (e: any) {
    error.value = e.message || '获取订单详情失败'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

function copyTrackingNumber(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    alert('已复制到剪贴板')
  }).catch(() => {
    console.error('复制失败')
  })
}

function viewItem(itemId: string) {
  router.push('/secondhand/item/' + itemId)
}

async function contactSeller(item: Item) {
  if (!item.seller) {
    alert('无法联系卖家，商品信息不完整')
    return
  }
  
  chatOtherUser.value = {
    id: Number(item.seller.id),
    username: item.seller.name || '未知卖家'
  }
  
  showChat.value = true
  chatMessages.value = []
  chatLoading.value = true
  
  try {
    const conversationId = user?.role === 'admin' ? `admin_${item.seller.id}` : String(item.id)
    const res = await getConversation(item.seller.id, conversationId)
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
  if (!newMessage.value.trim() || !chatOtherUser.value || !order.value) return
  
  const content = newMessage.value.trim()
  newMessage.value = ''
  
  try {
    const conversationId = user?.role === 'admin' ? `admin_${chatOtherUser.value.id}` : String(order.value.items[0]?.itemId)
    const res = await sendMessage({
      toUserId: chatOtherUser.value.id,
      content,
      itemId: conversationId,
      itemTitle: order.value.items[0]?.title || '订单咨询'
    })
    if (res.status === 'ok') {
      chatMessages.value.push({
        id: Date.now(),
        fromUserId: Number(user?.id) || 0,
        fromUsername: user?.username || '',
        toUserId: chatOtherUser.value.id,
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

async function handleCancelOrder() {
  if (!order.value) return
  if (!confirm('确定要取消该订单吗？')) return
  
  try {
    await cancelOrder(String(order.value.orderId))
    order.value.status = 'cancelled'
    alert('订单已取消')
  } catch (e) {
    console.error('取消订单失败:', e)
    alert('取消订单失败')
  }
}

async function handleConfirmReceive() {
  if (!order.value) return
  if (!confirm('确认已收到商品？')) return
  
  try {
    await confirmOrder(String(order.value.orderId))
    order.value.status = 'completed'
    alert('已确认收货')
  } catch (e) {
    console.error('确认收货失败:', e)
    alert('确认收货失败')
  }
}

async function handleApplyReturn() {
  if (!order.value) return
  const reason = prompt('请输入退货原因：')
  if (!reason) return
  
  try {
    await applyReturnOrder(String(order.value.orderId), reason)
    order.value.status = 'cancelled'
    alert('退货申请已提交')
  } catch (e) {
    console.error('退货申请失败:', e)
    alert('退货申请失败')
  }
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
  <div class="order-detail-page">
    <header class="page-header">
      <div class="header-content">
        <button class="btn-back" @click="goBack">← 返回</button>
        <h1 class="page-title">订单详情</h1>
        <div class="spacer"></div>
      </div>
    </header>

    <main class="page-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button @click="goBack" class="btn-retry">返回</button>
      </div>

      <template v-else-if="order">
        <div class="order-info-card">
          <div class="order-header-section">
            <h2 class="order-id">订单号：{{ order.orderId }}</h2>
            <span class="order-status" :class="getStatusClass(order.status)">
              {{ getStatusText(order.status) }}
            </span>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">下单时间</span>
              <span class="info-value">{{ order.date }}</span>
            </div>
            <div v-if="order.payTime" class="info-item">
              <span class="info-label">付款时间</span>
              <span class="info-value">{{ order.payTime }}</span>
            </div>
            <div v-if="order.shipTime" class="info-item">
              <span class="info-label">发货时间</span>
              <span class="info-value">{{ order.shipTime }}</span>
            </div>
            <div v-if="order.deliverTime" class="info-item">
              <span class="info-label">收货时间</span>
              <span class="info-value">{{ order.deliverTime }}</span>
            </div>
            <div v-if="order.trackingNumber" class="info-item tracking">
              <span class="info-label">物流单号</span>
              <span class="info-value tracking-number">
                <span>{{ order.trackingNumber }}</span>
                <button class="btn-copy" @click="copyTrackingNumber(order.trackingNumber || '')">复制</button>
              </span>
            </div>
            <div v-if="order.shippingAddress" class="info-item">
              <span class="info-label">收货地址</span>
              <span class="info-value">{{ order.shippingAddress }}</span>
            </div>
          </div>
        </div>



        <div class="order-summary">
          <div class="summary-row">
            <span>商品总价</span>
            <span>¥{{ order.totalAmount }}</span>
          </div>
          <div class="summary-row">
            <span>运费</span>
            <span>¥0.00</span>
          </div>
          <div class="summary-row total">
            <span>实付金额</span>
            <span>¥{{ order.totalAmount }}</span>
          </div>
        </div>

        <div v-if="order.status === 'pending'" class="action-section">
          <button class="btn-cancel" @click="handleCancelOrder">取消订单</button>
        </div>

        <div v-if="order.status === 'delivered'" class="action-section">
          <button class="btn-confirm" @click="handleConfirmReceive">确认收货</button>
        </div>

        <div v-if="order.status === 'completed'" class="action-section">
          <button class="btn-return" @click="handleApplyReturn">申请退货</button>
        </div>
      </template>
    </main>

    <div v-if="showChat" class="chat-overlay" @click.self="closeChat">
      <div class="chat-modal">
        <div class="chat-header">
          <h3>💬 与 {{ chatOtherUser?.username }} 聊天</h3>
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
            :class="{ 'is-self': String(msg.fromUserId) === String(user?.id) }"
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
  </div>
</template>

<style scoped>
.order-detail-page {
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
  max-width: 600px;
  margin: 0 auto;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(76, 29, 149, 0.2);
}

.btn-back,
.spacer {
  width: 80px;
}

.btn-back {
  padding: 10px 16px;
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
  font-size: 20px;
  font-weight: 700;
  color: #1e1b4b;
}

.page-content {
  max-width: 600px;
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

.order-info-card {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(76, 29, 149, 0.15);
}

.order-header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.order-id {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.order-status {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.status-paid {
  background: #dbeafe;
  color: #2563eb;
}

.status-shipped {
  background: #e0e7ff;
  color: #4f46e5;
}

.status-delivered {
  background: #d1fae5;
  color: #059669;
}

.status-completed {
  background: #d1fae5;
  color: #059669;
}

.status-cancelled {
  background: #fee2e2;
  color: #dc2626;
}

.info-grid {
  display: grid;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.info-label {
  color: #64748b;
  font-size: 14px;
}

.info-value {
  color: #1e293b;
  font-size: 14px;
  font-weight: 500;
}

.info-item.tracking .tracking-number {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-copy {
  padding: 4px 8px;
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}

.btn-copy:hover {
  background: #e2e8f0;
}

.items-section {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(76, 29, 149, 0.15);
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.items-list {
  display: grid;
  gap: 16px;
}

.order-item-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.item-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
}

.item-title:hover {
  color: #7c3aed;
}

.item-meta {
  margin: 0 0 4px;
  font-size: 13px;
  color: #64748b;
}

.item-price {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #7c3aed;
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.btn-contact,
.btn-view {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-contact {
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
}

.btn-contact:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.btn-view {
  background: #f1f5f9;
  color: #64748b;
}

.btn-view:hover {
  background: #e2e8f0;
  color: #475569;
}

.order-summary {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(76, 29, 149, 0.15);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  color: #64748b;
  font-size: 14px;
}

.summary-row.total {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 2px solid #f1f5f9;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.action-section {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-cancel,
.btn-confirm,
.btn-return {
  padding: 14px 32px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #fee2e2;
  color: #dc2626;
}

.btn-cancel:hover {
  background: #fecaca;
}

.btn-confirm {
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
}

.btn-confirm:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
}

.btn-return {
  background: #fef3c7;
  color: #d97706;
}

.btn-return:hover {
  background: #fde68a;
}

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
  max-width: 500px;
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
  font-size: 16px;
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
}

.chat-messages {
  height: 350px;
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
}

.chat-message.is-self .message-content {
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
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
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
}

.chat-input input:focus {
  outline: none;
  border-color: #7c3aed;
}

.btn-send {
  padding: 12px 24px;
  background: linear-gradient(135deg, #7c3aed, #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
</style>
