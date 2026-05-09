# 二手交易模块 — 前端接口文档

说明：以下为二手交易页面前端与后端交互所需的接口定义，覆盖列表筛选、详情展示与商品发布。

基础路径（示例）：`/api/secondhand`

## 1. 获取商品列表
- 方法：GET
- 路径：`/api/secondhand/items`
- 查询参数：
  - `page`：页码（int，可选）
  - `size`：每页数量（int，可选）
  - `q`：搜索关键词，可匹配标题、描述、卖家昵称、联系方式（string，可选）
  - `category`：商品分类（string，可选）
  - `status`：商品状态，建议值：`on_sale`、`reserved`、`sold`（string，可选）
  - `sort`：排序方式，建议值：`latest`、`price_asc`、`price_desc`（string，可选）
- 返回示例：
  ```json
  {
    "items": [
      {
        "id": "1",
        "title": "MacBook Air",
        "price": 4500,
        "thumb": "/img/1.jpg",
        "category": "数码",
        "condition": "八成新",
        "status": "on_sale",
        "seller": "小张",
        "contact": "wechat: zhang_trade",
        "location": "主校区",
        "publishedAt": "2026-05-09"
      }
    ],
    "total": 123
  }
  ```

## 2. 获取商品详情
- 方法：GET
- 路径：`/api/secondhand/items/{id}`
- 返回字段建议：
  - `id`：商品 ID
  - `title`：商品标题
  - `description`：商品描述
  - `price`：价格
  - `images`：图片地址数组
  - `category`：分类
  - `condition`：成色描述
  - `status`：商品状态
  - `location`：交易地点
  - `publishedAt`：发布时间
  - `seller`：卖家信息对象，建议包含 `id`、`name`、`contact`
- 返回示例：
  ```json
  {
    "id": "1",
    "title": "MacBook Air",
    "description": "九成新，电池循环正常...",
    "price": 4500,
    "images": ["/img/1.jpg"],
    "category": "数码",
    "condition": "九成新",
    "status": "on_sale",
    "location": "北区宿舍",
    "publishedAt": "2026-05-09",
    "seller": {
      "id": "u1",
      "name": "小张",
      "contact": "wechat: zhang_trade"
    }
  }
  ```

## 3. 发布新商品
- 方法：POST
- 路径：`/api/secondhand/items`
- 请求体（JSON 或 multipart/form-data）：
  - `title`：商品标题（string，必填）
  - `description`：商品描述（string，必填）
  - `price`：商品价格（number，必填）
  - `category`：商品分类（string，必填）
  - `condition`：成色描述，例如 `全新`、`九成新`、`八成新`、`有使用痕迹`（string，必填）
  - `contact`：联系方式（string，必填）
  - `location`：交易地点（string，必填）
  - `images`：商品图片（可选）
- 请求示例：
  ```json
  {
    "title": "人体工学椅",
    "description": "使用一年，带头枕和腰托。",
    "price": 299,
    "category": "家居",
    "condition": "八成新",
    "contact": "wechat: chair_sale",
    "location": "教学楼 A 区",
    "images": []
  }
  ```
- 返回示例：创建成功后的资源信息或 `201 Created`。

## 4. 编辑商品
- 方法：PUT
- 路径：`/api/secondhand/items/{id}`
- 请求体：同发布接口
- 补充说明：支持修改标题、价格、描述、分类、成色、联系方式、交易地点、状态。

## 5. 删除商品
- 方法：DELETE
- 路径：`/api/secondhand/items/{id}`

## 6. 更新商品状态
- 方法：PATCH
- 路径：`/api/secondhand/items/{id}/status`
- 请求体：
  - `status`：建议值 `on_sale`、`reserved`、`sold`

## 7. 我发布的商品
- 方法：GET
- 路径：`/api/secondhand/my-items`
- 需要鉴权（token 或 cookie）

## 鉴权建议
- 建议使用标准 `Authorization: Bearer <token>` 头部。
- 若平台存在登录态，也可使用 cookie/session 方式。

## 错误码约定
- `200 OK` — 成功
- `201 Created` — 已创建
- `400 Bad Request` — 参数错误
- `401 Unauthorized` — 未鉴权
- `403 Forbidden` — 无权限
- `404 Not Found` — 资源不存在

## 前端对接建议
- 页面筛选项与接口查询参数保持一致：搜索词、分类、状态、排序。
- 列表卡片建议直接使用列表接口返回的摘要字段，避免重复请求详情。
- 详情弹窗/详情页再请求详情接口，补充完整描述、联系方式和交易地点。
- 发布成功后可重新拉取列表，或将后端返回的新商品插入当前列表顶部。
