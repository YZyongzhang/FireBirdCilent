<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getGroups,
  getNotes,
  createGroup as apiCreateGroup,
  createNote as apiCreateNote,
  updateNote as apiUpdateNote,
  deleteGroup as apiDeleteGroup,
  deleteNote as apiDeleteNote,
  type ThoughtGroup,
  type ThoughtNote,
} from '@/utils/thoughts'

interface LocalGroup {
  id: string
  name: string
  remoteId?: number
}

interface LocalNote {
  id: string
  groupId: string
  title: string
  content: string
  updatedAt: string
  remoteId?: number
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  type: 'group-area' | 'note-list' | 'note-item'
  noteId?: string
}

const route = useRoute()
const router = useRouter()
const storageKey = 'firebird-thoughts'
const previewModes = ['split', 'edit', 'preview'] as const
const loading = ref(false)
const error = ref('')

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const defaultGroups: LocalGroup[] = [
  { id: 'group-inbox', name: '灵感收集' },
  { id: 'group-review', name: '复盘记录' },
]

const defaultNotes: LocalNote[] = [
  {
    id: 'note-welcome',
    groupId: 'group-inbox',
    title: '欢迎使用个人思考记录',
    content: '# 开始记录\n\n- 先创建分组\n- 再新增文档\n- 在右侧使用 Markdown 进行书写\n\n> 这里是类似飞书的轻量思考工作台。',
    updatedAt: new Date().toISOString(),
  },
]

const groups = ref<LocalGroup[]>(defaultGroups)
const notes = ref<LocalNote[]>(defaultNotes)
const previewMode = ref<(typeof previewModes)[number]>('preview')
const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  type: 'note-list',
})

const loadState = () => {
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as {
        groups?: LocalGroup[]
        notes?: LocalNote[]
      }
      if (parsed.groups?.length) {
        groups.value = parsed.groups
      }
      if (parsed.notes?.length) {
        notes.value = parsed.notes
      }
    } catch {
    }
  }
}

const saveState = () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      groups: groups.value,
      notes: notes.value,
    }),
  )
}

const syncFromServer = async () => {
  loading.value = true
  error.value = ''
  try {
    const remoteGroups = await getGroups()
    const remoteNotes = await getNotes()
    if (remoteGroups.length > 0 || remoteNotes.length > 0) {
      groups.value = remoteGroups.map(g => ({ ...g, id: String(g.id) }))
      notes.value = remoteNotes.map(n => ({
        ...n,
        id: String(n.id),
        groupId: String(n.groupId),
        updatedAt: n.updatedAt || new Date().toISOString(),
      }))
      saveState()
    } else {
      loadState()
    }
  } catch {
    loadState()
  } finally {
    loading.value = false
  }
}

syncFromServer()

const currentGroupId = computed(() => {
  const routeGroupId = typeof route.params.groupId === 'string' ? route.params.groupId : ''
  return groups.value.some((group) => group.id === routeGroupId) ? routeGroupId : groups.value[0]?.id ?? ''
})

const currentGroup = computed(() => {
  return groups.value.find((group) => group.id === currentGroupId.value) ?? null
})

const groupNotes = computed(() => {
  return notes.value
    .filter((note) => note.groupId === currentGroupId.value)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
})

const currentNoteId = computed(() => {
  const routeNoteId = typeof route.params.noteId === 'string' ? route.params.noteId : ''
  return groupNotes.value.some((note) => note.id === routeNoteId) ? routeNoteId : groupNotes.value[0]?.id ?? ''
})

const currentNote = computed(() => {
  return notes.value.find((note) => note.id === currentNoteId.value) ?? null
})

const syncRoute = (groupId: string, noteId?: string) => {
  router.replace({
    name: 'thoughts',
    params: {
      groupId,
      noteId: noteId ?? undefined,
    },
  })
}

watch(
  [currentGroupId, currentNoteId],
  () => {
    saveState()
    if (currentGroupId.value) {
      syncRoute(currentGroupId.value, currentNoteId.value || undefined)
    }
  },
  { immediate: true },
)

const closeContextMenu = () => {
  contextMenu.value.visible = false
}

const selectGroup = (groupId: string) => {
  const firstNote = notes.value.find((note) => note.groupId === groupId)
  syncRoute(groupId, firstNote?.id)
}

const selectNote = (noteId: string) => {
  if (!currentGroupId.value) {
    return
  }
  syncRoute(currentGroupId.value, noteId)
}

const ensureFallbackGroup = () => {
  if (groups.value.length && groups.value[0]) {
    return groups.value[0].id
  }
  const fallbackGroup = {
    id: createId(),
    name: '默认分组',
  }
  groups.value = [fallbackGroup]
  return fallbackGroup.id
}

const createGroup = async () => {
  const name = window.prompt('请输入分组名称')?.trim()
  if (!name) {
    return
  }
  try {
    const remoteGroup = await apiCreateGroup(name)
    const newGroup: LocalGroup = {
      id: String(remoteGroup.id),
      name: remoteGroup.name,
      remoteId: remoteGroup.id,
    }
    groups.value = [newGroup, ...groups.value]
    syncRoute(newGroup.id)
  } catch {
    const newGroup: LocalGroup = {
      id: createId(),
      name,
    }
    groups.value = [newGroup, ...groups.value]
    syncRoute(newGroup.id)
  }
}

const createNote = async () => {
  const groupId = currentGroupId.value || ensureFallbackGroup()
  const title = window.prompt('请输入文档标题')?.trim() || '未命名文档'
  const content = '# ' + title + '\n\n开始记录你的想法。'
  try {
    const remoteNote = await apiCreateNote(Number(groupId), title, content)
    const newNote: LocalNote = {
      id: String(remoteNote.id),
      groupId: String(remoteNote.groupId),
      title: remoteNote.title,
      content: remoteNote.content,
      updatedAt: remoteNote.updatedAt || new Date().toISOString(),
      remoteId: remoteNote.id,
    }
    notes.value = [newNote, ...notes.value]
    syncRoute(groupId, newNote.id)
  } catch {
    const newNote: LocalNote = {
      id: createId(),
      groupId,
      title,
      content,
      updatedAt: new Date().toISOString(),
    }
    notes.value = [newNote, ...notes.value]
    syncRoute(groupId, newNote.id)
  }
}

const deleteGroup = async () => {
  if (!currentGroup.value) {
    return
  }
  const confirmed = window.confirm(`确认删除分组"${currentGroup.value.name}"及其全部文档吗？`)
  if (!confirmed) {
    return
  }
  try {
    if (currentGroup.value.remoteId) {
      await apiDeleteGroup(currentGroup.value.remoteId)
    }
  } catch {
  }
  const nextGroups = groups.value.filter((group) => group.id !== currentGroup.value?.id)
  const nextNotes = notes.value.filter((note) => note.groupId !== currentGroup.value?.id)
  groups.value = nextGroups
  notes.value = nextNotes
  const fallbackGroupId = ensureFallbackGroup()
  const fallbackNoteId = notes.value.find((note) => note.groupId === fallbackGroupId)?.id
  syncRoute(fallbackGroupId, fallbackNoteId)
}

const deleteNote = async (noteId?: string) => {
  if (!noteId) {
    return
  }
  const targetNote = notes.value.find((note) => note.id === noteId)
  if (!targetNote) {
    return
  }
  const confirmed = window.confirm(`确认删除文档"${targetNote.title}"吗？`)
  if (!confirmed) {
    return
  }
  try {
    if (targetNote.remoteId) {
      await apiDeleteNote(targetNote.remoteId)
    }
  } catch {
  }
  notes.value = notes.value.filter((note) => note.id !== noteId)
  const fallbackNoteId = notes.value.find((note) => note.groupId === currentGroupId.value)?.id
  syncRoute(currentGroupId.value || ensureFallbackGroup(), fallbackNoteId)
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

const updateCurrentNote = (patch: Partial<Pick<LocalNote, 'title' | 'content'>>) => {
  if (!currentNote.value) {
    return
  }
  notes.value = notes.value.map((note) =>
    note.id === currentNote.value?.id
      ? {
          ...note,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : note,
  )
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(async () => {
    const noteToUpdate = notes.value.find(n => n.id === currentNote.value?.id)
    if (noteToUpdate && noteToUpdate.remoteId) {
      try {
        await apiUpdateNote(noteToUpdate.remoteId, {
          title: noteToUpdate.title,
          content: noteToUpdate.content,
        })
      } catch {
      }
    }
  }, 1000)
}

const openContextMenu = (event: MouseEvent, type: ContextMenuState['type'], noteId?: string) => {
  event.preventDefault()
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type,
    noteId,
  }
}

const handleContextAction = (action: 'create-group' | 'delete-group' | 'create-note' | 'delete-note') => {
  closeContextMenu()
  if (action === 'create-group') {
    createGroup()
    return
  }
  if (action === 'delete-group') {
    deleteGroup()
    return
  }
  if (action === 'create-note') {
    createNote()
    return
  }
  deleteNote(contextMenu.value.noteId)
}

const escapeHtml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const renderInlineMarkdown = (value: string) => {
  return value
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

const renderMarkdown = (value: string) => {
  const escaped = escapeHtml(value)
  const lines = escaped.split('\n')
  const blocks: string[] = []
  let inList = false
  let inCodeBlock = false
  let codeLines: string[] = []

  const closeList = () => {
    if (inList) {
      blocks.push('</ul>')
      inList = false
    }
  }

  const closeCodeBlock = () => {
    if (inCodeBlock) {
      blocks.push(`<pre><code>${codeLines.join('\n')}</code></pre>`)
      codeLines = []
      inCodeBlock = false
    }
  }

  lines.forEach((line) => {
    if (line.startsWith('```')) {
      closeList()
      if (inCodeBlock) {
        closeCodeBlock()
      } else {
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeLines.push(line)
      return
    }

    if (!line.trim()) {
      closeList()
      blocks.push('<div class="markdown-space"></div>')
      return
    }

    if (line.startsWith('- ')) {
      if (!inList) {
        blocks.push('<ul>')
        inList = true
      }

      blocks.push(`<li>${renderInlineMarkdown(line.slice(2))}</li>`)
      return
    }

    closeList()

    if (line.startsWith('### ')) {
      blocks.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`)
      return
    }

    if (line.startsWith('## ')) {
      blocks.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`)
      return
    }

    if (line.startsWith('# ')) {
      blocks.push(`<h1>${renderInlineMarkdown(line.slice(2))}</h1>`)
      return
    }

    if (line.startsWith('> ')) {
      blocks.push(`<blockquote>${renderInlineMarkdown(line.slice(2))}</blockquote>`)
      return
    }

    blocks.push(`<p>${renderInlineMarkdown(line)}</p>`)
  })

  closeList()
  closeCodeBlock()

  return blocks.join('')
}

const previewHtml = computed(() => renderMarkdown(currentNote.value?.content ?? ''))
const formatTime = (value: string) => new Date(value).toLocaleString()
const contextActions = computed(() => {
  if (contextMenu.value.type === 'group-area') {
    return [
      { label: '创建分组', action: 'create-group' as const },
      { label: '删除当前分组', action: 'delete-group' as const },
    ]
  }

  if (contextMenu.value.type === 'note-item') {
    return [
      { label: '创建文档', action: 'create-note' as const },
      { label: '删除当前文档', action: 'delete-note' as const },
    ]
  }

  return [{ label: '创建文档', action: 'create-note' as const }]
})

onMounted(() => {
  window.addEventListener('click', closeContextMenu)
  window.addEventListener('scroll', closeContextMenu, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('scroll', closeContextMenu, true)
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
})
</script>

<template>
  <main class="thoughts-page">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    <section class="thoughts-shell">
      <aside class="panel sidebar-panel">
        <div class="panel-header">
          <div>
            <p class="panel-badge">分组</p>
            <h2>个人思考记录</h2>
          </div>
        </div>

        <div class="group-select-area" @contextmenu="openContextMenu($event, 'group-area')">
          <label class="group-select-label" for="group-select">当前分组</label>
          <select id="group-select" :value="currentGroupId" @change="selectGroup(($event.target as HTMLSelectElement).value)">
            <option v-for="group in groups" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select>
          <p class="context-tip">右键此区域可创建或删除分组</p>
        </div>

        <div class="note-list-shell" @contextmenu="openContextMenu($event, 'note-list')">
          <div class="list-header">
            <div>
              <p class="panel-badge">文档</p>
              <h3>{{ currentGroup?.name || '未选择分组' }}</h3>
            </div>
          </div>

          <div class="note-list">
            <button
              v-for="note in groupNotes"
              :key="note.id"
              type="button"
              class="note-item"
              :class="{ active: note.id === currentNoteId }"
              @click="selectNote(note.id)"
              @contextmenu.stop="openContextMenu($event, 'note-item', note.id)"
            >
              <strong>{{ note.title }}</strong>
              <span>{{ formatTime(note.updatedAt) }}</span>
            </button>
            <p v-if="!groupNotes.length" class="empty-text">当前分组还没有文档，右键空白区域即可创建。</p>
          </div>
        </div>
      </aside>

      <section class="panel editor-panel">
        <div class="panel-header editor-header">
          <div>
            <p class="panel-badge">编辑器</p>
            <h2>{{ currentNote?.title || '请选择文档' }}</h2>
          </div>

          <div class="preview-switcher">
            <button
              v-for="mode in previewModes"
              :key="mode"
              type="button"
              class="mode-button"
              :class="{ active: previewMode === mode }"
              @click="previewMode = mode"
            >
              {{ mode }}
            </button>
          </div>
        </div>

        <template v-if="currentNote">
          <input
            class="note-title-input"
            :value="currentNote.title"
            type="text"
            placeholder="请输入文档标题"
            @input="updateCurrentNote({ title: ($event.target as HTMLInputElement).value })"
          />

          <div class="editor-body" :class="`mode-${previewMode}`">
            <textarea
              v-if="previewMode !== 'preview'"
              class="editor-textarea"
              :value="currentNote.content"
              placeholder="使用 Markdown 记录你的想法..."
              @input="updateCurrentNote({ content: ($event.target as HTMLTextAreaElement).value })"
            />

            <article v-if="previewMode !== 'edit'" class="preview-pane" v-html="previewHtml"></article>
          </div>
        </template>

        <div v-else class="empty-editor">
          <p>请先在左侧选择分组并创建文档。</p>
        </div>
      </section>
    </section>

    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{
        left: `${contextMenu.x}px`,
        top: `${contextMenu.y}px`,
      }"
    >
      <button
        v-for="item in contextActions"
        :key="item.action"
        type="button"
        class="context-menu-item"
        @click.stop="handleContextAction(item.action)"
      >
        {{ item.label }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.thoughts-page {
  min-height: 100vh;
  padding: 16px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.22), transparent 28%),
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.18), transparent 24%),
    linear-gradient(135deg, #020617 0%, #0f172a 45%, #1d4ed8 100%);
  position: relative;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(2, 6, 23, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(59, 130, 246, 0.3);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay p {
  color: #94a3b8;
  font-size: 14px;
}

.thoughts-shell {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 16px;
  min-height: calc(100vh - 32px);
}

.panel {
  min-height: calc(100vh - 32px);
  padding: 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
  box-sizing: border-box;
}

.sidebar-panel,
.editor-panel {
  backdrop-filter: blur(8px);
}

.editor-panel {
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.panel-badge {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.panel-header h2,
.list-header h3 {
  margin: 0;
  color: #0f172a;
}

.panel-header h2 {
  font-size: 24px;
}

.list-header h3 {
  font-size: 20px;
}

.group-select-area,
.note-list-shell {
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.95) 0%, rgba(219, 234, 254, 0.85) 100%);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
}

.group-select-area {
  padding: 18px;
  margin-bottom: 16px;
}

.group-select-label,
.context-tip {
  display: block;
}

.group-select-label {
  margin-bottom: 8px;
  color: #1e3a8a;
  font-size: 14px;
  font-weight: 700;
}

.context-tip {
  margin-top: 10px;
  color: #475569;
  font-size: 12px;
}

.group-select-area select,
.note-title-input,
.editor-textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  font-size: 14px;
  color: #0f172a;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.group-select-area select,
.note-title-input {
  height: 44px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.92);
}

.group-select-area select:focus,
.note-title-input:focus,
.editor-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
}

.note-list-shell {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 230px);
  padding: 18px;
}

.list-header {
  margin-bottom: 16px;
}

.note-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
  overflow: auto;
}

.note-item,
.mode-button,
.context-menu-item {
  border: none;
  border-radius: 12px;
}

.note-item {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.94);
  color: #1e3a8a;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.08);
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.note-item:hover {
  transform: translateY(-1px);
}

.note-item.active,
.mode-button.active {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
}

.note-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-item span {
  font-size: 12px;
  opacity: 0.8;
}

.editor-header {
  align-items: flex-start;
}

.preview-switcher {
  display: flex;
  gap: 8px;
}

.mode-button {
  min-width: 76px;
  height: 42px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.2);
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.mode-button:hover {
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.28);
}

.note-title-input {
  margin-bottom: 16px;
}

.editor-body {
  display: grid;
  flex: 1;
  gap: 16px;
  min-height: 0;
}

.editor-body.mode-split {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.editor-textarea,
.preview-pane,
.empty-editor {
  min-height: 0;
  height: 100%;
  border-radius: 20px;
  background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%);
  box-sizing: border-box;
}

.editor-textarea {
  padding: 18px;
  resize: none;
  line-height: 1.7;
}

.preview-pane {
  padding: 24px;
  overflow: auto;
  color: #0f172a;
}

.empty-editor {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #64748b;
}

.empty-text {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
}

.context-menu {
  position: fixed;
  z-index: 30;
  min-width: 180px;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.96);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
}

.context-menu-item {
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  color: #e2e8f0;
  text-align: left;
  cursor: pointer;
}

.context-menu-item:hover {
  background: rgba(59, 130, 246, 0.22);
}

.preview-pane :deep(h1),
.preview-pane :deep(h2),
.preview-pane :deep(h3) {
  margin: 0 0 16px;
  color: #0f172a;
}

.preview-pane :deep(p),
.preview-pane :deep(ul),
.preview-pane :deep(blockquote),
.preview-pane :deep(pre) {
  margin: 0 0 16px;
}

.preview-pane :deep(ul) {
  padding-left: 20px;
}

.preview-pane :deep(blockquote) {
  padding-left: 16px;
  border-left: 4px solid #93c5fd;
  color: #334155;
}

.preview-pane :deep(pre) {
  padding: 16px;
  border-radius: 12px;
  background: #0f172a;
  color: #e2e8f0;
  overflow: auto;
}

.preview-pane :deep(code) {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.2);
}

.preview-pane :deep(.markdown-space) {
  height: 8px;
}

@media (max-width: 1200px) {
  .thoughts-page {
    padding: 12px;
  }

  .thoughts-shell {
    grid-template-columns: 320px minmax(0, 1fr);
    min-height: calc(100vh - 24px);
  }

  .panel {
    min-height: calc(100vh - 24px);
  }
}

@media (max-width: 960px) {
  .thoughts-shell {
    grid-template-columns: 1fr;
  }

  .panel,
  .note-list-shell {
    min-height: auto;
  }

  .editor-textarea,
  .preview-pane,
  .empty-editor {
    min-height: 320px;
  }

  .editor-body.mode-split {
    grid-template-columns: 1fr;
  }
}
</style>