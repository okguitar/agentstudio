# 文件操作 API 文档

## 概述

本文档描述了 AI Editor 项目中的通用文件操作 API 接口。该 API 提供了对项目工作目录下文件的读写功能，支持单文件和多文件操作。Slides 功能通过这些通用接口来实现业务逻辑。

## 基础信息

- **基础 URL**: `/api/files`
- **数据格式**: JSON
- **认证**: 暂无认证要求
- **安全限制**: 只能访问项目工作目录内的文件

## 数据类型定义

### FileData 接口
```typescript
interface FileData {
  path: string;        // 文件相对路径
  content: string | null;  // 文件内容，如果文件不存在则为 null
  exists: boolean;     // 文件是否存在
  error?: string;      // 错误信息（如果有）
}
```

### FilesResponse 接口
```typescript
interface FilesResponse {
  files: FileData[];   // 文件数据数组
}
```

### ReadFileRequest 接口
```typescript
interface ReadFileRequest {
  path: string;        // 要读取的文件路径
}
```

### ReadFilesRequest 接口
```typescript
interface ReadFilesRequest {
  paths: string[];     // 要读取的文件路径数组
}
```

### WriteFileRequest 接口
```typescript
interface WriteFileRequest {
  path: string;        // 要写入的文件路径
  content: string;     // 文件内容
}
```

## API 接口

### 1. 读取单个文件

读取指定路径的单个文件内容。

**请求**
```http
GET /api/files/read?path={filePath}
```

**查询参数**
- `path` (string, 必需): 相对于工作目录的文件路径

**响应示例**
```json
{
  "path": "slides.js",
  "content": "const presentationConfig = {\n  title: \"AI Editor 演示\",\n  slides: [\n    \"slides/01-introduction.html\",\n    \"slides/02-features.html\"\n  ]\n};",
  "exists": true
}
```

**状态码**
- `200 OK`: 成功读取文件
- `400 Bad Request`: 缺少文件路径参数
- `403 Forbidden`: 文件路径超出工作目录范围
- `404 Not Found`: 文件不存在
- `500 Internal Server Error`: 服务器内部错误

### 2. 读取多个文件

批量读取多个文件的内容。

**请求**
```http
POST /api/files/read-multiple
Content-Type: application/json
```

**请求体**
```json
{
  "paths": [
    "slides/01-introduction.html",
    "slides/02-features.html",
    "slides/03-nonexistent.html"
  ]
}
```

**响应示例**
```json
{
  "files": [
    {
      "path": "slides/01-introduction.html",
      "content": "<!DOCTYPE html>\n<html>\n<head>\n<title>介绍</title>\n</head>\n<body>\n<h1>欢迎使用 AI Editor</h1>\n</body>\n</html>",
      "exists": true
    },
    {
      "path": "slides/02-features.html", 
      "content": "<!DOCTYPE html>\n<html>\n<head>\n<title>功能特点</title>\n</head>\n<body>\n<h1>强大的功能</h1>\n</body>\n</html>",
      "exists": true
    },
    {
      "path": "slides/03-nonexistent.html",
      "content": null,
      "exists": false,
      "error": "File not found"
    }
  ]
}
```

**状态码**
- `200 OK`: 成功读取文件（包含部分失败的情况）
- `400 Bad Request`: 无效的请求体
- `500 Internal Server Error`: 服务器内部错误

### 3. 写入文件

写入内容到指定文件，如果文件不存在则创建。

**请求**
```http
PUT /api/files/write
Content-Type: application/json
```

**请求体**
```json
{
  "path": "slides/01-introduction.html",
  "content": "<!DOCTYPE html>\n<html>\n<head>\n<title>更新的标题</title>\n</head>\n<body>\n<h1>更新的内容</h1>\n</body>\n</html>"
}
```

**请求体字段**
- `path` (string, 必需): 相对于工作目录的文件路径
- `content` (string, 必需): 要写入的文件内容

**响应示例**
```json
{
  "success": true,
  "message": "File written successfully",
  "path": "slides/01-introduction.html"
}
```

**状态码**
- `200 OK`: 成功写入文件
- `400 Bad Request`: 无效的请求体
- `403 Forbidden`: 文件路径超出工作目录范围
- `500 Internal Server Error`: 服务器内部错误

## 前端使用示例

### 通用文件操作 Hooks

项目提供了通用的文件操作 React Hooks：

#### 读取单个文件
```typescript
import { useReadFile } from './hooks/useFiles';

function FileContentComponent({ filePath }: { filePath: string }) {
  const { data: fileData, isLoading, error } = useReadFile(filePath);
  
  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>加载失败: {error.message}</div>;
  if (!fileData?.exists) return <div>文件不存在</div>;
  
  return (
    <div>
      <h3>文件: {fileData.path}</h3>
      <pre>{fileData.content}</pre>
    </div>
  );
}
```

#### 读取多个文件
```typescript
import { useReadFiles } from './hooks/useFiles';

function MultipleFilesComponent({ filePaths }: { filePaths: string[] }) {
  const { data: filesData, isLoading } = useReadFiles(filePaths);
  
  if (isLoading) return <div>加载中...</div>;
  
  return (
    <div>
      {filesData?.files.map(file => (
        <div key={file.path}>
          <h4>{file.path}</h4>
          {file.exists ? (
            <pre>{file.content}</pre>
          ) : (
            <p>文件不存在: {file.error}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### 写入文件
```typescript
import { useWriteFile } from './hooks/useFiles';

function FileEditor({ filePath }: { filePath: string }) {
  const [content, setContent] = useState('');
  const writeFileMutation = useWriteFile();
  
  const handleSave = () => {
    writeFileMutation.mutate({
      path: filePath,
      content
    });
  };
  
  return (
    <div>
      <textarea 
        value={content} 
        onChange={(e) => setContent(e.target.value)}
      />
      <button 
        onClick={handleSave}
        disabled={writeFileMutation.isPending}
      >
        {writeFileMutation.isPending ? '保存中...' : '保存'}
      </button>
    </div>
  );
}
```

### Slides 特定业务逻辑

基于通用文件操作构建的 Slides 业务逻辑：

#### 获取幻灯片列表
```typescript
import { useSlides } from './agents/slides/hooks/useSlides';

function SlidesComponent() {
  const { data: slidesData, isLoading, error } = useSlides();
  
  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>加载失败: {error.message}</div>;
  
  return (
    <div>
      <h2>{slidesData?.title}</h2>
      <p>共 {slidesData?.total} 张幻灯片</p>
      {slidesData?.slides.map(slide => (
        <div key={slide.index}>
          <h3>{slide.title}</h3>
          <p>路径: {slide.path}</p>
          <p>状态: {slide.exists ? '存在' : '不存在'}</p>
        </div>
      ))}
    </div>
  );
}
```

#### 获取和编辑幻灯片内容
```typescript
import { useSlideContent, useUpdateSlide } from './agents/slides/hooks/useSlides';

function SlideEditor({ slideIndex }: { slideIndex: number }) {
  const { data: slideContent, isLoading } = useSlideContent(slideIndex);
  const updateSlideMutation = useUpdateSlide();
  const [content, setContent] = useState('');
  
  useEffect(() => {
    if (slideContent?.content) {
      setContent(slideContent.content);
    }
  }, [slideContent]);
  
  const handleSave = () => {
    updateSlideMutation.mutate({
      slideIndex,
      content
    });
  };
  
  if (isLoading) return <div>加载中...</div>;
  
  return (
    <div>
      <h3>编辑幻灯片 {slideIndex + 1}</h3>
      <textarea 
        value={content} 
        onChange={(e) => setContent(e.target.value)}
        rows={20}
        cols={80}
      />
      <br />
      <button 
        onClick={handleSave}
        disabled={updateSlideMutation.isPending}
      >
        {updateSlideMutation.isPending ? '保存中...' : '保存'}
      </button>
    </div>
  );
}
```

## 错误处理

### 通用错误响应格式
```json
{
  "error": "错误描述信息",
  "details": {
    // 可选的详细错误信息
  }
}
```

### 常见错误类型

1. **文件路径超出工作目录**
   - 状态码: 403
   - 错误信息: "Access denied"

2. **缺少必需参数**
   - 状态码: 400
   - 错误信息: "File path is required" 或 "Invalid request body"

3. **文件不存在**
   - 状态码: 404
   - 错误信息: "File not found"

4. **请求体验证失败**
   - 状态码: 400
   - 错误信息: "Invalid request body"

## 配置说明

### Slides 业务配置

Slides 功能依赖项目根目录下的 `slides.js` 配置文件，该文件通过通用文件 API 读取和解析：

```javascript
// 推荐格式
const presentationConfig = {
  title: "我的演示文稿",
  slides: [
    "slides/01-introduction.html",
    "slides/02-features.html",
    "slides/03-conclusion.html"
  ]
};

// 兼容旧格式
const slides = [
  "slides/01-introduction.html", 
  "slides/02-features.html"
];
```

### 安全限制

- **工作目录限制**: 所有文件操作仅限于项目工作目录内
- **路径验证**: 自动阻止 `../` 等路径遍历攻击
- **相对路径**: 所有文件路径必须是相对路径

## 架构优势

### 关注点分离

1. **后端**: 仅提供通用文件读写功能，不涉及业务逻辑
2. **前端**: 在通用文件操作基础上构建特定业务逻辑
3. **可扩展性**: 可轻松支持其他文件驱动的功能（文档、代码等）

### 通用性

- 同一套 API 可支持多种文件类型和业务场景
- 便于其他 Agent 复用文件操作能力
- 简化后端维护和测试

## 缓存策略

前端使用 React Query 进行数据缓存：

### 通用文件操作
- 单文件缓存键: `['file', filePath]`
- 多文件缓存键: `['files', paths]`

### Slides 业务缓存
- 幻灯片列表缓存键: `['slides']`
- 特定幻灯片内容缓存键: `['slide-content', slideIndex]`

### 缓存失效策略
- 写入文件后自动失效相关缓存
- 支持手动失效和重新获取

## 注意事项

1. **文件路径必须是相对路径**，不能包含 `../` 等目录遍历
2. **所有操作限制在工作目录内**，确保安全性
3. **批量读取支持部分失败**，单个文件错误不影响其他文件
4. **自动创建目录**，写入文件时会自动创建不存在的目录
5. **编码统一为 UTF-8**，确保中文等字符正确处理
