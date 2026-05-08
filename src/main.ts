import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { attachToAxios } from './utils/auth'

const app = createApp(App)

// attach stored user info (if any) to axios headers for subsequent requests
attachToAxios()

app.use(router)

app.mount('#app')
