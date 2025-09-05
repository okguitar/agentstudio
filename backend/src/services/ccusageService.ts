// 使用ccusage命令行工具获取数据，避免价格获取问题
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  duration: number; // minutes
  stats: UsageStats;
  burnRate: number; // tokens per minute
  projectedTotal?: number;
}

export interface LiveMonitoringData {
  currentBlock?: BlocksUsage;
  recentActivity: UsageStats;
  burnRate: number;
  activeModels: string[];
  lastUpdate: string;
}

/**
 * 执行ccusage命令并返回JSON数据
 */
async function runCCUsageCommand(command: string): Promise<any> {
  try {
    const { stdout } = await execAsync(`ccusage ${command} --json --offline`, { 
      timeout: 10000,
      env: { ...process.env, NO_COLOR: '1' }
    });
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`Failed to run ccusage command: ${command}`, error);
    throw new Error(`CCUsage command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 格式化ccusage数据为我们的格式
 */
function formatUsageStats(data: any): UsageStats {
  return {
    totalTokens: data.totalTokens || 0,
    totalCost: data.totalCost || 0,
    inputTokens: data.inputTokens || 0,
    outputTokens: data.outputTokens || 0,
    cacheCreateTokens: data.cacheCreationTokens || 0,
    cacheReadTokens: data.cacheReadTokens || 0,
    requestCount: 1, // ccusage doesn't provide request count, so we approximate
    models: data.modelsUsed || []
  };
}

class CCUsageService {
  constructor() {
    // No initialization needed for command-line approach
  }

  /**
   * Get daily usage statistics
   */
  async getDailyUsage(since?: string, until?: string): Promise<DailyUsage[]> {
    try {
      let command = 'daily';
      if (since) command += ` --since ${since.replace(/-/g, '')}`;
      if (until) command += ` --until ${until.replace(/-/g, '')}`;

      const result = await runCCUsageCommand(command);
      
      if (!result.daily || !Array.isArray(result.daily)) {
        return [];
      }

      return result.daily.map((day: any) => ({
        date: day.date,
        stats: formatUsageStats(day)
      }));
    } catch (error) {
      console.error('Error getting daily usage:', error);
      return [];
    }
  }

  /**
   * Get weekly usage statistics
   */
  async getWeeklyUsage(since?: string, until?: string): Promise<WeeklyUsage[]> {
    try {
      let command = 'weekly';
      if (since) command += ` --since ${since.replace(/-/g, '')}`;
      if (until) command += ` --until ${until.replace(/-/g, '')}`;

      const result = await runCCUsageCommand(command);
      
      if (!result.weekly || !Array.isArray(result.weekly)) {
        return [];
      }

      return result.weekly.map((week: any) => {
        const startDate = new Date(week.startDate);
        const endDate = new Date(week.endDate);
        
        return {
          week: `${startDate.getFullYear()}-W${this.getWeekNumber(startDate)}`,
          startDate: week.startDate,
          endDate: week.endDate,
          stats: formatUsageStats(week)
        };
      });
    } catch (error) {
      console.error('Error getting weekly usage:', error);
      return [];
    }
  }

  /**
   * Get monthly usage statistics
   */
  async getMonthlyUsage(since?: string, until?: string): Promise<MonthlyUsage[]> {
    try {
      let command = 'monthly';
      if (since) command += ` --since ${since.replace(/-/g, '')}`;
      if (until) command += ` --until ${until.replace(/-/g, '')}`;

      const result = await runCCUsageCommand(command);
      
      if (!result.monthly || !Array.isArray(result.monthly)) {
        return [];
      }

      return result.monthly.map((month: any) => ({
        month: month.month.toString().padStart(2, '0'),
        year: month.year,
        stats: formatUsageStats(month)
      }));
    } catch (error) {
      console.error('Error getting monthly usage:', error);
      return [];
    }
  }

  /**
   * Get 5-hour blocks usage statistics
   */
  async getBlocksUsage(since?: string, until?: string): Promise<BlocksUsage[]> {
    try {
      let command = 'blocks';
      if (since) command += ` --since ${since.replace(/-/g, '')}`;
      if (until) command += ` --until ${until.replace(/-/g, '')}`;

      const result = await runCCUsageCommand(command);
      
      if (!result.blocks || !Array.isArray(result.blocks)) {
        return [];
      }

      return result.blocks.map((block: any) => {
        const startTime = new Date(block.startTime);
        const endTime = block.endTime ? new Date(block.endTime) : null;
        const isActive = !block.endTime;
        const duration = endTime 
          ? Math.floor((endTime.getTime() - startTime.getTime()) / 60000)
          : Math.floor((Date.now() - startTime.getTime()) / 60000);
        
        const stats = formatUsageStats(block);
        const burnRate = duration > 0 ? stats.totalTokens / duration : 0;
        const projectedTotal = isActive && burnRate > 0 ? burnRate * 300 : undefined; // 300 minutes = 5 hours

        return {
          blockId: block.id || startTime.toISOString(),
          startTime: startTime.toISOString(),
          endTime: endTime?.toISOString() || null,
          isActive,
          duration,
          stats,
          burnRate,
          projectedTotal
        };
      });
    } catch (error) {
      console.error('Error getting blocks usage:', error);
      return [];
    }
  }

  /**
   * Get live monitoring data
   */
  async getLiveMonitoringData(): Promise<LiveMonitoringData> {
    try {
      const [blocks, recentDaily] = await Promise.all([
        this.getBlocksUsage(),
        this.getDailyUsage(
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        )
      ]);

      const currentBlock = blocks.find(block => block.isActive);
      const recentActivity = recentDaily.length > 0 
        ? recentDaily[recentDaily.length - 1].stats 
        : this.getEmptyStats();
      
      const burnRate = currentBlock?.burnRate || 0;
      const activeModels = currentBlock?.stats.models || [];

      return {
        currentBlock,
        recentActivity,
        burnRate,
        activeModels,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting live monitoring data:', error);
      return {
        recentActivity: this.getEmptyStats(),
        burnRate: 0,
        activeModels: [],
        lastUpdate: new Date().toISOString()
      };
    }
  }

  private getEmptyStats(): UsageStats {
    return {
      totalTokens: 0,
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreateTokens: 0,
      cacheReadTokens: 0,
      requestCount: 0,
      models: []
    };
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

export const ccusageService = new CCUsageService();