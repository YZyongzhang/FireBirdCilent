import axios from 'axios'

const BASE = '/api/users'

export type UserRole = 'user' | 'seller' | 'admin'

export interface User {
  id: string | number
  username: string
  password?: string
  role: UserRole
  email?: string
}

export interface UserResponse {
  status: string
  message?: string
  data?: User
}

export interface UsersResponse {
  status: string
  data?: {
    users: User[]
    total: number
  }
}

function getHeaders() {
  const user = JSON.parse(localStorage.getItem('fb_user') || 'null')
  return user ? {
    'X-User-Id': String(user.id),
    'X-User-Username': user.username,
    'X-User-Role': user.role,
    'X-User-Password': user.password || '',
  } : {}
}

export async function getUsers(params: {
  page?: number
  size?: number
  role?: string
}): Promise<UsersResponse> {
  const { data } = await axios.get(BASE, {
    params,
    headers: getHeaders(),
  })
  return data
}

export async function getUserById(id: string | number): Promise<UserResponse> {
  const { data } = await axios.get(`${BASE}/${id}`, {
    headers: getHeaders(),
  })
  return data
}

export async function updateUser(id: string | number, userData: Partial<User>): Promise<UserResponse> {
  const { data } = await axios.put(`${BASE}/${id}`, userData, {
    headers: getHeaders(),
  })
  return data
}

export async function deleteUser(id: string | number): Promise<UserResponse> {
  const { data } = await axios.delete(`${BASE}/${id}`, {
    headers: getHeaders(),
  })
  return data
}

export async function getCurrentUser(): Promise<UserResponse> {
  const { data } = await axios.get(`${BASE}/me`, {
    headers: getHeaders(),
  })
  return data
}

export async function registerUser(data: {
  username: string
  password: string
  email?: string
  role?: UserRole
}): Promise<UserResponse> {
  const { data: res } = await axios.post('/register', data)
  return res
}

export default {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getCurrentUser,
  registerUser,
}
