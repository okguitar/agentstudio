import 'react-i18next';
import type common from './locales/zh-CN/common.json';
import type pages from './locales/zh-CN/pages.json';
import type components from './locales/zh-CN/components.json';
import type errors from './locales/zh-CN/errors.json';
import type agents from './locales/zh-CN/agents.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      pages: typeof pages;
      components: typeof components;
      errors: typeof errors;
      agents: typeof agents;
    };
  }
}