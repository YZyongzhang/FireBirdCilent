# 2026-05-17 - 商家管理功能实现

## 功能概述

实现了管理员对商家的管理功能，包括查看商家列表、商家详情和直接联系商家。同时修改了商家注册流程，要求填写更多信息。

## 修改内容

### 前端

**SecondhandView.vue**
- 将"商家消息"按钮改为"商家"
- 管理员点击"商家"按钮后显示商家列表
- 点击商家进入商家详情页，显示：
  - 基本信息（用户名、经营类型、手机号、地址）
  - 商家简介
  - 发布的商品列表
- 商家详情页提供"联系商家"按钮，可直接发起对话

**LoginView.vue**
- 选择"卖家"角色时显示额外字段：
  - 手机号（必填）
  - 身份证号（必填）
  - 地址（必填）
  - 经营类型（可选）
  - 商家简介（可选）

**secondhand.ts**
- 更新 getSellers 接口路径
- 添加 getSellerById 接口
- 添加 registerSeller 接口

### 后端

**User.java**
- 添加字段：phone、idCard、address、businessType、description

**UserMapper.java**
- 添加 insertSeller 方法

**UserController.java**
- GET /api/users/sellers - 获取商家列表（管理员）
- GET /api/users/sellers/{id} - 获取商家详情（管理员）
- POST /api/users/register/seller - 商家注册

## 权限说明

| 角色 | 查看商家列表 | 查看商家详情 | 联系商家 | 注册商家 |
|------|-------------|-------------|---------|---------|
| 管理员 | ✅ | ✅ | ✅ | ❌ |
| 商家 | ❌ | ❌ | ❌ | ✅ |
| 用户 | ❌ | ❌ | ❌ | ❌ |

## 数据库变更

需要执行以下SQL添加商家信息字段：
```sql
ALTER TABLE user ADD COLUMN phone VARCHAR(20);
ALTER TABLE user ADD COLUMN id_card VARCHAR(18);
ALTER TABLE user ADD COLUMN address VARCHAR(500);
ALTER TABLE user ADD COLUMN business_type VARCHAR(100);
ALTER TABLE user ADD COLUMN description VARCHAR(1000);
```