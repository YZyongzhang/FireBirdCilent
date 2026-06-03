import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import ThoughtsView from '@/views/ThoughtsView.vue'
import DailyPlanView from '@/views/DailyPlanView.vue'
import AdminUsersView from '@/views/AdminUsersView.vue'
import { getUser, clearUser } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // 通过调用浏览器内部的history接口然后进行url的跳转，vue进行匹配路由，实现路由的切换。
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: '/thoughts/:groupId?/:noteId?',
      name: 'thoughts',
      component: ThoughtsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/daily-plan',
      name: 'daily-plan',
      component: DailyPlanView,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUsersView,
      meta: { requiresAuth: true },
    },
  ],
})

// 路由守卫 - 检查登录状态
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth !== false
  const user = getUser()
  
  if (requiresAuth && !user) {
    // 需要登录但未登录，重定向到登录页
    next('/login')
  } else if (to.path === '/login' && user) {
    // 已登录访问登录页，重定向到首页
    next('/home')
  } else {
    next()
  }
})

// 全局登出方法
export function logout() {
  clearUser()
  router.push('/login')
}

export default router
