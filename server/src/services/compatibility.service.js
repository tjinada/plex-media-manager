const { Movie, Episode, TVShow } = require('../models');
const { getRules, getEnabledRules } = require('../config/compatibility-rules');

class CompatibilityService {
  /**
   * Get all compatibility rules
   */
  getRules() {
    return getRules().map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      category: rule.category,
      enabled: rule.enabled
    }));
  }

  /**
   * Analyze all media for compatibility issues
   */
  async analyzeAll() {
    const [movieResults, episodeResults] = await Promise.all([
      this.analyzeMovies(),
      this.analyzeEpisodes()
    ]);

    // Combine summaries
    const summary = {
      totalIssues: movieResults.summary.totalIssues + episodeResults.summary.totalIssues,
      highSeverity: movieResults.summary.highSeverity + episodeResults.summary.highSeverity,
      mediumSeverity: movieResults.summary.mediumSeverity + episodeResults.summary.mediumSeverity,
      lowSeverity: movieResults.summary.lowSeverity + episodeResults.summary.lowSeverity,
      affectedMovies: movieResults.summary.affectedItems,
      affectedEpisodes: episodeResults.summary.affectedItems,
      affectedSize: movieResults.summary.affectedSize + episodeResults.summary.affectedSize,
      byRule: this.mergeRuleCounts(movieResults.summary.byRule, episodeResults.summary.byRule)
    };

    return {
      summary,
      analyzedAt: new Date()
    };
  }

  /**
   * Merge rule counts from movies and episodes
   */
  mergeRuleCounts(movieRules, episodeRules) {
    const merged = {};
    const allRuleIds = new Set([...Object.keys(movieRules), ...Object.keys(episodeRules)]);
    
    for (const ruleId of allRuleIds) {
      const movieRule = movieRules[ruleId] || { count: 0, size: 0 };
      const episodeRule = episodeRules[ruleId] || { count: 0, size: 0 };
      
      merged[ruleId] = {
        count: movieRule.count + episodeRule.count,
        size: movieRule.size + episodeRule.size,
        name: movieRule.name || episodeRule.name,
        severity: movieRule.severity || episodeRule.severity
      };
    }
    
    return merged;
  }

  /**
   * Analyze movies for compatibility issues
   */
  async analyzeMovies() {
    const movies = await Movie.find({ media: { $exists: true } }).lean();
    const enabledRules = getEnabledRules();
    
    const issues = [];
    const byRule = {};
    let highCount = 0, mediumCount = 0, lowCount = 0;
    let affectedSize = 0;
    const affectedIds = new Set();

    for (const movie of movies) {
      const mediaInfo = this.transformMediaForRules(movie.media);
      
      for (const rule of enabledRules) {
        try {
          const result = rule.check(mediaInfo);
          if (result && result.detected) {
            affectedIds.add(movie._id.toString());
            affectedSize += movie.media?.fileSize || 0;
            
            // Track by rule
            if (!byRule[rule.id]) {
              byRule[rule.id] = { count: 0, size: 0, name: rule.name, severity: rule.severity };
            }
            byRule[rule.id].count++;
            byRule[rule.id].size += movie.media?.fileSize || 0;
            
            // Track by severity
            if (rule.severity === 'high') highCount++;
            else if (rule.severity === 'medium') mediumCount++;
            else lowCount++;

            issues.push({
              itemId: movie._id,
              itemType: 'movie',
              title: movie.title,
              year: movie.year,
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              category: rule.category,
              details: result.details,
              fileSize: movie.media?.fileSize || 0,
              filePath: movie.media?.filePath,
              resolution: movie.media?.resolution,
              videoCodec: movie.media?.videoCodec,
              // Include HDR debug info
              hdrInfo: movie.media?.hdr ? {
                doviPresent: movie.media.hdr.doviPresent,
                doviProfile: movie.media.hdr.doviProfile,
                doviBLCompatID: movie.media.hdr.doviBLCompatID
              } : null
            });
          }
        } catch (error) {
          console.error(`Error checking rule ${rule.id} for movie ${movie.title}:`, error.message);
        }
      }
    }

    return {
      issues,
      summary: {
        totalIssues: issues.length,
        highSeverity: highCount,
        mediumSeverity: mediumCount,
        lowSeverity: lowCount,
        affectedItems: affectedIds.size,
        affectedSize,
        byRule
      }
    };
  }

  /**
   * Analyze episodes for compatibility issues
   */
  async analyzeEpisodes() {
    const episodes = await Episode.find({ media: { $exists: true } })
      .populate('showId', 'title')
      .lean();
    
    const enabledRules = getEnabledRules();
    
    const issues = [];
    const byRule = {};
    let highCount = 0, mediumCount = 0, lowCount = 0;
    let affectedSize = 0;
    const affectedIds = new Set();

    for (const episode of episodes) {
      const mediaInfo = this.transformMediaForRules(episode.media);
      
      for (const rule of enabledRules) {
        try {
          const result = rule.check(mediaInfo);
          if (result && result.detected) {
            affectedIds.add(episode._id.toString());
            affectedSize += episode.media?.fileSize || 0;
            
            if (!byRule[rule.id]) {
              byRule[rule.id] = { count: 0, size: 0, name: rule.name, severity: rule.severity };
            }
            byRule[rule.id].count++;
            byRule[rule.id].size += episode.media?.fileSize || 0;
            
            if (rule.severity === 'high') highCount++;
            else if (rule.severity === 'medium') mediumCount++;
            else lowCount++;

            issues.push({
              itemId: episode._id,
              itemType: 'episode',
              title: episode.title,
              showTitle: episode.showId?.title || 'Unknown Show',
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              category: rule.category,
              details: result.details,
              fileSize: episode.media?.fileSize || 0,
              filePath: episode.media?.filePath,
              resolution: episode.media?.resolution,
              videoCodec: episode.media?.videoCodec,
              hdrInfo: episode.media?.hdr ? {
                doviPresent: episode.media.hdr.doviPresent,
                doviProfile: episode.media.hdr.doviProfile,
                doviBLCompatID: episode.media.hdr.doviBLCompatID
              } : null
            });
          }
        } catch (error) {
          console.error(`Error checking rule ${rule.id} for episode:`, error.message);
        }
      }
    }

    return {
      issues,
      summary: {
        totalIssues: issues.length,
        highSeverity: highCount,
        mediumSeverity: mediumCount,
        lowSeverity: lowCount,
        affectedItems: affectedIds.size,
        affectedSize,
        byRule
      }
    };
  }

  /**
   * Get issues list with pagination
   */
  async getIssues(options = {}) {
    const {
      type = 'all', // 'all', 'movies', 'episodes'
      severity = 'all', // 'all', 'high', 'medium', 'low'
      ruleId = null,
      sortBy = 'severity', // 'severity', 'fileSize', 'title'
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = options;

    // Get all issues
    let allIssues = [];
    
    if (type === 'all' || type === 'movies') {
      const movieResults = await this.analyzeMovies();
      allIssues.push(...movieResults.issues);
    }
    
    if (type === 'all' || type === 'episodes') {
      const episodeResults = await this.analyzeEpisodes();
      allIssues.push(...episodeResults.issues);
    }

    // Filter by severity
    if (severity !== 'all') {
      allIssues = allIssues.filter(i => i.severity === severity);
    }

    // Filter by rule
    if (ruleId) {
      allIssues = allIssues.filter(i => i.ruleId === ruleId);
    }

    // Sort
    const severityOrder = { high: 3, medium: 2, low: 1 };
    allIssues.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'severity') {
        comparison = severityOrder[b.severity] - severityOrder[a.severity];
      } else if (sortBy === 'fileSize') {
        comparison = b.fileSize - a.fileSize;
      } else if (sortBy === 'title') {
        const titleA = a.showTitle || a.title;
        const titleB = b.showTitle || b.title;
        comparison = titleA.localeCompare(titleB);
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    // Paginate
    const total = allIssues.length;
    const startIndex = (page - 1) * limit;
    const paginatedIssues = allIssues.slice(startIndex, startIndex + limit);

    return {
      items: paginatedIssues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Transform our media schema to match what rules expect
   */
  transformMediaForRules(media) {
    if (!media) return { videoTracks: [], audioTracks: [], hdr: null };

    return {
      // Pass HDR data directly - rules now check this
      hdr: media.hdr || null,
      
      videoTracks: [{
        codec: media.videoCodec,
        width: media.width,
        height: media.height,
        bitDepth: media.hdr?.bitDepth,
        bitrate: media.videoBitrate,
        format: media.videoCodec
      }],
      audioTracks: (media.audioTracks || []).map(track => ({
        codec: track.codec,
        channels: track.channels,
        title: track.title || track.extendedDisplayTitle,
        format: track.codec,
        formatAdditionalFeatures: track.extendedDisplayTitle,
        profile: track.profile
      })),
      overallBitrate: media.bitrate,
      container: media.container
    };
  }
}

module.exports = new CompatibilityService();
