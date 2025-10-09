export interface VersionTemplate {
  id: string;
  name: string;
  alias: string;
  description: string;
  versionDescription?: string;
  apiTokenUrl?: string; // URL to get API token
  logoUrl?: string; // Provider logo URL
  envVars: {
    key: string;
    value: string;
    isRequired: boolean;
    placeholder?: string;
    description?: string;
  }[];
}

export const VERSION_TEMPLATES: VersionTemplate[] = [
  {
    id: 'glm',
    name: 'GLM (智谱AI)',
    alias: 'glm',
    description: '使用智谱AI的GLM模型服务，兼容Anthropic API',
    versionDescription: '智谱AI GLM模型 - Anthropic兼容版本',
    apiTokenUrl: 'https://www.bigmodel.cn/claude-code?ic=IHK4TGHUDI',
    logoUrl: 'https://chatglm.cn/img/icons/favicon-32x32.png',
    envVars: [
      {
        key: 'ANTHROPIC_BASE_URL',
        value: 'https://api.z.ai/api/anthropic',
        isRequired: true,
        description: '智谱AI的Anthropic兼容端点'
      },
      {
        key: 'ANTHROPIC_AUTH_TOKEN',
        value: '',
        isRequired: true,
        placeholder: 'YOUR_API_KEY',
        description: '您的智谱AI API密钥（必填）'
      }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    alias: 'deepseek',
    description: '使用DeepSeek的高性能模型服务',
    versionDescription: 'DeepSeek高性能模型 - Anthropic兼容版本',
    apiTokenUrl: 'https://platform.deepseek.com/api_keys',
    logoUrl: 'https://chat.deepseek.com/favicon.svg',
    envVars: [
      {
        key: 'ANTHROPIC_BASE_URL',
        value: 'https://api.deepseek.com/anthropic',
        isRequired: true,
        description: 'DeepSeek的Anthropic兼容端点'
      },
      {
        key: 'ANTHROPIC_AUTH_TOKEN',
        value: '',
        isRequired: true,
        placeholder: 'YOUR_DEEPSEEK_API_KEY',
        description: '您的DeepSeek API密钥（必填）'
      },
      {
        key: 'API_TIMEOUT_MS',
        value: '600000',
        isRequired: false,
        description: 'API请求超时时间（毫秒）'
      },
      {
        key: 'ANTHROPIC_MODEL',
        value: 'deepseek-chat',
        isRequired: false,
        description: '使用的DeepSeek模型名称'
      },
      {
        key: 'ANTHROPIC_SMALL_FAST_MODEL',
        value: 'deepseek-chat',
        isRequired: false,
        description: '快速轻量级模型名称'
      },
      {
        key: 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
        value: '1',
        isRequired: false,
        description: '禁用非必要流量（1=启用，0=禁用）'
      }
    ]
  },
  {
    id: 'kimi',
    name: 'Kimi K2 (月之暗面)',
    alias: 'kimi-k2',
    description: '使用Kimi K2模型服务，支持Anthropic API兼容',
    versionDescription: 'Kimi K2模型 - Anthropic兼容版本',
    apiTokenUrl: 'https://platform.moonshot.cn/console/api-keys',
    logoUrl: 'https://statics.moonshot.cn/kimi-web-seo/favicon.ico',
    envVars: [
      {
        key: 'ANTHROPIC_BASE_URL',
        value: 'https://api.moonshot.an/anthropic',
        isRequired: true,
        description: 'Kimi的Anthropic兼容端点'
      },
      {
        key: 'ANTHROPIC_AUTH_TOKEN',
        value: '',
        isRequired: true,
        placeholder: 'sk-YOURKEY',
        description: '您的Kimi API密钥（必填，以sk-开头）'
      }
    ]
  }
];
