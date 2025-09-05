import express from 'express';
import { ccusageService } from '../services/ccusageService.js';

const router = express.Router();

/**
 * GET /api/usage/daily
 * Get daily usage statistics
 */
router.get('/daily', async (req, res) => {
  try {
    const { since, until } = req.query;
    const dailyUsage = await ccusageService.getDailyUsage(
      since as string,
      until as string
    );
    
    res.json({
      success: true,
      data: dailyUsage,
      total: dailyUsage.length
    });
  } catch (error) {
    console.error('Error getting daily usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily usage statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/usage/weekly
 * Get weekly usage statistics
 */
router.get('/weekly', async (req, res) => {
  try {
    const { since, until } = req.query;
    const weeklyUsage = await ccusageService.getWeeklyUsage(
      since as string,
      until as string
    );
    
    res.json({
      success: true,
      data: weeklyUsage,
      total: weeklyUsage.length
    });
  } catch (error) {
    console.error('Error getting weekly usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get weekly usage statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/usage/monthly
 * Get monthly usage statistics
 */
router.get('/monthly', async (req, res) => {
  try {
    const { since, until } = req.query;
    const monthlyUsage = await ccusageService.getMonthlyUsage(
      since as string,
      until as string
    );
    
    res.json({
      success: true,
      data: monthlyUsage,
      total: monthlyUsage.length
    });
  } catch (error) {
    console.error('Error getting monthly usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monthly usage statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/usage/blocks
 * Get 5-hour blocks usage statistics
 */
router.get('/blocks', async (req, res) => {
  try {
    const { since, until } = req.query;
    const blocksUsage = await ccusageService.getBlocksUsage(
      since as string,
      until as string
    );
    
    res.json({
      success: true,
      data: blocksUsage,
      total: blocksUsage.length
    });
  } catch (error) {
    console.error('Error getting blocks usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blocks usage statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/usage/live
 * Get live monitoring data
 */
router.get('/live', async (req, res) => {
  try {
    const liveData = await ccusageService.getLiveMonitoringData();
    
    res.json({
      success: true,
      data: liveData
    });
  } catch (error) {
    console.error('Error getting live monitoring data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/usage/summary
 * Get overall usage summary
 */
router.get('/summary', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let since: string | undefined;
    const now = new Date();
    
    switch (period) {
      case '24h':
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '7d':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30d':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90d':
        since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
    }

    const [dailyUsage, liveData] = await Promise.all([
      ccusageService.getDailyUsage(since),
      ccusageService.getLiveMonitoringData()
    ]);

    // Calculate totals
    const totalStats = dailyUsage.reduce((acc, day) => ({
      totalTokens: acc.totalTokens + day.stats.totalTokens,
      totalCost: acc.totalCost + day.stats.totalCost,
      inputTokens: acc.inputTokens + day.stats.inputTokens,
      outputTokens: acc.outputTokens + day.stats.outputTokens,
      cacheCreateTokens: acc.cacheCreateTokens + day.stats.cacheCreateTokens,
      cacheReadTokens: acc.cacheReadTokens + day.stats.cacheReadTokens,
      requestCount: acc.requestCount + day.stats.requestCount,
      models: Array.from(new Set([...acc.models, ...day.stats.models]))
    }), {
      totalTokens: 0,
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreateTokens: 0,
      cacheReadTokens: 0,
      requestCount: 0,
      models: [] as string[]
    });

    const avgDailyTokens = dailyUsage.length > 0 ? totalStats.totalTokens / dailyUsage.length : 0;
    const avgDailyCost = dailyUsage.length > 0 ? totalStats.totalCost / dailyUsage.length : 0;
    
    res.json({
      success: true,
      data: {
        period,
        summary: {
          ...totalStats,
          avgDailyTokens: Math.round(avgDailyTokens),
          avgDailyCost: parseFloat(avgDailyCost.toFixed(4)),
          activeDays: dailyUsage.filter(d => d.stats.requestCount > 0).length,
          currentBurnRate: liveData.burnRate
        },
        trend: dailyUsage.slice(-7), // Last 7 days for trend
        currentBlock: liveData.currentBlock
      }
    });
  } catch (error) {
    console.error('Error getting usage summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as usageRouter };