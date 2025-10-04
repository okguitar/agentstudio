import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Clock,
  Zap,
  Calendar,
  Download
} from 'lucide-react';

type TimeRange = '7d' | '30d' | '90d';

export const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const stats = [
    {
      name: t('analytics.stats.totalCalls'),
      value: '12,847',
      change: '+12.3%',
      trend: 'up',
      icon: Activity,
      color: 'bg-blue-500'
    },
    {
      name: t('analytics.stats.activeUsers'),
      value: '89',
      change: '+5.2%',
      trend: 'up',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      name: t('analytics.stats.avgResponseTime'),
      value: '2.1s',
      change: '-0.3s',
      trend: 'up',
      icon: Clock,
      color: 'bg-orange-500'
    },
    {
      name: t('analytics.stats.tokenUsage'),
      value: '234.5K',
      change: '+18.7%',
      trend: 'up',
      icon: Zap,
      color: 'bg-purple-500'
    }
  ];

  const topAgents = [
    { name: t('analytics.topAgents.pptEditor'), usage: 3247, percentage: 35.2 },
    { name: t('analytics.topAgents.codeAssistant'), usage: 2891, percentage: 31.4 },
    { name: t('analytics.topAgents.docWriter'), usage: 2156, percentage: 23.4 },
    { name: t('analytics.topAgents.custom'), usage: 953, percentage: 10.0 }
  ];

  const dailyUsage = [
    { date: '03-22', requests: 1200, users: 45, tokens: 23500 },
    { date: '03-23', requests: 1450, users: 52, tokens: 28900 },
    { date: '03-24', requests: 1100, users: 38, tokens: 21300 },
    { date: '03-25', requests: 1680, users: 61, tokens: 35200 },
    { date: '03-26', requests: 1890, users: 73, tokens: 42100 },
    { date: '03-27', requests: 2100, users: 81, tokens: 48700 },
    { date: '03-28', requests: 1950, users: 76, tokens: 45800 }
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="text-gray-600 mt-2">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: '7d', label: t('analytics.timeRange.7days') },
              { key: '30d', label: t('analytics.timeRange.30days') },
              { key: '90d', label: t('analytics.timeRange.90days') }
            ].map((range) => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key as TimeRange)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range.key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>{t('analytics.exportReport')}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className={`text-sm font-medium flex items-center ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className="w-4 h-4 mr-1" />
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Usage Trend Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{t('analytics.charts.usageTrend')}</h2>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>

          {/* Simple chart visualization */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600 pb-2 border-b">
              <span>{t('analytics.charts.date')}</span>
              <span>{t('analytics.charts.requests')}</span>
              <span>{t('analytics.charts.users')}</span>
              <span>{t('analytics.charts.tokens')}</span>
            </div>
            {dailyUsage.map((day) => (
              <div key={day.date} className="flex items-center justify-between text-sm">
                <span className="font-medium">{day.date}</span>
                <span className="text-blue-600">{day.requests}</span>
                <span className="text-green-600">{day.users}</span>
                <span className="text-purple-600">{day.tokens.toLocaleString()}</span>
              </div>
            ))}
          </div>
          
          {/* Visual bar chart */}
          <div className="mt-6">
            <div className="flex items-end justify-between h-32 space-x-2">
              {dailyUsage.map((day) => {
                const height = (day.requests / Math.max(...dailyUsage.map(d => d.requests))) * 100;
                return (
                  <div key={day.date} className="flex flex-col items-center">
                    <div 
                      className="w-8 bg-blue-500 rounded-t-sm"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.requests} ${t('analytics.charts.requestsUnit')}`}
                    />
                    <span className="text-xs text-gray-500 mt-1">{day.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Agents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{t('analytics.charts.topAgents')}</h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            {topAgents.map((agent, index) => (
              <div key={agent.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-600' :
                    'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-500">{agent.usage} {t('analytics.charts.usageCount')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${agent.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12">
                    {agent.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('analytics.performance.title')}</h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('analytics.performance.avgResponseTime')}</span>
              <span className="font-semibold text-gray-900">2.1s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('analytics.performance.successRate')}</span>
              <span className="font-semibold text-green-600">99.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('analytics.performance.errorRate')}</span>
              <span className="font-semibold text-red-600">0.8%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('analytics.performance.timeoutRate')}</span>
              <span className="font-semibold text-yellow-600">2.1%</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="font-medium text-gray-900 mb-3">{t('analytics.performance.responseDistribution')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">&lt; 1s</span>
                <span>45%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">1-3s</span>
                <span>38%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">3-5s</span>
                <span>12%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">&gt; 5s</span>
                <span>5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Patterns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">使用模式</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">高峰时段</h3>
              <p className="text-sm text-gray-600 mb-3">用户最活跃的时间段</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>09:00 - 12:00</span>
                  <span className="font-medium">35%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>14:00 - 18:00</span>
                  <span className="font-medium">42%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>20:00 - 22:00</span>
                  <span className="font-medium">18%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>其他时间</span>
                  <span className="font-medium">5%</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="font-medium text-gray-900 mb-2">功能使用</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">对话交互</span>
                  <span>65%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">文档生成</span>
                  <span>22%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">代码分析</span>
                  <span>13%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">资源使用</h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Token使用</span>
                <span className="font-semibold">234.5K / 500K</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '47%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">本月已使用 47%</p>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">API调用</span>
                <span className="font-semibold">12.8K / 50K</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '26%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">本月已使用 26%</p>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">存储空间</span>
                <span className="font-semibold">1.2GB / 10GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-600 h-2 rounded-full" style={{ width: '12%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">已使用 12%</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-medium text-gray-900 mb-2">费用统计</h3>
            <div className="text-2xl font-bold text-gray-900 mb-1">¥128.50</div>
            <p className="text-sm text-gray-500">本月总费用</p>
          </div>
        </div>
      </div>
    </div>
  );
};