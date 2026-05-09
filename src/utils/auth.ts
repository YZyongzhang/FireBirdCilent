import axios from 'axios'

const STORAGE_KEY = 'fb_user'

export type User = {
  id: string | number
  username: string
  password: string
  role: string
}

export function saveUser(user: User) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    attachToAxios(user)
  } catch (e) {
    // ignore
  }
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch (e) {
    return null
  }
}

export function clearUser() {
  localStorage.removeItem(STORAGE_KEY)
  detachAxios()
}

export function attachToAxios(user?: User | null) {
  const u = user || getUser()
  if (!u) return
  axios.defaults.headers.common['X-User-Id'] = String(u.id)
  axios.defaults.headers.common['X-User-Username'] = u.username
  axios.defaults.headers.common['X-User-Role'] = u.role
  axios.defaults.headers.common['X-User-Password'] = u.password
}

export function detachAxios() {
  delete axios.defaults.headers.common['X-User-Id']
  delete axios.defaults.headers.common['X-User-Username']
  delete axios.defaults.headers.common['X-User-Role']
  delete axios.defaults.headers.common['X-User-Password']
}

export default {
  saveUser,
  getUser,
  clearUser,
  attachToAxios,
  detachAxios,
}
