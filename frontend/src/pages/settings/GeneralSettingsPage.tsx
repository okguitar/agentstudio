import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Moon,
  Sun,
  Monitor,
  Globe,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useMobileContext } from '../../contexts/MobileContext';
import { authFetch } from '../../lib/authFetch';
import { API_BASE } from '../../lib/config.js';
import { useAuth } from '../../hooks/useAuth';

export const GeneralSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  const { checkPasswordRequired } = useAuth();
  
  // Initialize theme from localStorage directly to avoid race conditions
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'auto');
  const [language, setLanguage] = useState(i18n.language);
  
  // Password management state
  const [passwordRequired, setPasswordRequired] = useState<boolean | null>(null);
  const [checkingPassword, setCheckingPassword] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check current password status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setCheckingPassword(true);
      try {
        const result = await checkPasswordRequired();
        setPasswordRequired(result.passwordRequired);
      } catch (err) {
        console.error('Failed to check password status:', err);
      } finally {
        setCheckingPassword(false);
      }
    };
    checkStatus();
  }, [checkPasswordRequired]);

  // Handle password save
  const handleSavePassword = async () => {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: t('settings.general.password.mismatch', '两次输入的密码不一致') });
      return;
    }

    // Validate password length if setting a password
    if (newPassword && newPassword.length < 4) {
      setPasswordMessage({ type: 'error', text: t('settings.general.password.tooShort', '密码长度至少为4位') });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);

    try {
      const response = await authFetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminPassword: newPassword || '', // Empty string to clear password
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPasswordMessage({
          type: 'success',
          text: newPassword
            ? t('settings.general.password.setSuccess', '密码设置成功，下次登录时生效')
            : t('settings.general.password.clearSuccess', '密码已清除，系统现在可以免密登录'),
        });
        setPasswordRequired(!!newPassword);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({
          type: 'error',
          text: data.error || t('settings.general.password.saveFailed', '保存密码失败'),
        });
      }
    } catch (err) {
      console.error('Failed to save password:', err);
      setPasswordMessage({
        type: 'error',
        text: t('settings.general.password.saveFailed', '保存密码失败'),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle clear password
  const handleClearPassword = async () => {
    setSavingPassword(true);
    setPasswordMessage(null);

    try {
      const response = await authFetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminPassword: '',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPasswordMessage({
          type: 'success',
          text: t('settings.general.password.clearSuccess', '密码已清除，系统现在可以免密登录'),
        });
        setPasswordRequired(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({
          type: 'error',
          text: data.error || t('settings.general.password.clearFailed', '清除密码失败'),
        });
      }
    } catch (err) {
      console.error('Failed to clear password:', err);
      setPasswordMessage({
        type: 'error',
        text: t('settings.general.password.clearFailed', '清除密码失败'),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Sync language state with i18n
  useEffect(() => {
    setLanguage(i18n.language);
  }, [i18n.language]);

  // Apply theme changes
  useEffect(() => {
    const applyTheme = () => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // Auto theme
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme();
    localStorage.setItem('theme', theme);

    // Trigger a storage event for App.tsx to pick up the change
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  return (
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      <div>
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white mb-2`}>{t('settings.general.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400">{t('settings.general.description')}</p>
      </div>

      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${isMobile ? 'p-4' : 'p-6'}`}>
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 dark:text-white mb-4`}>{t('settings.general.interfaceSettings')}</h3>
        <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          {/* Theme Selection */}
          <div>
            <label className="block font-medium text-gray-900 dark:text-white mb-3">{t('settings.general.theme.label')}</label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('settings.general.theme.description')}</p>
            <div className={`${isMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-3 gap-3'}`}>
              {[
                { value: 'auto', label: t('settings.general.theme.auto'), icon: Monitor },
                { value: 'light', label: t('settings.general.theme.light'), icon: Sun },
                { value: 'dark', label: t('settings.general.theme.dark'), icon: Moon }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`${isMobile ? 'p-3' : 'p-4'} border-2 rounded-lg flex items-center ${isMobile ? 'flex-row space-x-3' : 'flex-col space-y-2'} transition-all ${
                    theme === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <option.icon className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block font-medium text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
              <Globe className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <span>{t('settings.general.language.label')}</span>
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('settings.general.language.description')}</p>
            <div className={`${isMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}`}>
              {[
                { value: 'zh-CN', label: '中文简体', flag: '🇨🇳' },
                { value: 'en-US', label: 'English', flag: '🇺🇸' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleLanguageChange(option.value)}
                  className={`${isMobile ? 'p-3' : 'p-4'} border-2 rounded-lg flex items-center space-x-3 transition-all ${
                    language === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>{option.flag}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Password Management Section */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${isMobile ? 'p-4' : 'p-6'}`}>
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2`}>
          <Lock className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <span>{t('settings.general.password.title', '访问密码')}</span>
        </h3>
        
        <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          {/* Current Password Status */}
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            {checkingPassword ? (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                <span className="text-sm">{t('settings.general.password.checking', '正在检查...')}</span>
              </div>
            ) : passwordRequired ? (
              <>
                <Lock className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('settings.general.password.currentlySet', '当前已设置访问密码')}
                </span>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('settings.general.password.currentlyNotSet', '当前未设置密码，可免密登录')}
                </span>
              </>
            )}
          </div>

          {/* Password Form */}
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.general.password.description', '设置密码后，登录时需要输入密码。留空并保存可清除密码，启用免密登录。')}
            </p>

            {/* New Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.general.password.newPassword', '新密码')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('settings.general.password.newPasswordPlaceholder', '输入新密码（留空则清除密码）')}
                  className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.general.password.confirmPassword', '确认密码')}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('settings.general.password.confirmPasswordPlaceholder', '再次输入密码')}
                  className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Message Display */}
            {passwordMessage && (
              <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                passwordMessage.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {passwordMessage.type === 'success' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{passwordMessage.text}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSavePassword}
                disabled={savingPassword || (!newPassword && !confirmPassword)}
                className="px-4 py-2 rounded-lg font-medium text-white
                         bg-blue-600 hover:bg-blue-700
                         disabled:bg-gray-400 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         transition-colors flex items-center space-x-2"
              >
                {savingPassword ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{t('settings.general.password.save', '保存密码')}</span>
              </button>

              {passwordRequired && (
                <button
                  onClick={handleClearPassword}
                  disabled={savingPassword}
                  className="px-4 py-2 rounded-lg font-medium
                           text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700
                           hover:bg-red-50 dark:hover:bg-red-900/20
                           disabled:opacity-50 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                           transition-colors flex items-center space-x-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{t('settings.general.password.clear', '清除密码')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};