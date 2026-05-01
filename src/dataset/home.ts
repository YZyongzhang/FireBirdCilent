export interface HomeCardData {
  title: string
  description: string
  actionText: string
  route?: string
}

export const homeCards: HomeCardData[] = [
  {
    title: '个人思考记录',
    description: '记录和整理你的个人想法、复盘和灵感。',
    actionText: '进入页面',
    route: '/thoughts',
  },
  {
    title: '每日计划',
    description: '查看今天的安排、任务优先级和关键提醒，帮助你快速进入工作状态。',
    actionText: '进入页面',
    route: '/daily-plan',
  },
  {
    title: '资料库占位',
    description: '后续可以在这里收集常用资料、文档和外部链接。',
    actionText: '敬请期待',
  },
  {
    title: '灵感卡片占位',
    description: '后续可以在这里扩展更多灵感内容和临时记录入口。',
    actionText: '敬请期待',
  },
]
