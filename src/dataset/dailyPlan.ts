export interface DailyTaskSeed {
  title: string
  time: string
  note: string
}

export interface DailyTaskData extends DailyTaskSeed {
  id: string
  done: boolean
}

export interface DailyPlanData {
  date: string
  completed: boolean
  tasks: DailyTaskData[]
}

export const defaultDailyTaskSeeds: DailyTaskSeed[] = [
  { title: '整理今日重点事项', time: '09:00 - 09:30', note: '' },
  { title: '推进核心功能开发', time: '10:00 - 12:00', note: '' },
]

export const initialDailyPlansByDate: Record<string, DailyPlanData> = {
  '2026-05-01': {
    date: '2026-05-01',
    completed: false,
    tasks: [
      {
        id: 'task-focus',
        title: '整理今日重点事项',
        time: '09:00 - 09:30',
        done: false,
        note: '',
      },
      {
        id: 'task-core-work',
        title: '推进核心功能开发',
        time: '10:00 - 12:00',
        done: false,
        note: '',
      },
    ],
  },
}
