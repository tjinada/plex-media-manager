const TautulliService = require('./tautulli.service');
const radarrService = require('./radarr.service');
const sonarrService = require('./sonarr.service');
const nzbgetService = require('./nzbget.service');
const qbittorrentService = require('./qbittorrent.service');
const TautulliConfig = require('../models/TautulliConfig');
const PlaybackSession = require('../models/PlaybackSession');
const Movie = require('../models/Movie');
const TVShow = require('../models/TVShow');

class HomeAggregatorService {
  constructor() {
    this.tautulliService = null;
  }

  /**
   * Initialize Tautulli service with config from database
   */
  async initializeTautulli() {
    try {
      const config = await TautulliConfig.getConfig();
      if (config && config.enabled) {
        this.tautulliService = new TautulliService(config.host, config.getDecryptedApiKey());
        return true;
      }
    } catch (error) {
      console.error('Error initializing Tautulli:', error.message);
    }
    this.tautulliService = null;
    return false;
  }
  /**
   * Get complete home page data
   */
  async getHomeData() {
    const [streaming, downloadsData, stats, recentActivity] = await Promise.all([
      this.getStreamingSessions(),
      this.getDownloads(),
      this.getQuickStats(),
      this.getRecentActivity(10, 0, 'all')
    ]);

    return {
      streaming,
      downloads: downloadsData.items,
      downloadStats: {
        totalSpeed: downloadsData.totalSpeed,
        totalActive: downloadsData.totalActive,
        totalQueued: downloadsData.totalQueued
      },
      stats,
      recentActivity: recentActivity.activities
    };
  }

  /**
   * Get current streaming sessions from Tautulli
   */
  async getStreamingSessions() {
    try {
      // Initialize Tautulli if not already done
      if (!this.tautulliService) {
        const initialized = await this.initializeTautulli();
        if (!initialized) {
          return [];
        }
      }

      const activity = await this.tautulliService.getActivity();

      if (!activity || !activity.sessions) {
        return [];
      }

      return activity.sessions.map(session => this.transformSession(session));
    } catch (error) {
      console.error('Error fetching streaming sessions:', error.message);
      // Reset tautulli service on error to retry initialization next time
      this.tautulliService = null;
      return [];
    }
  }

  /**
   * Transform Tautulli session to our format
   */
  transformSession(session) {
    const isEpisode = session.media_type === 'episode';

    return {
      sessionKey: session.session_key,
      user: {
        name: session.friendly_name || session.username || 'Unknown',
        id: session.user_id,
        thumb: session.user_thumb
      },
      media: {
        type: isEpisode ? 'episode' : 'movie',
        title: isEpisode ? session.title : session.full_title || session.title,
        year: session.year ? parseInt(session.year) : undefined,
        showTitle: isEpisode ? session.grandparent_title : undefined,
        seasonEpisode: isEpisode
          ? `S${String(session.parent_media_index || 0).padStart(2, '0')}E${String(session.media_index || 0).padStart(2, '0')}`
          : undefined,
        thumb: session.thumb,
        ratingKey: session.rating_key
      },
      player: {
        name: session.player || 'Unknown',
        platform: session.platform || 'Unknown',
        product: session.product,
        device: session.device || session.platform_name
      },
      // Source quality (original file)
      sourceQuality: {
        resolution: session.video_full_resolution || 'Unknown',
        videoCodec: session.video_codec || 'Unknown',
        audioCodec: session.audio_codec || 'Unknown',
        audioChannels: session.audio_channel_layout || session.audio_channels,
        bitrate: session.bitrate ? parseInt(session.bitrate) : undefined,
        container: session.container
      },
      // Stream quality (what's being delivered)
      streamQuality: {
        resolution: session.stream_video_full_resolution || session.video_full_resolution || 'Unknown',
        videoCodec: session.stream_video_codec || session.video_codec || 'Unknown',
        audioCodec: session.stream_audio_codec || session.audio_codec || 'Unknown',
        audioChannels: session.stream_audio_channel_layout || session.stream_audio_channels,
        bitrate: session.stream_bitrate ? parseInt(session.stream_bitrate) : undefined,
        container: session.stream_container || session.container
      },
      // Keep old quality field for backward compatibility
      quality: {
        resolution: session.stream_video_full_resolution || session.video_resolution || 'Unknown',
        videoCodec: session.stream_video_codec || session.video_codec || 'Unknown',
        audioCodec: session.stream_audio_codec || session.audio_codec
      },
      playback: {
        decision: this.normalizeDecision(session.transcode_decision),
        progress: session.progress_percent ? parseFloat(session.progress_percent) : 0,
        duration: session.duration ? parseInt(session.duration) : 0,
        state: session.state || 'playing',
        startedAt: session.started ? new Date(session.started * 1000).toISOString() : undefined
      },
      transcoding: session.transcode_decision !== 'direct play' ? {
        videoDecision: this.normalizeDecision(session.stream_video_decision),
        audioDecision: this.normalizeDecision(session.stream_audio_decision),
        hwDecode: session.transcode_hw_decoding === '1' || session.transcode_hw_decoding === true,
        hwEncode: session.transcode_hw_encoding === '1' || session.transcode_hw_encoding === true,
        speed: session.transcode_speed ? parseFloat(session.transcode_speed) : undefined,
        throttled: session.transcode_throttled === '1' || session.transcode_throttled === true
      } : undefined,
      network: {
        location: session.location === 'lan' ? 'lan' : 'wan',
        bandwidth: session.bandwidth ? parseInt(session.bandwidth) : undefined,
        secure: session.secure === '1' || session.secure === true,
        relayed: session.relayed === '1' || session.relayed === true
      }
    };
  }

  /**
   * Normalize transcode decision string
   */
  normalizeDecision(decision) {
    if (!decision) return 'directplay';
    const normalized = decision.toLowerCase().replace(/\s+/g, '');
    if (normalized === 'directplay' || normalized === 'direct') return 'directplay';
    if (normalized === 'copy' || normalized === 'directstream') return 'copy';
    return 'transcode';
  }

  /**
   * Get current downloads from all sources (Radarr, Sonarr, NZBGet, qBittorrent)
   */
  async getDownloads() {
    const downloads = [];
    let totalSpeed = 0;

    // Fetch from all sources in parallel
    const [radarrQueue, sonarrQueue, nzbgetQueue, qbtQueue] = await Promise.all([
      this.getRadarrQueue().catch(err => {
        console.error('Error fetching Radarr queue:', err.message);
        return [];
      }),
      this.getSonarrQueue().catch(err => {
        console.error('Error fetching Sonarr queue:', err.message);
        return [];
      }),
      this.getNzbgetQueue().catch(err => {
        console.error('Error fetching NZBGet queue:', err.message);
        return { downloads: [], speed: 0 };
      }),
      this.getQbittorrentQueue().catch(err => {
        console.error('Error fetching qBittorrent queue:', err.message);
        return { torrents: [], downloadSpeed: 0 };
      })
    ]);

    downloads.push(...radarrQueue);
    downloads.push(...sonarrQueue);
    downloads.push(...nzbgetQueue.downloads);
    downloads.push(...qbtQueue.torrents);

    // Calculate total download speed
    totalSpeed = (nzbgetQueue.speed || 0) + (qbtQueue.downloadSpeed || 0);

    // Sort by progress descending (most complete first)
    const sortedDownloads = downloads.sort((a, b) => b.progress - a.progress);

    // Add total speed to first item or return with metadata
    return {
      items: sortedDownloads,
      totalSpeed,
      totalActive: sortedDownloads.filter(d => d.status === 'downloading').length,
      totalQueued: sortedDownloads.filter(d => d.status === 'queued').length
    };
  }

  /**
   * Get NZBGet download queue
   */
  async getNzbgetQueue() {
    try {
      const queue = await nzbgetService.getQueue();
      return {
        downloads: queue.downloads.map(item => ({
          id: item.id,
          source: 'nzbget',
          type: 'usenet',
          title: item.name,
          status: item.status,
          progress: item.progress,
          size: item.size,
          sizeRemaining: item.sizeRemaining,
          speed: item.speed,
          eta: item.eta,
          quality: undefined,
          category: item.category
        })),
        speed: queue.speed || 0
      };
    } catch (error) {
      return { downloads: [], speed: 0 };
    }
  }

  /**
   * Get qBittorrent torrent queue
   */
  async getQbittorrentQueue() {
    try {
      const queue = await qbittorrentService.getQueue();
      return {
        torrents: queue.torrents.map(item => ({
          id: item.id,
          source: 'qbittorrent',
          type: 'torrent',
          title: item.name,
          status: item.status,
          progress: item.progress,
          size: item.size,
          sizeRemaining: item.sizeRemaining,
          speed: item.downloadSpeed,
          eta: item.eta,
          quality: undefined,
          category: item.category,
          seeds: item.seeds,
          peers: item.peers,
          ratio: item.ratio
        })),
        downloadSpeed: queue.downloadSpeed || 0
      };
    } catch (error) {
      return { torrents: [], downloadSpeed: 0 };
    }
  }

  /**
   * Get Radarr download queue
   */
  async getRadarrQueue() {
    try {
      const queue = await radarrService.getQueue();
      if (!queue || !queue.records) return [];

      return queue.records.map(item => ({
        id: `radarr-${item.id}`,
        source: 'radarr',
        type: 'movie',
        title: item.movie?.title || item.title || 'Unknown',
        status: this.mapQueueStatus(item.status, item.trackedDownloadState),
        progress: item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0,
        size: item.size || 0,
        sizeRemaining: item.sizeleft || 0,
        speed: undefined, // Radarr doesn't provide speed
        eta: item.timeleft || undefined,
        quality: item.quality?.quality?.name || 'Unknown',
        indexer: item.indexer || undefined,
        added: item.added ? new Date(item.added) : undefined
      }));
    } catch (error) {
      console.error('Error fetching Radarr queue:', error.message);
      return [];
    }
  }

  /**
   * Get Sonarr download queue
   */
  async getSonarrQueue() {
    try {
      const queue = await sonarrService.getQueue();
      if (!queue || !queue.records) return [];

      return queue.records.map(item => ({
        id: `sonarr-${item.id}`,
        source: 'sonarr',
        type: 'episode',
        title: item.episode
          ? `${item.series?.title || 'Unknown'} S${String(item.episode.seasonNumber).padStart(2, '0')}E${String(item.episode.episodeNumber).padStart(2, '0')}`
          : item.title || 'Unknown',
        status: this.mapQueueStatus(item.status, item.trackedDownloadState),
        progress: item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0,
        size: item.size || 0,
        sizeRemaining: item.sizeleft || 0,
        speed: undefined,
        eta: item.timeleft || undefined,
        quality: item.quality?.quality?.name || 'Unknown',
        indexer: item.indexer || undefined,
        added: item.added ? new Date(item.added) : undefined,
        seriesTitle: item.series?.title,
        seasonNumber: item.episode?.seasonNumber,
        episodeNumber: item.episode?.episodeNumber,
        episodeTitle: item.episode?.title
      }));
    } catch (error) {
      console.error('Error fetching Sonarr queue:', error.message);
      return [];
    }
  }

  /**
   * Map queue status to our format
   */
  mapQueueStatus(status, trackedState) {
    const state = (trackedState || status || '').toLowerCase();

    if (state.includes('download')) return 'downloading';
    if (state.includes('queue') || state.includes('pending')) return 'queued';
    if (state.includes('pause')) return 'paused';
    if (state.includes('import')) return 'importing';
    if (state.includes('extract')) return 'extracting';
    if (state.includes('seed')) return 'seeding';
    if (state.includes('stall')) return 'stalled';
    if (state.includes('error') || state.includes('fail')) return 'error';

    return 'queued';
  }

  /**
   * Get quick stats for the home page
   */
  async getQuickStats() {
    const stats = {
      streaming: { active: 0, transcoding: 0 },
      downloads: { active: 0, queued: 0, totalSpeed: 0 },
      radarr: { missing: 0, upcoming: 0, upgrades: 0, configured: false },
      sonarr: { missing: 0, upcoming: 0, upgrades: 0, configured: false }
    };

    try {
      // Get streaming stats
      const sessions = await this.getStreamingSessions();
      stats.streaming.active = sessions.length;
      stats.streaming.transcoding = sessions.filter(s => s.playback.decision === 'transcode').length;

      // Get download stats
      const downloads = await this.getDownloads();
      stats.downloads.active = downloads.totalActive || 0;
      stats.downloads.queued = downloads.totalQueued || 0;
      stats.downloads.totalSpeed = downloads.totalSpeed || 0;

      // Get Radarr stats
      try {
        const radarrStats = await radarrService.getStats();
        stats.radarr = {
          missing: radarrStats.missing || 0,
          upcoming: radarrStats.upcoming || 0,
          upgrades: radarrStats.upgrades || 0,
          configured: radarrStats.configured || false
        };
      } catch (error) {
        // Radarr not configured or error
      }

      // Get Sonarr stats
      try {
        const sonarrStats = await sonarrService.getStats();
        stats.sonarr = {
          missing: sonarrStats.missing || 0,
          upcoming: sonarrStats.upcoming || 0,
          upgrades: sonarrStats.upgrades || 0,
          configured: sonarrStats.configured || false
        };
      } catch (error) {
        // Sonarr not configured or error
      }
    } catch (error) {
      console.error('Error fetching quick stats:', error.message);
    }

    return stats;
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 10, offset = 0, type = 'all') {
    const activities = [];

    try {
      // Determine how many items to fetch per type when fetching 'all'
      const perTypeLimit = type === 'all' ? Math.ceil(limit / 2) : limit;

      // Get watch history from PlaybackSession
      if (type === 'all' || type === 'watched') {
        const watchedSessions = await PlaybackSession.find({
          stoppedAt: { $exists: true, $ne: null }
        })
          .sort({ stoppedAt: -1 })
          .skip(type === 'watched' ? offset : 0)
          .limit(type === 'watched' ? limit : perTypeLimit)
          .lean();

        // Collect rating keys to look up thumbs and additional media info
        const movieRatingKeys = watchedSessions
          .filter(s => s.mediaType === 'movie' && s.ratingKey)
          .map(s => s.ratingKey);
        const showRatingKeys = watchedSessions
          .filter(s => s.mediaType === 'episode' && s.grandparentRatingKey)
          .map(s => s.grandparentRatingKey);

        // Look up thumbs and info from Movie and TVShow collections
        const [movies, shows] = await Promise.all([
          movieRatingKeys.length > 0
            ? Movie.find({ ratingKey: { $in: movieRatingKeys } }, { ratingKey: 1, thumbUrl: 1, title: 1, year: 1 }).lean()
            : [],
          showRatingKeys.length > 0
            ? TVShow.find({ ratingKey: { $in: showRatingKeys } }, { ratingKey: 1, thumbUrl: 1, title: 1, year: 1 }).lean()
            : []
        ]);

        // Create lookup maps
        const movieMap = new Map(movies.map(m => [m.ratingKey, m]));
        const showMap = new Map(shows.map(s => [s.ratingKey, s]));

        watchedSessions.forEach(session => {
          // Get media info based on media type
          let thumb, title, year, showTitle;
          if (session.mediaType === 'movie') {
            const movie = movieMap.get(session.ratingKey);
            thumb = movie?.thumbUrl;
            title = session.mediaTitle || movie?.title;
            year = movie?.year;
          } else if (session.mediaType === 'episode') {
            const show = showMap.get(session.grandparentRatingKey);
            thumb = show?.thumbUrl;
            title = session.mediaTitle;
            showTitle = show?.title;
            year = show?.year;
          }

          activities.push({
            id: `watched-${session._id}`,
            type: 'watched',
            timestamp: session.stoppedAt || session.startedAt || session.viewedAt,
            media: {
              type: session.mediaType === 'episode' ? 'episode' : 'movie',
              title: title || session.mediaTitle || 'Unknown',
              year,
              showTitle,
              thumb,
              ratingKey: session.ratingKey
            },
            user: session.userName
          });
        });
      }

      // Get recently added media to the library
      if (type === 'all' || type === 'added') {
        // Get recently added movies
        const recentMovies = await Movie.find({
          addedAt: { $exists: true, $ne: null }
        })
          .sort({ addedAt: -1 })
          .skip(type === 'added' ? Math.floor(offset / 2) : 0)
          .limit(type === 'added' ? Math.ceil(limit / 2) : Math.ceil(perTypeLimit / 2))
          .lean();

        recentMovies.forEach(movie => {
          activities.push({
            id: `added-movie-${movie._id}`,
            type: 'added',
            timestamp: movie.addedAt,
            media: {
              type: 'movie',
              title: movie.title,
              year: movie.year,
              thumb: movie.thumbUrl,
              ratingKey: movie.ratingKey
            },
            quality: movie.videoResolution
          });
        });

        // Get recently added shows
        const recentShows = await TVShow.find({
          addedAt: { $exists: true, $ne: null }
        })
          .sort({ addedAt: -1 })
          .skip(type === 'added' ? Math.floor(offset / 2) : 0)
          .limit(type === 'added' ? Math.ceil(limit / 2) : Math.ceil(perTypeLimit / 2))
          .lean();

        recentShows.forEach(show => {
          activities.push({
            id: `added-show-${show._id}`,
            type: 'added',
            timestamp: show.addedAt,
            media: {
              type: 'episode',
              title: show.title,
              year: show.year,
              showTitle: show.title,
              thumb: show.thumbUrl,
              ratingKey: show.ratingKey
            },
            details: `${show.totalSeasons || 0} seasons, ${show.totalEpisodes || 0} episodes`
          });
        });
      }

      // Get recently downloaded items (from Radarr/Sonarr history)
      if (type === 'all' || type === 'downloaded') {
        try {
          const [radarrHistory, sonarrHistory] = await Promise.all([
            this.getRadarrHistory(type === 'downloaded' ? Math.ceil(limit / 2) : Math.ceil(perTypeLimit / 2)),
            this.getSonarrHistory(type === 'downloaded' ? Math.ceil(limit / 2) : Math.ceil(perTypeLimit / 2))
          ]);

          radarrHistory.forEach(item => {
            activities.push({
              id: `downloaded-radarr-${item.id}`,
              type: 'downloaded',
              timestamp: item.date,
              media: {
                type: 'movie',
                title: item.movieTitle || item.sourceTitle,
                year: item.year
              },
              quality: item.quality,
              details: item.eventType === 'grabbed' ? 'Grabbed' : 'Imported'
            });
          });

          sonarrHistory.forEach(item => {
            activities.push({
              id: `downloaded-sonarr-${item.id}`,
              type: 'downloaded',
              timestamp: item.date,
              media: {
                type: 'episode',
                title: item.episodeTitle || item.sourceTitle,
                showTitle: item.seriesTitle,
                seasonEpisode: item.seasonNumber && item.episodeNumber
                  ? `S${String(item.seasonNumber).padStart(2, '0')}E${String(item.episodeNumber).padStart(2, '0')}`
                  : undefined
              },
              quality: item.quality,
              details: item.eventType === 'grabbed' ? 'Grabbed' : 'Imported'
            });
          });
        } catch (error) {
          console.error('Error fetching download history:', error.message);
        }
      }

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const paginatedActivities = activities.slice(offset, offset + limit);

      return {
        activities: paginatedActivities,
        total: activities.length,
        hasMore: offset + limit < activities.length
      };
    } catch (error) {
      console.error('Error fetching recent activity:', error.message);
      return { activities: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get Radarr history for recently downloaded items
   */
  async getRadarrHistory(limit = 10) {
    try {
      const history = await radarrService.getHistory(limit);
      if (!history || !history.records) return [];

      return history.records
        .filter(item => item.eventType === 'grabbed' || item.eventType === 'downloadFolderImported')
        .map(item => ({
          id: item.id,
          movieTitle: item.movie?.title,
          sourceTitle: item.sourceTitle,
          year: item.movie?.year,
          quality: item.quality?.quality?.name,
          date: item.date,
          eventType: item.eventType
        }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get Sonarr history for recently downloaded items
   */
  async getSonarrHistory(limit = 10) {
    try {
      const history = await sonarrService.getHistory(limit);
      if (!history || !history.records) return [];

      return history.records
        .filter(item => item.eventType === 'grabbed' || item.eventType === 'downloadFolderImported')
        .map(item => ({
          id: item.id,
          seriesTitle: item.series?.title,
          episodeTitle: item.episode?.title,
          seasonNumber: item.episode?.seasonNumber,
          episodeNumber: item.episode?.episodeNumber,
          sourceTitle: item.sourceTitle,
          quality: item.quality?.quality?.name,
          date: item.date,
          eventType: item.eventType
        }));
    } catch (error) {
      return [];
    }
  }
}

module.exports = new HomeAggregatorService();
