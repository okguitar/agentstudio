# AgentStudio Docker 快速入门

## 一、构建镜像

```bash
docker build -t agentstudio:latest .
```

构建时间：约 3-5 分钟（取决于网络速度）
镜像大小：约 894MB

## 二、运行应用

### 方式 1：使用 docker-compose（推荐）

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 方式 2：使用 docker 命令

```bash
# 启动容器
docker run -d \
  --name agentstudio \
  -p 4936:4936 \
  -e ANTHROPIC_API_KEY=your_api_key_here \
  -v agentstudio_data:/app/data \
  agentstudio:latest

# 查看日志
docker logs -f agentstudio

# 停止容器
docker stop agentstudio

# 启动已停止的容器
docker start agentstudio
```

## 三、访问应用

打开浏览器访问：**http://localhost**

- **前端界面**：http://localhost (nginx 服务，端口 80)
- **API 接口**：http://localhost/api (nginx 代理到后端)
- **后端直接访问**：http://localhost:4936 (可选)
- **健康检查**：http://localhost:4936/api/health

## 四、数据持久化说明

### 📊 数据保存位置

所有应用数据（agent 配置、会话历史、项目文件等）都保存在 `/app/data` 目录，通过 Docker Volume 挂载到宿主机。

### ✅ 数据会保留的情况

| 操作 | 数据是否保留 | 说明 |
|------|-------------|------|
| `docker stop` | ✅ 保留 | 停止容器，数据完整保留 |
| `docker start` | ✅ 保留 | 重启容器，数据完整恢复 |
| `docker restart` | ✅ 保留 | 重启容器，数据完整保留 |
| `docker-compose down` | ✅ 保留 | 停止并删除容器，但 volume 数据保留 |
| `docker-compose up` | ✅ 保留 | 重新创建容器，数据自动恢复 |
| 镜像升级 | ✅ 保留 | 重新构建镜像，volume 数据不受影响 |

### ❌ 数据会丢失的情况

| 操作 | 数据是否丢失 | 如何避免 |
|------|-------------|---------|
| `docker rm agentstudio` | ⚠️ 容器数据丢失 | 使用 volume 挂载 |
| `docker volume rm agentstudio_data` | ❌ 永久删除 | 删除前备份数据 |
| `docker-compose down -v` | ❌ 永久删除 | 不要使用 `-v` 参数 |
| `docker system prune -a --volumes` | ❌ 永久删除所有 | 谨慎使用全局清理命令 |

## 五、数据备份与恢复

### 备份数据

```bash
# 创建备份
docker run --rm \
  -v agentstudio_data:/data \
  -v $(pwd):/backup \
  ubuntu tar czf /backup/agentstudio-backup-$(date +%Y%m%d).tar.gz -C /data .
```

### 恢复数据

```bash
# 从备份恢复
docker run --rm \
  -v agentstudio_data:/data \
  -v $(pwd):/backup \
  ubuntu tar xzf /backup/agentstudio-backup-20251010.tar.gz -C /data
```

### 查看 Volume 内容

```bash
# 列出 volume
docker volume ls

# 查看 volume 详情
docker volume inspect agentstudio_data

# 进入容器查看数据
docker exec -it agentstudio ls -la /app/data
```

## 六、实际测试示例

### 测试数据持久化

```bash
# 1. 启动容器
docker-compose up -d

# 2. 使用应用（创建一些 agents、sessions）
# 访问 http://localhost:4936

# 3. 停止容器
docker-compose down

# 4. 再次启动
docker-compose up -d

# 5. 访问应用，所有数据都还在！
```

### 升级应用保留数据

```bash
# 1. 停止旧版本
docker-compose down

# 2. 拉取最新代码并重新构建
git pull
docker build -t agentstudio:latest .

# 3. 启动新版本
docker-compose up -d

# 4. 数据自动恢复，无需任何额外操作
```

## 七、环境变量配置

创建 `backend/.env` 文件：

```env
# AI Provider API Keys (至少配置一个)
ANTHROPIC_API_KEY=sk-ant-xxx...
# OPENAI_API_KEY=sk-xxx...

# 服务器配置
PORT=4936
NODE_ENV=production

# 自定义 CORS（可选）
# CORS_ORIGINS=https://yourdomain.com,https://anotherdomain.com
```

## 八、常见问题

### 1. 如何查看容器是否健康？

```bash
docker ps
# 查看 STATUS 列，应该显示 "healthy"
```

### 2. 端口被占用怎么办？

修改 docker-compose.yml 中的端口映射：
```yaml
ports:
  - "8080:80"      # 前端使用 8080 端口
  - "5000:4936"    # 后端使用 5000 端口
```

然后访问 http://localhost:8080

### 3. 如何完全重新开始？

```bash
# ⚠️ 警告：这会删除所有数据
docker-compose down -v
docker rmi agentstudio:latest
docker build -t agentstudio:latest .
docker-compose up -d
```

### 4. 如何查看应用日志？

```bash
# 实时查看日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail=100

# 查看特定时间的日志
docker-compose logs --since 30m
```

## 九、生产环境部署建议

1. **使用版本标签**：
   ```bash
   docker build -t agentstudio:v1.0.0 .
   docker tag agentstudio:v1.0.0 agentstudio:latest
   ```

2. **定期备份数据**：
   ```bash
   # 添加到 crontab
   0 2 * * * /path/to/backup-script.sh
   ```

3. **配置资源限制**：
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

4. **启用日志轮转**：
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

## 十、总结

✅ **数据持久化已配置好**：使用 Docker Volume，数据安全可靠
✅ **前后端一体化**：单个容器，简单易用
✅ **一键启动**：`docker-compose up -d`
✅ **数据可备份**：简单的备份恢复机制

开始使用吧！🚀
