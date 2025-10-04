import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Code, FileText, Globe, Zap, Shield, Users, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LandingPage: React.FC = () => {
  const { t } = useTranslation('pages');

  useEffect(() => {
    // Update page title dynamically for SEO
    document.title = t('landing.pageTitle');

    // Add or update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', t('landing.metaDescription'));
    }
  }, [t]);

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
              {t('landing.nav.enterWorkspace')}
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
              {t('landing.hero.title')}
            </span>
            <br />
            {t('landing.hero.subtitle')}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            {t('landing.hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {t('landing.hero.startNow')}
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
            <a
              href="https://github.com/git-men/agentstudio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-300 transition-all duration-200"
            >
              <Code className="mr-2 w-5 h-5" />
              {t('landing.hero.viewSource')}
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('landing.features.title')}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.features.modernWeb.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('landing.features.modernWeb.description')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-100">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-6">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.features.multiModel.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('landing.features.multiModel.description')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-100">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.features.agentSystem.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('landing.features.agentSystem.description')}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl border border-orange-100">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.features.fileManagement.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('landing.features.fileManagement.description')}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-8 rounded-2xl border border-teal-100">
              <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.features.professionalTools.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('landing.features.professionalTools.description')}
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-8 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.features.secureReliable.title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('landing.features.secureReliable.description')}
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Installation Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('landing.quickStart.title')}</h2>
          <p className="text-lg text-gray-600 mb-8">
            {t('landing.quickStart.subtitle')}
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* End User Installation */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('landing.quickStart.endUserTitle')}</h3>
              <div className="bg-gray-900 rounded-lg p-4 text-left text-sm text-green-400 font-mono mb-4">
                <div>curl -fsSL https://raw.githubusercontent.com/git-men/agentstudio/main/scripts/remote-install.sh | bash</div>
              </div>
              <p className="text-gray-600 text-sm">
                {t('landing.quickStart.endUserDescription')}
              </p>
            </div>

            {/* Developer Installation */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('landing.quickStart.developerTitle')}</h3>
              <div className="bg-gray-900 rounded-lg p-4 text-left text-sm text-green-400 font-mono mb-4">
                <div>git clone https://github.com/git-men/agentstudio.git</div>
                <div>cd agentstudio</div>
                <div>pnpm install && pnpm run dev</div>
              </div>
              <p className="text-gray-600 text-sm">
                {t('landing.quickStart.developerDescription')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t('landing.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-8 py-4 bg-white hover:bg-gray-100 text-blue-600 font-semibold rounded-xl transition-all duration-200 shadow-lg"
            >
              {t('landing.cta.start')}
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
                <li><a href="https://github.com/git-men/agentstudio" className="hover:text-white transition-colors">{t('landing.footer.sourceCode')}</a></li>
                <li><a href="https://github.com/git-men/agentstudio/releases" className="hover:text-white transition-colors">{t('landing.footer.releases')}</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">{t('landing.footer.support')}</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com/git-men/agentstudio/wiki" className="hover:text-white transition-colors">{t('landing.footer.documentation')}</a></li>
                <li><a href="https://github.com/git-men/agentstudio/issues" className="hover:text-white transition-colors">{t('landing.footer.issues')}</a></li>
                <li><a href="https://github.com/git-men/agentstudio/discussions" className="hover:text-white transition-colors">{t('landing.footer.discussions')}</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;