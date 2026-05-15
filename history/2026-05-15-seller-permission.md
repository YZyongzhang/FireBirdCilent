# 2026-05-15 完成卖家账号权限控制

## 更改内容

### 1. 卖家账号权限限制
- **禁止购买操作**：卖家账号无法加入购物车
- **隐藏购物车按钮**：卖家界面不显示购物车入口
- **隐藏订单按钮**：卖家界面不显示订单入口

### 2. 卖家专用消息功能
- **买家消息列表**：卖家可以查看所有买家发来的消息
- **对话列表**：显示每个买家的最后一条消息和未读数量
- **点击进入聊天**：可以与特定买家进行对话

### 3. 前端修改
`src/views/SecondhandView.vue`:
- 修改 `handleAddToCart` 函数，卖家账号提示不能购买
- 隐藏卖家的购物车和订单按钮
- 添加卖家专用的"买家消息"按钮
- 添加卖家消息面板（conversation-list）
- 添加 `showSellerMessages`, `sellerConversations`, `sellerMessagesLoading` 状态
- 添加 `fetchSellerMessages`, `openSellerMessages`, `openChatWithBuyer` 函数

### 4. 后端修改
`FireBird/src/main/java/org/yongzhang/firebird/Controller/SecondhandController.java`:
- 修改 `getMessages` 接口，支持 `withUserId=0` 获取所有对话列表

`FireBird/src/main/java/org/yongzhang/firebird/Mapper/MessageMapper.java`:
- 添加 `getConversations` 方法，查询用户的所有对话

## 用户角色权限说明

| 角色 | 购买商品 | 发布商品 | 查看订单 | 接收消息 |
|------|---------|---------|---------|---------|
| `user` | ✅ | ❌ | ✅ | ✅ |
| `seller` | ❌ | ✅ | ❌ | ✅ (买家消息) |
| `admin` | ✅ | ✅ | ✅ | ✅ |

## 卖家功能说明

卖家账号的主要功能：
1. **发布商品**：可以发布二手商品供他人购买
2. **查看商品列表**：可以看到所有商品（包括自己发布的）
3. **买家消息**：查看所有买家发来的消息，进行回复
4. **无法购买**：卖家账号不能购买商品，专注于销售

## 接口更新

`GET /api/secondhand/messages?withUserId=0` - 获取当前用户的所有对话列表（卖家专用）

返回格式：
```json
{
  "conversations": [
    {
      "userId": 2,
      "userName": "买家A",
      "lastMessage": "这个商品还在吗？",
      "unreadCount": 2
    }
  ]
}
```
