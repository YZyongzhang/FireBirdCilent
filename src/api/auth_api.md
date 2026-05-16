# 用户认证接口文档

## 接口列表

### 1. 账号密码登录
**请求**
```
POST /login
```

**请求体**
```json
{
  "username": "string (用户名)",
  "password": "string (密码)"
}
```

**成功响应**
```json
{
  "status": "ok",
  "message": "登录成功",
  "data": {
    "id": 1,
    "username": "user1",
    "role": "user"
  }
}
```

**失败响应**
```json
{
  "status": "error",
  "message": "用户名或密码错误"
}
```

### 2. 用户注册
**请求**
```
POST /register
```

**请求体**
```json
{
  "username": "string (用户名，必填)",
  "password": "string (密码，必填)",
  "email": "string (邮箱，可选)",
  "role": "string (角色：user/seller/admin，默认user)"
}
```

**成功响应**
```json
{
  "status": "ok",
  "message": "注册成功"
}
```

**失败响应**
```json
{
  "status": "error",
  "message": "用户名已存在"
}
```

### 3. 获取当前用户信息
**请求**
```
GET /me
```

**请求头**
```
X-User-Id: 用户ID
```

**成功响应**
```json
{
  "status": "ok",
  "message": "查询成功",
  "data": {
    "user": {
      "id": 1,
      "username": "user1",
      "role": "user"
    }
  }
}
```

**失败响应**
```json
{
  "status": "error",
  "message": "用户未登录"
}
```

### 4. 退出登录
**请求**
```
POST /logout
```

**成功响应**
```json
{
  "status": "ok",
  "message": "退出成功"
}
```

### 5. 发送短信验证码
**请求**
```
POST /send-sms
```

**请求体**
```json
{
  "phone": "string (手机号)"
}
```

**成功响应**
```json
{
  "status": "ok",
  "message": "验证码已发送"
}
```

### 6. 短信登录
**请求**
```
POST /login/sms
```

**请求体**
```json
{
  "phone": "string (手机号)",
  "code": "string (验证码)"
}
```

**成功响应**
```json
{
  "status": "ok",
  "message": "登录成功"
}
```

**失败响应**
```json
{
  "status": "error",
  "message": "验证码已过期或不存在"
}
```

### 7. 获取登录二维码
**请求**
```
GET /login/qr
```

**成功响应**
- 返回PNG图片流
- 响应头包含 `X-Session-Id`

### 8. 查询二维码状态
**请求**
```
GET /login/qr/status?sessionId=xxx
```

**成功响应**
```json
{
  "status": "ok",
  "message": "查询成功",
  "data": {
    "status": "waiting|scanned|confirmed"
  }
}
```

### 9. 模拟二维码操作（演示用）
**请求**
```
POST /login/qr/simulate?sessionId=xxx&action=scan|confirm
```

**成功响应**
```json
{
  "status": "ok",
  "message": "操作成功"
}
```

## 数据模型

### User (用户)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 用户ID |
| username | String | 用户名 |
| password | String | 密码（登录响应中会被置为null） |
| role | String | 角色：user/seller/admin |

### 响应格式
所有接口统一响应格式：
```json
{
  "status": "ok|error",
  "message": "提示信息",
  "data": {}
}
```

## 错误码说明
| 错误信息 | 说明 |
|----------|------|
| 用户名或密码错误 | 登录时用户名或密码不正确 |
| 用户名和密码不能为空 | 注册时缺少必填字段 |
| 用户名已存在 | 注册时用户名重复 |
| 参数缺失 | 短信登录缺少参数 |
| 验证码已过期或不存在 | 验证码无效或已过期 |
| 验证码错误 | 验证码输入错误 |
| 用户未登录 | 缺少X-User-Id请求头 |
| 用户不存在 | 用户ID对应的用户不存在 |
| 会话不存在 | 二维码会话ID无效 |
