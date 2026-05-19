import axios from 'axios'
import { API_BASE } from '@/config'
import { getUser } from './auth'
import type { User } from './user'

const BASE = `${API_BASE}/secondhand`

function getHeaders() {
  const user = getUser()
  return {
    'X-User-Id': user?.id ? String(user.id) : '',
    'X-User-Username': user?.username || '',
    'X-User-Role': user?.role || '',
    'X-User-Password': user?.password || '',
  }
}

export type Item = {
  id: string | number
  title: string
  price: number
  thumb?: string
  images?: string[]
  description?: string
  seller?: { id: string | number; name: string }
  sellerId?: string | number
  sellerName?: string
  date?: string
  category?: string
  status?: string
  orders?: Order[]  // 添加订单列表
}

export type RawItem = {
  id: string | number
  title: string
  price: number
  thumb?: string
  images?: string  // 后端返回的是逗号分隔的字符串
  description?: string
  sellerId?: string | number
  sellerName?: string
  date?: string
  category?: string
  status?: string
}

function adaptItem(raw: RawItem): Item {
  // 将逗号分隔的字符串转为数组
  const imagesArray = raw.images 
    ? raw.images.split(',').map(img => {
        const trimmed = img.trim()
        return trimmed.startsWith('http') ? trimmed : `${API_BASE}${trimmed}`
      }).filter(Boolean)
    : undefined
  
  // 处理图片路径
  const thumb = raw.thumb ? (raw.thumb.startsWith('http') ? raw.thumb : `${API_BASE}${raw.thumb}`) : undefined
  
  return {
    ...raw,
    thumb,
    images: imagesArray,
    status: raw.status || 'available',
    seller: raw.sellerId !== undefined && raw.sellerId !== null && raw.sellerId !== 0
      ? { id: raw.sellerId, name: raw.sellerName || '未知卖家' }
      : undefined,
    sellerId: raw.sellerId,
    sellerName: raw.sellerName || '未知卖家',
  }
}

function adaptItems(rawItems: RawItem[]): Item[] {
  return rawItems.map(adaptItem)
}

export type CartItem = {
  id: string | number
  itemId: string | number
  title: string
  price: number
  thumb?: string
  quantity: number
}

export type Message = {
  id: string | number
  fromUserId: string | number
  fromUsername: string
  toUserId: string | number
  content: string
  date: string
  itemId?: string
  itemTitle?: string
  isRead?: number
}

export type Conversation = {
  itemId: string
  itemTitle: string
  otherUserId: string | number
  otherUsername: string
  lastMessage: string
  lastDate: string
  unreadCount: number
}

export interface ConversationsResponse {
  conversations: Conversation[]
}

export type Review = {
  id: string | number
  userId: string | number
  username: string
  rating: number
  comment: string
  date: string
}

export type Order = {
  orderId: string | number
  items: CartItem[]
  totalAmount: number
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  date: string
  payTime?: string
  shipTime?: string
  deliverTime?: string
  shippingAddress?: string
  trackingNumber?: string
}

export interface ItemsResponse {
  items: Item[]
  total: number
}

export interface RawItemsResponse {
  items: RawItem[]
  total: number
}

export interface CartResponse {
  items: CartItem[]
}

export interface MessagesResponse {
  messages: Message[]
}

export interface ReviewsResponse {
  reviews: Review[]
}

export interface OrdersResponse {
  orders: Order[]
}

export interface CategoriesResponse {
  categories: string[]
}

export interface UnreadCountResponse {
  count: number
}

export interface CreateOrderResponse {
  orderId: string | number
  status: string
}

export interface PayResponse {
  success: boolean
  orderId: string | number
  status: string
}

export async function getItems(params: {
  page?: number
  size?: number
  q?: string
  category?: string
}): Promise<ItemsResponse> {
  const { data } = await axios.get<RawItemsResponse>(`${BASE}/items`, {
    params,
    headers: getHeaders(),
  })
  return {
    ...data,
    items: adaptItems(data.items),
  }
}

export async function getItemDetail(id: string | number): Promise<Item> {
  console.log('[DEBUG] getItemDetail called with id:', id)
  try {
    const { data } = await axios.get<RawItem>(`${BASE}/items/${id}`, {
      headers: getHeaders(),
      timeout: 10000,
    })
    console.log('[DEBUG] Raw API response:', JSON.stringify(data, null, 2))
    const adapted = adaptItem(data)
    console.log('[DEBUG] Adapted item:', JSON.stringify(adapted, null, 2))
    return adapted
  } catch (error: any) {
    console.error('[DEBUG] getItemDetail error:', error.message)
    console.error('[DEBUG] Error response:', error.response?.data)
    throw error
  }
}

export async function createItem(payload: {
  title: string
  description: string
  price: number
  category: string
  images?: File[]
}): Promise<{ success: boolean; message?: string; data?: Item }> {
  const formData = new FormData()
  formData.append('title', payload.title)
  formData.append('description', payload.description)
  formData.append('price', String(payload.price))
  formData.append('category', payload.category)
  if (payload.images) {
    payload.images.forEach(img => formData.append('images', img))
  }
  const { data } = await axios.post(`${BASE}/items`, formData, {
    headers: {
      ...getHeaders(),
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

export async function updateItem(
  id: string | number,
  payload: {
    title: string
    description: string
    price: number
    category: string
    images?: File[]
  }
): Promise<Item> {
  const formData = new FormData()
  formData.append('title', payload.title)
  formData.append('description', payload.description)
  formData.append('price', String(payload.price))
  formData.append('category', payload.category)
  if (payload.images) {
    payload.images.forEach(img => formData.append('images', img))
  }
  const { data } = await axios.put(`${BASE}/items/${id}`, formData, {
    headers: {
      ...getHeaders(),
      'Content-Type': 'multipart/form-data',
    },
  })
  return data
}

export async function deleteItem(id: string | number): Promise<void> {
  await axios.delete(`${BASE}/items/${id}`, {
    headers: getHeaders(),
  })
}

export async function getMyItems(): Promise<Item[]> {
  const { data } = await axios.get<Item[]>(`${BASE}/items/my`, {
    headers: getHeaders(),
  })
  return data
}

export async function offlineItem(id: string | number): Promise<{ success: boolean; message: string }> {
  const { data } = await axios.put<{ success: boolean; message: string }>(`${BASE}/items/${id}/offline`, {}, {
    headers: getHeaders(),
  })
  return data
}

export async function getCategories(): Promise<CategoriesResponse> {
  const { data } = await axios.get(`${BASE}/categories`, {
    headers: getHeaders(),
  })
  return data
}

export async function getCart(): Promise<CartResponse> {
  const { data } = await axios.get(`${BASE}/cart`, {
    headers: getHeaders(),
  })
  return data
}

export async function addToCart(payload: {
  itemId: string | number
  quantity: number
  title?: string
  price?: number
  thumb?: string
}): Promise<{ success: boolean; message?: string }> {
  const { data } = await axios.post(`${BASE}/cart`, payload, {
    headers: getHeaders(),
  })
  return data
}

export async function updateCartItem(
  id: string | number,
  payload: { quantity: number }
): Promise<void> {
  await axios.put(`${BASE}/cart/${id}`, payload, {
    headers: getHeaders(),
  })
}

export async function removeFromCart(id: string | number): Promise<void> {
  await axios.delete(`${BASE}/cart/${id}`, {
    headers: getHeaders(),
  })
}

export async function clearCart(): Promise<void> {
  await axios.delete(`${BASE}/cart`, {
    headers: getHeaders(),
  })
}



export async function getConversations(): Promise<ConversationsResponse> {
  const { data } = await axios.get(`${BASE}/messages/conversations`, {
    headers: getHeaders(),
  })
  return data
}

export async function getMessagesByItem(itemId: string | number): Promise<MessagesResponse> {
  const { data } = await axios.get(`${BASE}/messages/item/${itemId}`, {
    headers: getHeaders(),
  })
  return data
}

export async function getConversation(withUserId: string | number, itemId: string): Promise<MessagesResponse> {
  const { data } = await axios.get(`${BASE}/messages/conversation`, {
    params: { withUserId, itemId },
    headers: getHeaders(),
  })
  return data
}

export async function sendMessage(payload: {
  toUserId: string | number
  content: string
  itemId: string
  itemTitle: string
}): Promise<{ status: string; message: Message }> {
  const { data } = await axios.post(`${BASE}/messages`, payload, {
    headers: getHeaders(),
  })
  return data
}

export async function getSellers(): Promise<{ status: string; message?: string; data?: User[] }> {
  const { data } = await axios.get(`${API_BASE}/api/users/sellers`, {
    headers: getHeaders(),
  })
  return data
}

export async function getSellerById(id: number): Promise<{ status: string; message?: string; data?: User }> {
  const { data } = await axios.get(`${API_BASE}/api/users/sellers/${id}`, {
    headers: getHeaders(),
  })
  return data
}

export async function registerSeller(payload: {
  username: string
  password: string
  phone: string
  idCard: string
  address: string
  businessType: string
  description: string
}): Promise<{ status: string; message?: string }> {
  const { data } = await axios.post(`/api/users/register/seller`, payload)
  return data
}

export async function getOrders(): Promise<OrdersResponse> {
  const { data } = await axios.get(`${BASE}/orders`, {
    headers: getHeaders(),
  })
  return data
}

export async function createOrder(payload: {
  cartItemIds: (string | number)[]
  totalAmount: number
}): Promise<CreateOrderResponse> {
  const { data } = await axios.post(`${BASE}/orders`, payload, {
    headers: getHeaders(),
  })
  return data
}

export async function payOrder(
  orderId: string | number,
  paymentMethod: 'alipay' | 'wechat' | 'paypal'
): Promise<PayResponse> {
  const { data } = await axios.post(
    `${BASE}/orders/${orderId}/pay`,
    { paymentMethod },
    { headers: getHeaders() }
  )
  return data
}

export async function cancelOrder(orderId: string | number): Promise<void> {
  await axios.put(`${BASE}/orders/${orderId}/cancel`, {}, {
    headers: getHeaders(),
  })
}

export async function getOrdersBySeller(sellerId: string | number): Promise<OrdersResponse> {
  const { data } = await axios.get(`${BASE}/orders/seller/${sellerId}`, {
    headers: getHeaders(),
  })
  return { orders: data }
}

export async function shipOrder(orderId: string | number, trackingNumber?: string): Promise<void> {
  await axios.post(`${BASE}/orders/${orderId}/ship`, { trackingNumber }, {
    headers: getHeaders(),
  })
}

export async function confirmOrder(orderId: string | number): Promise<void> {
  await axios.post(`${BASE}/orders/${orderId}/confirm`, {}, {
    headers: getHeaders(),
  })
}

export async function applyReturnOrder(orderId: string | number, reason: string): Promise<void> {
  await axios.post(`${BASE}/orders/${orderId}/refund`, { reason }, {
    headers: getHeaders(),
  })
}

export async function getItemReviews(itemId: string | number): Promise<ReviewsResponse> {
  const { data } = await axios.get(`${BASE}/items/${itemId}/reviews`, {
    headers: getHeaders(),
  })
  return data
}

export async function submitReview(
  itemId: string | number,
  payload: { rating: number; comment: string }
): Promise<Review> {
  const { data } = await axios.post(`${BASE}/items/${itemId}/reviews`, payload, {
    headers: getHeaders(),
  })
  return data
}

export const getItem = getItemDetail
export const addReview = submitReview
