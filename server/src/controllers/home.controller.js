const homeAggregatorService = require('../services/home-aggregator.service');

class HomeController {
  /**
   * GET /api/home
   * Get complete home page data
   */
  async getHomeData(req, res) {
    try {
      const data = await homeAggregatorService.getHomeData();
      res.json(data);
    } catch (error) {
      console.error('Error getting home data:', error);
      res.status(500).json({ error: 'Failed to get home data' });
    }
  }

  /**
   * GET /api/home/streaming
   * Get current streaming sessions
   */
  async getStreamingSessions(req, res) {
    try {
      const sessions = await homeAggregatorService.getStreamingSessions();
      res.json(sessions);
    } catch (error) {
      console.error('Error getting streaming sessions:', error);
      res.status(500).json({ error: 'Failed to get streaming sessions' });
    }
  }

  /**
   * GET /api/home/downloads
   * Get current download queue
   */
  async getDownloads(req, res) {
    try {
      const downloads = await homeAggregatorService.getDownloads();
      res.json(downloads);
    } catch (error) {
      console.error('Error getting downloads:', error);
      res.status(500).json({ error: 'Failed to get downloads' });
    }
  }

  /**
   * GET /api/home/stats
   * Get quick stats
   */
  async getStats(req, res) {
    try {
      const stats = await homeAggregatorService.getQuickStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }

  /**
   * GET /api/home/activity
   * Get paginated recent activity
   */
  async getActivity(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      const type = req.query.type || 'all';

      const result = await homeAggregatorService.getRecentActivity(limit, offset, type);
      res.json(result);
    } catch (error) {
      console.error('Error getting activity:', error);
      res.status(500).json({ error: 'Failed to get activity' });
    }
  }
}

module.exports = new HomeController();
