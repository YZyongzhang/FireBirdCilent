<template>
  <main class="thoughts-page">
    <section class="thoughts-card">
      <p class="thoughts-badge">个人思考记录</p>
      <h1>个人思考页面</h1>
      <p class="thoughts-description">
        这里可以作为个人思考记录的占位页面，后续可继续扩展为思考列表、详情和编辑功能。
      </p>
    </section>
  </main>
</template>

<style scoped>
.thoughts-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
}

.thoughts-card {
  width: 100%;
  max-width: 720px;
  padding: 40px 32px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  box-sizing: border-box;
}

.thoughts-badge {
  margin: 0 0 12px;
  color: #2563eb;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.thoughts-card h1 {
  margin: 0;
  color: #0f172a;
  font-size: 32px;
}

.thoughts-description {
  margin: 16px 0 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.8;
}
</style>
