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
      "date": string
    }
  ],
  "total": number,
  "page": number,
  "size": number
}
```

## 2. 获取分类列表

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/categories`

### 响应
```json
{
  "categories": string[]
}
```

## 3. 创建商品

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/items`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | title | string | 是 | 商品标题 |
  | description | string | 否 | 商品描述 |
  | price | number | 是 | 商品价格 |
  | category | string | 是 | 商品分类 |

### 响应
```json
{
  "id": number,
  "title": string,
  "description": string,
  "price": number,
  "category": string,
  "date": string
}
```

## 4. 获取商品评价

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

## 5. 提交评价

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

## 6. 获取购物车

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

## 7. 添加到购物车

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
  "success": boolean
}
```

## 8. 更新购物车商品数量

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

## 9. 删除购物车商品

### 请求
- **方法**: DELETE
- **路径**: `/api/secondhand/cart/{id}`

### 响应
```json
{
  "success": boolean
}
```

## 10. 清空购物车

### 请求
- **方法**: DELETE
- **路径**: `/api/secondhand/cart`

### 响应
```json
{
  "success": boolean
}
```

## 11. 创建订单

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/orders`

### 响应
```json
{
  "orderId": string | number,
  "totalAmount": number,
  "status": string,
  "date": string
}
```

## 12. 获取订单列表

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/orders`

### 响应
```json
{
  "orders": [
    {
      "orderId": string | number,
      "items": [
        {
          "id": number,
          "title": string,
          "quantity": number,
          "price": number
        }
      ],
      "totalAmount": number,
      "status": string,
      "date": string
    }
  ]
}
```

## 13. 支付订单

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/orders/{orderId}/pay`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | method | string | 是 | 支付方式: alipay, wechat, paypal |

### 响应
```json
{
  "success": boolean
}
```

## 14. 获取对话列表

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/conversations`

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

## 15. 获取对话详情

### 请求
- **方法**: GET
- **路径**: `/api/secondhand/conversations/{userId}/{itemId}`

### 响应
```json
{
  "messages": [
    {
      "id": number,
      "fromUserId": number | string,
      "fromUsername": string,
      "content": string,
      "date": string
    }
  ]
}
```

## 16. 发送消息

### 请求
- **方法**: POST
- **路径**: `/api/secondhand/conversations/{userId}/{itemId}`
- **Body**:
  | 参数 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | content | string | 是 | 消息内容 |

### 响应
```json
{
  "success": boolean
}
```
