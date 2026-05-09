# 二手交易模块 — 前端接口文档

说明：以下为前端与后端交互所需的接口定义（占位），用于实现二手商品的发布、浏览、详情、编辑与删除。

基础路径（示例）：`/api/secondhand`

1. 获取商品列表
- 方法：GET
- 路径：`/api/secondhand/items`
- 查询参数：
  - `page`：页码（int）
  - `size`：每页数量（int）
  - `q`：搜索关键词（可选）
  - `category`：分类（可选）
- 返回示例：
  ```json
  {
    "items": [
      { "id": "1", "title": "MacBook Air", "price": 4500, "thumb": "/img/1.jpg" }
    ],
    "total": 123
  }
  ```

2. 获取商品详情
- 方法：GET
- 路径：`/api/secondhand/items/{id}`
- 返回示例：
  ```json
  {
    "id": "1",
    "title": "MacBook Air",
    "description": "九成新...",
    "price": 4500,
    "images": ["/img/1.jpg"],
    "seller": { "id": "u1", "name": "小张" }
  }
  ```

3. 发布新商品
- 方法：POST
- 路径：`/api/secondhand/items`
- 请求体（JSON 或 multipart/form-data）：
  - `title`、`description`、`price`、`category`、`images`（文件上传）
- 返回示例：创建成功后的资源信息或 `201 Created`。

4. 编辑商品
- 方法：PUT
- 路径：`/api/secondhand/items/{id}`
- 请求体：同发布

5. 删除商品
- 方法：DELETE
- 路径：`/api/secondhand/items/{id}`

6. 我发布的商品（用户专属）
- 方法：GET
- 路径：`/api/secondhand/my-items`
- 需要鉴权（token 或 cookie）

鉴权：建议使用标准 Authorization: Bearer <token> 头部。

错误码约定：
- 200 OK — 成功
- 201 Created — 已创建
- 400 Bad Request — 参数错误
- 401 Unauthorized — 未鉴权
- 403 Forbidden — 无权限
- 404 Not Found — 资源不存在

前端实现建议：
- 在 `src/utils` 新增 `secondhand.ts`（或在已有的 API 管理文件中加入）封装请求方法。
- 在页面加载与分页中复用 `items` 接口；详情页面使用 `items/{id}`。
