<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')

// const loginApi = async (payload: { username: string; password: string }) => {
//   return fetch('/api/login', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(payload),
//   })
// }

const handleSubmit = async () => {
  try {
    // 向后端POST发JSON
    const res = await axios.post(
      'http://localhost:8080/login',  // 后端接口地址
      {                                // 这就是 RequestBody
        username: username.value,
        password: password.value
      }
    )
    if (res.data == "成功"){
      router.push('/home')
    }else{
      alert("账号密码错误")
    }
    console.log('后端返回：', res.data)

  } catch (error) {
    // 失败进入这里
    errorMessage.value = '账号或密码错误'
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <div class="login-header">
        <p class="login-badge">FireBird Client</p>
        <h1>欢迎登录</h1>
        <p class="login-description">请输入账号和密码进入系统。</p>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
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
