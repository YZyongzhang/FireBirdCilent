<script setup lang="ts">
import { ref, computed } from 'vue'

type Item = {
  id: number
  title: string
  price: number
  img: string
  desc: string
  seller: string
  date: string
  category: string
}

const search = ref('')
const category = ref('全部')
const showDetail = ref(false)
const activeItem = ref<Item | null>(null)

const items = ref<Item[]>([
  { id: 1, title: '二手吉他', price: 450, img: '/public/placeholder.png', desc: '九成新，声音好', seller: '小张', date: '2026-05-01', category: '乐器' },
  { id: 2, title: 'MacBook Pro 2018', price: 4200, img: '/public/placeholder.png', desc: '16GB 内存，256GB SSD', seller: '小李', date: '2026-04-20', category: '数码' },
  { id: 3, title: '英伦风外套', price: 120, img: '/public/placeholder.png', desc: '尺码M，干净整洁', seller: '小王', date: '2026-03-15', category: '服饰' },
  { id: 4, title: '桌面显示器 24寸', price: 500, img: '/public/placeholder.png', desc: '1080p，带HDMI', seller: '小赵', date: '2026-02-10', category: '数码' }
])

const categories = computed(() => ['全部', ...Array.from(new Set(items.value.map(i => i.category)))])

const filtered = computed(() => {
  return items.value.filter(i => {
    const matchesSearch = search.value.trim() === '' || i.title.includes(search.value) || i.desc.includes(search.value)
    const matchesCategory = category.value === '全部' || i.category === category.value
    return matchesSearch && matchesCategory
  })
})

function openDetail(it: Item) {
  activeItem.value = it
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  activeItem.value = null
}
</script>

<template>
  <main class="secondhand-page">
    <section class="container">
      <div class="header-row">
        <h1>二手交易</h1>
        <div class="controls">
          <input v-model="search" placeholder="搜索商品、描述或卖家" class="search" />
          <select v-model="category" class="select">
            <option v-for="c in categories" :key="c">{{ c }}</option>
          </select>
        </div>
      </div>

      <div class="list-grid">
        <div v-for="item in filtered" :key="item.id" class="card" @click="openDetail(item)">
          <div class="thumb">
            <img :src="item.img" alt="" />
          </div>
          <div class="card-body">
            <div class="title">{{ item.title }}</div>
            <div class="meta">
              <span class="price">¥{{ item.price }}</span>
              <span class="seller">{{ item.seller }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filtered.length === 0" class="empty">暂无符合条件的商品</div>
    </section>

    <div v-if="showDetail && activeItem" class="modal-overlay" @click.self="closeDetail">
      <div class="modal">
        <button class="close" @click="closeDetail">关闭</button>
        <div class="modal-content">
          <div class="modal-thumb"><img :src="activeItem.img" alt="" /></div>
          <div class="modal-info">
            <h2>{{ activeItem.title }}</h2>
            <p class="price-large">¥{{ activeItem.price }}</p>
            <p class="desc">{{ activeItem.desc }}</p>
            <p class="meta">卖家：{{ activeItem.seller }} • 发布：{{ activeItem.date }}</p>
            <a :href="`mailto:example@example.com?subject=关于 ${activeItem.title} 的咨询`" class="contact">联系卖家</a>
          </div>
        </div>
      </div>
    </div>
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
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.controls {
  display: flex;
  gap: 8px;
  align-items: center;
}
.search {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ddd;
  min-width: 260px;
}
.select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ddd;
}
.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 18px;
}
.card {
  border: 1px solid #eee;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  transition: box-shadow .12s ease;
}
.card:hover { box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
.thumb { height: 140px; background: #fafafa; display:flex; align-items:center; justify-content:center; }
.thumb img { max-width:100%; max-height:100%; object-fit:contain }
.card-body { padding: 12px; }
.title { font-weight: 600; margin-bottom: 8px; }
.meta { display:flex; justify-content:space-between; color:#666; font-size:14px }
.price { color:#f56c6c; font-weight:700 }
.empty { text-align:center; color:#888; padding:36px 0 }

.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:50 }
.modal { background:#fff; width:90%; max-width:900px; border-radius:12px; padding:18px; position:relative }
.close { position:absolute; right:12px; top:12px; background:transparent; border:none; font-size:14px; cursor:pointer }
.modal-content { display:flex; gap:18px }
.modal-thumb { width:48%; display:flex; align-items:center; justify-content:center; background:#fafafa; padding:12px }
.modal-thumb img { max-width:100%; max-height:320px; object-fit:contain }
.modal-info { width:52%; }
.price-large { color:#f56c6c; font-size:22px; font-weight:700 }
.contact { display:inline-block; margin-top:12px; padding:8px 14px; background:#409eff; color:#fff; border-radius:6px; text-decoration:none }
</style>
