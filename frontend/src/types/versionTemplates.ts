import { ModelConfig } from './claude-versions';

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
  models?: ModelConfig[]; // 支持的模型列表
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
        value: 'https://open.bigmodel.cn/api/anthropic',
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
    ],
    models: [
      {
        id: 'glm-4.7',
        name: 'GLM-4.7',
        isVision: false,
        description: '智谱AI GLM-4.7 最新版本'
      },
      {
        id: 'glm-4.6',
        name: 'GLM-4.6',
        isVision: false,
        description: '智谱AI GLM-4.6 模型'
      },
      {
        id: 'glm-4.5',
        name: 'GLM-4.5',
        isVision: false,
        description: '智谱AI GLM-4.5 模型'
      },
      {
        id: 'glm-4.5v',
        name: 'GLM-4.5V',
        isVision: true,
        description: '智谱AI GLM-4.5V 视觉模型'
      },
      {
        id: 'glm-4.5-flash',
        name: 'GLM-4.5-Flash',
        isVision: false,
        description: '智谱AI GLM-4.5-Flash 快速模型'
      },
      {
        id: 'glm-4.5-air',
        name: 'GLM-4.5-Air',
        isVision: false,
        description: '智谱AI GLM-4.5-Air 轻量级模型'
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
    ],
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        isVision: false,
        description: 'DeepSeek Chat 最新对话模型'
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        isVision: false,
        description: 'DeepSeek Reasoner 推理模型'
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
        value: 'https://api.moonshot.cn/anthropic',
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
    ],
    models: [
      {
        id: 'kimi-k2-0905-preview',
        name: 'Kimi K2 0905 Preview',
        isVision: false,
        description: 'Kimi K2 2024年9月5日预览版'
      },
      {
        id: 'kimi-k2-0711-preview',
        name: 'Kimi K2 0711 Preview',
        isVision: false,
        description: 'Kimi K2 2024年7月11日预览版'
      },
      {
        id: 'kimi-k2-turbo-preview',
        name: 'Kimi K2 Turbo Preview',
        isVision: false,
        description: 'Kimi K2 Turbo 预览版'
      },
      {
        id: 'kimi-latest',
        name: 'Kimi Latest',
        isVision: true,
        description: 'Kimi 最新版本视觉模型'
      }
    ]
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    alias: 'minimax',
    description: '使用MiniMax的高性能模型服务，支持Anthropic API兼容',
    versionDescription: 'MiniMax模型 - Anthropic兼容版本',
    apiTokenUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    logoUrl: 'https://agent.minimaxi.com/assets/logo/favicon.png?v=4',
    envVars: [
      {
        key: 'ANTHROPIC_BASE_URL',
        value: 'https://api.minimaxi.com/anthropic',
        isRequired: true,
        description: 'MiniMax的Anthropic兼容端点'
      },
      {
        key: 'ANTHROPIC_AUTH_TOKEN',
        value: '',
        isRequired: true,
        placeholder: '<MINIMAX_API_KEY>',
        description: '您的MiniMax API密钥（必填）'
      },
      {
        key: 'API_TIMEOUT_MS',
        value: '3000000',
        isRequired: false,
        description: 'API请求超时时间（毫秒）'
      },
      {
        key: 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
        value: '1',
        isRequired: false,
        description: '禁用非必要流量（1=启用，0=禁用）'
      },
      {
        key: 'ANTHROPIC_MODEL',
        value: 'MiniMax-M2',
        isRequired: false,
        description: '使用的MiniMax模型名称'
      },
      {
        key: 'ANTHROPIC_SMALL_FAST_MODEL',
        value: 'MiniMax-M2',
        isRequired: false,
        description: '快速轻量级模型名称'
      },
      {
        key: 'ANTHROPIC_DEFAULT_SONNET_MODEL',
        value: 'MiniMax-M2',
        isRequired: false,
        description: '默认Sonnet模型名称'
      },
      {
        key: 'ANTHROPIC_DEFAULT_OPUS_MODEL',
        value: 'MiniMax-M2',
        isRequired: false,
        description: '默认Opus模型名称'
      },
      {
        key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL',
        value: 'MiniMax-M2',
        isRequired: false,
        description: '默认Haiku模型名称'
      }
    ],
    models: [
      {
        id: 'MiniMax-M2',
        name: 'MiniMax M2',
        isVision: false,
        description: 'MiniMax M2 最新模型'
      }
    ]
  }
];
