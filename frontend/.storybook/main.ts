import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest"
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {}
  },
  typescript: {
    check: false
  },
  viteFinal: async (config, { configType }) => {
    // 添加 TailwindCSS 支持
    if (config.css?.postcss?.plugins) {
      config.css.postcss.plugins.push(
        require('tailwindcss'),
        require('autoprefixer'),
        require('@tailwindcss/typography')
      );
    }

    // 确保路径别名正确解析
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/components': '/src/components',
        '@/utils': '/src/utils',
        '@/hooks': '/src/hooks',
        '@/stores': '/src/stores',
        '@/types': '/src/types'
      };
    }

    return config;
  }
};

export default config;