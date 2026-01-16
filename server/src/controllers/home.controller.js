const homeAggregatorService = require('../services/home-aggregator.service');
const radarrService = require('../services/radarr.service');
const sonarrService = require('../services/sonarr.service');
const overseerrService = require('../services/overseerr.service');

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

  /**
   * GET /api/home/calendar
   * Get combined calendar from Radarr and Sonarr
   */
  async getCalendar(req, res) {
    try {
      const days = parseInt(req.query.days) || 7;
      
      // Calculate date range
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Fetch calendars in parallel
      const [radarrCalendar, sonarrCalendar] = await Promise.all([
        radarrService.getCalendar(startISO, endISO).catch(() => []),
        sonarrService.getCalendar(startISO, endISO).catch(() => [])
      ]);

      // Combine and sort by date
      const combined = [...radarrCalendar, ...sonarrCalendar].sort((a, b) => {
        const dateA = new Date(a.releaseDate || a.airDate);
        const dateB = new Date(b.releaseDate || b.airDate);
        return dateA - dateB;
      });

      // Group by date
      const grouped = {};
      combined.forEach(item => {
        const dateStr = new Date(item.releaseDate || item.airDate).toISOString().split('T')[0];
        if (!grouped[dateStr]) {
          grouped[dateStr] = [];
        }
        grouped[dateStr].push(item);
      });

      res.json({ 
        items: combined,
        grouped,
        startDate: startISO,
        endDate: endISO
      });
    } catch (error) {
      console.error('Error getting calendar:', error);
      res.status(500).json({ error: 'Failed to get calendar' });
    }
  }

  /**
   * GET /api/home/requests
   * Get Overseerr requests for widget
   */
  async getRequests(req, res) {
    try {
      const status = req.query.status ? parseInt(req.query.status) : undefined;
      const take = parseInt(req.query.take) || 10;
      const skip = parseInt(req.query.skip) || 0;

      const result = await overseerrService.getRequests({ status, take, skip });
      res.json(result);
    } catch (error) {
      console.error('Error getting requests:', error);
      res.status(500).json({ error: 'Failed to get requests' });
    }
  }

  /**
   * GET /api/home/shortcuts
   * Get configured service URLs for shortcuts widget
   */
  async getShortcuts(req, res) {
    try {
      const shortcuts = await homeAggregatorService.getShortcuts();
      res.json({ shortcuts });
    } catch (error) {
      console.error('Error getting shortcuts:', error);
      res.status(500).json({ error: 'Failed to get shortcuts' });
    }
  }
}

module.exports = new HomeController();
