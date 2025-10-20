import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

const target = 'http://127.0.0.1:4936';

// Get package version
const getPackageVersion = () => {
  try {
    const packagePath = path.resolve(__dirname, 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.warn('Could not read version from package.json:', error);
    return 'unknown';
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(getPackageVersion()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'agentstudio-shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 将大型第三方库分离到独立chunk
          'monaco-editor': ['@monaco-editor/react'],
          'syntax-highlighting': ['prismjs', 'react-syntax-highlighter'],
          'ui-components': ['lucide-react', 'react-icons'],
          'data-structures': ['react-arborist'],
          // 将工具组件分离
          'tools': [
            './src/components/tools/TodoWriteTool.tsx',
            './src/components/tools/KillBashTool.tsx',
            './src/components/tools/BashOutputTool.tsx'
          ],
          // 将代理相关组件分离
          'agents': [
            './src/agents/slides/components/SlidePreview.tsx',
            './src/agents/documents/components/DocumentOutlinePanel.tsx',
            './src/agents/code/components/CodeExplorerPanel.tsx'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000, // 提高警告阈值
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    proxy: {
      '/api': {
        target: target,
        changeOrigin: true,
      },
      '/slides': {
        target: target,
        changeOrigin: true,
      },
      '/media': {
        target: target,
        changeOrigin: true,
      },
    },
  },
})
