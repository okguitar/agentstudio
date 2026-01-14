import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cloud,
  Globe,
  Link as LinkIcon,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronRight,
  Info,
  Terminal,
  CheckCircle2
} from 'lucide-react';
import { useMobileContext } from '../../contexts/MobileContext';

interface TunnelConfig {
  hasApiToken: boolean;
  hasAccountId: boolean;
  activeTunnel: {
    tunnelId: string;
    tunnelName: string;
    publicUrl: string;
    createdAt: string;
    localPort: number;
  } | null;
}

interface TunnelDetails {
  id: string;
  name: string;
  publicUrl: string;
  localUrl: string;
  createdAt: string;
  token: string;
  instructions: {
    cli: string;
    docker: string;
  };
}

type WizardStep = 'intro' | 'credentials' | 'create' | 'start' | 'done';

export const CloudflareTunnelPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();

  const [config, setConfig] = useState<TunnelConfig | null>(null);
  const [apiToken, setApiToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [localPort, setLocalPort] = useState('4936');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [tunnelDetails, setTunnelDetails] = useState<TunnelDetails | null>(null);
  const [currentStep, setCurrentStep] = useState<WizardStep>('intro');
  const [showWizard, setShowWizard] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    // Auto-determine current step based on config
    if (!config) return;

    if (config.activeTunnel) {
      setCurrentStep('done');
      setShowWizard(false);
    } else if (config.hasApiToken && config.hasAccountId) {
      setCurrentStep('create');
    } else {
      setCurrentStep('credentials');
    }
  }, [config]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cloudflare-tunnel/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }

      const data = await response.json();
      setConfig(data);
    } catch (err) {
      console.error('Error loading config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveCredentials = async () => {
    if (!apiToken || !accountId) {
      setError(t('settings.cloudflare.errors.credentialsRequired'));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/cloudflare-tunnel/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: JSON.stringify({ apiToken, accountId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save credentials');
      }

      setSuccess(t('settings.cloudflare.credentialsSaved'));
      await loadConfig();
      setCurrentStep('create');

      // Clear form
      setApiToken('');
      setAccountId('');
    } catch (err) {
      console.error('Error saving credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const createTunnel = async () => {
    setCreating(true);
    setError(null);
    setSuccess(null);
    setTunnelDetails(null);

    try {
      const response = await fetch('/api/cloudflare-tunnel/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: JSON.stringify({
          subdomain: subdomain || undefined,
          localPort: parseInt(localPort)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create tunnel');
      }

      const data = await response.json();
      setTunnelDetails(data.tunnel);
      setSuccess(t('settings.cloudflare.tunnelCreated'));
      setCurrentStep('start');
      await loadConfig();
    } catch (err) {
      console.error('Error creating tunnel:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tunnel');
    } finally {
      setCreating(false);
    }
  };

  const deleteTunnel = async (tunnelId: string) => {
    if (!confirm(t('settings.cloudflare.confirmDelete'))) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cloudflare-tunnel/delete/${tunnelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete tunnel');
      }

      setSuccess(t('settings.cloudflare.tunnelDeleted'));
      setTunnelDetails(null);
      setCurrentStep('intro');
      setShowWizard(true);
      await loadConfig();
    } catch (err) {
      console.error('Error deleting tunnel:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete tunnel');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'command') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedCommand(true);
        setTimeout(() => setCopiedCommand(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'intro', label: t('settings.cloudflare.wizard.steps.intro'), icon: Info },
      { id: 'credentials', label: t('settings.cloudflare.wizard.steps.credentials'), icon: Cloud },
      { id: 'create', label: t('settings.cloudflare.wizard.steps.create'), icon: LinkIcon },
      { id: 'start', label: t('settings.cloudflare.wizard.steps.start'), icon: Terminal },
      { id: 'done', label: t('settings.cloudflare.wizard.steps.done'), icon: CheckCircle2 }
    ];

    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={`mt-2 text-xs ${
                      isActive || isCompleted
                        ? 'text-gray-900 dark:text-white font-medium'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderIntroStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2" />
          {t('settings.cloudflare.wizard.intro.title')}
        </h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
          <p>{t('settings.cloudflare.wizard.intro.description')}</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>{t('settings.cloudflare.wizard.intro.benefit1')}</li>
            <li>{t('settings.cloudflare.wizard.intro.benefit2')}</li>
            <li>{t('settings.cloudflare.wizard.intro.benefit3')}</li>
            <li>{t('settings.cloudflare.wizard.intro.benefit4')}</li>
          </ul>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          {t('settings.cloudflare.wizard.intro.requirements')}
        </h4>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start">
            <CheckCircle2 className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <span>{t('settings.cloudflare.wizard.intro.req1')}</span>
          </div>
          <div className="flex items-start">
            <CheckCircle2 className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <span>{t('settings.cloudflare.wizard.intro.req2')}</span>
          </div>
          <div className="flex items-start">
            <CheckCircle2 className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <span>{t('settings.cloudflare.wizard.intro.req3')}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setCurrentStep('credentials')}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
      >
        <span>{t('settings.cloudflare.wizard.intro.getStarted')}</span>
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  const renderCredentialsStep = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-2">{t('settings.cloudflare.wizard.credentials.howToGet')}</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>{t('settings.cloudflare.wizard.credentials.step1')}</li>
              <li>{t('settings.cloudflare.wizard.credentials.step2')}</li>
              <li>{t('settings.cloudflare.wizard.credentials.step3')}</li>
            </ol>
            <a
              href="https://dash.cloudflare.com/profile/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-3 text-yellow-700 dark:text-yellow-300 hover:underline font-medium"
            >
              {t('settings.cloudflare.wizard.credentials.openDashboard')}
              <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.cloudflare.credentials.apiToken')}
          </label>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter Cloudflare API Token"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.cloudflare.credentials.accountId')}
          </label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter Cloudflare Account ID"
          />
        </div>

        <button
          onClick={saveCredentials}
          disabled={saving || !apiToken || !accountId}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {saving ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>{t('settings.cloudflare.credentials.saving')}</span>
            </>
          ) : (
            <>
              <span>{t('settings.cloudflare.wizard.credentials.saveAndContinue')}</span>
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderCreateStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p>{t('settings.cloudflare.wizard.create.description')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.cloudflare.tunnel.subdomain')}
          </label>
          <input
            type="text"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder={t('settings.cloudflare.tunnel.subdomainPlaceholder')}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('settings.cloudflare.tunnel.subdomainHelp')}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.cloudflare.tunnel.localPort')}
          </label>
          <input
            type="number"
            value={localPort}
            onChange={(e) => setLocalPort(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="4936"
          />
        </div>

        <button
          onClick={createTunnel}
          disabled={creating}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {creating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>{t('settings.cloudflare.tunnel.creating')}</span>
            </>
          ) : (
            <>
              <LinkIcon className="w-5 h-5" />
              <span>{t('settings.cloudflare.wizard.create.createButton')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderStartStep = () => {
    if (!tunnelDetails) return null;

    return (
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800 dark:text-green-200">
              <p className="font-medium">{t('settings.cloudflare.wizard.start.tunnelCreated')}</p>
              <p className="mt-1">{t('settings.cloudflare.wizard.start.nextStep')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            {t('settings.cloudflare.wizard.start.yourPublicUrl')}
          </h4>
          <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
            <Globe className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <a
              href={tunnelDetails.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm break-all"
            >
              {tunnelDetails.publicUrl}
            </a>
            <button
              onClick={() => copyToClipboard(tunnelDetails.publicUrl, 'url')}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-2">{t('settings.cloudflare.wizard.start.importantNote')}</p>
              <p>{t('settings.cloudflare.wizard.start.needToStartClient')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">
            {t('settings.cloudflare.wizard.start.howToStart')}
          </h4>

          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.cloudflare.wizard.start.option1')} ({t('settings.cloudflare.wizard.start.recommended')})
              </span>
              <button
                onClick={() => copyToClipboard(tunnelDetails.instructions.docker, 'command')}
                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded flex items-center space-x-1"
              >
                {copiedCommand ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>{t('settings.cloudflare.wizard.start.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{t('settings.cloudflare.wizard.start.copy')}</span>
                  </>
                )}
              </button>
            </div>
            <code className="block text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-300 dark:border-gray-600 overflow-x-auto">
              {tunnelDetails.instructions.docker}
            </code>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.cloudflare.wizard.start.option2')}
              </span>
            </div>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <p>1. {t('settings.cloudflare.wizard.start.installCloudfared')}</p>
              <code className="block bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">
                brew install cloudflare/cloudflare/cloudflared
              </code>
              <p>2. {t('settings.cloudflare.wizard.start.runCommand')}</p>
              <code className="block bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 overflow-x-auto">
                {tunnelDetails.instructions.cli}
              </code>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setCurrentStep('done');
            setShowWizard(false);
          }}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{t('settings.cloudflare.wizard.start.finishSetup')}</span>
        </button>
      </div>
    );
  };

  const renderDoneStep = () => {
    if (!config?.activeTunnel) return null;

    return (
      <div className="space-y-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
            {t('settings.cloudflare.wizard.done.title')}
          </h3>
          <p className="text-green-800 dark:text-green-200">
            {t('settings.cloudflare.wizard.done.description')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {t('settings.cloudflare.tunnel.active')}
            </h4>
            <button
              onClick={() => deleteTunnel(config.activeTunnel!.tunnelId)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('settings.cloudflare.wizard.done.deleteTunnel')}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.cloudflare.tunnel.publicUrl')}:
              </span>
              <div className="flex items-center space-x-2 mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                <a
                  href={config.activeTunnel.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm break-all"
                >
                  {config.activeTunnel.publicUrl}
                </a>
                <button
                  onClick={() => copyToClipboard(config.activeTunnel!.publicUrl, 'url')}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('settings.cloudflare.tunnel.name')}:</span>
                <p className="font-mono text-gray-900 dark:text-white">{config.activeTunnel.tunnelName}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('settings.cloudflare.tunnel.localPort')}:</span>
                <p className="font-mono text-gray-900 dark:text-white">{config.activeTunnel.localPort}</p>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('settings.cloudflare.tunnel.createdAt')}: {new Date(config.activeTunnel.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">{t('settings.cloudflare.wizard.done.reminder')}</p>
              <p>{t('settings.cloudflare.wizard.done.keepClientRunning')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      <div>
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white mb-2 flex items-center space-x-2`}>
          <Cloud className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
          <span>{t('settings.cloudflare.title')}</span>
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{t('settings.cloudflare.description')}</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Wizard */}
      {showWizard && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          {renderStepIndicator()}

          {currentStep === 'intro' && renderIntroStep()}
          {currentStep === 'credentials' && renderCredentialsStep()}
          {currentStep === 'create' && renderCreateStep()}
          {currentStep === 'start' && renderStartStep()}
          {currentStep === 'done' && renderDoneStep()}
        </div>
      )}

      {/* Show wizard button when closed */}
      {!showWizard && config?.activeTunnel && (
        <button
          onClick={() => setShowWizard(true)}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center space-x-1"
        >
          <Info className="w-4 h-4" />
          <span>{t('settings.cloudflare.wizard.showGuide')}</span>
        </button>
      )}
    </div>
  );
};
