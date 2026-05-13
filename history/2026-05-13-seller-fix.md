# 2026-05-13 修复后端返回 seller 数据格式不匹配问题

## 问题描述

二手交易平台打开客服聊天记录进行聊天的时候，出现 `seller` 为 `undefined` 的情况。

## 问题根因

**后端返回的数据格式 vs 前端期望的数据格式 不匹配**

### 后端 `Item.java` 返回的格式：
```java
{
  "id": "xxx",
  "sellerId": 1,        // 独立的 sellerId 字段
  "sellerName": "小张",  // 独立的 sellerName 字段
  ...
}
```

### 前端 `Item` 类型期望的格式：
```typescript
{
  "id": "xxx",
  "seller": { id: 1, name: "小张" },  // seller 是一个对象
  ...
}
```

后端返回的是扁平的 `sellerId` 和 `sellerName`，但前端期望的是嵌套的 `seller` 对象，导致 `seller.seller.id` 访问时得到 `undefined`。

## 修复方案

在 `src/utils/secondhand.ts` 中添加数据适配层：

1. **新增 `RawItem` 类型**：匹配后端返回的原始数据格式
2. **新增 `RawItemsResponse` 接口**：处理后端原始响应
3. **新增 `adaptItem()` 函数**：将后端数据转换为前端期望的格式
4. **新增 `adaptItems()` 函数**：批量转换商品列表
5. **更新 `getItems()` 和 `getItemDetail()` 函数**：在返回前进行数据适配

### 数据适配逻辑：

```typescript
function adaptItem(raw: RawItem): Item {
  return {
    ...raw,
    seller: raw.sellerId !== undefined
      ? { id: raw.sellerId, name: raw.sellerName || '' }
      : undefined,
  }
}
```

## 修改文件

- `src/utils/secondhand.ts`:
  - 新增 `RawItem` 类型定义
  - 新增 `RawItemsResponse` 接口
  - 新增 `adaptItem()` 和 `adaptItems()` 适配函数
  - 更新 `getItems()` 和 `getItemDetail()` 使用适配函数

## 修复效果

- ✅ 后端返回的 `sellerId` + `sellerName` 自动转换为前端的 `seller` 对象
- ✅ `openChat` 函数现在能正确获取卖家信息
- ✅ 客服聊天功能正常工作
