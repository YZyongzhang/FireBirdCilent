# 二手交易模块 — 前端接口文档

说明：以下为前端与后端交互所需的接口定义，用于实现二手商品的发布、浏览、详情、编辑、删除、购物车、客服、支付、评价等功能。

基础路径（示例）：`/api/secondhand`

---

## 一、商品管理

### 1.1 获取商品列表
- 方法：GET
- 路径：`/api/secondhand/items`
- 查询参数：
  - `page`：页码（int，默认 1）
  - `size`：每页数量（int，默认 20）
  - `q`：搜索关键词（可选）
  - `category`：分类（可选）
- 返回示例：
  ```json
  {
    "items": [
      { "id": "1", "title": "MacBook Air", "price": 4500, "thumb": "/img/1.jpg", "seller": "小张", "date": "2026-05-01", "category": "数码" }
    ],
    "total": 123
  }
  ```

### 1.2 获取商品详情
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
    "seller": { "id": "u1", "name": "小张" },
    "date": "2026-05-01",
    "category": "数码"
  }
  ```

### 1.3 发布新商品
- 方法：POST
- 路径：`/api/secondhand/items`
- 请求体（JSON 或 multipart/form-data）：
  - `title`：商品标题（string）
  - `description`：商品描述（string）
  - `price`：价格（number）
  - `category`：分类（string）
  - `images`：图片文件（file，可选）
- 返回示例：`201 Created`
  ```json
  { "id": "5", "title": "二手吉他", "price": 450 }
  ```

### 1.4 编辑商品
- 方法：PUT
- 路径：`/api/secondhand/items/{id}`
- 请求体：同发布

### 1.5 删除商品
- 方法：DELETE
- 路径：`/api/secondhand/items/{id}`

### 1.6 获取商品评价列表
- 方法：GET
- 路径：`/api/secondhand/items/{id}/reviews`
- 返回示例：
  ```json
  {
    "reviews": [
      { "id": "1", "userId": "u2", "username": "小李", "rating": 5, "comment": "很好！", "date": "2026-05-10" }
    ]
  }
  ```

---

## 二、购物车

### 2.1 获取购物车列表
- 方法：GET
- 路径：`/api/secondhand/cart`
- 需要鉴权
- 返回示例：
  ```json
  {
    "items": [
      { "id": "c1", "itemId": "1", "title": "MacBook Air", "price": 4500, "thumb": "/img/1.jpg", "quantity": 1 }
    ]
  }
  ```

### 2.2 添加商品到购物车
- 方法：POST
- 路径：`/api/secondhand/cart`
- 请求体：
  ```json
  { "itemId": "1", "quantity": 1 }
  ```
- 返回示例：`201 Created`

### 2.3 更新购物车商品数量
- 方法：PUT
- 路径：`/api/secondhand/cart/{id}`
- 请求体：
  ```json
  { "quantity": 2 }
  ```

### 2.4 从购物车移除商品
- 方法：DELETE
- 路径：`/api/secondhand/cart/{id}`

### 2.5 清空购物车
- 方法：DELETE
- 路径：`/api/secondhand/cart`

---

## 三、客服（消息）

### 3.1 获取与某用户的聊天记录
- 方法：GET
- 路径：`/api/secondhand/messages`
- 查询参数：
  - `withUserId`：对方用户ID（string）
- 返回示例：
  ```json
  {
    "messages": [
      { "id": "m1", "fromUserId": "u1", "fromUsername": "小张", "toUserId": "u2", "content": "你好，商品还在吗？", "date": "2026-05-10 10:00:00" }
    ]
  }
  ```

### 3.2 发送消息
- 方法：POST
- 路径：`/api/secondhand/messages`
- 请求体：
  ```json
  { "toUserId": "u2", "content": "在的，随时可以交易" }
  ```

### 3.3 获取未读消息数
- 方法：GET
- 路径：`/api/secondhand/messages/unread-count`
- 返回示例：
  ```json
  { "count": 3 }
  ```

---

## 四、订单与支付

### 4.1 创建订单
- 方法：POST
- 路径：`/api/secondhand/orders`
- 请求体：
  ```json
  {
    "cartItemIds": ["c1", "c2"],
    "totalAmount": 5000
  }
  ```
- 返回示例：`201 Created`
  ```json
  { "orderId": "o1", "status": "pending_payment" }
  ```

### 4.2 获取订单列表
- 方法：GET
- 路径：`/api/secondhand/orders`
- 返回示例：
  ```json
  {
    "orders": [
      { "orderId": "o1", "items": [...], "totalAmount": 5000, "status": "paid", "date": "2026-05-10" }
    ]
  }
  ```

### 4.3 模拟支付
- 方法：POST
- 路径：`/api/secondhand/orders/{orderId}/pay`
- 请求体：
  ```json
  { "paymentMethod": "alipay|wechat|paypal" }
  ```
- 返回示例：
  ```json
  { "success": true, "orderId": "o1", "status": "paid" }
  ```

### 4.4 取消订单
- 方法：PUT
- 路径：`/api/secondhand/orders/{orderId}/cancel`

---

## 五、商品评价

### 5.1 提交商品评价
- 方法：POST
- 路径：`/api/secondhand/items/{id}/reviews`
- 请求体：
  ```json
  { "rating": 5, "comment": "商品很好，满意！" }
  ```

---

## 六、分类

### 6.1 获取所有分类
- 方法：GET
- 路径：`/api/secondhand/categories`
- 返回示例：
  ```json
  { "categories": ["数码", "服饰", "乐器", "图书", "其他"] }
  ```

---

## 鉴权方式

所有需要鉴权的接口，需要在请求头中携带用户信息：
- `X-User-Id`：用户ID
- `X-User-Username`：用户名
- `X-User-Role`：用户角色
- `X-User-Password`：用户密码（用于验证）

## 错误码约定

- 200 OK — 成功
- 201 Created — 已创建
- 400 Bad Request — 参数错误
- 401 Unauthorized — 未鉴权
- 403 Forbidden — 无权限
- 404 Not Found — 资源不存在
- 500 Internal Server Error — 服务器错误
