# 2026-05-17 二手交易页面图片上传与下架功能

## 更改内容

### 1. 图片上传功能

#### 后端修改
**Item.java**
- 添加 `status` 字段，用于标识商品状态（available/offline）

**ItemMapper.java**
- search 查询添加 status = 'available' 条件，只显示在售商品
- getBySellerId 新增方法，获取当前用户的发布列表
- updateStatus 新增方法，更新商品状态
- offline 新增方法，支持下架操作（需要验证权限）

**SecondhandController.java**
- 添加 NGINX_IMAGE_PATH 常量：`D:/nginx-1.24.0/html/images/`
- 修改 createItem 方法：
  - 图片上传到 nginx 服务器
  - 图片 URL 格式为 `http://localhost:80/images/{filename}`
- 修改 updateItem 方法：同样使用 nginx 路径
- 新增 getMyItems 接口：GET /items/my
- 新增 offlineItem 接口：PUT /items/{id}/offline（仅发布者或管理员可操作）

#### 前端修改
**secondhand.ts**
- Item 类型添加 status 字段
- 新增 getMyItems() 函数：获取我的发布列表
- 新增 offlineItem() 函数：下架商品

**SecondhandView.vue**
- 添加图片上传功能：
  - 新增 addImages ref 存储选择的图片
  - 新增 handleImageSelect 函数处理图片选择
  - 发布表单添加文件输入框
  - 支持多张图片选择
- 新增"我的发布"功能：
  - 新增 showMyListings, myListings, myListingsLoading 状态
  - 新增 fetchMyListings, openMyListings, handleOfflineItem 函数
  - 顶部导航栏添加"我的发布"按钮（仅卖家可见）
  - 新增"我的发布"模态框：
    - 显示所有发布商品及状态
    - 已下架商品显示"已下架"标签
    - 在售商品可点击"下架"按钮

### 2. 下架功能

#### 权限控制
- 仅商品发布者（sellerId 匹配）或管理员（role = 'admin'）可以下架商品
- 下架后商品状态变为 'offline'
- 下架的商品不会在商品列表中显示（search 查询默认过滤）

#### 前端交互
- 在"我的发布"页面中：
  - 显示每个商品的状态标签
  - 在售商品显示红色"下架"按钮
  - 点击下架按钮前弹出确认对话框
  - 下架成功后刷新列表

### 3. API接口文档更新

**src/utils/secondhand-api.md**
新增接口：
- GET /items/my - 获取我的发布列表
- PUT /items/{id}/offline - 商品下架

更新接口：
- POST /items - 添加 images 参数，支持图片上传
- GET /items - 响应添加 status 字段

## 技术细节

### 图片上传流程
1. 用户在发布表单选择图片文件
2. 前端将 File 对象数组添加到 FormData
3. 后端接收 multipart/form-data 请求
4. 图片保存到 nginx 服务器目录：`D:/nginx-1.24.0/html/images/`
5. 生成 URL：`http://localhost:80/images/{uuid}_{filename}`
6. 返回给前端用于展示

### 下架权限验证
```java
// SecondhandController.java
if (!role.equals("admin") && !item.getSellerId().equals(userId)) {
    res.put("success", false);
    res.put("message", "无权限下架此商品");
    return res;
}
```

### 数据库变更
需要在 items 表添加 status 字段：
```sql
ALTER TABLE items ADD COLUMN status VARCHAR(50) DEFAULT 'available';
```

## 功能入口

### 发布商品
1. 点击顶部"发布商品"按钮
2. 填写标题、描述、价格、分类
3. 可选：添加商品图片（支持多张）
4. 点击"发布"提交

### 我的发布
1. 卖家用户点击顶部"我的发布"按钮
2. 查看所有发布商品及其状态
3. 可对在售商品执行下架操作

### 下架商品
1. 在"我的发布"页面点击"下架"按钮
2. 确认下架操作
3. 商品状态更新为"已下架"
4. 商品从商品列表中移除