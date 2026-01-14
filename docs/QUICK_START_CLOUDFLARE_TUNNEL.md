# Cloudflare Tunnel 快速开始指南

## 📋 你需要做什么

按照界面上的 **5 步向导**操作，只需 5 分钟即可完成设置！

---

## 🚀 第一步：介绍（了解功能）

打开 AgentStudio → 系统管理 → 外网访问

你会看到一个欢迎界面，介绍了：
- ✨ 什么是 Cloudflare Tunnel
- 💡 有什么好处
- 📝 需要准备什么

点击 **"开始设置"** 进入下一步

---

## 🔑 第二步：配置凭证

### 2.1 获取 Cloudflare 凭证

1. 点击界面上的 **"打开 Cloudflare Dashboard"** 链接
2. 如果没有账号，先注册一个（完全免费）
3. 登录后，你会自动进入 API Token 创建页面

### 2.2 创建 API Token

在 Cloudflare Dashboard 中：

1. 点击 **"Create Token"**
2. 选择 **"Create Custom Token"**
3. 配置权限：
   ```
   Zone → DNS → Edit
   Account → Cloudflare Tunnel → Edit
   ```
4. Zone Resources 选择 **"All zones"**
5. 点击 **"Continue to summary"**
6. 点击 **"Create Token"**
7. **复制生成的 Token**（只显示一次！）

### 2.3 获取 Account ID

1. 在 Cloudflare Dashboard 左侧点击任意网站
2. 右侧栏可以看到 **"Account ID"**
3. 复制这个 ID

### 2.4 填写凭证

回到 AgentStudio 界面：

1. 将 API Token 粘贴到 **"API Token"** 输入框
2. 将 Account ID 粘贴到 **"Account ID"** 输入框
3. 点击 **"保存并继续"**

✅ 完成！自动进入下一步

---

## 🔗 第三步：创建 Tunnel

这一步超级简单：

1. **子域名前缀**（可选）：
   - 可以填：`my-agentstudio` → 生成 `my-agentstudio-xxx.trycloudflare.com`
   - 不填：系统自动生成随机名称

2. **本地端口**：默认 `4936`（不用改）

3. 点击 **"一键创建 Tunnel"** 按钮

等待几秒钟... ✅ Tunnel 创建成功！

---

## 🎯 第四步：启动服务

### 最重要的一步！

Tunnel 已经创建了，但还需要启动一个客户端程序来建立连接。

界面会显示：
- ✅ 你的公网访问地址（比如：`https://agentstudio-abc123.trycloudflare.com`）
- 📋 两种启动方式的命令

### 推荐方式：使用 Docker

1. 点击 **"复制"** 按钮，复制 Docker 命令
2. 打开终端，粘贴并运行：

```bash
docker run cloudflare/cloudflared:latest tunnel run --token eyJ...很长的token...
```

3. 看到 `Connection registered` 就成功了！

### 备选方式：使用 cloudflared CLI

1. 安装 cloudflared：
   ```bash
   # macOS
   brew install cloudflare/cloudflare/cloudflared

   # Linux
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   chmod +x cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   ```

2. 运行命令（从界面复制）：
   ```bash
   cloudflared tunnel run --token eyJ...
   ```

### 验证是否成功

在浏览器中打开你的公网地址（界面上显示的 URL），应该能看到 AgentStudio 登录页面！

点击 **"完成设置"** 进入下一步

---

## ✅ 第五步：完成

恭喜！🎉 你的 AgentStudio 现在可以从任何地方访问了！

界面会显示：
- 🌍 公网访问地址
- 📝 Tunnel 名称
- 🔌 本地端口
- 📅 创建时间

### 💡 重要提示

- 保持终端中的 `cloudflared` 进程运行
- 关闭终端后公网地址将无法访问
- 需要时可以重新运行启动命令

### 🗑️ 不用了怎么办

点击 **"删除 Tunnel"** 按钮即可删除

---

## 📱 实际使用场景

### 场景 1：在公司访问家里的 AgentStudio

1. 在家里的电脑上运行 AgentStudio
2. 按照上面步骤创建 Tunnel
3. 启动 cloudflared 客户端
4. 在公司电脑浏览器输入公网地址
5. 登录后就能使用了！

### 场景 2：在手机上使用

1. 获取公网地址（比如 `https://my-agent.trycloudflare.com`）
2. 在手机浏览器打开这个地址
3. 享受移动端的 AI 助手！

### 场景 3：分享给朋友

1. 将公网地址发送给朋友
2. 朋友在浏览器打开即可使用
3. 注意：建议在 "外观设置" 中启用访问密码！

---

## ⚠️ 常见问题

### Q1: 创建 Tunnel 时报错 "Python not found"

**解决**：安装 Python 3
```bash
# macOS
brew install python3

# Ubuntu/Debian
sudo apt-get install python3
```

### Q2: cloudflared 运行后公网地址无法访问

**检查清单**：
1. ✅ AgentStudio 后端是否在运行？（应该在 4936 端口）
2. ✅ cloudflared 是否显示 "Connection registered"？
3. ✅ 网络连接是否正常？

### Q3: 想更换子域名

**解决**：
1. 删除当前 Tunnel
2. 重新创建时填写新的子域名前缀

### Q4: cloudflared 进程意外关闭

**解决**：重新运行启动命令即可，无需重新创建 Tunnel

### Q5: API Token 无效

**解决**：
1. 检查 Token 权限是否正确配置
2. 确认 Token 没有过期
3. 重新创建一个新的 Token

---

## 🎓 进阶技巧

### 后台运行 cloudflared

**macOS/Linux:**
```bash
nohup cloudflared tunnel run --token YOUR_TOKEN > tunnel.log 2>&1 &
```

**Docker:**
```bash
docker run -d --restart=always \
  --name cloudflared-tunnel \
  cloudflare/cloudflared:latest \
  tunnel run --token YOUR_TOKEN
```

### 查看运行状态

```bash
# Docker
docker logs -f cloudflared-tunnel

# 查看本地日志
tail -f tunnel.log
```

### 自动启动（系统重启后）

使用 Docker 的 `--restart=always` 参数，或者创建 systemd 服务：

```bash
# /etc/systemd/system/cloudflared.service
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=your-username
ExecStart=/usr/local/bin/cloudflared tunnel run --token YOUR_TOKEN
Restart=always

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## 🔒 安全建议

1. **启用访问密码**
   - 进入 "系统管理" → "外观设置"
   - 设置一个强密码

2. **不要分享 Tunnel Token**
   - Token 等同于你的服务访问权限
   - 泄露后立即删除 Tunnel 并重新创建

3. **定期检查活跃 Tunnel**
   - 不用的 Tunnel 及时删除
   - 避免未授权访问

4. **使用自定义域名（可选）**
   - 如果有自己的域名，可以配置 DNS 指向 Tunnel
   - 更专业，更容易记忆

---

## 📚 更多资源

- [Cloudflare Tunnel 官方文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [完整架构说明](./CLOUDFLARE_TUNNEL_ARCHITECTURE.md)
- [详细使用文档](./CLOUDFLARE_TUNNEL.md)

---

## 💬 需要帮助？

如果遇到问题：
1. 查看上面的 "常见问题" 部分
2. 检查 cloudflared 日志输出
3. 提交 Issue 到项目仓库

---

**享受你的公网 AI 助手吧！** 🎉
