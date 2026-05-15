# 个人思考记录模块 API 接口文档

## 概述
个人思考记录模块提供文档分组管理和Markdown文档的CRUD操作，支持用户创建分组、在分组下创建文档、编辑和删除文档等功能。

## 基础信息
- **Base URL**: `http://localhost:8080/thoughts`
- **认证方式**: 通过请求头携带用户信息
  - `X-User-Id`: 用户ID
  - `X-User-Username`: 用户名
  - `X-User-Role`: 用户角色
  - `X-User-Password`: 用户密码

---

## 接口列表

### 1. 获取所有分组
**请求**
```
GET /thoughts/groups
```

**响应**
```json
{
  "groups": [
    {
      "id": 1,
      "name": "灵感收集",
      "userId": 1,
      "createdAt": "2026-05-15T10:00:00",
      "updatedAt": "2026-05-15T10:00:00"
    }
  ]
}
```

---

### 2. 创建分组
**请求**
```
POST /thoughts/groups
Content-Type: application/json

{
  "name": "新分组名称"
}
```

**响应**
```json
{
  "id": 2,
  "name": "新分组名称",
  "userId": 1,
  "createdAt": "2026-05-15T10:00:00",
  "updatedAt": "2026-05-15T10:00:00"
}
```

---

### 3. 更新分组
**请求**
```
PUT /thoughts/groups/{id}
Content-Type: application/json

{
  "name": "更新后的分组名称"
}
```

**响应**
```json
{
  "id": 1,
  "name": "更新后的分组名称",
  "userId": 1,
  "createdAt": "2026-05-15T10:00:00",
  "updatedAt": "2026-05-15T11:00:00"
}
```

---

### 4. 删除分组
**请求**
```
DELETE /thoughts/groups/{id}
```

**响应**
```
204 No Content
```

---

### 5. 获取所有文档
**请求**
```
GET /thoughts/notes
```

**响应**
```json
{
  "notes": [
    {
      "id": 1,
      "groupId": 1,
      "title": "欢迎使用个人思考记录",
      "content": "# 开始记录\n\n- 先创建分组\n- 再新增文档\n- 在右侧使用 Markdown 进行书写",
      "userId": 1,
      "createdAt": "2026-05-15T10:00:00",
      "updatedAt": "2026-05-15T10:00:00"
    }
  ]
}
```

---

### 6. 获取指定分组的文档
**请求**
```
GET /thoughts/notes?groupId={groupId}
```

**参数**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| groupId | integer | 否 | 分组ID，不传则返回所有文档 |

**响应**
```json
{
  "notes": [
    {
      "id": 1,
      "groupId": 1,
      "title": "文档标题",
      "content": "文档内容（Markdown格式）",
      "userId": 1,
      "createdAt": "2026-05-15T10:00:00",
      "updatedAt": "2026-05-15T10:00:00"
    }
  ]
}
```

---

### 7. 获取单个文档
**请求**
```
GET /thoughts/notes/{id}
```

**响应**
```json
{
  "id": 1,
  "groupId": 1,
  "title": "文档标题",
  "content": "文档内容（Markdown格式）",
  "userId": 1,
  "createdAt": "2026-05-15T10:00:00",
  "updatedAt": "2026-05-15T10:00:00"
}
```

---

### 8. 创建文档
**请求**
```
POST /thoughts/notes
Content-Type: application/json

{
  "groupId": 1,
  "title": "新文档标题",
  "content": "# 新文档\n\n开始记录你的想法。"
}
```

**响应**
```json
{
  "id": 2,
  "groupId": 1,
  "title": "新文档标题",
  "content": "# 新文档\n\n开始记录你的想法。",
  "userId": 1,
  "createdAt": "2026-05-15T10:00:00",
  "updatedAt": "2026-05-15T10:00:00"
}
```

---

### 9. 更新文档
**请求**
```
PUT /thoughts/notes/{id}
Content-Type: application/json

{
  "title": "更新后的标题",
  "content": "更新后的内容",
  "groupId": 1
}
```

**响应**
```json
{
  "id": 1,
  "groupId": 1,
  "title": "更新后的标题",
  "content": "更新后的内容",
  "userId": 1,
  "createdAt": "2026-05-15T10:00:00",
  "updatedAt": "2026-05-15T12:00:00"
}
```

---

### 10. 删除文档
**请求**
```
DELETE /thoughts/notes/{id}
```

**响应**
```
204 No Content
```

---

## 数据模型

### ThoughtGroup（分组）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer | 分组唯一标识 |
| name | string | 分组名称 |
| userId | integer | 创建者用户ID |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

### ThoughtNote（文档）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | integer | 文档唯一标识 |
| groupId | integer | 所属分组ID |
| title | string | 文档标题 |
| content | string | 文档内容（Markdown格式） |
| userId | integer | 创建者用户ID |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

---

## 错误码
| HTTP状态码 | 说明 |
|------------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 204 | 删除成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（用户信息缺失） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
