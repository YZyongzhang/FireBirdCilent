<script setup lang="ts">
import { computed, ref } from 'vue'

type ItemCondition = '全新' | '九成新' | '八成新' | '有使用痕迹'
type ItemStatus = '在售' | '已预订'
type SortMode = 'latest' | 'price-asc' | 'price-desc'

type Item = {
  id: number
  title: string
  price: number
  img: string
  desc: string
  seller: string
  date: string
  category: string
  condition: ItemCondition
  status: ItemStatus
  contact: string
  location: string
}

type DraftItem = {
  title: string
  price: string
  category: string
  condition: ItemCondition
  seller: string
  contact: string
  location: string
  desc: string
}

const initialItems: Item[] = [
  {
    id: 1,
    title: '二手吉他',
    price: 450,
    img: '/placeholder.png',
    desc: '九成新，声音稳定，适合入门和日常练习。',
    seller: '小张',
    date: '2026-05-01',
    category: '乐器',
    condition: '九成新',
    status: '在售',
    contact: 'wechat: zhang_music',
    location: '软件园校区',
  },
  {
    id: 2,
    title: 'MacBook Pro 2018',
    price: 4200,
    img: '/placeholder.png',
    desc: '16GB 内存，256GB SSD，办公剪辑都够用。',
    seller: '小李',
    date: '2026-04-20',
    category: '数码',
    condition: '八成新',
    status: '在售',
    contact: 'tel: 138****1024',
    location: '主校区宿舍',
  },
  {
    id: 3,
    title: '英伦风外套',
    price: 120,
    img: '/placeholder.png',
    desc: '尺码 M，干净整洁，适合春秋通勤。',
    seller: '小王',
    date: '2026-03-15',
    category: '服饰',
    condition: '九成新',
    status: '已预订',
    contact: 'qq: 2788****',
    location: '南区生活区',
  },
  {
    id: 4,
    title: '桌面显示器 24 寸',
    price: 500,
    img: '/placeholder.png',
    desc: '1080p，带 HDMI，屏幕无亮点，配电源线。',
    seller: '小赵',
    date: '2026-02-10',
    category: '数码',
    condition: '八成新',
    status: '在售',
    contact: 'wechat: zhao_display',
    location: '图书馆附近',
  },
]

const createDraft = (): DraftItem => ({
  title: '',
  price: '',
  category: '数码',
  condition: '九成新',
  seller: '',
  contact: '',
  location: '',
  desc: '',
})

const search = ref('')
const category = ref('全部')
const status = ref('全部')
const sortMode = ref<SortMode>('latest')
const showDetail = ref(false)
const showPublishForm = ref(false)
const activeItem = ref<Item | null>(null)
const draftItem = ref<DraftItem>(createDraft())

const items = ref<Item[]>(initialItems)

const categories = computed(() => ['全部', ...Array.from(new Set(items.value.map((item) => item.category)))])
const statusOptions = ['全部', '在售', '已预订'] as const
const conditionOptions: ItemCondition[] = ['全新', '九成新', '八成新', '有使用痕迹']

const filtered = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return items.value
    .filter((item) => {
      const matchesSearch =
        keyword === '' ||
        item.title.toLowerCase().includes(keyword) ||
        item.desc.toLowerCase().includes(keyword) ||
        item.seller.toLowerCase().includes(keyword) ||
        item.contact.toLowerCase().includes(keyword)
      const matchesCategory = category.value === '全部' || item.category === category.value
      const matchesStatus = status.value === '全部' || item.status === status.value
      return matchesSearch && matchesCategory && matchesStatus
    })
    .slice()
    .sort((left, right) => {
      if (sortMode.value === 'price-asc') {
        return left.price - right.price
      }

      if (sortMode.value === 'price-desc') {
        return right.price - left.price
      }

      return right.date.localeCompare(left.date)
    })
})

const totalItems = computed(() => items.value.length)
const onSaleCount = computed(() => items.value.filter((item) => item.status === '在售').length)

function openDetail(item: Item) {
  activeItem.value = item
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  activeItem.value = null
}

function togglePublishForm() {
  showPublishForm.value = !showPublishForm.value

  if (!showPublishForm.value) {
    draftItem.value = createDraft()
  }
}

function publishItem() {
  const title = draftItem.value.title.trim()
  const seller = draftItem.value.seller.trim()
  const contact = draftItem.value.contact.trim()
  const location = draftItem.value.location.trim()
  const desc = draftItem.value.desc.trim()
  const price = Number(draftItem.value.price)

  if (!title || !seller || !contact || !location || !desc || !Number.isFinite(price) || price <= 0) {
    return
  }

  items.value = [
    {
      id: Date.now(),
      title,
      price,
      img: '/placeholder.png',
      desc,
      seller,
      date: new Date().toISOString().slice(0, 10),
      category: draftItem.value.category,
      condition: draftItem.value.condition,
      status: '在售',
      contact,
      location,
    },
    ...items.value,
  ]

  draftItem.value = createDraft()
  showPublishForm.value = false
}
</script>

<template>
  <main class="secondhand-page">
    <section class="hero-panel">
      <div>
        <p class="hero-badge">Campus Market</p>
        <h1>二手交易平台</h1>
        <p class="hero-desc">支持浏览、筛选和快速发布，让闲置物品更快找到新主人。</p>
      </div>
      <div class="hero-stats">
        <article>
          <strong>{{ totalItems }}</strong>
          <span>商品总数</span>
        </article>
        <article>
          <strong>{{ filtered.length }}</strong>
          <span>筛选结果</span>
        </article>
        <article>
          <strong>{{ onSaleCount }}</strong>
          <span>在售商品</span>
        </article>
      </div>
    </section>

    <section class="container">
      <div class="toolbar">
        <div class="controls">
          <input v-model="search" placeholder="搜索商品、描述、卖家或联系方式" class="search" />
          <select v-model="category" class="select">
            <option v-for="option in categories" :key="option">{{ option }}</option>
          </select>
          <select v-model="status" class="select">
            <option v-for="option in statusOptions" :key="option">{{ option }}</option>
          </select>
          <select v-model="sortMode" class="select">
            <option value="latest">最新发布</option>
            <option value="price-asc">价格从低到高</option>
            <option value="price-desc">价格从高到低</option>
          </select>
        </div>
        <button class="publish-btn" type="button" @click="togglePublishForm">
          {{ showPublishForm ? '收起发布表单' : '发布商品' }}
        </button>
      </div>

      <section v-if="showPublishForm" class="publish-panel">
        <div class="panel-head">
          <div>
            <p class="panel-badge">发布商品</p>
            <h2>填写商品信息</h2>
          </div>
          <span class="panel-tip">当前为前端演示版本，发布后会立即展示在列表顶部。</span>
        </div>

        <div class="form-grid">
          <label>
            <span>商品标题</span>
            <input v-model="draftItem.title" type="text" placeholder="例如：二手人体工学椅" />
          </label>
          <label>
            <span>价格</span>
            <input v-model="draftItem.price" type="number" min="0" placeholder="例如：299" />
          </label>
          <label>
            <span>分类</span>
            <input v-model="draftItem.category" type="text" placeholder="例如：家居 / 数码 / 图书" />
          </label>
          <label>
            <span>成色</span>
            <select v-model="draftItem.condition">
              <option v-for="option in conditionOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </label>
          <label>
            <span>卖家昵称</span>
            <input v-model="draftItem.seller" type="text" placeholder="例如：小陈" />
          </label>
          <label>
            <span>联系方式</span>
            <input v-model="draftItem.contact" type="text" placeholder="例如：wechat: chen_store" />
          </label>
          <label>
            <span>交易地点</span>
            <input v-model="draftItem.location" type="text" placeholder="例如：北区食堂门口" />
          </label>
          <label class="full-row">
            <span>商品描述</span>
            <textarea v-model="draftItem.desc" rows="4" placeholder="补充尺寸、配件、使用情况等信息"></textarea>
          </label>
        </div>

        <div class="publish-actions">
          <button class="ghost-btn" type="button" @click="togglePublishForm">取消</button>
          <button class="publish-btn" type="button" @click="publishItem">确认发布</button>
        </div>
      </section>

      <div class="list-grid">
        <div v-for="item in filtered" :key="item.id" class="card" @click="openDetail(item)">
          <div class="thumb">
            <img :src="item.img" alt="商品图片" />
            <span class="status-badge" :class="item.status === '已预订' ? 'reserved' : 'onsale'">{{ item.status }}</span>
          </div>
          <div class="card-body">
            <div class="card-top">
              <div>
                <div class="title">{{ item.title }}</div>
                <div class="sub-meta">{{ item.category }} · {{ item.condition }}</div>
              </div>
              <span class="price">¥{{ item.price }}</span>
            </div>
            <p class="desc-preview">{{ item.desc }}</p>
            <div class="meta">
              <span>{{ item.seller }}</span>
              <span>{{ item.location }}</span>
              <span>{{ item.date }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filtered.length === 0" class="empty">暂无符合条件的商品，试试调整筛选条件或发布新的闲置物品。</div>
    </section>

    <div v-if="showDetail && activeItem" class="modal-overlay" @click.self="closeDetail">
      <div class="modal">
        <button class="close" type="button" @click="closeDetail">关闭</button>
        <div class="modal-content">
          <div class="modal-thumb">
            <img :src="activeItem.img" alt="商品图片" />
          </div>
          <div class="modal-info">
            <div class="detail-head">
              <div>
                <h2>{{ activeItem.title }}</h2>
                <p class="price-large">¥{{ activeItem.price }}</p>
              </div>
              <span class="status-badge" :class="activeItem.status === '已预订' ? 'reserved' : 'onsale'">{{ activeItem.status }}</span>
            </div>
            <p class="desc">{{ activeItem.desc }}</p>
            <ul class="detail-list">
              <li><strong>分类：</strong>{{ activeItem.category }}</li>
              <li><strong>成色：</strong>{{ activeItem.condition }}</li>
              <li><strong>卖家：</strong>{{ activeItem.seller }}</li>
              <li><strong>联系方式：</strong>{{ activeItem.contact }}</li>
              <li><strong>交易地点：</strong>{{ activeItem.location }}</li>
              <li><strong>发布日期：</strong>{{ activeItem.date }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.secondhand-page {
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(180deg, #eef4ff 0%, #f8fbff 100%);
}

.hero-panel,
.container,
.card,
.publish-panel,
.modal {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.hero-panel {
  max-width: 1200px;
  margin: 0 auto 20px;
  padding: 28px 32px;
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.hero-badge,
.panel-badge {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2563eb;
}

.hero-panel h1,
.panel-head h2,
.detail-head h2 {
  margin: 0;
  color: #0f172a;
}

.hero-desc,
.panel-tip,
.desc-preview,
.meta,
.detail-list {
  color: #64748b;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(100px, 1fr));
  gap: 12px;
  min-width: 360px;
}

.hero-stats article {
  padding: 16px;
  border-radius: 16px;
  background: #f8fbff;
  text-align: center;
}

.hero-stats strong {
  display: block;
  font-size: 28px;
  color: #1d4ed8;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.toolbar,
.panel-head,
.publish-actions,
.card-top,
.meta,
.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.toolbar,
.panel-head,
.detail-head {
  align-items: center;
}

.controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

input,
select,
textarea,
button {
  font: inherit;
}

.search,
.select,
.form-grid input,
.form-grid select,
.form-grid textarea {
  border: 1px solid #d7e2f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  box-sizing: border-box;
}

.search {
  min-width: 280px;
}

.publish-btn,
.ghost-btn {
  border: none;
  border-radius: 999px;
  padding: 11px 18px;
  cursor: pointer;
  font-weight: 600;
}

.publish-btn {
  background: #2563eb;
  color: #fff;
}

.ghost-btn {
  background: #eef4ff;
  color: #1d4ed8;
}

.publish-panel {
  margin-top: 20px;
  padding: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-grid span {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.full-row {
  grid-column: 1 / -1;
}

.publish-actions {
  margin-top: 18px;
  justify-content: flex-end;
}

.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
  margin-top: 22px;
}

.card {
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 22px 44px rgba(15, 23, 42, 0.12);
}

.thumb {
  position: relative;
  height: 180px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb img,
.modal-thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 700;
}

.status-badge.onsale {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.reserved {
  background: #fef3c7;
  color: #b45309;
}

.card-body {
  padding: 16px;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.sub-meta {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.price,
.price-large {
  color: #ef4444;
  font-weight: 700;
}

.price-large {
  margin: 8px 0 0;
  font-size: 28px;
}

.desc-preview {
  margin: 14px 0;
  line-height: 1.6;
  min-height: 44px;
}

.meta {
  flex-wrap: wrap;
  font-size: 13px;
}

.empty {
  padding: 40px 0 16px;
  text-align: center;
  color: #64748b;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  width: min(960px, calc(100vw - 32px));
  padding: 22px;
  position: relative;
}

.close {
  position: absolute;
  top: 14px;
  right: 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #475569;
}

.modal-content {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(320px, 1.1fr);
  gap: 18px;
}

.modal-thumb {
  background: #f8fafc;
  border-radius: 14px;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.desc {
  line-height: 1.7;
  color: #334155;
}

.detail-list {
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

@media (max-width: 960px) {
  .hero-panel,
  .toolbar,
  .panel-head,
  .modal-content {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .hero-stats,
  .form-grid {
    grid-template-columns: 1fr;
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .secondhand-page {
    padding: 16px;
  }

  .container,
  .hero-panel,
  .publish-panel,
  .modal {
    padding: 18px;
  }

  .search {
    min-width: 0;
    width: 100%;
  }
}
</style>
