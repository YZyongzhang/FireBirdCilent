<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  getItems,
  getCategories,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getConversations,
  getConversation,
  sendMessage,
  getOrders,
  createOrder,
  createItem,
  payOrder,
  getItemReviews,
  submitReview,
  type Item,
  type CartItem,
  type Message,
  type Review,
  type Order,
  type Conversation,
} from '@/utils/secondhand'
import { getCurrentUser, type User } from '@/utils/user'
import { getUser } from '@/utils/auth'

const user = getUser()

const search = ref('')
const category = ref('全部')
const categories = ref<string[]>(['全部','灵感','模版'])

const items = ref<Item[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const showDetail = ref(false)
const activeItem = ref<Item | null>(null)
const itemReviews = ref<Review[]>([])

const showAddForm = ref(false)
const addForm = ref({
  title: '',
  description: '',
  price: '',
  category: '',
})
const addLoading = ref(false)

const showCart = ref(false)
const cartItems = ref<CartItem[]>([])
const cartLoading = ref(false)

const showChat = ref(false)
const showConversations = ref(false)
const currentConversation = ref<Conversation | null>(null)
const chatMessages = ref<Message[]>([])
const chatInput = ref('')
const chatLoading = ref(false)
const conversations = ref<Conversation[]>([])

const showPayment = ref(false)
const pendingOrder = ref<{ orderId: string | number; totalAmount: number } | null>(null)
const paymentMethod = ref<'alipay' | 'wechat' | 'paypal'>('alipay')
const paymentLoading = ref(false)

const showOrders = ref(false)
const orders = ref<Order[]>([])
const ordersLoading = ref(false)

const reviewForm = ref({ rating: 5, comment: '' })
const reviewLoading = ref(false)

const loading = ref(false)
const error = ref('')

const filtered = computed(() => {
  return items.value
})

const canContactSeller = computed(() => {
  console.log("canContactSeller", activeItem.value?.seller)
  return activeItem.value?.seller?.id !== undefined && activeItem.value?.seller?.id !== null
})

const storedUser = getUser()
const currentUser = ref<User | null>(storedUser ? { 
  ...storedUser, 
  role: storedUser.role as 'user' | 'seller' | 'admin' 
} : null)
const isSeller = computed(() => currentUser.value?.role === 'seller')
const isAdmin = computed(() => currentUser.value?.role === 'admin')
const isAuthenticated = computed(() => currentUser.value !== null)

console.log('=== User Info ===')
console.log('Current user from localStorage:', storedUser)
console.log('currentUser:', currentUser.value)
console.log('isSeller:', isSeller.value)
console.log('isAuthenticated:', isAuthenticated.value)

async function fetchCategories() {
  try {
    const res = await getCategories()
    categories.value = ['全部', ...res.categories]
  } catch (e) {
    console.error('Failed to fetch categories:', e)
  }
}

async function fetchItems() {
  loading.value = true
  error.value = ''
  console.log('fetchItems')
  try {
    const res = await getItems({
      page: page.value,
      size: pageSize.value,
      q: search.value || undefined,
      category: category.value === '全部' ? undefined : category.value,
    })
    items.value = res.items
    total.value = res.total
  } catch (e: any) {
    error.value = '获取商品列表失败'
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function openDetail(it: Item) {
  activeItem.value = it
  showDetail.value = true
  try {
    const res = await getItemReviews(it.id)
    itemReviews.value = res.reviews
  } catch (e) {
    itemReviews.value = []
  }
}

function closeDetail() {
  showDetail.value = false
  activeItem.value = null
  itemReviews.value = []
  reviewForm.value = { rating: 5, comment: '' }
}

async function handleAddItem() {
  if (!addForm.value.title || !addForm.value.price || !addForm.value.category) {
    error.value = '请填写完整信息'
    return
  }
  addLoading.value = true
  error.value = ''
  try {
    await createItem({
      title: addForm.value.title,
      description: addForm.value.description,
      price: parseFloat(addForm.value.price),
      category: addForm.value.category,
    })
    showAddForm.value = false
    addForm.value = { title: '', description: '', price: '', category: '' }
    fetchItems()
  } catch (e: any) {
    error.value = '发布商品失败'
  } finally {
    addLoading.value = false
  }
}

async function handleAddToCart(it: Item) {
  if (isSeller.value) {
    alert('卖家账号不能购买商品')
    return
  }
  try {
    await addToCart({ itemId: it.id, quantity: 1 })
    alert('已加入购物车')
  } catch (e: any) {
    alert('加入购物车失败')
  }
}

async function fetchConversations() {
  try {
    const res = await getConversations()
    conversations.value = res.conversations
  } catch (e) {
    console.error('获取对话列表失败:', e)
  }
}

async function openChat(item: Item) {
  if (!item.seller || !item.seller.id) {
    alert('无法联系卖家，卖家信息不完整')
    return
  }
  const conversation: Conversation = {
    itemId: String(item.id),
    itemTitle: item.title,
    otherUserId: item.seller.id,
    otherUsername: item.seller.name || item.sellerName || '未知卖家',
    lastMessage: '',
    lastDate: '',
    unreadCount: 0
  }
  currentConversation.value = conversation
  showChat.value = true
  chatLoading.value = true
  try {
    const res = await getConversation(item.seller.id, String(item.id))
    chatMessages.value = res.messages
  } catch (e) {
    chatMessages.value = []
    console.error('获取聊天记录失败:', e)
  } finally {
    chatLoading.value = false
  }
}

const showSellerMessages = ref(false)
const sellerMessagesLoading = ref(false)

async function fetchSellerMessages() {
  sellerMessagesLoading.value = true
  try {
    const res = await getConversations()
    conversations.value = res.conversations || []
  } catch (e) {
    conversations.value = []
    console.error('获取消息列表失败:', e)
  } finally {
    sellerMessagesLoading.value = false
  }
}

function openSellerMessages() {
  showSellerMessages.value = true
  fetchSellerMessages()
}

async function openChatFromList(conversation: Conversation) {
  currentConversation.value = conversation
  showChat.value = true
  showSellerMessages.value = false
  chatLoading.value = true
  try {
    const res = await getConversation(conversation.otherUserId, conversation.itemId)
    chatMessages.value = res.messages
  } catch (e) {
    chatMessages.value = []
    console.error('获取聊天记录失败:', e)
  } finally {
    chatLoading.value = false
  }
}

async function handleSendMessage() {
  console.log('handleSendMessage called')
  console.log('chatInput:', chatInput.value)
  console.log('currentConversation:', currentConversation.value)
  
  if (!chatInput.value.trim()) {
    console.log('chatInput is empty')
    return
  }
  
  if (!currentConversation.value) {
    console.log('currentConversation is null')
    alert('无法发送消息，请先选择一个对话')
    return
  }
  
  const conv = currentConversation.value
  try {
    console.log('Sending message to:', conv.otherUserId, 'item:', conv.itemId)
    const res = await sendMessage({
      toUserId: conv.otherUserId,
      content: chatInput.value,
      itemId: conv.itemId,
      itemTitle: conv.itemTitle,
    })
    console.log('Message sent successfully:', res)
    chatMessages.value.push(res.message)
    chatInput.value = ''
  } catch (e) {
    console.error('Failed to send message:', e)
    alert('发送消息失败')
  }
}

async function fetchCart() {
  cartLoading.value = true
  try {
    const res = await getCart()
    cartItems.value = res.items
  } catch (e) {
    cartItems.value = []
  } finally {
    cartLoading.value = false
  }
}

async function openCart() {
  showCart.value = true
  fetchCart()
}

async function handleUpdateQuantity(cartItem: CartItem, delta: number) {
  const newQty = cartItem.quantity + delta
  if (newQty <= 0) {
    await handleRemoveFromCart(cartItem.id)
    return
  }
  try {
    await updateCartItem(cartItem.id, { quantity: newQty })
    cartItem.quantity = newQty
  } catch (e) {
    alert('更新数量失败')
  }
}

async function handleRemoveFromCart(id: string | number) {
  try {
    await removeFromCart(id)
    cartItems.value = cartItems.value.filter(c => c.id !== id)
  } catch (e) {
    alert('移除失败')
  }
}

async function handleClearCart() {
  if (!confirm('确定要清空购物车吗？')) return
  try {
    await clearCart()
    cartItems.value = []
  } catch (e) {
    alert('清空失败')
  }
}

const cartTotal = computed(() => {
  return cartItems.value.reduce((sum, c) => sum + c.price * c.quantity, 0)
})

async function handleCheckout() {
  if (cartItems.value.length === 0) return
  try {
    const res = await createOrder({
      cartItemIds: cartItems.value.map(c => c.id),
      totalAmount: cartTotal.value,
    })
    pendingOrder.value = { orderId: res.orderId, totalAmount: cartTotal.value }
    showCart.value = false
    showPayment.value = true
  } catch (e) {
    alert('创建订单失败')
  }
}

async function handlePay() {
  if (!pendingOrder.value) return
  paymentLoading.value = true
  try {
    const res = await payOrder(pendingOrder.value.orderId, paymentMethod.value)
    if (res.success) {
      alert('支付成功！')
      showPayment.value = false
      pendingOrder.value = null
      cartItems.value = []
    } else {
      alert('支付失败')
    }
  } catch (e) {
    alert('支付失败')
  } finally {
    paymentLoading.value = false
  }
}

async function handleSubmitReview() {
  if (!activeItem.value || !reviewForm.value.comment.trim()) {
    alert('请填写评价内容')
    return
  }
  reviewLoading.value = true
  try {
    const review = await submitReview(activeItem.value.id, {
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment,
    })
    itemReviews.value.unshift(review)
    reviewForm.value = { rating: 5, comment: '' }
  } catch (e) {
    alert('提交评价失败')
  } finally {
    reviewLoading.value = false
  }
}

async function openOrders() {
  showOrders.value = true
  ordersLoading.value = true
  try {
    const res = await getOrders()
    orders.value = res.orders
  } catch (e) {
    orders.value = []
  } finally {
    ordersLoading.value = false
  }
}

watch([search, category], () => {
  page.value = 1
  fetchItems()
})

onMounted(() => {
  fetchCategories()
  fetchItems()
})
</script>

<template>
  <main class="secondhand-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <section class="container">
      <div class="header-row">
        <h1>二手交易</h1>
        <div class="header-actions">
          <button v-if="!isSeller" class="btn-outline" @click="openOrders">我的订单</button>
          <button v-if="!isSeller" class="btn-outline" @click="openCart">购物车</button>
          <button v-if="!isSeller" class="btn-outline" @click="openSellerMessages">我的消息</button>
          <button class="btn-primary" @click="showAddForm = true">发布商品</button>
          <button v-if="isSeller" class="btn-outline" @click="openSellerMessages">买家消息</button>
        </div>
      </div>

      <div class="controls">
        <input
          v-model="search"
          placeholder="搜索商品、描述或卖家"
          class="search"
          @input="fetchItems"
        />
        <select v-model="category" class="select" @change="fetchItems">
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select>
      </div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>

      <div class="list-grid" v-else>
        <div
          v-for="item in filtered"
          :key="item.id"
          class="card"
          @click="openDetail(item)"
        >
          <div class="thumb">
            <img :src="item.thumb || '/placeholder.png'" alt="" />
          </div>
          <div class="card-body">
            <div class="title">{{ item.title }}</div>
            <div class="meta">
              <span class="price">¥{{ item.price }}</span>
              <span class="seller">{{ item.sellerName || item.seller?.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!loading && filtered.length === 0" class="empty">暂无符合条件的商品</div>

      <div class="pagination" v-if="total > pageSize">
        <button :disabled="page <= 1" @click="page--; fetchItems()">上一页</button>
        <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
        <button
          :disabled="page >= Math.ceil(total / pageSize)"
          @click="page++; fetchItems()"
        >
          下一页
        </button>
      </div>
    </section>

    <div v-if="showDetail && activeItem" class="modal-overlay" @click.self="closeDetail">
      <div class="modal modal-large">
        <button class="close" @click="closeDetail">关闭</button>
        <div class="modal-content">
          <div class="modal-thumb">
            <img :src="activeItem.thumb || activeItem.images?.[0] || '/placeholder.png'" alt="" />
          </div>
          <div class="modal-info">
            <h2>{{ activeItem.title }}</h2>
            <p class="price-large">¥{{ activeItem.price }}</p>
            <p class="desc">{{ activeItem.description }}</p>
            <p class="meta">
              卖家：{{ activeItem.seller?.name || activeItem.sellerName }} •
              分类：{{ activeItem.category }} •
              发布：{{ activeItem.date }}
            </p>
            <div class="action-row">
              <button class="btn-primary" @click="handleAddToCart(activeItem!)">加入购物车</button>
              <button 
                class="btn-outline" 
                @click="openChat(activeItem!)"
                :disabled="!canContactSeller"
              >
                {{ canContactSeller ? '联系卖家' : '暂无法联系卖家' }}
              </button>
            </div>
          </div>
        </div>

        <div class="reviews-section">
          <h3>商品评价</h3>
          <div class="review-form" v-if="user">
            <div class="rating-row">
              <span>评分：</span>
              <select v-model="reviewForm.rating">
                <option :value="5">5 - 非常满意</option>
                <option :value="4">4 - 满意</option>
                <option :value="3">3 - 一般</option>
                <option :value="2">2 - 不满意</option>
                <option :value="1">1 - 很差</option>
              </select>
            </div>
            <textarea
              v-model="reviewForm.comment"
              placeholder="写下你的评价..."
              class="review-textarea"
            ></textarea>
            <button
              class="btn-primary"
              @click="handleSubmitReview"
              :disabled="reviewLoading"
            >
              {{ reviewLoading ? '提交中...' : '提交评价' }}
            </button>
          </div>
          <div v-else class="login-tip">登录后可评价</div>

          <div class="review-list">
            <div v-for="r in itemReviews" :key="r.id" class="review-item">
              <div class="review-header">
                <span class="review-user">{{ r.username }}</span>
                <span class="review-rating">{{ '★'.repeat(r.rating) }}</span>
                <span class="review-date">{{ r.date }}</span>
              </div>
              <p class="review-comment">{{ r.comment }}</p>
            </div>
            <div v-if="itemReviews.length === 0" class="empty-reviews">暂无评价</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddForm" class="modal-overlay" @click.self="showAddForm = false">
      <div class="modal">
        <button class="close" @click="showAddForm = false">关闭</button>
        <h2>发布商品</h2>
        <form class="add-form" @submit.prevent="handleAddItem">
          <div class="form-group">
            <label>商品标题</label>
            <input v-model="addForm.title" type="text" required />
          </div>
          <div class="form-group">
            <label>商品描述</label>
            <textarea v-model="addForm.description"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>价格</label>
              <input v-model="addForm.price" type="number" required min="0" />
            </div>
            <div class="form-group">
              <label>分类</label>
              <select v-model="addForm.category" required>
                <option value="">选择分类</option>
                <option v-for="c in categories.filter(c => c !== '全部')" :key="c" :value="c">
                  {{ c }}
                </option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn-primary" :disabled="addLoading">
            {{ addLoading ? '发布中...' : '发布' }}
          </button>
        </form>
      </div>
    </div>

    <div v-if="showSellerMessages" class="modal-overlay" @click.self="showSellerMessages = false">
      <div class="modal modal-large">
        <button class="close" @click="showSellerMessages = false">关闭</button>
        <h2>{{ isSeller ? '买家消息' : '我的消息' }}</h2>
        <div v-if="sellerMessagesLoading" class="loading">加载中...</div>
        <div v-else-if="conversations.length === 0" class="empty">暂无消息</div>
        <div v-else class="conversation-list">
          <div 
            v-for="conv in conversations" 
            :key="conv.itemId" 
            class="conversation-item"
            @click="openChatFromList(conv)"
          >
            <div class="conv-product">
              <span class="conv-product-title">商品：{{ conv.itemTitle }}</span>
              <span v-if="conv.otherUsername" class="conv-other-user">与 {{ conv.otherUsername }} 的对话</span>
            </div>
            <div class="conv-preview">
              <span class="conv-message">{{ conv.lastMessage }}</span>
            </div>
            <div class="conv-meta">
              <span class="conv-date">{{ conv.lastDate }}</span>
              <span v-if="conv.unreadCount > 0" class="conv-unread">{{ conv.unreadCount }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCart" class="modal-overlay" @click.self="showCart = false">
      <div class="modal modal-large">
        <button class="close" @click="showCart = false">关闭</button>
        <h2>购物车</h2>
        <div v-if="cartLoading" class="loading">加载中...</div>
        <div v-else-if="cartItems.length === 0" class="empty">购物车为空</div>
        <div v-else>
          <div class="cart-list">
            <div v-for="c in cartItems" :key="c.id" class="cart-item">
              <div class="cart-info">
                <span class="cart-title">{{ c.title }}</span>
                <span class="cart-price">¥{{ c.price }}</span>
              </div>
              <div class="cart-controls">
                <button @click="handleUpdateQuantity(c, -1)">-</button>
                <span>{{ c.quantity }}</span>
                <button @click="handleUpdateQuantity(c, 1)">+</button>
                <button class="btn-remove" @click="handleRemoveFromCart(c.id)">删除</button>
              </div>
            </div>
          </div>
          <div class="cart-footer">
            <div class="cart-total">总计：¥{{ cartTotal }}</div>
            <div class="cart-actions">
              <button class="btn-outline" @click="handleClearCart">清空</button>
              <button class="btn-primary" @click="handleCheckout">结算</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showChat" class="modal-overlay" @click.self="showChat = false">
      <div class="modal modal-large">
        <button class="close" @click="showChat = false">关闭</button>
        <div class="chat-header">
          <button class="btn-back" @click="showChat = false; showSellerMessages = true;">← 返回</button>
          <div class="chat-header-info">
            <h2>{{ currentConversation?.itemTitle || '聊天' }}</h2>
            <span class="chat-product-label">商品咨询</span>
          </div>
          <div class="chat-other-info">
            <span class="chat-other-label">{{ isSeller ? '买家' : '卖家' }}：</span>
            <span class="chat-other-user">{{ currentConversation?.otherUsername }}</span>
          </div>
        </div>
        <div class="chat-container">
          <div class="chat-messages" v-if="!chatLoading">
            <div
              v-for="msg in chatMessages"
              :key="msg.id"
              :class="['chat-msg', String(msg.fromUserId) === String(user?.id) ? 'mine' : 'theirs']"
            >
              <span class="msg-user">{{ msg.fromUsername }}</span>
              <p class="msg-content">{{ msg.content }}</p>
              <span class="msg-date">{{ msg.date }}</span>
            </div>
            <div v-if="chatMessages.length === 0" class="empty">暂无消息</div>
          </div>
          <div v-else class="loading">加载中...</div>
          <div class="chat-input-row">
            <input
              v-model="chatInput"
              placeholder="输入消息..."
              @keyup.enter="handleSendMessage"
            />
            <button class="btn-primary" @click="handleSendMessage">发送</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPayment" class="modal-overlay" @click.self="showPayment = false">
      <div class="modal">
        <button class="close" @click="showPayment = false">关闭</button>
        <h2>模拟支付</h2>
        <div class="payment-info">
          <p>订单号：{{ pendingOrder?.orderId }}</p>
          <p class="payment-amount">应付金额：¥{{ pendingOrder?.totalAmount }}</p>
        </div>
        <div class="payment-methods">
          <label class="payment-option" :class="{ selected: paymentMethod === 'alipay' }">
            <input type="radio" value="alipay" v-model="paymentMethod" />
            <span>支付宝</span>
          </label>
          <label class="payment-option" :class="{ selected: paymentMethod === 'wechat' }">
            <input type="radio" value="wechat" v-model="paymentMethod" />
            <span>微信支付</span>
          </label>
          <label class="payment-option" :class="{ selected: paymentMethod === 'paypal' }">
            <input type="radio" value="paypal" v-model="paymentMethod" />
            <span>PayPal</span>
          </label>
        </div>
        <button
          class="btn-primary btn-pay"
          @click="handlePay"
          :disabled="paymentLoading"
        >
          {{ paymentLoading ? '支付中...' : '确认支付' }}
        </button>
      </div>
    </div>

    <div v-if="showOrders" class="modal-overlay" @click.self="showOrders = false">
      <div class="modal modal-large">
        <button class="close" @click="showOrders = false">关闭</button>
        <h2>我的订单</h2>
        <div v-if="ordersLoading" class="loading">加载中...</div>
        <div v-else-if="orders.length === 0" class="empty">暂无订单</div>
        <div v-else class="order-list">
          <div v-for="o in orders" :key="o.orderId" class="order-item">
            <div class="order-header">
              <span class="order-id">订单号：{{ o.orderId }}</span>
              <span class="order-status" :class="o.status">{{ o.status }}</span>
            </div>
            <div class="order-items">
              <div v-for="item in o.items" :key="item.id" class="order-product">
                {{ item.title }} × {{ item.quantity }}
              </div>
            </div>
            <div class="order-footer">
              <span class="order-total">总计：¥{{ o.totalAmount }}</span>
              <span class="order-date">{{ o.date }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.secondhand-page {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #7c3aed 100%);
  position: relative;
  overflow-x: hidden;
}

.bg-decoration {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
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

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(20px, 10px) scale(1.02); }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 24px;
  box-shadow: 
    0 25px 80px rgba(76, 29, 149, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.3) inset;
  position: relative;
  z-index: 1;
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f1f5f9;
}

.header-row h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-row h1::before {
  content: '🛒';
  font-size: 28px;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search {
  flex: 1;
  min-width: 280px;
  padding: 12px 16px 12px 44px;
  border-radius: 14px;
  border: 2px solid #e2e8f0;
  background: #fafafa;
  font-size: 15px;
  color: #1e293b;
  transition: all 0.25s ease;
  position: relative;
}

.search:focus {
  border-color: #8b5cf6;
  background: #fff;
  box-shadow: 
    0 0 0 4px rgba(139, 92, 246, 0.12),
    0 2px 8px rgba(139, 92, 246, 0.1);
  outline: none;
}

.search::placeholder {
  color: #94a3b8;
}

.select {
  padding: 12px 16px;
  border-radius: 14px;
  border: 2px solid #e2e8f0;
  background: #fafafa;
  font-size: 15px;
  color: #1e293b;
  cursor: pointer;
  min-width: 140px;
  transition: all 0.25s ease;
}

.select:focus {
  border-color: #8b5cf6;
  background: #fff;
  outline: none;
}
.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.card {
  border: none;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
  position: relative;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(76, 29, 149, 0.2);
}

.card:hover::before {
  opacity: 1;
}

.thumb {
  height: 180px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.thumb::after {
  content: '📦';
  position: absolute;
  font-size: 48px;
  opacity: 0.1;
}

.thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  position: relative;
  z-index: 1;
}

.card-body {
  padding: 16px;
}

.title {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 12px;
  color: #0f172a;
  line-height: 1.4;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #64748b;
  font-size: 14px;
}

.price {
  color: #dc2626;
  font-weight: 700;
  font-size: 18px;
}

.seller {
  color: #64748b;
  font-size: 13px;
}
.empty {
  text-align: center;
  color: #94a3b8;
  padding: 48px 0;
  font-size: 16px;
}

.loading {
  text-align: center;
  color: #94a3b8;
  padding: 32px 0;
  font-size: 15px;
}

.error {
  text-align: center;
  color: #dc2626;
  padding: 32px 0;
  font-size: 15px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid #f1f5f9;
}

.pagination button {
  padding: 10px 20px;
  border: 2px solid #8b5cf6;
  background: #fff;
  color: #8b5cf6;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.25s ease;
}

.pagination button:hover:not(:disabled) {
  background: #f5f3ff;
  transform: translateY(-2px);
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #e2e8f0;
  color: #94a3b8;
}

.pagination span {
  color: #64748b;
  font-weight: 500;
}

.btn-primary {
  padding: 10px 20px;
  background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.25s ease;
  box-shadow: 0 4px 16px rgba(76, 29, 149, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(76, 29, 149, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  padding: 10px 20px;
  background: #fff;
  color: #8b5cf6;
  border: 2px solid #8b5cf6;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.25s ease;
}

.btn-outline:hover {
  background: #f5f3ff;
  transform: translateY(-2px);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: #fff;
  width: 90%;
  max-width: 500px;
  border-radius: 24px;
  padding: 28px;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 80px rgba(15, 23, 42, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-large {
  max-width: 900px;
}

.close {
  position: absolute;
  right: 20px;
  top: 20px;
  background: #f1f5f9;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 10px;
  color: #64748b;
  font-weight: 500;
  transition: all 0.2s ease;
}

.close:hover {
  background: #e2e8f0;
  color: #334155;
}
.modal-content {
  display: flex;
  gap: 24px;
}

.modal-thumb {
  width: 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  padding: 16px;
  border-radius: 16px;
}

.modal-thumb img {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.modal-info {
  width: 55%;
}

.modal-info h2 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.price-large {
  color: #dc2626;
  font-size: 28px;
  font-weight: 700;
  margin: 8px 0;
}

.desc {
  color: #64748b;
  line-height: 1.6;
  margin: 12px 0;
}

.modal-info .meta {
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 16px;
}

.action-row {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.reviews-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid #f1f5f9;
}

.reviews-section h3 {
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.review-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rating-row span {
  font-weight: 500;
  color: #334155;
}

.rating-row select {
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}

.review-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  resize: vertical;
  font-size: 14px;
  background: #fff;
}

.review-textarea:focus {
  border-color: #8b5cf6;
  outline: none;
}

.login-tip {
  color: #94a3b8;
  padding: 16px 0;
  text-align: center;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.review-user {
  font-weight: 600;
  color: #0f172a;
}

.review-rating {
  color: #f59e0b;
  font-size: 14px;
}

.review-date {
  color: #94a3b8;
  font-size: 12px;
  margin-left: auto;
}

.review-comment {
  color: #475569;
  line-height: 1.6;
}

.empty-reviews {
  color: #94a3b8;
  text-align: center;
  padding: 20px;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.add-form h2 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  color: #334155;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 15px;
  background: #fff;
  transition: all 0.25s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  border-color: #8b5cf6;
  outline: none;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.cart-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cart-title {
  font-weight: 600;
  color: #0f172a;
  font-size: 15px;
}

.cart-price {
  color: #dc2626;
  font-weight: 700;
  font-size: 16px;
}

.cart-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cart-controls button {
  padding: 6px 14px;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.cart-controls button:hover {
  border-color: #8b5cf6;
  background: #f5f3ff;
}

.btn-remove {
  color: #dc2626 !important;
  border-color: #fecaca !important;
}

.btn-remove:hover {
  background: #fef2f2 !important;
  border-color: #dc2626 !important;
}

.cart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 2px solid #f1f5f9;
}

.cart-total {
  font-size: 20px;
  font-weight: 700;
  color: #dc2626;
}

.cart-actions {
  display: flex;
  gap: 12px;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conversation-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.25s ease;
}

.conversation-item:hover {
  background: #f1f5f9;
  border-color: #8b5cf6;
  transform: translateX(4px);
}

.conv-product {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conv-product-title {
  font-weight: 700;
  color: #0f172a;
  font-size: 15px;
}

.conv-other-user {
  font-size: 13px;
  color: #64748b;
}

.conv-preview {
  font-size: 14px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conv-date {
  font-size: 12px;
  color: #94a3b8;
}

.conv-unread {
  background: #dc2626;
  color: white;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
  font-weight: 600;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
  margin-bottom: 16px;
}

.chat-header .btn-back {
  padding: 8px 16px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s ease;
}

.chat-header .btn-back:hover {
  background: #e2e8f0;
}

.chat-header-info {
  flex: 1;
}

.chat-header-info h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.chat-product-label {
  font-size: 13px;
  color: #94a3b8;
  margin-top: 4px;
  display: block;
}

.chat-other-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chat-other-label {
  font-size: 13px;
  color: #64748b;
}

.chat-other-user {
  font-size: 14px;
  color: #8b5cf6;
  font-weight: 600;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 450px;
  margin-top: 16px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
}

.chat-msg {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
  line-height: 1.5;
}

.chat-msg.mine {
  align-self: flex-end;
  background: linear-gradient(135deg, #4c1d95, #7c3aed);
  color: white;
  border-radius: 16px 16px 4px 16px;
}

.chat-msg.theirs {
  align-self: flex-start;
  background: #fff;
  color: #334155;
  border: 1px solid #e2e8f0;
  border-radius: 16px 16px 16px 4px;
}

.msg-user {
  font-size: 12px;
  opacity: 0.8;
  display: block;
  margin-bottom: 4px;
}

.msg-content {
  margin: 0;
}

.msg-date {
  font-size: 11px;
  opacity: 0.7;
  display: block;
  text-align: right;
  margin-top: 4px;
}

.chat-input-row {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.chat-input-row input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  font-size: 15px;
}

.chat-input-row input:focus {
  border-color: #8b5cf6;
  outline: none;
}

.payment-info {
  padding: 20px;
  background: #f8fafc;
  border-radius: 16px;
  margin: 20px 0;
  border: 1px solid #e2e8f0;
}

.payment-info p {
  margin: 8px 0;
  color: #475569;
}

.payment-amount {
  font-size: 24px;
  font-weight: 700;
  color: #dc2626;
}

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.payment-option:hover {
  border-color: #c4b5fd;
}

.payment-option.selected {
  border-color: #8b5cf6;
  background: #f5f3ff;
}

.btn-pay {
  width: 100%;
  margin-top: 20px;
  padding: 14px;
  font-size: 16px;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.order-item {
  padding: 20px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.order-id {
  font-weight: 600;
  color: #0f172a;
}

.order-status {
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
}

.order-status.paid {
  background: #dcfce7;
  color: #16a34a;
}

.order-status.pending_payment {
  background: #fef3c7;
  color: #d97706;
}

.order-status.cancelled {
  background: #fee2e2;
  color: #dc2626;
}

.order-items {
  padding: 12px 0;
  border-top: 1px solid #e2e8f0;
}

.order-product {
  padding: 6px 0;
  color: #64748b;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.order-total {
  font-weight: 700;
  color: #dc2626;
  font-size: 16px;
}

.order-date {
  color: #94a3b8;
  font-size: 13px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .secondhand-page {
    padding: 16px;
  }

  .container {
    padding: 20px;
  }

  .header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-row h1 {
    font-size: 26px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .controls {
    flex-direction: column;
  }

  .search {
    min-width: 100%;
  }

  .list-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .modal {
    padding: 20px;
    border-radius: 20px;
  }

  .modal-content {
    flex-direction: column;
  }

  .modal-thumb,
  .modal-info {
    width: 100%;
  }

  .chat-container {
    height: 350px;
  }
}

@media (max-width: 480px) {
  .list-grid {
    grid-template-columns: 1fr;
  }

  .header-actions {
    justify-content: space-between;
  }

  .btn-primary,
  .btn-outline {
    padding: 8px 14px;
    font-size: 13px;
  }
}
</style>
