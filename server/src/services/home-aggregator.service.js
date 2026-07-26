const TautulliService = require('./tautulli.service');
const radarrService = require('./radarr.service');
const sonarrService = require('./sonarr.service');
const nzbgetService = require('./nzbget.service');
const qbittorrentService = require('./qbittorrent.service');
const overseerrService = require('./overseerr.service');
const TautulliConfig = require('../models/TautulliConfig');
const PlaybackSession = require('../models/PlaybackSession');
const Movie = require('../models/Movie');
const TVShow = require('../models/TVShow');
const Episode = require('../models/Episode');
const PlexServer = require('../models/PlexServer');

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
        grandparentThumb: isEpisode ? session.grandparent_thumb : undefined,
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
        videoBitrate: session.video_bitrate ? parseInt(session.video_bitrate) : undefined,
        audioBitrate: session.audio_bitrate ? parseInt(session.audio_bitrate) : undefined,
        dynamicRange: session.video_dynamic_range || undefined,
        container: session.container
      },
      // Stream quality (what's being delivered)
      streamQuality: {
        resolution: session.stream_video_full_resolution || session.video_full_resolution || 'Unknown',
        videoCodec: session.stream_video_codec || session.video_codec || 'Unknown',
        audioCodec: session.stream_audio_codec || session.audio_codec || 'Unknown',
        audioChannels: session.stream_audio_channel_layout || session.stream_audio_channels,
        bitrate: session.stream_bitrate ? parseInt(session.stream_bitrate) : undefined,
        videoBitrate: session.stream_video_bitrate ? parseInt(session.stream_video_bitrate) : undefined,
        audioBitrate: session.stream_audio_bitrate ? parseInt(session.stream_audio_bitrate) : undefined,
        dynamicRange: session.stream_video_dynamic_range || undefined,
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
        hwDecode: this.toBool(session.transcode_hw_decoding),
        hwEncode: this.toBool(session.transcode_hw_encoding),
        hwDecodeCodec: session.transcode_hw_decode || undefined,
        hwEncodeCodec: session.transcode_hw_encode || undefined,
        subtitleDecision: session.stream_subtitle_decision || undefined,
        speed: session.transcode_speed ? parseFloat(session.transcode_speed) : undefined,
        throttled: this.toBool(session.transcode_throttled)
      } : undefined,
      network: {
        location: session.location === 'lan' ? 'lan' : 'wan',
        bandwidth: session.bandwidth ? parseInt(session.bandwidth) : undefined,
        secure: this.toBool(session.secure),
        relayed: this.toBool(session.relayed)
      }
    };
  }

  /**
   * Parse Tautulli boolean-ish values (may arrive as 1, '1', or true)
   */
  toBool(value) {
    return value === 1 || value === '1' || value === true;
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
    const activeDownloads = [];
    const historyItems = [];
    let totalSpeed = 0;

    // Fetch from all sources in parallel
    const [radarrQueue, sonarrQueue, nzbgetQueue, qbtQueue, nzbgetHistory] = await Promise.all([
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
      }),
      this.getNzbgetHistory().catch(err => {
        console.error('Error fetching NZBGet history:', err.message);
        return [];
      })
    ]);

    // Active queue items (used for completion detection)
    activeDownloads.push(...radarrQueue);
    activeDownloads.push(...sonarrQueue);
    activeDownloads.push(...nzbgetQueue.downloads);
    activeDownloads.push(...qbtQueue.torrents);

    // History items (display only, not tracked for completion)
    historyItems.push(...nzbgetHistory);

    // Calculate total download speed
    totalSpeed = (nzbgetQueue.speed || 0) + (qbtQueue.downloadSpeed || 0);

    // Combined list for display (sorted by progress descending)
    const allItems = [...activeDownloads, ...historyItems].sort((a, b) => b.progress - a.progress);

    return {
      items: allItems,
      activeItems: activeDownloads,
      totalSpeed,
      totalActive: activeDownloads.filter(d => d.status === 'downloading').length,
      totalQueued: activeDownloads.filter(d => d.status === 'queued').length
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
          quality: this.extractQualityFromTitle(item.name) || item.category || undefined,
          category: item.category
        })),
        speed: queue.speed || 0
      };
    } catch (error) {
      return { downloads: [], speed: 0 };
    }
  }

  /**
   * Get NZBGet download history
   */
  async getNzbgetHistory() {
    try {
      const history = await nzbgetService.getHistory(10);
      return history.map(item => ({
        id: item.id,
        source: 'nzbget',
        type: 'usenet',
        title: item.name,
        status: item.status === 'SUCCESS' ? 'completed' : 
                item.status === 'FAILURE' ? 'failed' : 
                item.status === 'DELETED' ? 'deleted' : 'completed',
        progress: 100,
        size: item.size,
        sizeRemaining: 0,
        quality: this.extractQualityFromTitle(item.name) || item.category || undefined,
        category: item.category,
        completedAt: item.completedAt
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract quality info from release title
   */
  extractQualityFromTitle(title) {
    if (!title) return null;
    const titleUpper = title.toUpperCase();
    
    // Check for resolution
    if (titleUpper.includes('2160P') || titleUpper.includes('4K') || titleUpper.includes('UHD')) return '4K';
    if (titleUpper.includes('1080P')) return '1080p';
    if (titleUpper.includes('720P')) return '720p';
    if (titleUpper.includes('480P') || titleUpper.includes('SD')) return '480p';
    
    return null;
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
          quality: this.extractQualityFromTitle(item.name) || item.category || undefined,
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
      // When fetching a specific type, use the full limit
      // When fetching 'all', use a reasonable per-type limit for the initial combined view
      const perTypeLimit = type === 'all' ? Math.ceil(limit * 0.75) : limit;

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
        // Collect episode rating keys where season/episode numbers are missing
        const episodeRatingKeys = watchedSessions
          .filter(s => s.mediaType === 'episode' && s.ratingKey && 
                  (s.seasonNumber === undefined || s.episodeNumber === undefined))
          .map(s => s.ratingKey);

        // Look up thumbs and info from Movie, TVShow, and Episode collections
        // Note: plexId in our DB corresponds to ratingKey from Plex/Tautulli
        const [movies, shows, episodes] = await Promise.all([
          movieRatingKeys.length > 0
            ? Movie.find({ plexId: { $in: movieRatingKeys } }, { plexId: 1, thumbUrl: 1, title: 1, year: 1 }).lean()
            : [],
          showRatingKeys.length > 0
            ? TVShow.find({ plexId: { $in: showRatingKeys } }, { plexId: 1, thumbUrl: 1, title: 1, year: 1 }).lean()
            : [],
          episodeRatingKeys.length > 0
            ? Episode.find({ plexId: { $in: episodeRatingKeys } }, { plexId: 1, seasonNumber: 1, episodeNumber: 1 }).lean()
            : []
        ]);

        // Create lookup maps using plexId
        const movieMap = new Map(movies.map(m => [m.plexId, m]));
        const showMap = new Map(shows.map(s => [s.plexId, s]));
        const episodeMap = new Map(episodes.map(e => [e.plexId, e]));

        watchedSessions.forEach(session => {
          // Get media info based on media type
          let thumb, title, year, showTitle, seasonEpisode;
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
            
            // Get season/episode numbers - check stored values first, then lookup from Episode collection
            if (session.seasonNumber !== undefined && session.episodeNumber !== undefined) {
              seasonEpisode = `S${String(session.seasonNumber).padStart(2, '0')}E${String(session.episodeNumber).padStart(2, '0')}`;
            } else {
              // Look up from Episode collection
              const episode = episodeMap.get(session.ratingKey);
              if (episode && episode.seasonNumber !== undefined && episode.episodeNumber !== undefined) {
                seasonEpisode = `S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`;
              }
            }
          }

          // Calculate watch progress/status
          // Use Tautulli's percentComplete directly if available (most accurate)
          let watchStatus = 'partial';
          let watchProgress = 0;
          
          if (session.percentComplete !== null && session.percentComplete !== undefined) {
            // Use Tautulli's direct percentage
            watchProgress = session.percentComplete;
          } else if (session.duration && session.duration > 0) {
            // Fallback: calculate from watched/total duration
            const watched = session.watchedDuration || 0;
            watchProgress = Math.round((watched / session.duration) * 100);
          }
          
          // Determine watch status based on progress
          if (watchProgress >= 90) {
            watchStatus = 'completed';
          } else if (watchProgress <= 10) {
            watchStatus = 'abandoned';
          } else {
            watchStatus = 'partial';
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
              seasonEpisode,
              thumb,
              ratingKey: session.ratingKey
            },
            user: session.userName,
            watchStatus,
            watchProgress
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
                year: item.year,
                thumb: item.posterUrl
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
                thumb: item.posterUrl,
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

      const historyItems = history.records
        .filter(item => item.eventType === 'grabbed' || item.eventType === 'downloadFolderImported')
        .map(item => ({
          id: item.id,
          movieTitle: item.movie?.title,
          sourceTitle: item.sourceTitle,
          year: item.movie?.year,
          tmdbId: item.movie?.tmdbId,
          quality: item.quality?.quality?.name,
          date: item.date,
          eventType: item.eventType,
          // Radarr includes poster in movie.images
          posterUrl: item.movie?.images?.find(i => i.coverType === 'poster')?.remoteUrl || null
        }));

      // Try to get posters from our local DB for any missing ones
      const tmdbIds = historyItems.filter(h => h.tmdbId && !h.posterUrl).map(h => h.tmdbId);
      if (tmdbIds.length > 0) {
        const movies = await Movie.find({ tmdbId: { $in: tmdbIds } }, { tmdbId: 1, thumbUrl: 1 }).lean();
        const movieMap = new Map(movies.map(m => [m.tmdbId, m.thumbUrl]));
        historyItems.forEach(item => {
          if (!item.posterUrl && item.tmdbId) {
            item.posterUrl = movieMap.get(item.tmdbId);
          }
        });
      }

      return historyItems;
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

      const historyItems = history.records
        .filter(item => item.eventType === 'grabbed' || item.eventType === 'downloadFolderImported')
        .map(item => ({
          id: item.id,
          seriesTitle: item.series?.title,
          seriesId: item.series?.id,
          tvdbId: item.series?.tvdbId,
          episodeTitle: item.episode?.title,
          seasonNumber: item.episode?.seasonNumber,
          episodeNumber: item.episode?.episodeNumber,
          sourceTitle: item.sourceTitle,
          quality: item.quality?.quality?.name,
          date: item.date,
          eventType: item.eventType,
          // Sonarr includes poster in series.images
          posterUrl: item.series?.images?.find(i => i.coverType === 'poster')?.remoteUrl || null
        }));

      // Try to get posters from our local DB for any missing ones
      const tvdbIds = historyItems.filter(h => h.tvdbId && !h.posterUrl).map(h => h.tvdbId);
      if (tvdbIds.length > 0) {
        const shows = await TVShow.find({ tvdbId: { $in: tvdbIds } }, { tvdbId: 1, thumbUrl: 1 }).lean();
        const showMap = new Map(shows.map(s => [s.tvdbId, s.thumbUrl]));
        historyItems.forEach(item => {
          if (!item.posterUrl && item.tvdbId) {
            item.posterUrl = showMap.get(item.tvdbId);
          }
        });
      }

      return historyItems;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get configured service URLs for shortcuts widget
   */
  async getShortcuts() {
    const shortcuts = [];

    try {
      // Plex
      const plexServer = await PlexServer.findOne();
      if (plexServer && plexServer.host) {
        const plexBaseUrl = (plexServer.externalUrl || plexServer.host).replace(/\/+$/, '');
        shortcuts.push({
          id: 'plex',
          name: 'Plex',
          url: plexBaseUrl + '/web',
          icon: 'plex',
          configured: true,
          connected: true
        });
      }

      // NZBGet
      const nzbgetConfig = await nzbgetService.getConfig();
      if (nzbgetConfig) {
        shortcuts.push({
          id: 'nzbget',
          name: 'NZBGet',
          url: nzbgetConfig.externalUrl || nzbgetConfig.host,
          icon: 'nzbget',
          configured: true,
          connected: nzbgetConfig.isConnected
        });
      }

      // Radarr
      const radarrConfig = await radarrService.getConfig();
      if (radarrConfig) {
        shortcuts.push({
          id: 'radarr',
          name: 'Radarr',
          url: radarrConfig.externalUrl || radarrConfig.host,
          icon: 'radarr',
          configured: true,
          connected: radarrConfig.isConnected
        });
      }

      // Sonarr
      const sonarrConfig = await sonarrService.getConfig();
      if (sonarrConfig) {
        shortcuts.push({
          id: 'sonarr',
          name: 'Sonarr',
          url: sonarrConfig.externalUrl || sonarrConfig.host,
          icon: 'sonarr',
          configured: true,
          connected: sonarrConfig.isConnected
        });
      }

      // Overseerr
      const overseerrConfig = await overseerrService.getConfig();
      if (overseerrConfig) {
        shortcuts.push({
          id: 'overseerr',
          name: 'Overseerr',
          url: overseerrConfig.externalUrl || overseerrConfig.host,
          icon: 'overseerr',
          configured: true,
          connected: overseerrConfig.isConnected
        });
      }

      // Tautulli
      const tautulliConfig = await TautulliConfig.getConfig();
      if (tautulliConfig && tautulliConfig.host) {
        shortcuts.push({
          id: 'tautulli',
          name: 'Tautulli',
          url: tautulliConfig.externalUrl || tautulliConfig.host,
          icon: 'tautulli',
          configured: true,
          connected: tautulliConfig.enabled
        });
      }

      // qBittorrent
      const qbtConfig = await qbittorrentService.getConfig();
      if (qbtConfig) {
        shortcuts.push({
          id: 'qbittorrent',
          name: 'qBittorrent',
          url: qbtConfig.externalUrl || qbtConfig.host,
          icon: 'qbittorrent',
          configured: true,
          connected: qbtConfig.isConnected
        });
      }

    } catch (error) {
      console.error('Error fetching shortcuts:', error.message);
    }

    return shortcuts;
  }
}

module.exports = new HomeAggregatorService();
