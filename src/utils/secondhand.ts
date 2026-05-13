import axios from 'axios'
import { API_BASE } from '@/config'
import { getUser } from './auth'

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
}

export type RawItem = {
  id: string | number
  title: string
  price: number
  thumb?: string
  images?: string[]
  description?: string
  sellerId?: string | number
  sellerName?: string
  date?: string
  category?: string
}

function adaptItem(raw: RawItem): Item {
  return {
    ...raw,
    seller: raw.sellerId !== undefined
      ? { id: raw.sellerId, name: raw.sellerName || '' }
      : undefined,
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
  status: string
  date: string
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
  const { data } = await axios.get<RawItem>(`${BASE}/items/${id}`, {
    headers: getHeaders(),
  })
  return adaptItem(data)
}

export async function createItem(payload: {
  title: string
  description: string
  price: number
  category: string
  images?: File[]
}): Promise<Item> {
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
}): Promise<void> {
  await axios.post(`${BASE}/cart`, payload, {
    headers: getHeaders(),
  })
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

export async function getMessages(withUserId: string | number): Promise<MessagesResponse> {
  const { data } = await axios.get(`${BASE}/messages`, {
    params: { withUserId },
    headers: getHeaders(),
  })
  return data
}

export async function sendMessage(payload: {
  toUserId: string | number
  content: string
}): Promise<Message> {
  const { data } = await axios.post(`${BASE}/messages`, payload, {
    headers: getHeaders(),
  })
  return data
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const { data } = await axios.get(`${BASE}/messages/unread-count`, {
    headers: getHeaders(),
  })
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
