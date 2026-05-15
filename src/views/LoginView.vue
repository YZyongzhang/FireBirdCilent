<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { API_BASE } from '../config'
import { saveUser } from '../utils/auth'

const router = useRouter()

// 通用状态
const mode = ref<'account' | 'sms' | 'qr' | 'register'>('account')
const errorMessage = ref('')

// 账号密码登录
const username = ref('')
const password = ref('')
const handleAccountLogin = async () => {
  try {
    const res = await axios.post(`${API_BASE}/login`, {
      username: username.value,
      password: password.value,
    })
    if (res.data.status === 'ok') {
      // 后端可能直接返回一个 data map: { id, username, role }
      console.log(res.data)
      const dataMap = res.data?.data
      let user: any = null
      if (dataMap && (dataMap.id || dataMap.username || dataMap.role)) {
        user = {
          id: dataMap.id,
          username: dataMap.username,
          role: dataMap.role || 'user',
        }
      } else if (res.data?.user) {
        user = res.data.user
      } else {
        user = {
          id: res.data?.id || Date.now(),
          username: username.value,
          role: res.data?.role || 'user',
        }
      }
      saveUser(user)
      router.push('/home')
    } else {
      errorMessage.value = res.data?.message || '账号或密码错误'
    }
  } catch (err) {
    errorMessage.value = '账号或密码错误'
  }
}

// 注册
const regUsername = ref('')
const regPassword = ref('')
const regConfirm = ref('')
const regEmail = ref('')
const regRole = ref<'user' | 'seller' | 'admin'>('user')
const handleRegister = async () => {
  if (regPassword.value !== regConfirm.value) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }
  try {
    const res = await axios.post(`${API_BASE}/register`, {
      username: regUsername.value,
      password: regPassword.value,
      email: regEmail.value,
      role: regRole.value,
    })
    if (res.data.status === 'ok') {
      router.push('/login')
    } else {
      errorMessage.value = res.data?.message || '注册失败'
    }
  } catch (err) {
    errorMessage.value = '注册失败'
  }
}

// 短信登录
const phone = ref('')
const smsCode = ref('')
const smsSent = ref(false)
const sendSmsCode = async () => {
  try {
    await axios.post(`${API_BASE}/send-sms`, { phone: phone.value })
    smsSent.value = true
  } catch (err) {
    errorMessage.value = '发送短信失败'
  }
}
const handleSmsLogin = async () => {
  try {
    const res = await axios.post(`${API_BASE}/login/sms`, { phone: phone.value, code: smsCode.value })
    if (res.data.status === 'ok') {
      const dataMap = res.data?.data
      let user: any = null
      if (dataMap && (dataMap.id || dataMap.username || dataMap.role)) {
        user = {
          id: dataMap.id,
          username: dataMap.username || phone.value,
          role: dataMap.role || 'user',
        }
      } else if (res.data?.user) {
        user = res.data.user
      } else {
        user = {
          id: res.data?.id || Date.now(),
          username: phone.value,
          role: res.data?.role || 'user',
        }
      }
      saveUser(user)
      router.push('/home')
    } else errorMessage.value = res.data?.message || '短信登录失败'
  } catch (err) {
    errorMessage.value = '短信登录失败'
  }
}

// 二维码登录：后端返回 PNG（二进制）并在响应头带上 X-Session-Id
const qrCodeUrl = ref('')
const qrStatus = ref<'waiting' | 'scanned' | 'confirmed' | 'error'>('waiting')
const qrSessionId = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

const stopPolling = () => {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const startPolling = () => {
  if (!qrSessionId.value) return
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const res = await axios.get(`${API_BASE}/login/qr/status`, { params: { sessionId: qrSessionId.value } })
      // 兼容后端返回结构：{ status:"ok", message:"", data:{ status: "waiting" } }
      const status = res.data?.data?.status || res.data?.status || 'waiting'
      qrStatus.value = status
      if (status === 'confirmed') {
        stopPolling()
        // try to obtain user info for this QR session and persist it
        try {
          const r = await axios.get(`${API_BASE}/login/qr/result`, { params: { sessionId: qrSessionId.value } })
          // 后端可能返回 data map 或 user 对象
          const dataMap = r.data?.data
          let user: any = null
          if (dataMap && (dataMap.id || dataMap.username || dataMap.role)) {
            user = { id: dataMap.id, username: dataMap.username, role: dataMap.role }
          } else if (r.data?.user) {
            user = r.data.user
          }
          if (user) saveUser(user)
          else {
            // fallback to a general /me endpoint
            try {
              const me = await axios.get(`${API_BASE}/me`)
              const mu = me.data?.data?.user || me.data?.user
              if (mu) saveUser(mu)
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore
        }
        router.push('/home')
      }
    } catch (err) {
      // 忽略单次轮询错误，稍后继续
    }
  }, 2000)
}

// initQr: 请求二维码 PNG（二进制），从响应头读取 X-Session-Id，展示图片并开始轮询
const initQr = async () => {
  try {
    const res = await axios.get(`${API_BASE}/login/qr`, { responseType: 'blob' })
    const sessionId = res.headers['x-session-id'] || res.headers['X-Session-Id'] || ''
    qrSessionId.value = sessionId

    // 释放上一个 URL（如果存在）
    if (qrCodeUrl.value) URL.revokeObjectURL(qrCodeUrl.value)

    const blob = res.data as Blob
    const url = URL.createObjectURL(blob)
    qrCodeUrl.value = url
    qrStatus.value = 'waiting'
    // 开始轮询状态
    startPolling()
  } catch (err) {
    qrStatus.value = 'error'
    errorMessage.value = '无法生成二维码'
  }
}

// 清理
watch(mode, (n) => {
  if (n !== 'qr') {
    stopPolling()
    if (qrCodeUrl.value) {
      URL.revokeObjectURL(qrCodeUrl.value)
      qrCodeUrl.value = ''
    }
    qrSessionId.value = ''
    qrStatus.value = 'waiting'
  }
})

onUnmounted(() => {
  stopPolling()
  if (qrCodeUrl.value) URL.revokeObjectURL(qrCodeUrl.value)
})

</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <div class="login-header">
        <p class="login-badge">FireBird Client</p>
        <h1 v-if="mode === 'register'">创建账号</h1>
        <h1 v-else>欢迎登录</h1>
        <p class="login-description">请选择登录方式：账号/短信/二维码 或 注册新账号。</p>
      </div>

      <nav class="auth-tabs">
        <button :class="{active: mode === 'account'}" @click="mode = 'account'">账号登录</button>
        <button :class="{active: mode === 'sms'}" @click="mode = 'sms'">短信登录</button>
        <button :class="{active: mode === 'qr'}" @click="(mode = 'qr', initQr())">二维码登录</button>
        <button :class="{active: mode === 'register'}" @click="mode = 'register'">注册</button>
      </nav>

      <!-- 账号密码登录 -->
      <form v-if="mode === 'account'" class="login-form" @submit.prevent="handleAccountLogin">
        <label class="form-item">
          <span>用户名</span>
          <input v-model="username" type="text" placeholder="请输入用户名" />
        </label>

        <label class="form-item">
          <span>密码</span>
          <input v-model="password" type="password" placeholder="请输入密码" />
        </label>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit">登录</button>
      </form>

      <!-- 短信登录 -->
      <form v-if="mode === 'sms'" class="login-form" @submit.prevent="handleSmsLogin">
        <label class="form-item">
          <span>手机号</span>
          <input v-model="phone" type="tel" placeholder="请输入手机号" />
        </label>

        <div class="sms-row">
          <label class="form-item" style="flex:1;">
            <span>验证码</span>
            <input v-model="smsCode" type="text" placeholder="输入收到的验证码" />
          </label>
          <button type="button" class="send-code" @click="sendSmsCode">{{ smsSent ? '已发送' : '发送验证码' }}</button>
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit">短信登录</button>
      </form>

      <!-- 二维码登录 -->
      <div v-if="mode === 'qr'" class="qr-area">
        <p>使用移动端扫码登录：</p>
        <div class="qr-box">
          <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="二维码" />
          <div v-else class="qr-placeholder">二维码加载中</div>
        </div>
        <p v-if="qrStatus === 'scanned'">已扫码，等待确认…</p>
      </div>

      <!-- 注册 -->
      <form v-if="mode === 'register'" class="login-form" @submit.prevent="handleRegister">
        <label class="form-item">
          <span>用户名</span>
          <input v-model="regUsername" type="text" placeholder="请输入用户名" />
        </label>

        <label class="form-item">
          <span>邮箱（可选）</span>
          <input v-model="regEmail" type="email" placeholder="请输入邮箱" />
        </label>

        <label class="form-item">
          <span>用户角色</span>
          <select v-model="regRole" class="select">
            <option value="user">普通用户</option>
            <option value="seller">卖家</option>
            <option value="admin">管理员</option>
          </select>
        </label>

        <label class="form-item">
          <span>密码</span>
          <input v-model="regPassword" type="password" placeholder="请输入密码" />
        </label>

        <label class="form-item">
          <span>确认密码</span>
          <input v-model="regConfirm" type="password" placeholder="再次输入密码" />
        </label>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit">注册</button>
      </form>

    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  overflow: hidden;
  background: linear-gradient(135deg, #172554 0%, #1d4ed8 50%, #60a5fa 100%);
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 32px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  box-sizing: border-box;
}

.login-header {
  margin-bottom: 28px;
}

.login-badge {
  margin: 0 0 12px;
  color: #2563eb;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.login-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
}

.login-description {
  margin: 12px 0 0;
  color: #475569;
  line-height: 1.6;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #1e293b;
  font-size: 14px;
  font-weight: 600;
}

.form-item input {
  height: 48px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  font-size: 15px;
  color: #0f172a;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-item input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
}

.error-message {
  margin: -6px 0 0;
  color: #dc2626;
  font-size: 14px;
}

button {
  height: 48px;
  border: none;
  border-radius: 12px;
  background: #2563eb;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

button:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
</style>
