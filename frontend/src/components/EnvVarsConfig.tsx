import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EnvVarsConfigProps {
    envVars: Record<string, string>;
    onChange: (envVars: Record<string, string>) => void;
}

export const EnvVarsConfig: React.FC<EnvVarsConfigProps> = ({ envVars, onChange }) => {
    const { t } = useTranslation('components');
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');

    const handleAdd = () => {
        if (!newKey.trim()) return;

        const updatedEnvVars = { ...envVars, [newKey.trim()]: newValue };
        onChange(updatedEnvVars);
        setNewKey('');
        setNewValue('');
    };

    const handleRemove = (key: string) => {
        const updatedEnvVars = { ...envVars };
        delete updatedEnvVars[key];
        onChange(updatedEnvVars);
    };

    const handleUpdate = (oldKey: string, newKey: string, newValue: string) => {
        if (oldKey !== newKey) {
            const updatedEnvVars = { ...envVars };
            delete updatedEnvVars[oldKey];
            updatedEnvVars[newKey] = newValue;
            onChange(updatedEnvVars);
        } else {
            const updatedEnvVars = { ...envVars, [oldKey]: newValue };
            onChange(updatedEnvVars);
        }
    };

    return (
        <div className="space-y-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('agentChat.envVars.title', 'Environment Variables')}
            </div>

            {/* List of existing env vars */}
            <div className="space-y-2">
                {Object.entries(envVars).length === 0 && (
                    <div className="text-sm text-gray-400 italic px-2">
                        {t('agentChat.envVars.noVars', 'No environment variables set')}
                    </div>
                )}
                {Object.entries(envVars).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={key}
                            onChange={(e) => handleUpdate(key, e.target.value, value)}
                            className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder={t('agentChat.envVars.key', 'KEY')}
                        />
                        <span className="text-gray-400">=</span>
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => handleUpdate(key, key, e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder={t('agentChat.envVars.value', 'VALUE')}
                        />
                        <button
                            onClick={() => handleRemove(key)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title={t('agentChat.envVars.delete', 'Remove')}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add new env var */}
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('agentChat.envVars.key', 'NEW_KEY')}
                />
                <span className="text-gray-400">=</span>
                <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('agentChat.envVars.value', 'VALUE')}
                />
                <button
                    onClick={handleAdd}
                    disabled={!newKey.trim()}
                    className="p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('agentChat.envVars.add', 'Add')}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
