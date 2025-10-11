# Agent Studio 脚本管理工具

这个目录包含了 Agent Studio 的管理脚本，用于安装、更新、卸载和恢复。

## 脚本概览

| 脚本 | 功能 | 用法 |
|------|------|------|
| `update.sh` | 更新 Agent Studio 到最新版本 | `./update.sh [--force] [--backup-only]` |
| `remove.sh` | 安全卸载 Agent Studio | `./remove.sh [--keep-data] [--force]` |
| `restore.sh` | 从备份恢复数据 | `./restore.sh <backup_directory>` |

## 安装检测

现在安装脚本会自动检测是否已经安装了 Agent Studio：

- **如果已安装**：显示当前版本和可用的操作选项
- **如果未安装**：正常执行安装流程

## 更新脚本 (update.sh)

### 基本用法

```bash
# 标准更新
./update.sh

# 强制更新（即使没有新版本）
./update.sh --force

# 仅创建备份，不更新
./update.sh --backup-only
```

### 更新过程

1. **检查安装**：验证 Agent Studio 是否已正确安装
2. **创建备份**：自动备份配置、slides 和重要文件
3. **检查更新**：与远程仓库比较，确认是否有新版本
4. **停止服务**：安全停止正在运行的 Agent Studio 服务
5. **更新代码**：拉取最新代码并处理本地更改
6. **更新依赖**：重新安装并构建依赖
7. **启动服务**：重启 Agent Studio 服务
8. **验证更新**：确认服务正常运行

### 备份内容

- 配置文件 (`~/.agent-studio-config/`)
- Slides 目录 (`~/slides/`)
- 包配置文件 (`package.json`, `pnpm-lock.yaml` 等)
- 环境文件 (`.env`)

## 卸载脚本 (remove.sh)

### 基本用法

```bash
# 完全卸载（会询问确认）
./remove.sh

# 保留用户数据（slides、配置）
./remove.sh --keep-data

# 强制卸载（无确认提示）
./remove.sh --force
```

### 卸载内容

- **默认会移除**：
  - 安装目录 (`~/.agent-studio/`)
  - 配置目录 (`~/.agent-studio-config/`)
  - 日志目录 (`~/.agent-studio-logs/`)
  - Slides 目录 (`~/slides/`)
  - 系统服务文件
  - 服务管理脚本

- **--keep-data 选项会保留**：
  - Slides 目录
  - 配置目录

### 安全特性

- 创建最终备份（除非使用 --keep-data）
- 停止相关服务
- 确认提示（除非使用 --force）
- 详细的卸载计划显示

## 恢复脚本 (restore.sh)

### 基本用法

```bash
# 从备份恢复
./restore.sh ~/.agent-studio-backup-20231010_143022

# 查看可用备份
ls -la ~/.agent-studio-backup-*
```

### 恢复过程

1. **验证备份**：检查备份目录是否存在且可读
2. **显示信息**：显示备份内容和详细信息
3. **检查安装**：检查当前安装状态
4. **备份数据**：备份现有的数据（避免覆盖）
5. **恢复配置**：恢复配置文件
6. **恢复 Slides**：恢复所有 slides 文件
7. **恢复包文件**：恢复包配置（如果适用）
8. **重启服务**：尝试重启服务
9. **验证恢复**：确认恢复成功

## 安装脚本改进

现在安装脚本包含以下改进：

### 智能检测

- 检测现有安装
- 显示当前版本信息
- 提供操作建议（更新、卸载、强制重装）

### 用户友好

- 清晰的错误消息
- 详细的操作指导
- 非交互模式支持

### 组件检测

- 检测遗留组件
- 提供清理建议
- 警告部分安装

## 使用示例

### 首次安装

```bash
curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | bash
```

### 更新已安装版本

```bash
cd ~/.agent-studio
./scripts/update.sh
```

### 完全卸载

```bash
cd ~/.agent-studio
./scripts/remove.sh
```

### 保留数据卸载

```bash
cd ~/.agent-studio
./scripts/remove.sh --keep-data
```

### 从备份恢复

```bash
cd ~/.agent-studio
./scripts/restore.sh ~/.agent-studio-backup-20231010_143022
```

## 故障排除

### 更新失败

1. 检查网络连接
2. 验证 Git 仓库访问权限
3. 手动创建备份：`./update.sh --backup-only`
4. 强制更新：`./update.sh --force`

### 卸载失败

1. 停止服务：`sudo systemctl stop agent-studio`
2. 检查权限：确保有足够的权限
3. 强制卸载：`./remove.sh --force`

### 恢复失败

1. 验证备份完整性
2. 检查目标目录权限
3. 手动恢复文件
4. 重新安装后恢复

## 备份管理

### 备份位置

- 自动备份：`~/.agent-studio-backup-YYYYMMDD_HHMMSS/`
- 卸载备份：同上位置
- 更新备份：保留最近 5 个备份

### 清理旧备份

更新脚本会自动清理超过 5 个的旧备份。手动清理：

```bash
# 删除所有备份
rm -rf ~/.agent-studio-backup-*

# 删除特定备份
rm -rf ~/.agent-studio-backup-20231010_143022
```

## 安全注意事项

1. **备份数据**：在执行任何操作前，重要数据会自动备份
2. **权限检查**：脚本会检查必要的权限
3. **服务管理**：安全地停止和启动服务
4. **错误处理**：详细的错误信息和恢复建议

## 技术细节

### 脚本依赖

- Bash 4.0+
- Git（用于代码更新）
- Systemd（用于服务管理，Linux）
- curl（用于网络请求）

### 环境变量

- `INSTALL_DIR`: 安装目录 (默认: `~/.agent-studio`)
- `CONFIG_DIR`: 配置目录 (默认: `~/.agent-studio-config`)
- `LOG_DIR`: 日志目录 (默认: `~/.agent-studio-logs`)
- `SLIDES_DIR`: Slides 目录 (默认: `~/slides`)

### 退出代码

- `0`: 成功
- `1`: 一般错误
- `2`: 权限错误
- `3`: 依赖缺失

## 贡献

如需改进这些脚本，请：

1. 保持向后兼容性
2. 添加适当的错误处理
3. 更新文档
4. 测试各种场景

## 支持

如遇到问题：

1. 查看日志文件
2. 检查备份目录
3. 查看 GitHub Issues
4. 手动执行相应步骤