# JSONL 文件检测和修复工具集

这套工具用于检测、诊断和修复 JSONL (JSON Lines) 文件中的格式错误。

## 📁 工具清单

### 1️⃣ `jsonl_validator.py` - JSONL 文件验证器
**功能**: 快速检测 JSONL 文件中的所有格式错误

**使用方法**:
```bash
python3 jsonl_validator.py <文件路径>
```

**示例**:
```bash
python3 jsonl_validator.py data.jsonl
```

**输出内容**:
- ✅ 总行数统计
- ✅ 有效行数/错误行数
- ✅ 每个错误的详细信息：
  - 错误行号
  - 错误类型
  - 错误位置
  - 错误上下文
  - 修复建议

**检测的错误类型**:
- JSON 解析错误（语法错误）
- 空行
- 多个 JSON 对象连接在一行
- 格式错误

---

### 2️⃣ `jsonl_fixer.py` - JSONL 自动修复工具
**功能**: 自动修复常见的 JSONL 格式错误

**使用方法**:
```bash
# 修复文件并创建新文件（保留原文件）
python3 jsonl_fixer.py <原文件> <新文件>

# 直接修复原文件（会自动创建备份）
python3 jsonl_fixer.py <文件>
```

**示例**:
```bash
# 创建修复后的新文件
python3 jsonl_fixer.py data.jsonl data_fixed.jsonl

# 直接修复原文件（原文件保存为 .backup）
python3 jsonl_fixer.py data.jsonl
```

**修复功能**:
- ✅ 分离连接在一起的多个 JSON 对象
- ✅ 移除空行
- ✅ 修复常见的 JSON 格式问题
- ✅ 自动创建备份文件
- ✅ 详细的修复报告

**安全特性**:
- 默认创建 `.backup` 备份文件
- 可选择保留原文件
- 详细的修复日志

---

### 3️⃣ `jsonl_detailed_diagnostic.py` - 详细诊断工具
**功能**: 深入分析特定行的错误详情

**使用方法**:
```bash
python3 jsonl_detailed_diagnostic.py <文件路径> <行号>
```

**示例**:
```bash
python3 jsonl_detailed_diagnostic.py data.jsonl 107
```

**输出内容**:
- 📄 该行的完整内容
- 🔬 JSON 解析尝试
- 📍 精确的错误位置（带上下文）
- 💡 智能问题分析
- ✅ 自动分割建议
- 📋 分割后的对象预览

---

## 🚀 快速开始

### 场景 1: 快速检查文件

```bash
# 1. 检查文件是否有错误
python3 jsonl_validator.py mydata.jsonl

# 2. 如果发现错误，查看详细信息
python3 jsonl_detailed_diagnostic.py mydata.jsonl 107

# 3. 自动修复
python3 jsonl_fixer.py mydata.jsonl mydata_fixed.jsonl

# 4. 验证修复后的文件
python3 jsonl_validator.py mydata_fixed.jsonl
```

### 场景 2: 批量处理多个文件

```bash
# 检查多个文件
for file in *.jsonl; do
    echo "检查文件: $file"
    python3 jsonl_validator.py "$file"
done

# 批量修复
for file in *.jsonl; do
    python3 jsonl_fixer.py "$file" "${file%.jsonl}_fixed.jsonl"
done
```

---

## 📊 实际案例演示

### 案例: 修复包含合并 JSON 的文件

**原始错误**:
```
❌ 第 107 行: JSON 解析错误
   错误: 行包含多个 JSON 对象（JSONL 每行只能有一个 JSON）
```

**第 107 行内容**:
```json
{"type":"message","uuid":"abc123","timestamp":"2026-01-05T02:57:29.275Z"}{"type":"queue-operation","operation":"enqueue","timestamp":"2026-01-05T04:32:22.505Z"}
```

**问题分析**:
- 两个 JSON 对象直接连接在一起：`"}{"`
- 应该分为两行

**修复命令**:
```bash
python3 jsonl_fixer.py broken.jsonl fixed.jsonl
```

**修复结果**:
```
🔧 应用了 1 个修复:
  第 107 行: 分离多个 JSON 对象

✅ 修复完成!
📁 修复后的文件: fixed.jsonl
```

**验证**:
```bash
python3 jsonl_validator.py fixed.jsonl
# ✅ 恭喜！文件完全有效，没有发现任何错误。
```

---

## 🔍 常见错误类型和解决方案

### 1️⃣ **多个 JSON 对象连接在一行**
```
{"id":1}{"id":2}
```
**原因**: 两条记录被合并到一行
**修复**: 自动分割为两行
**预防**: 检查写入 JSONL 的代码逻辑

### 2️⃣ **缺少引号**
```
{name: "test"}
```
**原因**: 属性名未使用双引号
**修复**: `{"name": "test"}`
**注意**: JSON 必须使用双引号，不能用单引号

### 3️⃣ **尾随逗号**
```
{"items": [1, 2, 3,]}
```
**原因**: 数组/对象末尾多了逗号
**修复**: `{"items": [1, 2, 3]}`
**工具**: jsonl_fixer.py 会自动处理

### 4️⃣ **单引号代替双引号**
```
{'name': 'test'}
```
**原因**: 使用了 JavaScript 风格
**修复**: `{"name": "test"}`
**注意**: JSON 标准要求双引号

### 5️⃣ **未转义的特殊字符**
```
{"text": "He said "Hello""}
```
**原因**: 内部引号未转义
**修复**: `{"text": "He said \"Hello\""}`
**工具**: 需要手动修复

---

## 🛠️ 高级用法

### 查看修复前后对比
```bash
# 查看问题行
python3 jsonl_detailed_diagnostic.py data.jsonl 107

# 修复文件
python3 jsonl_fixer.py data.jsonl data_fixed.jsonl

# 对比特定行
sed -n '107p' data.jsonl
sed -n '107p' data_fixed.jsonl
```

### 集成到 CI/CD
```bash
#!/bin/bash
# check_jsonl.sh

for file in "$@"; do
    if ! python3 jsonl_validator.py "$file" > /dev/null 2>&1; then
        echo "❌ JSONL 验证失败: $file"
        exit 1
    fi
done

echo "✅ 所有 JSONL 文件验证通过"
```

### 备份策略
```bash
# 使用时间戳备份
backup_file="data_$(date +%Y%m%d_%H%M%S).jsonl.bak"
python3 jsonl_fixer.py data.jsonl "$backup_file"

# 保留最近 5 个备份
ls -t data_*.jsonl.bak | tail -n +6 | xargs rm -f
```

---

## 📚 技术细节

### JSONL 格式规范
- 每行是一个完整的 JSON 对象
- 行与行之间用换行符 `\n` 分隔
- 不支持跨行的 JSON 对象
- 不支持注释

### 错误检测算法
1. 逐行读取文件
2. 对每行尝试 `json.loads()`
3. 捕获 `JSONDecodeError` 异常
4. 分析错误位置和上下文
5. 生成友好的错误报告

### 自动修复策略
1. **多对象分离**: 使用括号匹配算法找到完整 JSON
2. **空行处理**: 可选择保留或删除
3. **常见问题**: 使用正则表达式修复尾随逗号等
4. **安全优先**: 保留原文件和备份

---

## 🤝 贡献

如果你发现新的错误类型或修复策略，欢迎贡献！

**改进方向**:
- 支持更多自动修复场景
- 添加交互式修复模式
- 支持大文件的流式处理
- 添加性能分析和优化

---

## 📄 许可证

MIT License

---

## 📮 反馈

如有问题或建议，请提交 Issue。
