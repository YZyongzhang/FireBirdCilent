# 每日计划接口文档

后端接口用于管理每日计划数据。以下为前端在 `DailyPlanView.vue` 中使用的接口规范（示例）：

1. GET /daily-plans
   - 描述：获取所有日期的计划列表
   - 返回：Array<DailyPlan>
   - 示例返回：
     ```json
     [
       { "date": "2026-05-07", "completed": false, "tasks": [ { "id": "...", "title": "...", "time": "", "done": false, "note": "" } ] }
     ]
     ```

2. GET /daily-plans/{date}
   - 描述：获取指定日期的计划
   - 参数：path `date` (格式 `YYYY-MM-DD`)
   - 返回：DailyPlan

3. POST /daily-plans
   - 描述：创建当天计划（如果不存在）
   - 请求体：{ "date": "YYYY-MM-DD" }
   - 返回：创建结果或目标计划

4. POST /daily-plans/{date}/tasks
   - 描述：为指定日期添加一项任务
   - 请求体：{ "title": string, "time"?: string, "note"?: string }
   - 返回：新增任务或更新后的计划

5. PATCH /daily-plans/{date}/tasks/{taskId}
   - 描述：更新指定任务（部分字段）
   - 请求体：Partial<DailyTask>，例如 { "title": "...", "done": true }
   - 返回：更新结果或更新后的任务

6. DELETE /daily-plans/{date}/tasks/{taskId}
   - 描述：删除指定任务
   - 返回：删除结果

7. POST /daily-plans/{date}/toggle
   - 描述：切换当日计划完成状态（completed 字段）
   - 返回：更新后的计划或状态

说明：
- `DailyPlan` 结构：{ date: string, completed: boolean, tasks: DailyTask[] }
- `DailyTask` 结构：{ id: string, title: string, time: string, done: boolean, note: string }
- 所有接口建议使用 JSON 格式请求与响应，生产环境请启用 HTTPS 与鉴权。
