import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Clock, 
  Zap,
  Calendar,
  Download,
  RefreshCw,
  Timer,
  AlertCircle,
  CheckCircle,
  Gauge
} from 'lucide-react';
import { 
  useDailyUsage, 
  useWeeklyUsage, 
  useMonthlyUsage, 
  useBlocksUsage,
  useLiveMonitoring,
  useUsageSummary,
  formatters,
  DailyUsage,
  WeeklyUsage,
  MonthlyUsage,
  BlocksUsage
} from '../hooks/useUsageStats';

type TimeRange = '24h' | '7d' | '30d' | '90d';
type ViewMode = 'daily' | 'weekly' | 'monthly' | 'blocks' | 'live';

export const UsageStatsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Calculate date range for queries
  const getDateRange = (range: TimeRange) => {
    const now = new Date();
    const since = new Date();
    
    switch (range) {
      case '24h':
        since.setDate(now.getDate() - 1);
        break;
      case '7d':
        since.setDate(now.getDate() - 7);
        break;
      case '30d':
        since.setDate(now.getDate() - 30);
        break;
      case '90d':
        since.setDate(now.getDate() - 90);
        break;
    }
    
    return {
      since: since.toISOString().split('T')[0],
      until: now.toISOString().split('T')[0]
    };
  };

  const { since, until } = getDateRange(timeRange);

  // Data hooks
  const dailyQuery = useDailyUsage(since, until);
  const weeklyQuery = useWeeklyUsage(since, until);
  const monthlyQuery = useMonthlyUsage(since, until);
  const blocksQuery = useBlocksUsage(since, until);
  const liveQuery = useLiveMonitoring(viewMode === 'live' || autoRefresh);
  const summaryQuery = useUsageSummary(timeRange);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      switch (viewMode) {
        case 'daily':
          dailyQuery.refetch();
          break;
        case 'weekly':
          weeklyQuery.refetch();
          break;
        case 'monthly':
          monthlyQuery.refetch();
          break;
        case 'blocks':
          blocksQuery.refetch();
          break;
        case 'live':
          liveQuery.refetch();
          break;
      }
      summaryQuery.refetch();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, viewMode]);

  const getCurrentData = () => {
    switch (viewMode) {
      case 'daily':
        return dailyQuery;
      case 'weekly':
        return weeklyQuery;
      case 'monthly':
        return monthlyQuery;
      case 'blocks':
        return blocksQuery;
      case 'live':
        return liveQuery;
      default:
        return dailyQuery;
    }
  };

  const currentQuery = getCurrentData();
  const summary = summaryQuery.data?.summary;
  const currentBlock = liveQuery.data?.currentBlock;

  // Debug logging
  console.log('UsageStatsPage render:', { 
    timeRange, 
    viewMode, 
    summaryData: summaryQuery.data?.summary,
    isLoading: summaryQuery.isLoading,
    error: summaryQuery.error 
  });

  const exportData = () => {
    const data = currentQuery.data;
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-usage-${viewMode}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claude Code 使用统计</h1>
          <p className="text-gray-600 mt-2">基于 CCusage 的详细使用分析和实时监控</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Mode Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'daily', label: '按日' },
              { key: 'weekly', label: '按周' },
              { key: 'monthly', label: '按月' },
              { key: 'blocks', label: '5小时块' },
              { key: 'live', label: '实时监控' }
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key as ViewMode)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode.key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          {viewMode !== 'live' && (
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: '24h', label: '24小时' },
                { key: '7d', label: '7天' },
                { key: '30d', label: '30天' },
                { key: '90d', label: '90天' }
              ].map((range) => (
                <button
                  key={range.key}
                  onClick={() => setTimeRange(range.key as TimeRange)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range.key
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={autoRefresh ? '停止自动刷新' : '开启自动刷新'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={exportData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导出数据</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {summaryQuery.isLoading ? (
          // Loading skeleton
          [1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))
        ) : summaryQuery.error ? (
          // Error state
          <div className="col-span-4 bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-600">加载统计数据失败: {summaryQuery.error.message}</p>
          </div>
        ) : summary ? (
          // Success state - render cards
          <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-500">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-green-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                {formatters.tokens(summary.avgDailyTokens)}/天
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">总 Token 使用</p>
              <p className="text-2xl font-bold text-gray-900">{formatters.tokens(summary.totalTokens)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-500">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-green-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                {summary.requestCount} 次
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">API 调用次数</p>
              <p className="text-2xl font-bold text-gray-900">{summary.requestCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-500">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-blue-600 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {summary.activeDays} 天
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">活跃天数</p>
              <p className="text-2xl font-bold text-gray-900">{summary.activeDays}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-500">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-green-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                {formatters.cost(summary.avgDailyCost)}/天
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">总费用</p>
              <p className="text-2xl font-bold text-gray-900">{formatters.cost(summary.totalCost)}</p>
            </div>
          </div>
          </>
        ) : (
          // No data fallback
          <div className="col-span-4 bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-500">暂无统计数据</p>
          </div>
        )}
      </div>

      {/* Current Block Status (for live monitoring) */}
      {viewMode === 'live' && currentBlock && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">当前 5 小时会话块</h2>
            <div className="flex items-center space-x-2">
              {currentBlock.isActive ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <Timer className="w-4 h-4 mr-1" />
                  活跃中
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  已完成
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">会话时长</p>
              <p className="text-2xl font-bold text-gray-900">{formatters.duration(currentBlock.duration)}</p>
              <p className="text-xs text-gray-500 mt-1">
                开始时间: {new Date(currentBlock.startTime).toLocaleString()}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-2">Token 消耗率</p>
              <p className="text-2xl font-bold text-gray-900">{formatters.burnRate(currentBlock.burnRate)}</p>
              {currentBlock.projectedTotal && (
                <p className="text-xs text-gray-500 mt-1">
                  预计总量: {formatters.tokens(currentBlock.projectedTotal)}
                </p>
              )}
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-2">当前使用量</p>
              <p className="text-2xl font-bold text-gray-900">{formatters.tokens(currentBlock.stats.totalTokens)}</p>
              <p className="text-xs text-gray-500 mt-1">
                费用: {formatters.cost(currentBlock.stats.totalCost)}
              </p>
            </div>
          </div>
          
          {currentBlock.isActive && currentBlock.burnRate > 1000 && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm font-medium text-orange-800">高使用率警告</p>
                  <p className="text-sm text-orange-700 mt-1">
                    当前 Token 消耗率较高 ({formatters.burnRate(currentBlock.burnRate)})，请注意使用量控制
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-8">
        {/* Usage Trend Chart */}
        <UsageTrendChart 
          data={currentQuery.data}
          viewMode={viewMode}
          isLoading={currentQuery.isLoading}
          error={currentQuery.error}
        />

        {/* Detailed Statistics */}
        {viewMode === 'blocks' && blocksQuery.data && (
          <BlocksDetailView blocks={blocksQuery.data} />
        )}
        
        {/* Model Usage Breakdown */}
        <ModelBreakdownChart 
          data={currentQuery.data}
          viewMode={viewMode}
        />
      </div>
    </div>
  );
};

// Usage Trend Chart Component
interface UsageTrendChartProps {
  data: any;
  viewMode: ViewMode;
  isLoading: boolean;
  error: any;
}

const UsageTrendChart: React.FC<UsageTrendChartProps> = ({ data, viewMode, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">加载数据时出错: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">使用趋势</h2>
        <BarChart3 className="w-5 h-5 text-gray-400" />
      </div>
      
      {data && data.length > 0 ? (
        <div className="space-y-4">
          {/* Chart visualization would go here */}
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">图表可视化区域 (需要集成图表库)</p>
          </div>
          
          {/* Data table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">时间</th>
                  <th className="text-right py-2">Token 数</th>
                  <th className="text-right py-2">费用</th>
                  <th className="text-right py-2">请求数</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(-10).map((item: any, index: number) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2">
                      {item.date || item.week || `${item.year}-${item.month}` || new Date(item.startTime).toLocaleDateString()}
                    </td>
                    <td className="text-right py-2 text-blue-600">
                      {formatters.tokens(item.stats.totalTokens)}
                    </td>
                    <td className="text-right py-2 text-green-600">
                      {formatters.cost(item.stats.totalCost)}
                    </td>
                    <td className="text-right py-2 text-purple-600">
                      {item.stats.requestCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无数据</p>
        </div>
      )}
    </div>
  );
};

// Blocks Detail View Component
interface BlocksDetailViewProps {
  blocks: BlocksUsage[];
}

const BlocksDetailView: React.FC<BlocksDetailViewProps> = ({ blocks }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">5小时会话块详情</h2>
        <Timer className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {blocks.map((block) => (
          <div 
            key={block.blockId}
            className={`p-4 rounded-lg border-l-4 ${
              block.isActive 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {new Date(block.startTime).toLocaleString()}
                </span>
                {block.isActive && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    活跃中
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-600">
                {formatters.duration(block.duration)}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Token: </span>
                <span className="font-medium">{formatters.tokens(block.stats.totalTokens)}</span>
              </div>
              <div>
                <span className="text-gray-600">费用: </span>
                <span className="font-medium">{formatters.cost(block.stats.totalCost)}</span>
              </div>
              <div>
                <span className="text-gray-600">消耗率: </span>
                <span className="font-medium">{formatters.burnRate(block.burnRate)}</span>
              </div>
            </div>
            
            {block.projectedTotal && (
              <div className="mt-2 text-sm text-gray-600">
                预计总量: {formatters.tokens(block.projectedTotal)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Model Breakdown Chart Component
interface ModelBreakdownChartProps {
  data: any;
  viewMode: ViewMode;
}

const ModelBreakdownChart: React.FC<ModelBreakdownChartProps> = ({ data, viewMode }) => {
  if (!data) return null;

  // Handle different data formats based on view mode
  let dataArray: any[] = [];
  
  if (viewMode === 'live') {
    // For live mode, data is a single object with nested structure
    if (data.recentActivity) {
      dataArray = [{ stats: data.recentActivity }];
    }
    if (data.currentBlock) {
      dataArray.push({ stats: data.currentBlock.stats });
    }
  } else {
    // For other modes, data should be an array
    dataArray = Array.isArray(data) ? data : [];
  }

  if (dataArray.length === 0) return null;

  // Aggregate model usage
  const modelUsage = new Map<string, { tokens: number; cost: number; requests: number }>();
  
  dataArray.forEach((item: any) => {
    if (!item.stats || !item.stats.models) return;
    
    item.stats.models.forEach((model: string) => {
      if (!modelUsage.has(model)) {
        modelUsage.set(model, { tokens: 0, cost: 0, requests: 0 });
      }
      const usage = modelUsage.get(model)!;
      usage.tokens += item.stats.totalTokens / item.stats.models.length;
      usage.cost += item.stats.totalCost / item.stats.models.length;
      usage.requests += item.stats.requestCount / item.stats.models.length;
    });
  });

  const sortedModels = Array.from(modelUsage.entries())
    .sort((a, b) => b[1].tokens - a[1].tokens);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">模型使用分布</h2>
        <Gauge className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {sortedModels.map(([model, usage], index) => (
          <div key={model} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                index === 0 ? 'bg-blue-500' :
                index === 1 ? 'bg-green-500' :
                index === 2 ? 'bg-orange-500' :
                'bg-gray-500'
              }`}>
                {index + 1}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{model}</h3>
                <p className="text-sm text-gray-500">
                  {Math.round(usage.requests)} 次调用
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900">{formatters.tokens(Math.round(usage.tokens))}</p>
              <p className="text-sm text-gray-500">{formatters.cost(usage.cost)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};