import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { attachToAxios, getUser } from './utils/auth'

const app = createApp(App)

// attach stored user info (if any) to axios defaults for subsequent requests
attachToAxios()

app.use(router)

app.mount('#app')
