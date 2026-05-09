# 身份认证接口文档

以下为本次实现/预期的认证相关接口说明（示例）。后端应按需实现对应路由。

## POST /login
- 描述：账号密码登录
- 请求体 JSON:
  - `username` (string)
  - `password` (string)
- 返回示例：
  - 成功: `"成功"` 或 `{ "status":"ok" }`
  - 失败: `{ "status":"error", "message":"原因" }`

## POST /register
- 描述：注册新账号
- 请求体 JSON:
  - `username` (string)
  - `password` (string)
  - `email` (string, optional)
- 返回示例：
  - 成功: `"注册成功"`
  - 失败: `{ "status":"error", "message":"原因" }`

## POST /send-sms
- 描述：发送短信验证码（用于短信登录）
- 请求体 JSON:
  - `phone` (string)
- 返回示例：
  - 成功: `{ "status":"ok" }`
  - 失败: `{ "status":"error", "message":"原因" }`

## POST /login/sms
- 描述：短信验证码登录
- 请求体 JSON:
  - `phone` (string)
  - `code` (string)
- 返回示例：
  - 成功: `"成功"`
  - 失败: `{ "status":"error", "message":"原因" }`

## GET /login/qr
- 描述：获取二维码资源或二维码会话（前端使用获取到的二维码图片 URL 渲染扫码）
- 返回示例：
  - `{ "qr": "https://.../qrcode.png", "sessionId": "..." }`

## 说明
- 前端已实现占位式二维码登录流程：前端获取 `/login/qr` 后展示图片，后端需提供扫码与确认的状态查询或推送机制。
- 真实生产环境请确保所有接口使用 HTTPS，并在响应中使用明确的 `status`/`message` 结构以便前端处理。
