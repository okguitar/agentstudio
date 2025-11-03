# Slack "gitman" 机器人配置指南

## 📋 需要配置的OAuth权限

在 `OAuth & Permissions` 页面，添加以下 **Bot Token Scopes**：

### 必需权限
- `app_mentions:read` - 读取提及机器人的消息
- `channels:history` - 查看公共频道消息历史
- `channels:read` - 查看基本频道信息
- `chat:write` - 以机器人身份发送消息
- `chat:write.public` - 在公共频道发送消息
- `im:history` - 查看直接消息历史
- `im:read` - 查看基本直接消息信息
- `im:write` - 发送直接消息
- `groups:history` - 查看私人频道消息历史
- `groups:read` - 查看私人频道信息

### 可选权限（根据需要）
- `files:write` - 上传文件
- `reactions:write` - 添加和编辑反应
- `users:read` - 读取用户信息

## 🔧 Event Subscriptions配置

### 启用事件订阅
1. 转到 `Event Subscriptions` 页面
2. 切换 **Enable Events** 为 ON
3. 设置 **Request URL** 为：
   ```
   https://your-domain.com/api/slack/events
   ```
   或开发时使用：
   ```
   https://your-ngrok-id.ngrok.io/api/slack/events
   ```

### 订阅的事件
在 **Subscribe to bot events** 中添加：
- `app_mention` - 机器人在频道被提及
- `message.channels` - 频道中的消息（如果机器人已加入）
- `message.im` - 直接消息
- `message.groups` - 私人频道消息（如果机器人已加入）

## 📱 App Home配置
1. 转到 `App Home` 页面
2. 确保 **Show the Tabs as wide as possible** 已启用
3. 机器人头像和显示名称已正确设置

## 🔒 Basic Information

### App Credentials
- **Client ID**: 记录下来
- **Client Secret**: 记录下来
- **Signing Secret**: 记录下来（在后面步骤需要）

### Install App
- 点击 **Install to Workspace**
- 授权后获取 **Bot User OAuth Token**（格式：xoxb-xxx）

## 📝 配置完成检查清单

- [ ] OAuth权限已配置（至少7个必需权限）
- [ ] Event Subscriptions已启用
- [ ] Request URL已设置
- [ ] 已订阅至少3个bot事件
- [ ] 应用已安装到工作区
- [ ] 已获取Bot User OAuth Token
- [ ] Signing Secret已记录

## 🔗 部署后验证

配置完成后，在Slack中：
1. 搜索 "gitman" 机器人
2. 点击 "发送消息" 开始对话
3. 测试提及：@gitman 你是谁？

## 🚨 常见问题

### 机器人不响应
- 检查Event Subscriptions URL是否可访问
- 验证Bot Token权限是否完整
- 确认机器人已加入频道

### URL验证失败
- 确保后端服务正在运行
- 检查URL格式正确
- 验证SSL证书有效（生产环境）

### 权限错误
- 重新安装应用到工作区
- 检查所有必需权限都已授予
- 确认机器人有正确的频道访问权限