import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译资源
import zhCN_common from './locales/zh-CN/common.json';
import zhCN_pages from './locales/zh-CN/pages.json';
import zhCN_home from './locales/zh-CN/home.json';
import zhCN_components from './locales/zh-CN/components.json';
import zhCN_errors from './locales/zh-CN/errors.json';
import zhCN_agents from './locales/zh-CN/agents.json';
import zhCN_onboarding from './locales/zh-CN/onboarding.json';

import enUS_common from './locales/en-US/common.json';
import enUS_pages from './locales/en-US/pages.json';
import enUS_home from './locales/en-US/home.json';
import enUS_components from './locales/en-US/components.json';
import enUS_errors from './locales/en-US/errors.json';
import enUS_agents from './locales/en-US/agents.json';
import enUS_onboarding from './locales/en-US/onboarding.json';

const resources = {
  'zh-CN': {
    common: zhCN_common,
    pages: zhCN_pages,
    home: zhCN_home,
    components: zhCN_components,
    errors: zhCN_errors,
    agents: zhCN_agents,
    onboarding: zhCN_onboarding,
  },
  'en-US': {
    common: enUS_common,
    pages: enUS_pages,
    home: enUS_home,
    components: enUS_components,
    errors: enUS_errors,
    agents: enUS_agents,
    onboarding: enUS_onboarding,
  },
};

i18n
  .use(LanguageDetector) // 自动检测用户语言
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    defaultNS: 'common',
    ns: ['common', 'pages', 'home', 'components', 'errors', 'agents', 'onboarding'],

    interpolation: {
      escapeValue: false, // React已经处理了XSS
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;