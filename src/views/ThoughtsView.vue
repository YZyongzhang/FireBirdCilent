<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface ThoughtGroup {
  id: string
  name: string
}

interface ThoughtNote {
  id: string
  groupId: string
  title: string
  content: string
  updatedAt: string
}

const route = useRoute()
const router = useRouter()
const storageKey = 'firebird-thoughts'

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const defaultGroups: ThoughtGroup[] = [
  { id: 'group-inbox', name: '灵感收集' },
  { id: 'group-review', name: '复盘记录' },
]

const defaultNotes: ThoughtNote[] = [
  {
    id: 'note-welcome',
    groupId: 'group-inbox',
    title: '欢迎使用个人思考记录',
    content: '# 开始记录\n\n- 先创建分组\n- 再新增文档\n- 在右侧使用 Markdown 进行书写\n\n> 这里是类似飞书的轻量思考工作台。',
    updatedAt: new Date().toISOString(),
  },
]

const groups = ref<ThoughtGroup[]>(defaultGroups)
const notes = ref<ThoughtNote[]>(defaultNotes)
const draftGroupName = ref('')
const draftNoteTitle = ref('')
const previewMode = ref<'split' | 'edit' | 'preview'>('split')

const loadState = () => {
  const stored = localStorage.getItem(storageKey)

  if (!stored) {
    return
  }

  const parsed = JSON.parse(stored) as {
    groups?: ThoughtGroup[]
    notes?: ThoughtNote[]
  }

  if (parsed.groups?.length) {
    groups.value = parsed.groups
  }

  if (parsed.notes?.length) {
    notes.value = parsed.notes
  }
}

loadState()

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
  [groups, notes, currentGroupId, currentNoteId],
  () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        groups: groups.value,
        notes: notes.value,
      }),
    )

    if (!currentGroupId.value) {
      return
    }

    syncRoute(currentGroupId.value, currentNoteId.value || undefined)
  },
  { deep: true, immediate: true },
)

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

const createGroup = () => {
  const name = draftGroupName.value.trim()

  if (!name) {
    return
  }

  const newGroup = {
    id: createId(),
    name,
  }

  groups.value = [newGroup, ...groups.value]
  draftGroupName.value = ''
  syncRoute(newGroup.id)
}

const createNote = () => {
  if (!currentGroupId.value) {
    return
  }

  const title = draftNoteTitle.value.trim() || '未命名文档'
  const newNote = {
    id: createId(),
    groupId: currentGroupId.value,
    title,
    content: '# 新文档\n\n开始记录你的想法。',
    updatedAt: new Date().toISOString(),
  }

  notes.value = [newNote, ...notes.value]
  draftNoteTitle.value = ''
  syncRoute(currentGroupId.value, newNote.id)
}

const updateCurrentNote = (patch: Partial<Pick<ThoughtNote, 'title' | 'content'>>) => {
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
</script>

<template>
  <main class="thoughts-page">
    <section class="thoughts-shell">
      <aside class="panel group-panel">
        <div class="panel-header">
          <div>
            <p class="panel-badge">分组</p>
            <h2>思考分组</h2>
          </div>
        </div>

        <div class="panel-form">
          <input v-model="draftGroupName" type="text" placeholder="输入分组名称" @keyup.enter="createGroup" />
          <button type="button" @click="createGroup">新建分组</button>
        </div>

        <div class="group-list">
          <button
            v-for="group in groups"
            :key="group.id"
            type="button"
            class="group-item"
            :class="{ active: group.id === currentGroupId }"
            @click="selectGroup(group.id)"
          >
            {{ group.name }}
          </button>
        </div>
      </aside>

      <section class="panel note-panel">
        <div class="panel-header">
          <div>
            <p class="panel-badge">文档</p>
            <h2>{{ currentGroup?.name || '未选择分组' }}</h2>
          </div>
        </div>

        <div class="panel-form">
          <input v-model="draftNoteTitle" type="text" placeholder="输入文档标题" @keyup.enter="createNote" />
          <button type="button" @click="createNote">新建文档</button>
        </div>

        <div class="note-list">
          <button
            v-for="note in groupNotes"
            :key="note.id"
            type="button"
            class="note-item"
            :class="{ active: note.id === currentNoteId }"
            @click="selectNote(note.id)"
          >
            <strong>{{ note.title }}</strong>
            <span>{{ formatTime(note.updatedAt) }}</span>
          </button>
          <p v-if="!groupNotes.length" class="empty-text">当前分组还没有文档，请先创建一篇。</p>
        </div>
      </section>

      <section class="panel editor-panel">
        <div class="panel-header editor-header">
          <div>
            <p class="panel-badge">编辑器</p>
            <h2>{{ currentNote?.title || '请选择文档' }}</h2>
          </div>

          <div class="preview-switcher">
            <button
              v-for="mode in ['split', 'edit', 'preview']"
              :key="mode"
              type="button"
              class="mode-button"
              :class="{ active: previewMode === mode }"
              @click="previewMode = mode as 'split' | 'edit' | 'preview'"
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
          <p>请先在左侧创建分组，再新建文档开始记录。</p>
        </div>
      </section>
    </section>
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
}

.thoughts-shell {
  display: grid;
  grid-template-columns: 260px 320px minmax(0, 1fr);
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

.panel-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
}

.panel-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.panel-form input,
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

.panel-form input,
.note-title-input {
  height: 44px;
  padding: 0 14px;
}

.panel-form input:focus,
.note-title-input:focus,
.editor-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
}

.panel-form button,
.mode-button,
.group-item,
.note-item {
  border: none;
  border-radius: 12px;
}

.panel-form button,
.mode-button {
  height: 42px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.2);
}

.panel-form button:hover,
.mode-button:hover {
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.28);
}

.note-panel,
.editor-panel {
  backdrop-filter: blur(8px);
}

.editor-panel {
  display: flex;
  flex-direction: column;
}

.group-list,
.note-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 240px);
  padding-right: 4px;
  overflow: auto;
}

.group-item,
.note-item {
  padding: 14px 16px;
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  color: #1e3a8a;
  text-align: left;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
}

.group-item:hover,
.note-item:hover {
  transform: translateY(-1px);
}

.group-item,
.note-item,
.panel-form button,
.mode-button {
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.group-item.active,
.note-item.active,
.mode-button.active {
  background: #1d4ed8;
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
    grid-template-columns: 220px 260px minmax(0, 1fr);
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

  .panel {
    min-height: auto;
  }

  .group-list,
  .note-list {
    max-height: none;
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
