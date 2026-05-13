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
  getMessages,
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
} from '@/utils/secondhand'
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
const chatWith = ref<{ id: string | number; name: string } | null>(null)
const chatMessages = ref<Message[]>([])
const chatInput = ref('')
const chatLoading = ref(false)

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
  try {
    await addToCart({ itemId: it.id, quantity: 1 })
    alert('已加入购物车')
  } catch (e: any) {
    alert('加入购物车失败')
  }
}

async function openChat(item: Item) {
  if (!item.seller || !item.seller.id) {
    alert('无法联系卖家，卖家信息不完整')
    return
  }
  chatWith.value = { id: item.seller.id, name: item.seller.name || item.sellerName || '未知卖家' }
  showChat.value = true
  chatLoading.value = true
  try {
    const res = await getMessages(item.seller.id)
    chatMessages.value = res.messages
  } catch (e) {
    chatMessages.value = []
    console.error('获取聊天记录失败:', e)
  } finally {
    chatLoading.value = false
  }
}

async function handleSendMessage() {
  if (!chatInput.value.trim() || !chatWith.value) return
  try {
    const msg = await sendMessage({
      toUserId: chatWith.value.id,
      content: chatInput.value,
    })
    chatMessages.value.push(msg)
    chatInput.value = ''
  } catch (e) {
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
    <section class="container">
      <div class="header-row">
        <h1>二手交易</h1>
        <div class="header-actions">
          <button class="btn-outline" @click="openOrders">我的订单</button>
          <button class="btn-outline" @click="openCart">购物车</button>
          <button class="btn-primary" @click="showAddForm = true">发布商品</button>
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
        <h2>联系 {{ chatWith?.name }}</h2>
        <div class="chat-container">
          <div class="chat-messages" v-if="!chatLoading">
            <div
              v-for="msg in chatMessages"
              :key="msg.id"
              :class="['chat-msg', msg.fromUserId === user?.id ? 'mine' : 'theirs']"
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
.container {
  max-width: 1080px;
  margin: 24px auto;
  padding: 24px;
  background: white;
  border-radius: 12px;
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.controls {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.search {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ddd;
  min-width: 260px;
}
.select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ddd;
}
.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 18px;
}
.card {
  border: 1px solid #eee;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  transition: box-shadow 0.12s ease;
}
.card:hover {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}
.thumb {
  height: 140px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.card-body {
  padding: 12px;
}
.title {
  font-weight: 600;
  margin-bottom: 8px;
}
.meta {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 14px;
}
.price {
  color: #f56c6c;
  font-weight: 700;
}
.empty {
  text-align: center;
  color: #888;
  padding: 36px 0;
}
.loading {
  text-align: center;
  color: #888;
  padding: 24px 0;
}
.error {
  text-align: center;
  color: #f56c6c;
  padding: 24px 0;
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}
.pagination button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-outline {
  padding: 8px 16px;
  background: white;
  color: #409eff;
  border: 1px solid #409eff;
  border-radius: 6px;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  background: #fff;
  width: 90%;
  max-width: 500px;
  border-radius: 12px;
  padding: 18px;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-large {
  max-width: 800px;
}
.close {
  position: absolute;
  right: 12px;
  top: 12px;
  background: transparent;
  border: none;
  font-size: 14px;
  cursor: pointer;
}
.modal-content {
  display: flex;
  gap: 18px;
}
.modal-thumb {
  width: 48%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  padding: 12px;
}
.modal-thumb img {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}
.modal-info {
  width: 52%;
}
.price-large {
  color: #f56c6c;
  font-size: 22px;
  font-weight: 700;
}
.action-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.reviews-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}
.reviews-section h3 {
  margin-bottom: 12px;
}
.review-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.rating-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rating-row select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.review-textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: vertical;
}
.login-tip {
  color: #888;
  padding: 12px 0;
}
.review-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.review-item {
  padding: 10px;
  background: #f9f9f9;
  border-radius: 6px;
}
.review-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.review-user {
  font-weight: 600;
  color: #333;
}
.review-rating {
  color: #f56c6c;
}
.review-date {
  color: #999;
  font-size: 12px;
}
.review-comment {
  color: #666;
  line-height: 1.5;
}
.empty-reviews {
  color: #aaa;
  text-align: center;
  padding: 12px;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-group label {
  font-size: 14px;
  color: #666;
}
.form-group input,
.form-group textarea,
.form-group select {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.form-row {
  display: flex;
  gap: 12px;
}
.form-row .form-group {
  flex: 1;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}
.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 6px;
}
.cart-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cart-title {
  font-weight: 600;
}
.cart-price {
  color: #f56c6c;
  font-weight: 700;
}
.cart-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cart-controls button {
  padding: 4px 10px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}
.btn-remove {
  color: #f56c6c !important;
  border-color: #f56c6c !important;
}
.cart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}
.cart-total {
  font-size: 18px;
  font-weight: 700;
  color: #f56c6c;
}
.cart-actions {
  display: flex;
  gap: 8px;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 400px;
  margin-top: 12px;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 6px;
}
.chat-msg {
  max-width: 75%;
  padding: 8px 12px;
  border-radius: 8px;
  line-height: 1.4;
}
.chat-msg.mine {
  align-self: flex-end;
  background: #409eff;
  color: white;
}
.chat-msg.theirs {
  align-self: flex-start;
  background: white;
  border: 1px solid #eee;
}
.msg-user {
  font-size: 12px;
  opacity: 0.8;
  display: block;
}
.msg-content {
  margin: 4px 0;
}
.msg-date {
  font-size: 10px;
  opacity: 0.6;
  display: block;
  text-align: right;
}
.chat-input-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.chat-input-row input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.payment-info {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  margin: 16px 0;
}
.payment-info p {
  margin: 4px 0;
}
.payment-amount {
  font-size: 20px;
  font-weight: 700;
  color: #f56c6c;
}
.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.payment-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
}
.payment-option.selected {
  border-color: #409eff;
  background: #ecf5ff;
}
.btn-pay {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  font-size: 16px;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}
.order-item {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.order-id {
  font-weight: 600;
}
.order-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.order-status.paid {
  background: #e1f3d8;
  color: #67c23a;
}
.order-status.pending_payment {
  background: #fdf6ec;
  color: #e6a23c;
}
.order-status.cancelled {
  background: #fde2e2;
  color: #f56c6c;
}
.order-items {
  padding: 8px 0;
  border-top: 1px solid #eee;
}
.order-product {
  padding: 4px 0;
  color: #666;
}
.order-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #eee;
}
.order-total {
  font-weight: 700;
  color: #f56c6c;
}
.order-date {
  color: #999;
  font-size: 12px;
}
</style>
