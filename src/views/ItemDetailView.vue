<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getItem, getItemReviews, addReview, addToCart, getConversation, sendMessage } from '@/utils/secondhand'
import { getUser } from '@/utils/auth'
import type { Item, Review, Message } from '@/utils/secondhand'

const router = useRouter()
const route = useRoute()
const user = getUser()

const item = ref<Item | null>(null)
const itemReviews = ref<Review[]>([])
const loading = ref(false)
const error = ref('')

// 评论表单
const reviewForm = ref({ rating: 5, comment: '' })
const reviewLoading = ref(false)
const reviewSuccess = ref(false)

// 聊天相关
const showChat = ref(false)
const chatMessages = ref<Message[]>([])
const chatLoading = ref(false)
const newMessage = ref('')

const canContactSeller = computed(() => {
  return user && user.role !== 'seller' && item.value?.seller
})

const isSeller = computed(() => user?.role === 'seller')

onMounted(async () => {
  const itemId = String(route.params.itemId)  // 确保是字符串类型
  if (!itemId || itemId === 'undefined') {
    error.value = '商品ID不存在'
    loading.value = false
    return
  }
  
  loading.value = true
  try {
    console.log('开始获取商品详情，ID:', itemId)
    const res = await getItem(itemId)
    console.log('获取商品详情成功:', res)
    item.value = res
    
    // 获取评价
    const reviewRes = await getItemReviews(itemId)
    console.log('获取评价成功:', reviewRes)
    itemReviews.value = reviewRes.reviews
  } catch (e: any) {
    console.error('获取商品详情失败:', e)
    error.value = e.message || e.response?.data?.message || '获取商品详情失败，请稍后重试'
  } finally {
    loading.value = false
    console.log('加载完成，loading:', loading.value, 'error:', error.value, 'item:', item.value)
  }
})

async function handleSubmitReview() {
  if (!item.value || !user) return
  
  reviewLoading.value = true
  reviewSuccess.value = false
  try {
    await addReview(Number(item.value.id), {
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment
    })
    reviewSuccess.value = true
    reviewForm.value = { rating: 5, comment: '' }
    // 刷新评价列表
    const reviewRes = await getItemReviews(Number(item.value!.id))
    itemReviews.value = reviewRes.reviews
  } catch (e) {
    console.error('提交评价失败:', e)
  } finally {
    reviewLoading.value = false
  }
}

const showCartSuccess = ref(false)

async function handleAddToCart() {
  if (!item.value) return
  try {
    await addToCart({ itemId: String(item.value.id), quantity: 1 })
    showCartSuccess.value = true
  } catch (e) {
    console.error('加入购物车失败:', e)
    alert('加入购物车失败')
  }
}

function closeCartSuccess() {
  showCartSuccess.value = false
}

async function contactSeller() {
  if (!item.value?.seller) return
  showChat.value = true
  chatMessages.value = []
  await fetchChatHistory()
}

async function fetchChatHistory() {
  if (!item.value?.seller) return
  chatLoading.value = true
  try {
    const res = await getConversation(item.value.seller.id, String(item.value.id))
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
  if (!newMessage.value.trim() || !item.value?.seller) return
  
  const content = newMessage.value.trim()
  newMessage.value = ''
  
  try {
    const res = await sendMessage({
      toUserId: item.value.seller.id,
      content,
      itemId: String(item.value.id),
      itemTitle: item.value.title
    })
    if (res.status === 'ok') {
      chatMessages.value.push({
        id: Date.now(),
        fromUserId: Number(user?.id) || 0,
        fromUsername: user?.username || '用户',
        toUserId: item.value.seller.id,
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
</script>

<template>
  <div class="item-detail-page">
    <header class="page-header">
      <div class="header-content">
        <button class="btn-back" @click="router.back()">← 返回</button>
        <h1 class="page-title">商品详情</h1>
        <button class="btn-home" @click="router.push('/secondhand')">二手市场</button>
      </div>
    </header>

    <main class="page-content" v-if="!loading && !error && item">
      <div class="item-detail">
        <!-- 商品图片 -->
        <div class="item-images">
          <div class="main-image">
            <img :src="item.thumb || item.images?.[0] || '/placeholder.png'" :alt="item.title" />
          </div>
          <div v-if="item.images && item.images.length > 1" class="thumbnails">
            <div v-for="(img, index) in item.images" :key="index" class="thumbnail">
              <img :src="img" :alt="`图片${index + 1}`" />
            </div>
          </div>
        </div>

        <!-- 商品信息 -->
        <div class="item-info">
          <h2 class="item-title">{{ item.title }}</h2>
          <p class="item-price">¥{{ item?.price?.toFixed(2) || '0.00' }}</p>
          <p class="item-desc">{{ item.description || '暂无描述' }}</p>
          
          <div class="item-meta">
            <div class="meta-item">
              <span class="meta-label">卖家</span>
              <span class="meta-value">{{ item.seller?.name || item.sellerName || '未知卖家' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">分类</span>
              <span class="meta-value">{{ item.category || '未分类' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">发布时间</span>
              <span class="meta-value">{{ item.date || '未知' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">状态</span>
              <span class="meta-value" :class="item.status === 'available' ? 'status-available' : 'status-offline'">
                {{ item.status === 'available' ? '在售' : '已下架' }}
              </span>
            </div>
          </div>

          <div class="item-actions">
            <button 
              class="btn-primary" 
              @click="handleAddToCart"
              :disabled="isSeller || item.status !== 'available'"
            >
              {{ isSeller ? '商家无法购买' : (item.status !== 'available' ? '商品已下架' : '加入购物车') }}
            </button>
            <button 
              class="btn-outline" 
              @click="contactSeller"
              :disabled="!canContactSeller || item.status !== 'available'"
            >
              {{ canContactSeller && item.status === 'available' ? '联系卖家' : '暂无法联系' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 评价部分 -->
      <div class="reviews-section">
        <h3 class="section-title">商品评价</h3>
        
        <!-- 评价表单 -->
        <div v-if="user" class="review-form">
          <div class="review-form-header">
            <span>发表评价</span>
            <div v-if="reviewSuccess" class="success-message">评价提交成功！</div>
          </div>
          <div class="rating-row">
            <span class="rating-label">评分：</span>
            <select v-model="reviewForm.rating" class="rating-select">
              <option :value="5">★★★★★ 非常满意</option>
              <option :value="4">★★★★☆ 满意</option>
              <option :value="3">★★★☆☆ 一般</option>
              <option :value="2">★★☆☆☆ 不满意</option>
              <option :value="1">★☆☆☆☆ 很差</option>
            </select>
          </div>
          <textarea
            v-model="reviewForm.comment"
            placeholder="写下你的评价..."
            class="review-textarea"
          ></textarea>
          <button
            class="btn-primary btn-submit-review"
            @click="handleSubmitReview"
            :disabled="reviewLoading || !reviewForm.comment.trim()"
          >
            {{ reviewLoading ? '提交中...' : '提交评价' }}
          </button>
        </div>
        <div v-else class="login-tip">
          <p>请先登录以发表评价</p>
        </div>

        <!-- 评价列表 -->
        <div class="review-list">
          <div v-for="review in itemReviews" :key="review.id" class="review-item">
            <div class="review-header">
              <span class="review-user">{{ review.username }}</span>
              <span class="review-rating">{{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}</span>
              <span class="review-date">{{ review.date }}</span>
            </div>
            <p class="review-comment">{{ review.comment }}</p>
          </div>
          <div v-if="itemReviews.length === 0" class="empty-reviews">
            暂无评价，成为第一个评价的人吧！
          </div>
        </div>
      </div>
    </main>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="router.back()" class="btn-retry">返回</button>
    </div>

    <!-- 加入购物车成功弹窗 -->
    <div v-if="showCartSuccess" class="modal-overlay" @click.self="closeCartSuccess">
      <div class="modal-success">
        <div class="success-icon">✓</div>
        <h3>已加入购物车</h3>
        <p>商品已成功加入购物车</p>
        <button class="btn-primary btn-ok" @click="closeCartSuccess">OK</button>
      </div>
    </div>

    <!-- 聊天弹窗 -->
    <div v-if="showChat" class="chat-overlay" @click.self="closeChat">
      <div class="chat-modal">
        <div class="chat-header">
          <h3>与 {{ item?.seller?.name || item?.sellerName }} 聊天</h3>
          <button class="chat-close" @click="closeChat">×</button>
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
  </div>
</template>

<style scoped>
.item-detail-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #7c3aed 100%);
  padding-bottom: 24px;
}

.page-header {
  background: rgba(0, 0, 0, 0.3);
  padding: 16px 24px;
  backdrop-filter: blur(10px);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-back, .btn-home {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-back:hover, .btn-home:hover {
  background: rgba(255, 255, 255, 0.2);
}

.page-title {
  color: white;
  font-size: 24px;
  font-weight: 600;
}

.page-content {
  max-width: 1200px;
  margin: 24px auto;
  padding: 0 24px;
}

.item-detail {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 24px;
}

.item-images {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-image {
  width: 100%;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
  background: #f3f4f6;
}

.main-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.thumbnails {
  display: flex;
  gap: 8px;
}

.thumbnail {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.3s;
}

.thumbnail:hover {
  border-color: #8b5cf6;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.item-title {
  color: white;
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.item-price {
  color: #fbbf24;
  font-size: 36px;
  font-weight: 700;
  margin: 0;
}

.item-desc {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.meta-value {
  color: white;
  font-size: 16px;
}

.status-available {
  color: #10b981;
}

.status-offline {
  color: #ef4444;
}

.item-actions {
  display: flex;
  gap: 16px;
  margin-top: auto;
}

.btn-primary, .btn-outline {
  flex: 1;
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
}

.btn-outline {
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.btn-outline:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.btn-primary:disabled, .btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reviews-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
}

.section-title {
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 24px 0;
}

.review-form {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.review-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: white;
  font-weight: 600;
}

.success-message {
  color: #10b981;
  font-size: 14px;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.rating-label {
  color: rgba(255, 255, 255, 0.8);
}

.rating-select {
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
}

.review-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  resize: vertical;
  box-sizing: border-box;
}

.review-textarea::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.btn-submit-review {
  margin-top: 12px;
  width: auto;
  flex: none;
}

.login-tip {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 24px;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.review-user {
  color: white;
  font-weight: 500;
}

.review-rating {
  color: #fbbf24;
  font-size: 14px;
}

.review-date {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin-left: auto;
}

.review-comment {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.5;
}

.empty-reviews {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 32px;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 24px;
  color: white;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state p {
  margin-bottom: 16px;
}

.btn-retry {
  padding: 12px 24px;
  border-radius: 8px;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
  border: none;
  cursor: pointer;
}

/* 聊天弹窗样式 */
.chat-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.chat-modal {
  background: #1f2937;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header h3 {
  color: white;
  margin: 0;
  font-size: 16px;
}

.chat-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  max-height: 400px;
}

.chat-loading {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 20px;
}

.chat-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 40px;
}

.chat-message {
  margin-bottom: 16px;
}

.chat-message.is-self {
  text-align: right;
}

.message-content {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  border-radius: 16px;
  max-width: 70%;
}

.is-self .message-content {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

.message-sender {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-bottom: 4px;
}

.message-content p {
  color: white;
  margin: 0;
  word-break: break-all;
}

.message-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  display: block;
  margin-top: 4px;
}

.chat-input {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-input input {
  flex: 1;
  padding: 12px 16px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.chat-input input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.btn-send {
  padding: 12px 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  border: none;
  color: white;
  cursor: pointer;
  font-weight: 600;
}

@media (max-width: 768px) {
  .item-detail {
    grid-template-columns: 1fr;
  }
  
  .main-image {
    height: 250px;
  }
  
  .item-actions {
    flex-direction: column;
  }
}

/* 弹窗覆盖层 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* 成功弹窗 */
.modal-success {
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 20px;
}

.modal-success h3 {
  color: white;
  font-size: 24px;
  margin: 0 0 12px 0;
}

.modal-success p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 24px 0;
}

.btn-ok {
  padding: 12px 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 16px;
}

.btn-ok:hover {
  opacity: 0.9;
}
</style>