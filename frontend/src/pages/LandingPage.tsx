import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Code, FileText, Globe, Zap, Shield, Users, ChevronRight } from 'lucide-react';

const LandingPage: React.FC = () => {
  useEffect(() => {
    // Update page title dynamically for SEO
    document.title = 'AgentStudio - 智能体工作平台 | Claude Code 驱动的 AI 助手';
    
    // Add or update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', '基于 Claude Code SDK 的现代化个人智能体工作平台。通过直观的 Web 界面，轻松访问强大的 AI 能力，支持多种大语言模型，提升工作效率。');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src="/cc-studio.png" alt="AgentStudio" className="w-8 h-8" />
              <span className="text-xl font-bold text-gray-900">AgentStudio</span>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              进入工作台
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              智能体工作平台
            </span>
            <br />
            让AI成为你的得力助手
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            基于 Claude Code SDK 构建的现代化个人智能体工作平台。
            通过直观的 Web 界面，轻松访问强大的 AI 能力，提升工作效率。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              立即开始
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
            <a
              href="https://github.com/git-men/agentstudio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-300 transition-all duration-200"
            >
              <Code className="mr-2 w-5 h-5" />
              查看源码
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">核心特性</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              为现代化AI工作流程设计的全面功能集
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">现代化Web界面</h3>
              <p className="text-gray-600 leading-relaxed">
                专业直观的 Web UI，实时流式响应，分屏布局设计，适合开发者和普通用户使用
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-100">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-6">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">多模型支持</h3>
              <p className="text-gray-600 leading-relaxed">
                支持 Claude、OpenAI、GLM、DeepSeek 等多种大语言模型，灵活切换，满足不同需求
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-100">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">智能体系统</h3>
              <p className="text-gray-600 leading-relaxed">
                内置多种专业智能体，支持自定义智能体创建，消息级工具定制，扩展开发框架
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl border border-orange-100">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">文件管理</h3>
              <p className="text-gray-600 leading-relaxed">
                内置文件浏览器，项目感知操作，版本控制集成，支持图片上传和内容预览
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 rounded-2xl border border-teal-100">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">专业工具</h3>
              <p className="text-gray-600 leading-relaxed">
                幻灯片智能体、代码探索器、文档大纲、工具渲染器等专业工具，提升工作效率
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-8 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">安全可靠</h3>
              <p className="text-gray-600 leading-relaxed">
                环境变量保护API密钥，CORS配置，输入验证，沙盒文件系统访问，确保安全性
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Installation Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">快速开始</h2>
          <p className="text-lg text-gray-600 mb-8">
            选择适合你的安装方式，几分钟内即可开始使用
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* End User Installation */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">普通用户 - 一键安装</h3>
              <div className="bg-gray-900 rounded-lg p-4 text-left text-sm text-green-400 font-mono mb-4">
                <div>curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | bash</div>
              </div>
              <p className="text-gray-600 text-sm">
                无需配置，自动安装所有依赖，适合快速体验和日常使用
              </p>
            </div>

            {/* Developer Installation */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">开发者 - 源码部署</h3>
              <div className="bg-gray-900 rounded-lg p-4 text-left text-sm text-green-400 font-mono mb-4">
                <div>git clone https://github.com/git-men/agentstudio.git</div>
                <div>cd agentstudio</div>
                <div>pnpm install && pnpm run dev</div>
              </div>
              <p className="text-gray-600 text-sm">
                完整开发环境，支持热重载，适合定制开发和功能扩展
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            准备好开始你的AI工作流程了吗？
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            加入使用AgentStudio的开发者和团队，体验AI驱动的高效工作方式
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-8 py-4 bg-white hover:bg-gray-100 text-blue-600 font-semibold rounded-xl transition-all duration-200 shadow-lg"
            >
              开始使用
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <a
              href="https://github.com/git-men/agentstudio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl border border-blue-400 transition-all duration-200"
            >
              <Code className="mr-2 w-5 h-5" />
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img src="/cc-studio.png" alt="AgentStudio" className="w-8 h-8" />
                <span className="text-xl font-bold text-white">AgentStudio</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                基于 Claude Code SDK 的个人智能体工作平台，让AI成为你的得力助手。
              </p>
              <div className="text-sm text-gray-500">
                © 2024 AgentStudio. MIT License.
              </div>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">产品</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">工作台</Link></li>
                <li><a href="https://github.com/git-men/agentstudio" className="hover:text-white transition-colors">源码</a></li>
                <li><a href="https://github.com/git-men/agentstudio/releases" className="hover:text-white transition-colors">发布版本</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">支持</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com/git-men/agentstudio/wiki" className="hover:text-white transition-colors">文档</a></li>
                <li><a href="https://github.com/git-men/agentstudio/issues" className="hover:text-white transition-colors">问题反馈</a></li>
                <li><a href="https://github.com/git-men/agentstudio/discussions" className="hover:text-white transition-colors">社区讨论</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;