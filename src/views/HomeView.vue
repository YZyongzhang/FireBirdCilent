<template>
  <main class="home-page">
    <section class="home-card">
      <p class="home-badge">FireBird Client</p>
      <h1>Hello World</h1>
      <p>你已经完成登录，这是一个简单的登录后页面。</p>
    </section>
  </main>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
}

.home-card {
  width: 100%;
  max-width: 520px;
  padding: 48px 32px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  text-align: center;
  box-sizing: border-box;
}

.home-badge {
  margin: 0 0 12px;
  color: #2563eb;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-card h1 {
  margin: 0;
  color: #0f172a;
  font-size: 36px;
}

.home-card p:last-child {
  margin: 16px 0 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.6;
}
</style>
