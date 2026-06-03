export interface ThoughtGroupSeed {
  id: string
  name: string
}

export interface ThoughtNoteSeed {
  id: string
  groupId: string
  title: string
  content: string
  updatedAt: string
}

export const defaultThoughtGroups: ThoughtGroupSeed[] = [
  { id: 'group-inbox', name: '灵感收集' },
  { id: 'group-review', name: '复盘记录' },
]

export const defaultThoughtNotes: ThoughtNoteSeed[] = [
  {
    id: 'note-welcome',
    groupId: 'group-inbox',
    title: '欢迎使用个人思考记录',
    content: '# 开始记录\n\n- 先创建分组\n- 再新增文档\n- 在右侧使用 Markdown 进行书写\n\n> 这里是类似飞书的轻量思考工作台。',
    updatedAt: '2026-05-01T00:00:00.000Z',
  },
]
