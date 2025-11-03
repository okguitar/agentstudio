import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Moon,
  Sun,
  Monitor,
  Globe,
} from 'lucide-react';
import { useMobileContext } from '../../contexts/MobileContext';

export const GeneralSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  // Initialize theme from localStorage directly to avoid race conditions
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'auto');
  const [language, setLanguage] = useState(i18n.language);

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
    </div>
  );
};