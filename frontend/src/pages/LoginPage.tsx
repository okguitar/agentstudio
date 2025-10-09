import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useBackendServices } from '../hooks/useBackendServices';
import { Server } from 'lucide-react';

export function LoginPage() {
  const { t } = useTranslation('pages');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();
  const { currentService } = useBackendServices();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const success = await login(password);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('login.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('login.subtitle')}
            </p>

            {/* Current Service Info */}
            {currentService && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                  <Server className="w-4 h-4" />
                  <span className="font-medium">{currentService.name}</span>
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <span className="text-xs truncate max-w-40">{currentService.url}</span>
                </div>
              </div>
            )}
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('login.passwordLabel')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                required
                autoFocus
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500
                         transition-colors"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full py-3 px-4 rounded-lg font-medium text-white
                       bg-blue-600 hover:bg-blue-700
                       disabled:bg-gray-400 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                       transition-colors"
            >
              {isLoading ? t('login.loggingIn') : t('login.loginButton')}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('login.footer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
