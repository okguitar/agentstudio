import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  requestCount: number;
  models: string[];
}

export interface DailyUsage {
  date: string;
  stats: UsageStats;
}

export interface WeeklyUsage {
  week: string;
  startDate: string;
  endDate: string;
  stats: UsageStats;
}

export interface MonthlyUsage {
  month: string;
  year: number;
  stats: UsageStats;
}

export interface BlocksUsage {
  blockId: string;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  duration: number;
  stats: UsageStats;
  burnRate: number;
  projectedTotal?: number;
}

export interface LiveMonitoringData {
  currentBlock?: BlocksUsage;
  recentActivity: UsageStats;
  burnRate: number;
  activeModels: string[];
  lastUpdate: string;
}

export interface UsageSummary {
  period: string;
  summary: UsageStats & {
    avgDailyTokens: number;
    avgDailyCost: number;
    activeDays: number;
    currentBurnRate: number;
  };
  trend: DailyUsage[];
  currentBlock?: BlocksUsage;
}

const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3002/api';

async function fetchUsageData<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}/usage${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || `Failed to fetch ${endpoint}`);
  }

  return result.data;
}

/**
 * Hook to get daily usage statistics
 */
export function useDailyUsage(since?: string, until?: string): UseQueryResult<DailyUsage[]> {
  return useQuery({
    queryKey: ['usage', 'daily', since, until],
    queryFn: () => fetchUsageData<DailyUsage[]>('/daily', { since, until }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get weekly usage statistics
 */
export function useWeeklyUsage(since?: string, until?: string): UseQueryResult<WeeklyUsage[]> {
  return useQuery({
    queryKey: ['usage', 'weekly', since, until],
    queryFn: () => fetchUsageData<WeeklyUsage[]>('/weekly', { since, until }),
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to get monthly usage statistics
 */
export function useMonthlyUsage(since?: string, until?: string): UseQueryResult<MonthlyUsage[]> {
  return useQuery({
    queryKey: ['usage', 'monthly', since, until],
    queryFn: () => fetchUsageData<MonthlyUsage[]>('/monthly', { since, until }),
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to get 5-hour blocks usage statistics
 */
export function useBlocksUsage(since?: string, until?: string): UseQueryResult<BlocksUsage[]> {
  return useQuery({
    queryKey: ['usage', 'blocks', since, until],
    queryFn: () => fetchUsageData<BlocksUsage[]>('/blocks', { since, until }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get live monitoring data
 */
export function useLiveMonitoring(enabled: boolean = true): UseQueryResult<LiveMonitoringData> {
  return useQuery({
    queryKey: ['usage', 'live'],
    queryFn: () => fetchUsageData<LiveMonitoringData>('/live'),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    refetchIntervalInBackground: true,
  });
}

/**
 * Hook to get usage summary
 */
export function useUsageSummary(period: '24h' | '7d' | '30d' | '90d' = '7d'): UseQueryResult<UsageSummary> {
  return useQuery({
    queryKey: ['usage', 'summary', period],
    queryFn: () => fetchUsageData<UsageSummary>('/summary', { period }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Utility functions for formatting
 */
export const formatters = {
  tokens: (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  },

  cost: (amount: number): string => {
    return `$${amount.toFixed(4)}`;
  },

  duration: (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  },

  burnRate: (tokensPerMinute: number): string => {
    if (tokensPerMinute >= 1000) {
      return `${(tokensPerMinute / 1000).toFixed(1)}K/min`;
    }
    return `${Math.round(tokensPerMinute)}/min`;
  },

  percentage: (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  }
};