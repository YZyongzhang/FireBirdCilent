import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import ThoughtsView from '@/views/ThoughtsView.vue'
import DailyPlanView from '@/views/DailyPlanView.vue'
import SecondhandView from '@/views/SecondhandView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/thoughts/:groupId?/:noteId?',
      name: 'thoughts',
      component: ThoughtsView,
    },
    {
      path: '/daily-plan',
      name: 'daily-plan',
      component: DailyPlanView,
    },
    {
      path: '/secondhand',
      name: 'secondhand',
      component: SecondhandView,
    },
  ],
})

export default router
