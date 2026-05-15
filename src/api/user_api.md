# 用户管理 API 接口文档

## 概述

提供用户管理相关接口，支持多角色（卖家、管理员、普通用户）的管理功能。

## 接口列表

### 1. 注册新用户
- **URL**: `POST /register`
- **功能**: 创建新用户账号
- **请求体**:
```json
{
  "username": "string (必填)",
  "password": "string (必填)",
  "email": "string (选填)",
  "role": "string (选填，默认: user)"
}
```
- **角色选项**:
  - `user`: 普通用户
  - `seller`: 卖家
  - `admin`: 管理员
- **成功响应**:
```json
{
  "status": "ok",
  "message": "注册成功",
  "data": null
}
```
- **失败响应**:
```json
{
  "status": "error",
  "message": "用户名已存在"
}
```

### 2. 用户登录
- **URL**: `POST /login`
- **功能**: 用户登录认证
- **请求体**:
```json
{
  "username": "string (必填)",
  "password": "string (必填)"
}
```
- **成功响应**:
```json
{
  "status": "ok",
  "message": "登录成功",
  "data": {
    "id": "number",
    "username": "string",
    "role": "string"
  }
}
```
- **失败响应**:
```json
{
  "status": "error",
  "message": "用户名或密码错误"
}
```

### 3. 获取用户列表（管理员）
- **URL**: `GET /api/users`
- **功能**: 获取所有用户列表（仅限管理员）
- **请求参数**:
  - `page`: number (页码，默认: 1)
  - `size`: number (每页数量，默认: 10)
  - `role`: string (角色筛选，可选)
- **成功响应**:
```json
{
  "status": "ok",
  "data": {
    "users": [
      {
        "id": "number",
        "username": "string",
        "role": "string",
        "email": "string"
      }
    ],
    "total": "number"
  }
}
```

### 4. 获取用户详情
- **URL**: `GET /api/users/{id}`
- **功能**: 获取单个用户详情
- **路径参数**:
  - `id`: 用户ID
- **成功响应**:
```json
{
  "status": "ok",
  "data": {
    "id": "number",
    "username": "string",
    "role": "string",
    "email": "string"
  }
}
```

### 5. 更新用户信息（管理员）
- **URL**: `PUT /api/users/{id}`
- **功能**: 更新用户信息（仅限管理员）
- **路径参数**:
  - `id`: 用户ID
- **请求体**:
```json
{
  "username": "string (选填)",
  "email": "string (选填)",
  "role": "string (选填)"
}
```
- **成功响应**:
```json
{
  "status": "ok",
  "message": "更新成功"
}
```

### 6. 删除用户（管理员）
- **URL**: `DELETE /api/users/{id}`
- **功能**: 删除用户（仅限管理员）
- **路径参数**:
  - `id`: 用户ID
- **成功响应**:
```json
{
  "status": "ok",
  "message": "删除成功"
}
```

### 7. 获取当前登录用户信息
- **URL**: `GET /api/users/me`
- **功能**: 获取当前登录用户的信息
- **成功响应**:
```json
{
  "status": "ok",
  "data": {
    "id": "number",
    "username": "string",
    "role": "string",
    "email": "string"
  }
}
```

## 用户角色说明

| 角色 | 权限说明 |
|------|---------|
| `user` | 普通用户，可浏览商品、购买商品、发表评价 |
| `seller` | 卖家，除普通用户权限外，可发布商品、管理商品 |
| `admin` | 管理员，拥有所有权限，可管理用户、审核商品 |
