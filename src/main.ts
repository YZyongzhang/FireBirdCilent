import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { attachToAxios, getUser } from './utils/auth'

const app = createApp(App)

// attach stored user info (if any) to axios defaults for subsequent requests
attachToAxios()

// ensure every request includes current user headers (in case defaults are lost)
// axios.interceptors.request.use(
// 	(config: AxiosRequestConfig) => {
// 		try {
// 			const u = getUser()
// 			if (u) {
// 				if (!config.headers) config.headers = {} as any
// 				;(config.headers as any)['X-User-Id'] = String(u.id)
// 				;(config.headers as any)['X-User-Username'] = u.username
// 				;(config.headers as any)['X-User-Role'] = u.role
// 			}
// 		} catch (e) {
// 			// ignore
// 		}
// 		return config
// 	},
// 	(err) => Promise.reject(err),
// )

app.use(router)

app.mount('#app')
