# AI PPT Editor - 快速开始

## 🚀 启动步骤

### 1. 配置AI API密钥

```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 编辑 backend/.env 文件，添加你的API密钥
# OPENAI_API_KEY=your_key_here
# 或者
# ANTHROPIC_API_KEY=your_key_here
```

### 2. 安装依赖

```bash
# 安装所有依赖（前端+后端）
npm run setup
```

### 3. 启动开发服务器

```bash
# 同时启动前端(3000)和后端(3001)
npm run dev
```

### 4. 访问应用

打开浏览器访问：http://localhost:3000

## 🎯 功能测试

1. **查看幻灯片预览** - 右侧应显示现有幻灯片网格
2. **AI聊天** - 左侧聊天框输入："你好，帮我创建一张新幻灯片"
3. **编辑幻灯片** - 点击幻灯片的"编辑"按钮
4. **缩放预览** - 使用右上角的缩放控制

## ⚠️ 故障排除

如果遇到问题：

1. **后端启动失败** - 检查 `.env` 文件是否正确配置
2. **AI不响应** - 确认API密钥有效且有足够额度
3. **幻灯片不显示** - 检查 `../slides/` 目录是否存在
4. **依赖错误** - 删除 `node_modules` 重新 `npm install`

## 🔧 开发模式

```bash
# 分别启动（用于调试）
npm run dev:frontend  # 仅前端
npm run dev:backend   # 仅后端
```

## 📝 注意事项

- 确保端口3000和3001没有被占用
- AI API需要网络连接
- 幻灯片文件会自动保存到 `../slides/` 目录