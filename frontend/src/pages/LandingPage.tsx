import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Code,
  Monitor,
  Shield,
  Clock,
  Network,
  Palette,
  Zap,
  FolderOpen,
  Check,
  X,
  Globe,
  Copy,
  Github,
  FileText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LandingPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('npm install -g agentstudio && agentstudio start');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    document.title = t('landing.pageTitle');
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', t('landing.metaDescription'));
    }
  }, [t]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation */}
      <nav className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img src="/cc-studio.png" alt="AgentStudio" className="w-8 h-8" />
              <span className="text-xl font-semibold text-gray-900 dark:text-white">AgentStudio</span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/okguitar/agentstudio/tree/main/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <FileText className="w-5 h-5 mr-1" />
                <span className="hidden sm:inline">{t('landing.nav.docs')}</span>
              </a>
              <a
                href="https://github.com/okguitar/agentstudio"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Github className="w-5 h-5 mr-1" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg transition-colors duration-200"
              >
                {t('landing.nav.enterWorkspace')}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 mb-6">
            <Zap className="w-4 h-4 mr-2 text-amber-500" />
            {t('landing.hero.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            {t('landing.hero.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4 max-w-2xl mx-auto">
            {t('landing.hero.subtitle')}
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-500 mb-8 max-w-2xl mx-auto">
            {t('landing.hero.description')}
          </p>

          {/* Quick Install */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {t('landing.hero.installHint')}
          </p>
          <div className="bg-gray-900 dark:bg-gray-800 rounded-xl p-4 max-w-xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <code className="text-green-400 text-sm sm:text-base font-mono flex-1">
                npm install -g agentstudio && agentstudio start
              </code>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors flex items-center gap-1.5 text-sm flex-shrink-0 min-w-[72px] justify-center"
                title={t('landing.hero.copyCommand')}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t('landing.hero.copy')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Product Preview Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('landing.preview.title')}</h2>
            <p className="text-gray-600 dark:text-gray-400">{t('landing.preview.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chat Interface */}
            <div className="group">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <img
                  src="/screenshot-chat.png"
                  alt={t('landing.preview.chatAlt')}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">{t('landing.preview.chatCaption')}</p>
            </div>
            {/* MCP Management */}
            <div className="group">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <img
                  src="/screenshot-mcp.png"
                  alt={t('landing.preview.mcpAlt')}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">{t('landing.preview.mcpCaption')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t('landing.features.title')}</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: Local Agent Workspace */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mb-6">
                <Monitor className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('landing.features.localWorkspace.title')}
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <Shield className="w-5 h-5 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>{t('landing.features.localWorkspace.point1')}</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>{t('landing.features.localWorkspace.point2')}</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                  <span>{t('landing.features.localWorkspace.point3')}</span>
                </li>
              </ul>
            </div>

            {/* Feature 2: Web Experience */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('landing.features.webExperience.title')}
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <Zap className="w-5 h-5 mr-2 mt-0.5 text-amber-500 flex-shrink-0" />
                  <span>{t('landing.features.webExperience.point1')}</span>
                </li>
                <li className="flex items-start">
                  <Palette className="w-5 h-5 mr-2 mt-0.5 text-purple-500 flex-shrink-0" />
                  <span>{t('landing.features.webExperience.point2')}</span>
                </li>
                <li className="flex items-start">
                  <FolderOpen className="w-5 h-5 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>{t('landing.features.webExperience.point3')}</span>
                </li>
              </ul>
            </div>

            {/* Feature 3: Claude Agent SDK */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mb-6">
                <Code className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('landing.features.sdkFeatures.title')}
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">MCP</span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">{t('landing.features.sdkFeatures.skills')}</span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">{t('landing.features.sdkFeatures.commands')}</span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">{t('landing.features.sdkFeatures.plugins')}</span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">{t('landing.features.sdkFeatures.memory')}</span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">{t('landing.features.sdkFeatures.subagent')}</span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">{t('landing.features.sdkFeatures.multiModel')}</span>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                {t('landing.features.sdkFeatures.anthropicCompat')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scheduled Tasks Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm mb-4">
                <Clock className="w-4 h-4 mr-2" />
                {t('landing.scheduler.badge')}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {t('landing.scheduler.title')}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                {t('landing.scheduler.description')}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                {t('landing.scheduler.scenariosTitle')}
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-2xl mr-3">📊</span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{t('landing.scheduler.scenario1.title')}</span>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">{t('landing.scheduler.scenario1.desc')}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">🔍</span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{t('landing.scheduler.scenario2.title')}</span>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">{t('landing.scheduler.scenario2.desc')}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">📝</span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{t('landing.scheduler.scenario3.title')}</span>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">{t('landing.scheduler.scenario3.desc')}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">📈</span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{t('landing.scheduler.scenario4.title')}</span>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">{t('landing.scheduler.scenario4.desc')}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* A2A Protocol Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                {t('landing.a2a.scenariosTitle')}
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-2xl mr-3">🤵</span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{t('landing.a2a.scenario1.title')}</span>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">{t('landing.a2a.scenario1.desc')}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">💻</span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{t('landing.a2a.scenario2.title')}</span>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">{t('landing.a2a.scenario2.desc')}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">📱</span>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{t('landing.a2a.scenario3.title')}</span>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">{t('landing.a2a.scenario3.desc')}</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm mb-4">
                <Network className="w-4 h-4 mr-2" />
                {t('landing.a2a.badge')}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {t('landing.a2a.title')}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {t('landing.a2a.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Agent Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm mb-4">
              <Bot className="w-4 h-4 mr-2" />
              {t('landing.customAgent.badge')}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.customAgent.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('landing.customAgent.description')}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
              <span className="text-4xl mb-3 block">📊</span>
              <span className="font-medium text-gray-900 dark:text-white">{t('landing.customAgent.example1')}</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
              <span className="text-4xl mb-3 block">🤵</span>
              <span className="font-medium text-gray-900 dark:text-white">{t('landing.customAgent.example2')}</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
              <span className="text-4xl mb-3 block">📝</span>
              <span className="font-medium text-gray-900 dark:text-white">{t('landing.customAgent.example3')}</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
              <span className="text-4xl mb-3 block">🔍</span>
              <span className="font-medium text-gray-900 dark:text-white">{t('landing.customAgent.example4')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.comparison.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('landing.comparison.subtitle')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400">{t('landing.comparison.dimension')}</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">AgentStudio</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Claude Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{t('landing.comparison.interface')}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">Web {t('landing.comparison.webInterface')}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-500">{t('landing.comparison.cli')}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{t('landing.comparison.targetUsers')}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">{t('landing.comparison.everyone')}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-500">{t('landing.comparison.developers')}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{t('landing.comparison.toolDisplay')}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">{t('landing.comparison.visual')}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-500">{t('landing.comparison.textOnly')}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{t('landing.comparison.fileBrowser')}</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{t('landing.comparison.agentCustom')}</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{t('landing.comparison.scheduler')}</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{t('landing.comparison.a2a')}</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{t('landing.comparison.mobileAccess')}</td>
                  <td className="px-6 py-4 text-center text-sm text-amber-600 dark:text-amber-400">{t('landing.comparison.beta')}</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            {t('landing.cta.subtitle')}
          </p>
          <div className="bg-gray-900 dark:bg-gray-800 rounded-xl p-4 max-w-xl mx-auto mb-8">
            <div className="flex items-center justify-between gap-4">
              <code className="text-green-400 text-sm sm:text-base font-mono flex-1">
                npm install -g agentstudio && agentstudio start
              </code>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors flex items-center gap-1.5 text-sm flex-shrink-0 min-w-[72px] justify-center"
                title={t('landing.hero.copyCommand')}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t('landing.hero.copy')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <a
            href="https://github.com/okguitar/agentstudio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-200"
          >
            <Code className="mr-2 w-5 h-5" />
            GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img src="/cc-studio.png" alt="AgentStudio" className="w-8 h-8" />
                <span className="text-xl font-semibold text-white">AgentStudio</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                {t('landing.footer.description')}
              </p>
              <div className="text-sm text-gray-500">
                {t('landing.footer.copyright')}
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">{t('landing.footer.product')}</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">{t('landing.footer.workspace')}</Link></li>
                <li><a href="https://github.com/okguitar/agentstudio" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t('landing.footer.sourceCode')}</a></li>
                <li><a href="https://github.com/okguitar/agentstudio/releases" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t('landing.footer.releases')}</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">{t('landing.footer.support')}</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com/okguitar/agentstudio/tree/main/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t('landing.footer.documentation')}</a></li>
                <li><a href="https://github.com/okguitar/agentstudio/issues" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t('landing.footer.issues')}</a></li>
                <li><a href="https://github.com/okguitar/agentstudio/discussions" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t('landing.footer.discussions')}</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
