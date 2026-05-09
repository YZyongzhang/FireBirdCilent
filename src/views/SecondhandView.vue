<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="secondhand-page">
    <section class="container">
      <h1>二手交易</h1>
      <p>这里将展示二手商品列表（占位）。</p>
    </section>
  </main>
</template>

<style scoped>
.container {
  max-width: 1080px;
  margin: 24px auto;
  padding: 24px;
  background: white;
  border-radius: 12px;
}
</style>
