# 二手交易平台 API 接口文档

## 1. 获取商品列表

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/items`
- **参数**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | page | number | 否 | 页码，默认1 |
  | size | number | 否 | 每页数量，默认9 |
  | q | string | 否 | 搜索关键词 |
  | category | string | 否 | 分类筛选 |

### 响应
```json
{
  "items": [
    {
      "id": number,
      "title": string,
      "description": string,
      "price": number,
      "category": string,
      "thumb": string,
      "images": string[],
      "seller": {
        "id": number,
        "name": string
      },
      "sellerName": string,
      "date": string,
      "status": string
    }
  ],
  "total": number,
  "page": number,
  "size": number
}
```

## 2. 获取我的发布列表

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/items/my`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Id | 是 | 用户ID |

### 响应
```json
[
  {
    "id": number,
    "title": string,
    "description": string,
    "price": number,
    "category": string,
    "thumb": string,
    "images": string[],
    "sellerId": number,
    "sellerName": string,
    "date": string,
    "status": "available" | "offline"
  }
]
```

## 3. 获取待审核商品列表（管理员）

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/items/pending`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Role | 是 | 必须是 admin |

### 响应
```json
[
  {
    "id": number,
    "title": string,
    "description": string,
    "price": number,
    "category": string,
    "thumb": string,
    "images": string[],
    "sellerId": number,
    "sellerName": string,
    "date": string,
    "status": "pending_review"
  }
]
```

### 权限说明
- 仅管理员可以访问

## 4. 审核商品（通过/拒绝）

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/items/{id}/review`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Role | 是 | 必须是 admin |
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | action | string | 是 | approve（通过）或 reject（拒绝） |

### 响应
```json
{
  "success": boolean,
  "message": string
}
```

### 权限说明
- 仅管理员可以审核商品
- 审核通过后商品状态变为 available
- 审核拒绝后商品状态变为 rejected

## 5. 商品下架

### 请求
- **方法**: PUT
- **路径**: `/api/secondhand/items/{id}/offline`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Id | 是 | 用户ID |
  | X-User-Role | 是 | 用户角色 |

### 响应
```json
{
  "success": boolean,
  "message": string
}
```

### 权限说明
- 仅商品发布者或管理员(admin)可以下架商品

## 6. 获取分类列表

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/categories`

### 响应
```json
{
  "categories": ["灵感", "思考", "模版", "资源"]
}
```

## 7. 创建商品

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/items`
- **Content-Type**: `multipart/form-data`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | title | string | 是 | 商品标题 |
  | description | string | 否 | 商品描述 |
  | price | number | 是 | 商品价格 |
  | category | string | 是 | 商品分类 |
  | images | File[] | 否 | 商品图片（支持多张） |

### 响应
```json
{
  "success": boolean,
  "message": string,
  "data": {
    "id": string,
    "title": string,
    "description": string,
    "price": number,
    "category": string,
    "date": string,
    "thumb": "http://localhost:80/images/xxx.png",
    "images": "http://localhost:80/images/xxx.png,http://localhost:80/images/yyy.png",
    "status": "pending_review"
  }
}
```

### 图片上传说明
- 图片上传到 nginx 服务器，路径为 `E:/yongzhang/Nginx_server/images/`
- 返回的 URL 格式为 `http://localhost:80/images/{filename}`
- 支持多张图片上传，images 字段用逗号分隔

## 8. 获取商品评价

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/items/{id}/reviews`

### 响应
```json
{
  "reviews": [
    {
      "id": number,
      "userId": number,
      "username": string,
      "rating": number,
      "comment": string,
      "date": string
    }
  ]
}
```

## 9. 提交评价

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/items/{id}/reviews`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | rating | number | 是 | 评分(1-5) |
  | comment | string | 是 | 评价内容 |

### 响应
```json
{
  "id": number,
  "userId": number,
  "username": string,
  "rating": number,
  "comment": string,
  "date": string
}
```

## 10. 获取购物车

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/cart`

### 响应
```json
{
  "items": [
    {
      "id": number,
      "itemId": number,
      "title": string,
      "price": number,
      "quantity": number,
      "thumb": string
    }
  ]
}
```

## 11. 添加到购物车

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/cart`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | itemId | number | 是 | 商品ID |
  | quantity | number | 否 | 数量，默认1 |

### 响应
```json
{
  "success": boolean,
  "message": string
}
```

## 12. 更新购物车商品数量

### 请求
- **方法**: PUT
- **路径**: `/api/secondhand/cart/{id}`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | quantity | number | 是 | 新数量 |

### 响应
```json
{
  "success": boolean
}
```

## 13. 删除购物车商品

### 请求
- **方法**: DELETE
- **路径**: `/api/secondhand/cart/{id}`

### 响应
```json
{
  "success": boolean,
  "message": string
}
```

## 14. 清空购物车

### 请求
- **方法**: DELETE
- **路径**: `/api/secondhand/cart`

### 响应
```json
{
  "success": boolean,
  "message": string
}
```

## 15. 创建订单

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/orders`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Id | 是 | 用户ID |
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | totalAmount | number | 是 | 订单总金额 |
  | shippingAddress | string | 是 | 收货地址 |

### 响应
```json
{
  "success": boolean,
  "orderId": string,
  "message": string
}
```

## 16. 获取订单列表

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/orders`

### 响应
```json
{
  "orders": [
    {
      "orderId": string,
      "items": [
        {
          "id": number,
          "title": string,
          "quantity": number,
          "price": number
        }
      ],
      "totalAmount": number,
      "status": "pending" | "paid" | "shipped" | "delivered" | "completed" | "cancelled",
      "date": string,
      "payTime": string,
      "shipTime": string,
      "deliverTime": string,
      "receiveTime": string,
      "trackingNumber": string,
      "shippingAddress": string,
      "refundStatus": string,
      "refundTime": string,
      "refundReason": string
    }
  ]
}
```

## 17. 获取卖家订单列表

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/orders/seller/{sellerId}`

### 响应
```json
[
  {
    "orderId": string,
    "totalAmount": number,
    "status": "pending" | "paid" | "shipped" | "delivered" | "completed" | "cancelled",
    "date": string,
    "payTime": string,
    "shipTime": string,
    "trackingNumber": string,
    "refundStatus": string,
    "refundReason": string
  }
]
```

## 18. 支付订单

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/orders/{orderId}/pay`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Id | 是 | 用户ID |

### 响应
```json
{
  "success": boolean,
  "message": string,
  "balance": number
}
```

## 19. 发货

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/orders/{orderId}/ship`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | trackingNumber | string | 是 | 物流单号 |

### 响应
```json
{
  "success": boolean,
  "message": string
}
```

## 20. 确认收货

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/orders/{orderId}/confirm`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Id | 是 | 用户ID |

### 响应
```json
{
  "success": boolean,
  "message": string
}
```

## 21. 申请退款

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/orders/{orderId}/refund`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Id | 是 | 用户ID |
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | reason | string | 是 | 退款原因 |

### 响应
```json
{
  "success": boolean,
  "message": string
}
```

## 22. 获取待处理退款申请

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/orders/refunds/pending`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Id | 是 | 卖家用户ID |

### 响应
```json
[
  {
    "orderId": string,
    "totalAmount": number,
    "status": string,
    "date": string,
    "refundStatus": "pending",
    "refundTime": string,
    "refundReason": string
  }
]
```

## 23. 审核退款申请

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/orders/{orderId}/refund/review`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | action | string | 是 | approve（通过）或 reject（拒绝） |

### 响应
```json
{
  "success": boolean,
  "message": string
}
```

### 说明
- 审核通过后，退款会退回买家账户，订单状态变为 cancelled
- 审核拒绝后，退款状态变为 rejected

## 24. 获取对话列表

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/messages/conversations`

### 响应
```json
{
  "conversations": [
    {
      "itemId": string,
      "itemTitle": string,
      "otherUserId": number | string,
      "otherUsername": string,
      "lastMessage": string,
      "lastDate": string,
      "unreadCount": number
    }
  ]
}
```

## 25. 获取对话详情

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/messages/conversation`
- **参数**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | withUserId | number | 是 | 对方用户ID |
  | itemId | string | 否 | 商品ID |

### 响应
```json
{
  "messages": [
    {
      "id": number,
      "fromUserId": number,
      "fromUsername": string,
      "toUserId": number,
      "content": string,
      "date": string,
      "itemId": string,
      "itemTitle": string
    }
  ]
}
```

## 26. 发送消息

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/messages`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | toUserId | number | 是 | 接收消息的用户ID |
  | content | string | 是 | 消息内容 |
  | itemId | string | 否 | 商品ID |
  | itemTitle | string | 否 | 商品标题 |

### 响应
```json
{
  "success": boolean,
  "message": {
    "id": string,
    "fromUserId": number,
    "fromUsername": string,
    "toUserId": number,
    "content": string,
    "date": string,
    "itemId": string,
    "itemTitle": string
  }
}
```

## 27. 充值

### 请求
- **方法**: POST
- **路径**: `/api/login/recharge`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Id | 是 | 用户ID |
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | amount | number | 是 | 充值金额 |

### 响应
```json
{
  "success": boolean,
  "message": string,
  "balance": number
}
```

## 28. 获取商家列表

### 请求
- **方法**: GET
- **路径**: `/api/users/sellers`

### 响应
```json
{
  "status": string,
  "data": [
    {
      "id": number,
      "username": string,
      "phone": string,
      "businessType": string,
      "description": string,
      "status": "pending" | "approved" | "rejected",
      "balance": number
    }
  ]
}
```

## 29. 审核商家

### 请求
- **方法**: POST
- **路径**: `/api/users/sellers/{id}/review`
- **Headers**:
  | 参数 | 必填 | 说明 |
  |------|------|------|
  | X-User-Role | 是 | 必须是 admin |
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | action | string | 是 | approve（通过）或 reject（拒绝） |

### 响应
```json
{
  "success": boolean,
  "message": string
}
```

## 30. 注册商家

### 请求
- **方法**: POST
- **路径**: `/api/users/register/seller`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | username | string | 是 | 用户名 |
  | password | string | 是 | 密码 |
  | phone | string | 是 | 手机号 |
  | idCard | string | 是 | 身份证号 |
  | address | string | 是 | 地址 |
  | businessType | string | 是 | 经营类型 |
  | description | string | 否 | 商家描述 |

### 响应
```json
{
  "status": string,
  "message": string
}
```

## 订单状态说明

| 状态 | 说明 |
|------|------|
| pending | 待支付 |
| paid | 已支付 |
| shipped | 已发货 |
| delivered | 已收货 |
| completed | 已完成 |
| cancelled | 已取消 |

## 退款状态说明

| 状态 | 说明 |
|------|------|
| null | 无退款 |
| pending | 等待审核 |
| approved | 已通过 |
| rejected | 已拒绝 |
| refunded | 已退款 |