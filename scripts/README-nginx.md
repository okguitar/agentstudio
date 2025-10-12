# AgentStudio Nginx Setup Scripts

这个目录包含了用于配置Nginx和SSL证书的脚本，帮助您快速部署AgentStudio后端服务。

## 脚本说明

### 1. `setup-nginx-ssl.sh` (推荐)

完整的Nginx + SSL配置脚本，包含自动HTTPS证书申请和配置。

**功能特性：**
- 自动安装Nginx和Certbot
- 配置域名代理到后端服务
- 自动申请Let's Encrypt免费SSL证书
- 配置HTTP自动重定向到HTTPS
- 设置证书自动续期
- **SSE (Server-Sent Events) 支持** - 优化流式响应和实时通信
- 完整的错误检查和状态验证

**用法：**
```bash
# 基本用法（使用默认邮箱和端口）
./setup-nginx-ssl.sh your-domain.com

# 指定邮箱
./setup-nginx-ssl.sh your-domain.com your-email@example.com

# 指定邮箱和后端端口
./setup-nginx-ssl.sh your-domain.com your-email@example.com 8080
```

**参数说明：**
- `domain`: 域名（必需）
- `email`: SSL证书注册邮箱（可选，默认：admin@agentstudio.cc）
- `backend_port`: 后端服务端口（可选，默认：4936）

**示例：**
```bash
./setup-nginx-ssl.sh jeff-hk.agentstudio.cc bbmyth@gmail.com 4936
```

### 2. `setup_nginx.sh` (基础版本)

仅配置Nginx反向代理的简化脚本，不包含SSL证书配置。

**功能特性：**
- 配置Nginx反向代理
- **SSE (Server-Sent Events) 支持** - 优化流式响应和实时通信
- 基础的反向代理配置
- 完整的错误检查

**适用场景：**
- 测试环境
- 内网部署
- 临时使用
- 后续手动配置SSL

**用法：**
```bash
./setup_nginx.sh
```

**注意：** 此脚本硬编码了域名 `jeff-hk.agentstudio.cc` 和端口 `4936`。

## SSE (Server-Sent Events) 支持

所有Nginx配置脚本都包含SSE优化配置，确保实时流式响应的稳定传输。

### SSE配置特性

**代理配置优化：**
- `proxy_buffering off` - 禁用响应缓冲，确保实时传输
- `proxy_cache off` - 禁用缓存，防止延迟数据传输
- `proxy_read_timeout 86400s` - 24小时读取超时，支持长连接
- `proxy_send_timeout 86400s` - 24小时发送超时，防止连接断开
- `proxy_connect_timeout 86400s` - 24小时连接超时

**HTTP头部优化：**
- `X-Accel-Buffering: no` - 告诉nginx不要缓冲响应
- `Cache-Control: no-cache` - 禁用客户端缓存
- 传递客户端的Accept头部，正确处理SSE请求

**WebSocket兼容：**
- 支持HTTP/1.1协议升级
- 正确处理Upgrade和Connection头部
- 兼容WebSocket和SSE连接

### SSE使用场景

AgentStudio中的SSE应用：
- **AI助手实时响应流** - Claude等AI模型的流式输出
- **实时状态更新** - 滑片编辑、处理进度等状态同步
- **实时通知系统** - 多用户协作、消息推送
- **日志流输出** - 实时查看处理日志和调试信息

### SSE配置验证

测试SSE功能是否正常工作：

```bash
# 测试SSE端点（需要替换为实际的SSE端点）
curl -N -H "Accept: text/event-stream" https://your-domain.com/api/sse-endpoint

# 检查响应头是否包含正确的SSE配置
curl -I https://your-domain.com/api/stream-endpoint

# 验证长连接支持
timeout 30 curl -N https://your-domain.com/api/long-polling-endpoint
```

### SSE故障排除

**常见SSE问题：**

1. **连接频繁断开**
   ```bash
   # 检查nginx超时配置
   grep -r "timeout" /etc/nginx/sites-available/your-domain

   # 查看连接日志
   sudo tail -f /var/log/nginx/access.log | grep "stream"
   ```

2. **响应延迟或缓冲**
   ```bash
   # 确认缓冲设置
   grep -r "proxy_buffering\|proxy_cache" /etc/nginx/sites-available/your-domain

   # 检查响应头
   curl -I https://your-domain.com/api/stream-endpoint
   ```

3. **CORS与SSE冲突**
   ```bash
   # 检查CORS配置（应由后端处理，nginx不重复设置）
   curl -H "Origin: https://your-frontend.com" -I https://your-domain.com/api/stream
   ```

## Let's Encrypt SSL证书自动续期原理

### 续期机制
Let's Encrypt证书有效期为90天，需要定期续期。自动续期通过以下方式实现：

1. **Systemd Timer**: Certbot安装时自动创建systemd定时器
2. **检查频率**: 每天检查两次证书状态
3. **续期触发**: 当证书有效期少于30天时自动续期
4. **验证过程**: 通过ACME协议验证域名所有权
5. **证书更新**: 新证书下载后自动应用到Nginx配置

### 续期配置检查
```bash
# 查看续期定时器状态
sudo systemctl status certbot.timer

# 查看下次续期时间
sudo systemctl list-timers certbot.timer

# 测试续期过程
sudo certbot renew --dry-run
```

### 手动续期
```bash
# 强制续期
sudo certbot renew

# 检查证书状态
sudo certbot certificates
```

## 前置条件

### 服务器要求
- Ubuntu 18.04+ / Debian 9+
- sudo权限
- 80和443端口未被占用
- 域名DNS A记录指向服务器IP

### 后端服务
- AgentStudio后端服务已安装并运行
- 默认监听端口：4936

### 防火墙配置
确保以下端口开放：
```bash
sudo ufw allow 80/tcp   # HTTP (必需)
sudo ufw allow 443/tcp  # HTTPS (SSL证书需要)
```

## 使用流程

### 1. 部署后端服务
确保AgentStudio后端服务在目标端口运行：
```bash
# 检查服务状态
curl -I http://localhost:4936
```

### 2. 配置DNS解析
将域名A记录指向服务器IP地址

### 3. 运行配置脚本
```bash
# 下载脚本
wget https://your-repo/scripts/setup-nginx-ssl.sh
chmod +x setup-nginx-ssl.sh

# 运行脚本
./setup-nginx-ssl.sh your-domain.com your-email@example.com
```

### 4. 验证部署
```bash
# 检查HTTPS访问
curl -I https://your-domain.com

# 检查自动重定向
curl -I http://your-domain.com  # 应返回301重定向
```

## 故障排除

### 常见问题

**1. SSL证书申请失败**
```bash
# 检查域名解析
nslookup your-domain.com

# 检查端口80是否开放
telnet your-server-ip 80

# 查看certbot日志
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

**2. Nginx配置错误**
```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 重新加载配置
sudo systemctl reload nginx
```

**3. 证书续期失败**
```bash
# 手动测试续期
sudo certbot renew --dry-run

# 检查定时器状态
sudo systemctl status certbot.timer

# 重启certbot服务
sudo systemctl restart certbot.timer
```

### 日志文件位置
- **Nginx访问日志**: `/var/log/nginx/access.log`
- **Nginx错误日志**: `/var/log/nginx/error.log`
- **Certbot日志**: `/var/log/letsencrypt/letsencrypt.log`
- **系统日志**: `sudo journalctl -u nginx`

### 有用命令
```bash
# 查看Nginx状态
sudo systemctl status nginx

# 重启Nginx
sudo systemctl restart nginx

# 查看监听端口
sudo netstat -tlnp | grep -E ':(80|443)'

# 检查证书有效期
sudo certbot certificates

# 查看证书详情
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout
```

## 安全建议

1. **定期备份证书**：
   ```bash
   sudo cp -r /etc/letsencrypt /backup/letsencrypt-$(date +%Y%m%d)
   ```

2. **监控证书到期**：
   ```bash
   # 设置提醒脚本
   echo "0 9 * * * /usr/bin/certbot certificates | grep -q 'Expires.*days'" | sudo crontab -
   ```

3. **更新系统包**：
   ```bash
   sudo apt update && sudo apt upgrade
   ```

4. **配置防火墙**：
   ```bash
   sudo ufw enable
   sudo ufw deny 22   # 根据需要配置SSH
   sudo ufw allow 80
   sudo ufw allow 443
   ```

## 证书文件位置
```
/etc/letsencrypt/live/your-domain.com/
├── fullchain.pem    # 完整证书链
├── privkey.pem      # 私钥文件
└── cert.pem         # 域名证书
```

## 支持

如遇问题，请检查：
1. 服务器系统日志
2. Nginx和Certbot日志
3. 域名DNS配置
4. 防火墙和网络设置

更多详细信息请参考Let's Encrypt官方文档：https://letsencrypt.org/docs/