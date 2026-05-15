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
const loading = ref(false)

// 账号密码登录
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const showRegPassword = ref(false)
const showRegConfirm = ref(false)
const handleAccountLogin = async () => {
  loading.value = true
  try {
    const res = await axios.post(`${API_BASE}/login`, {
      username: username.value,
      password: password.value,
    })
    if (res.data.status === 'ok') {
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
  } finally {
    loading.value = false
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
  loading.value = true
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
  } finally {
    loading.value = false
  }
}

// 短信登录
const phone = ref('')
const smsCode = ref('')
const smsSent = ref(false)
const smsCountdown = ref(60)
const sendSmsCode = async () => {
  if (smsSent.value) return
  try {
    await axios.post(`${API_BASE}/send-sms`, { phone: phone.value })
    smsSent.value = true
    const timer = setInterval(() => {
      smsCountdown.value--
      if (smsCountdown.value <= 0) {
        clearInterval(timer)
        smsSent.value = false
        smsCountdown.value = 60
      }
    }, 1000)
  } catch (err) {
    errorMessage.value = '发送短信失败'
  }
}
const handleSmsLogin = async () => {
  loading.value = true
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
  } finally {
    loading.value = false
  }
}

// 二维码登录
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
      const status = res.data?.data?.status || res.data?.status || 'waiting'
      qrStatus.value = status
      if (status === 'confirmed') {
        stopPolling()
        try {
          const r = await axios.get(`${API_BASE}/login/qr/result`, { params: { sessionId: qrSessionId.value } })
          const dataMap = r.data?.data
          let user: any = null
          if (dataMap && (dataMap.id || dataMap.username || dataMap.role)) {
            user = { id: dataMap.id, username: dataMap.username, role: dataMap.role }
          } else if (r.data?.user) {
            user = r.data.user
          }
          if (user) saveUser(user)
          else {
            try {
              const me = await axios.get(`${API_BASE}/me`)
              const mu = me.data?.data?.user || me.data?.user
              if (mu) saveUser(mu)
            } catch (e) {}
          }
        } catch (e) {}
        router.push('/home')
      }
    } catch (err) {}
  }, 2000)
}

const initQr = async () => {
  try {
    const res = await axios.get(`${API_BASE}/login/qr`, { responseType: 'blob' })
    const sessionId = res.headers['x-session-id'] || res.headers['X-Session-Id'] || ''
    qrSessionId.value = sessionId

    if (qrCodeUrl.value) URL.revokeObjectURL(qrCodeUrl.value)

    const blob = res.data as Blob
    const url = URL.createObjectURL(blob)
    qrCodeUrl.value = url
    qrStatus.value = 'waiting'
    startPolling()
  } catch (err) {
    qrStatus.value = 'error'
    errorMessage.value = '无法生成二维码'
  }
}

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
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
      <div class="wave wave-1"></div>
      <div class="wave wave-2"></div>
    </div>

    <section class="login-card">
      <div class="card-content">
        <!-- 头部 -->
        <div class="login-header">
          <div class="logo-wrapper">
            <div class="logo">
              <span class="logo-icon">🔥</span>
              <span class="logo-text">FireBird</span>
            </div>
          </div>
          <h1 v-if="mode === 'register'">创建账号</h1>
          <h1 v-else>欢迎回来</h1>
          <p class="login-description">
            {{ mode === 'register' ? '开启您的二手交易之旅' : '请选择登录方式' }}
          </p>
        </div>

      <!-- 标签切换 -->
      <nav class="auth-tabs">
        <button 
          :class="{active: mode === 'account', disabled: loading}" 
          @click="mode = 'account'"
        >
          <span class="tab-icon">👤</span>
          <span>账号登录</span>
        </button>
        <button 
          :class="{active: mode === 'sms', disabled: loading}" 
          @click="mode = 'sms'"
        >
          <span class="tab-icon">📱</span>
          <span>短信登录</span>
        </button>
        <button 
          :class="{active: mode === 'qr', disabled: loading}" 
          @click="(mode = 'qr', initQr())"
        >
          <span class="tab-icon">📷</span>
          <span>二维码</span>
        </button>
        <button 
          :class="{active: mode === 'register', disabled: loading}" 
          @click="mode = 'register'"
        >
          <span class="tab-icon">✏️</span>
          <span>注册</span>
        </button>
      </nav>

      <!-- 账号密码登录 -->
      <form v-if="mode === 'account'" class="login-form" @submit.prevent="handleAccountLogin">
        <div class="input-wrapper">
          <span class="input-icon">👤</span>
          <input 
            v-model="username" 
            type="text" 
            placeholder="请输入用户名"
            :disabled="loading"
          />
        </div>

        <div class="input-wrapper">
          <span class="input-icon">🔑</span>
          <input 
            v-model="password" 
            :type="showPassword ? 'text' : 'password'" 
            placeholder="请输入密码"
            :disabled="loading"
          />
          <button 
            type="button" 
            class="toggle-password" 
            @click="showPassword = !showPassword"
            :disabled="loading"
          >
            {{ showPassword ? '🙈' : '👁️' }}
          </button>
        </div>

        <p v-if="errorMessage" class="error-message">
          <span class="error-icon">⚠️</span>
          {{ errorMessage }}
        </p>

        <button type="submit" :disabled="loading" class="submit-btn">
          <span v-if="loading" class="loading-spinner"></span>
          <span>{{ loading ? '登录中...' : '登 录' }}</span>
        </button>
      </form>

      <!-- 短信登录 -->
      <form v-if="mode === 'sms'" class="login-form" @submit.prevent="handleSmsLogin">
        <div class="input-wrapper">
          <span class="input-icon">📱</span>
          <input 
            v-model="phone" 
            type="tel" 
            placeholder="请输入手机号"
            :disabled="loading"
          />
        </div>

        <div class="sms-row">
          <div class="input-wrapper">
            <span class="input-icon">📧</span>
            <input 
              v-model="smsCode" 
              type="text" 
              placeholder="输入验证码"
              :disabled="loading"
            />
          </div>
          <button 
            type="button" 
            class="send-code" 
            @click="sendSmsCode"
            :disabled="loading || smsSent"
          >
            {{ smsSent ? `${smsCountdown}s` : '发送验证码' }}
          </button>
        </div>

        <p v-if="errorMessage" class="error-message">
          <span class="error-icon">⚠️</span>
          {{ errorMessage }}
        </p>

        <button type="submit" :disabled="loading" class="submit-btn">
          <span v-if="loading" class="loading-spinner"></span>
          <span>{{ loading ? '登录中...' : '短信登录' }}</span>
        </button>
      </form>

      <!-- 二维码登录 -->
      <div v-if="mode === 'qr'" class="qr-area">
        <div class="qr-header">
          <p>使用移动端扫码登录</p>
          <span class="qr-tip">打开APP扫描二维码</span>
        </div>
        <div class="qr-box">
          <div v-if="qrStatus === 'waiting'" class="qr-scan-ring">
            <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="二维码" />
            <div v-else class="qr-placeholder">
              <span class="placeholder-icon">🔄</span>
              <span>加载中...</span>
            </div>
          </div>
          <div v-else-if="qrStatus === 'scanned'" class="qr-scanned">
            <span class="scanned-icon">✅</span>
            <p>已扫码，等待确认…</p>
          </div>
          <div v-else-if="qrStatus === 'confirmed'" class="qr-confirmed">
            <span class="confirmed-icon">🎉</span>
            <p>登录成功，正在跳转…</p>
          </div>
          <div v-else class="qr-error">
            <span class="error-icon">❌</span>
            <p>二维码加载失败</p>
            <button @click="initQr">重新加载</button>
          </div>
        </div>
        <button v-if="qrStatus === 'waiting'" class="refresh-qr" @click="initQr">
          刷新二维码
        </button>
      </div>

      <!-- 注册 -->
      <form v-if="mode === 'register'" class="login-form" @submit.prevent="handleRegister">
        <div class="input-wrapper">
          <span class="input-icon">👤</span>
          <input 
            v-model="regUsername" 
            type="text" 
            placeholder="请输入用户名"
            :disabled="loading"
          />
        </div>

        <div class="input-wrapper">
          <span class="input-icon">📧</span>
          <input 
            v-model="regEmail" 
            type="email" 
            placeholder="请输入邮箱（可选）"
            :disabled="loading"
          />
        </div>

        <div class="input-wrapper select-wrapper">
          <span class="input-icon">🎭</span>
          <select v-model="regRole" class="select" :disabled="loading">
            <option value="user">普通用户</option>
            <option value="seller">卖家</option>
            <option value="admin">管理员</option>
          </select>
        </div>

        <div class="input-wrapper">
          <span class="input-icon">🔑</span>
          <input 
            v-model="regPassword" 
            :type="showRegPassword ? 'text' : 'password'" 
            placeholder="请输入密码"
            :disabled="loading"
          />
          <button 
            type="button" 
            class="toggle-password" 
            @click="showRegPassword = !showRegPassword"
            :disabled="loading"
          >
            {{ showRegPassword ? '🙈' : '👁️' }}
          </button>
        </div>

        <div class="input-wrapper">
          <span class="input-icon">🔑</span>
          <input 
            v-model="regConfirm" 
            :type="showRegConfirm ? 'text' : 'password'" 
            placeholder="再次输入密码"
            :disabled="loading"
          />
          <button 
            type="button" 
            class="toggle-password" 
            @click="showRegConfirm = !showRegConfirm"
            :disabled="loading"
          >
            {{ showRegConfirm ? '🙈' : '👁️' }}
          </button>
        </div>

        <p v-if="errorMessage" class="error-message">
          <span class="error-icon">⚠️</span>
          {{ errorMessage }}
        </p>

        <button type="submit" :disabled="loading" class="submit-btn">
          <span v-if="loading" class="loading-spinner"></span>
          <span>{{ loading ? '注册中...' : '注 册' }}</span>
        </button>
      </form>

      </div>
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
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #7c3aed 100%);
  position: relative;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
  animation: float 20s infinite ease-in-out;
  filter: blur(20px);
}

.circle-1 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  top: -150px;
  right: -150px;
  animation-delay: 0s;
}

.circle-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  bottom: -100px;
  left: -100px;
  animation-delay: -7s;
}

.circle-3 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  top: 50%;
  left: 10%;
  animation-delay: -14s;
}

.circle-4 {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #f472b6, #f97316);
  top: 20%;
  right: 30%;
  animation-delay: -5s;
  opacity: 0.1;
}

.wave {
  position: absolute;
  bottom: 0;
  left: -100%;
  width: 200%;
  height: 120px;
  background: linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.1) 50%, transparent 100%);
  animation: wave 8s infinite linear;
}

.wave-1 {
  animation-delay: 0s;
}

.wave-2 {
  animation-delay: -4s;
  height: 80px;
  background: linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.08) 50%, transparent 100%);
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(40px, -40px) scale(1.05); }
  50% { transform: translate(20px, 20px) scale(0.95); }
  75% { transform: translate(-30px, -20px) scale(1.02); }
}

@keyframes wave {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0%); }
}

@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 440px;
  padding: 48px 40px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 
    0 25px 80px rgba(76, 29, 149, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.4) inset,
    0 0 40px rgba(139, 92, 246, 0.1);
  box-sizing: border-box;
  position: relative;
  backdrop-filter: blur(20px);
  animation: cardFadeIn 0.5s ease-out;
  overflow: hidden;
}

.login-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(139, 92, 246, 0.05) 90deg,
    transparent 180deg,
    rgba(99, 102, 241, 0.05) 270deg,
    transparent 360deg
  );
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-content {
  position: relative;
  z-index: 1;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 头部 */
.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-wrapper {
  margin-bottom: 20px;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 28px;
  font-weight: 800;
  color: #4c1d95;
}

.logo-icon {
  font-size: 32px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.login-header h1 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 32px;
  font-weight: 700;
}

.login-description {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

/* 标签切换 */
.auth-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  padding: 6px;
  background: #f1f5f9;
  border-radius: 12px;
}

.auth-tabs button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
}

.auth-tabs button:hover:not(.disabled) {
  background: #e2e8f0;
}

.auth-tabs button.active {
  background: #fff;
  color: #4c1d95;
  box-shadow: 0 2px 8px rgba(76, 29, 149, 0.15);
  transform: translateY(-1px);
}

.auth-tabs button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tab-icon {
  font-size: 18px;
}

/* 表单 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  font-size: 18px;
  z-index: 1;
}

.input-wrapper input {
  width: 100%;
  height: 52px;
  padding: 0 16px 0 48px;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  outline: none;
  font-size: 15px;
  color: #1e293b;
  background: #fafafa;
  transition: all 0.25s ease;
}

.input-wrapper input:focus {
  border-color: #8b5cf6;
  background: #fff;
  box-shadow: 
    0 0 0 4px rgba(139, 92, 246, 0.12),
    0 0 20px rgba(139, 92, 246, 0.15),
    0 2px 8px rgba(139, 92, 246, 0.1);
  transform: translateY(-1px);
}

.input-wrapper input::placeholder {
  color: #94a3b8;
}

.input-wrapper input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-password {
  position: absolute;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  z-index: 1;
}

.toggle-password:hover {
  opacity: 1;
}

.toggle-password:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.select-wrapper {
  background: #fafafa;
  border-radius: 14px;
  border: 2px solid #e2e8f0;
  transition: all 0.25s ease;
}

.select-wrapper:focus-within {
  border-color: #8b5cf6;
  background: #fff;
  box-shadow: 
    0 0 0 4px rgba(139, 92, 246, 0.12),
    0 2px 8px rgba(139, 92, 246, 0.1);
}

.select-wrapper select {
  width: 100%;
  height: 52px;
  padding: 0 16px 0 48px;
  border: none;
  border-radius: 14px;
  outline: none;
  font-size: 15px;
  color: #1e293b;
  background: transparent;
  cursor: pointer;
  appearance: none;
  position: relative;
}

.select-wrapper::after {
  content: '▼';
  position: absolute;
  right: 16px;
  font-size: 12px;
  color: #94a3b8;
  pointer-events: none;
}

/* 短信行 */
.sms-row {
  display: flex;
  gap: 12px;
}

.sms-row .input-wrapper {
  flex: 1;
}

.send-code {
  padding: 0 20px;
  height: 52px;
  border: 2px solid #8b5cf6;
  border-radius: 14px;
  background: #fff;
  color: #8b5cf6;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.send-code:hover:not(:disabled) {
  background: #f5f3ff;
  transform: translateY(-1px);
}

.send-code:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 错误消息 */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -8px 0 4px;
  padding: 10px 14px;
  background: #fef2f2;
  border-radius: 10px;
  color: #dc2626;
  font-size: 13px;
}

.error-icon {
  font-size: 14px;
}

/* 提交按钮 */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 54px;
  margin-top: 8px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #8b5cf6 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 
    0 4px 16px rgba(76, 29, 149, 0.3),
    0 0 30px rgba(139, 92, 246, 0.2);
  position: relative;
  overflow: hidden;
}

.submit-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.submit-btn:hover:not(:disabled)::before {
  left: 100%;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 24px rgba(76, 29, 149, 0.4),
    0 0 40px rgba(139, 92, 246, 0.3);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 加载动画 */
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 二维码区域 */
.qr-area {
  text-align: center;
}

.qr-header {
  margin-bottom: 24px;
}

.qr-header p {
  margin: 0 0 6px;
  color: #0f172a;
  font-size: 18px;
  font-weight: 600;
}

.qr-tip {
  color: #94a3b8;
  font-size: 13px;
}

.qr-box {
  width: 220px;
  height: 220px;
  margin: 0 auto 24px;
  padding: 16px;
  border: 2px dashed #e2e8f0;
  border-radius: 16px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-scan-ring {
  position: relative;
}

.qr-scan-ring img {
  width: 180px;
  height: 180px;
  border-radius: 12px;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #94a3b8;
}

.placeholder-icon {
  font-size: 32px;
  animation: spin 1s infinite linear;
}

.qr-scanned, .qr-confirmed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.scanned-icon, .confirmed-icon {
  font-size: 48px;
  animation: bounce 0.5s ease;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.qr-scanned p, .qr-confirmed p {
  margin: 0;
  color: #10b981;
  font-size: 16px;
  font-weight: 600;
}

.qr-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qr-error p {
  margin: 0;
  color: #dc2626;
  font-size: 14px;
}

.qr-error button {
  padding: 8px 20px;
  border: 2px solid #8b5cf6;
  border-radius: 10px;
  background: #fff;
  color: #8b5cf6;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.refresh-qr {
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-qr:hover {
  background: #e2e8f0;
}
</style>