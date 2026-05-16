# 2026-05-16 二手交易页面全屏布局与翻页功能优化

## 更改内容

### 1. 全屏布局优化
**SecondhandView.vue**
- 将页面设置为100vh高度，移除边距，实现铺满全屏效果
- 添加紫色渐变背景，与整体UI设计保持一致
- 添加背景装饰元素（三个渐变圆形，带浮动动画效果）
- 使用flex布局，让主内容区域自动填充剩余空间

### 2. 翻页功能实现
- 将pageSize从20改为9，实现每页显示9个商品（3x3布局）
- 添加totalPages计算属性：`const totalPages = computed(() => Math.ceil(total.value / pageSize.value))`
- 实现翻页相关方法：
  - `handleSearch()` - 搜索时重置页码
  - `goToPrevPage()` - 上一页
  - `goToNextPage()` - 下一页
  - `goToPage(pageNum)` - 跳转到指定页码
- 添加翻页导航UI组件：
  - 上一页/下一页按钮（带禁用状态）
  - 页码指示器（圆点样式，当前页高亮）
  - 页码信息显示（当前页/总页数、商品总数）

### 3. 翻页导航样式
- 导航按钮使用白色背景配紫色边框
- 添加悬停时的上浮动画和阴影效果
- 页码圆点使用渐变紫色高亮当前页
- 添加禁用状态样式（半透明、禁止鼠标指针）

### 4. 商品展示优化
- 商品网格改为3列布局（grid-template-columns: repeat(3, 1fr)）
- 增加卡片间距（gap: 28px）
- 优化卡片悬停效果，添加快速查看覆盖层
- 卡片图片区域添加渐变背景

### 5. 搜索栏优化
- 搜索框添加阴影效果
- 分类选择器样式统一
- 聚焦时添加紫色边框高亮

### 6. API接口文档
创建 `src/utils/secondhand-api.md`，详细记录了16个API接口：
- 商品管理：获取商品列表、获取分类、创建商品
- 评价管理：获取评价、提交评价
- 购物车：获取购物车、添加商品、更新数量、删除商品、清空购物车
- 订单：创建订单、获取订单列表、支付订单
- 聊天：获取对话列表、获取对话详情、发送消息

## 技术实现

### 翻页逻辑
```typescript
const page = ref(1)
const pageSize = ref(9)
const total = ref(0)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

function goToPrevPage() {
  if (page.value > 1) {
    page.value--
    fetchItems()
  }
}

function goToNextPage() {
  if (page.value < totalPages.value) {
    page.value++
    fetchItems()
  }
}
```

### 视觉效果
- 全屏紫色渐变背景（#1e1b4b → #7c3aed）
- 浮动装饰圆形动画（30秒循环）
- 卡片悬停上浮效果（translateY(-12px)）
- 翻页按钮禁用状态处理

## 功能特点

### 翻页导航
- 支持点击页码圆点快速跳转
- 上一页/下一页按钮自动禁用（边界处理）
- 显示当前页码和商品总数信息

### 响应式设计
- 保持原有的响应式断点设置
- 移动端自动调整布局

### 交互体验
- 翻页时显示加载状态
- 搜索时自动重置到第一页
- 页码切换平滑过渡