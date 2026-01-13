const axios = require('axios');

/**
 * Service for communicating with Tautulli API
 */
class TautulliService {
  constructor(host, apiKey) {
    this.host = host?.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
    this.baseUrl = `${this.host}/api/v2`;
  }

  /**
   * Make a request to Tautulli API
   */
  async request(cmd, params = {}) {
    const url = this.baseUrl;
    const response = await axios({
      url,
      method: 'GET',
      params: {
        apikey: this.apiKey,
        cmd,
        ...params
      },
      timeout: 30000
    });

    // Tautulli returns { response: { result: 'success'|'error', data: ... } }
    const result = response.data?.response;
    
    if (result?.result === 'error') {
      throw new Error(result.message || 'Tautulli API error');
    }

    return result?.data;
  }

  /**
   * Test connection to Tautulli
   */
  async testConnection() {
    const data = await this.request('get_tautulli_info');
    
    return {
      success: true,
      serverName: data.tautulli_install_type || 'Tautulli',
      version: data.tautulli_version,
      pythonVersion: data.tautulli_python_version,
      platform: data.tautulli_platform,
      plexName: data.pms_name,
      plexVersion: data.pms_version
    };
  }

  /**
   * Get server info
   */
  async getServerInfo() {
    return await this.request('get_server_info');
  }

  /**
   * Get history with pagination
   * @param {Object} options - Query options
   * @param {number} options.start - Row to start from (0-indexed)
   * @param {number} options.length - Number of items to return
   * @param {string} options.mediaType - Filter by media type ('movie', 'episode', etc.)
   * @param {string} options.transcodeDecision - Filter by transcode decision
   * @param {string} options.orderColumn - Column to sort by
   * @param {string} options.orderDir - Sort direction ('asc' or 'desc')
   */
  async getHistory(options = {}) {
    const params = {
      start: options.start || 0,
      length: options.length || 100,
      order_column: options.orderColumn || 'date',
      order_dir: options.orderDir || 'desc'
    };

    if (options.mediaType) {
      params.media_type = options.mediaType;
    }

    if (options.transcodeDecision) {
      params.transcode_decision = options.transcodeDecision;
    }

    if (options.after) {
      params.after = options.after; // YYYY-MM-DD format
    }

    if (options.before) {
      params.before = options.before;
    }

    const data = await this.request('get_history', params);
    
    return {
      totalRecords: data.recordsTotal,
      filteredRecords: data.recordsFiltered,
      sessions: data.data || []
    };
  }

  /**
   * Get detailed stream data for a specific history row
   * This provides the richest data including HW transcode info
   */
  async getStreamData(rowId) {
    return await this.request('get_stream_data', { row_id: rowId });
  }

  /**
   * Get activity (current sessions)
   */
  async getActivity() {
    const data = await this.request('get_activity');
    return {
      streamCount: data.stream_count,
      sessions: data.sessions || [],
      lanBandwidth: data.lan_bandwidth,
      wanBandwidth: data.wan_bandwidth
    };
  }

  /**
   * Get home stats
   */
  async getHomeStats(options = {}) {
    const params = {
      time_range: options.timeRange || 30,
      stats_type: options.statsType || 'plays'
    };

    return await this.request('get_home_stats', params);
  }

  /**
   * Get plays by stream type (direct play vs transcode)
   */
  async getPlaysByStreamType(options = {}) {
    return await this.request('get_plays_by_stream_type', {
      time_range: options.timeRange || 30,
      y_axis: options.yAxis || 'plays'
    });
  }

  /**
   * Get plays by top 10 platforms
   */
  async getPlaysByTopPlatforms(options = {}) {
    return await this.request('get_plays_by_top_10_platforms', {
      time_range: options.timeRange || 30,
      y_axis: options.yAxis || 'plays'
    });
  }

  /**
   * Get plays by top 10 users
   */
  async getPlaysByTopUsers(options = {}) {
    return await this.request('get_plays_by_top_10_users', {
      time_range: options.timeRange || 30,
      y_axis: options.yAxis || 'plays'
    });
  }

  /**
   * Get plays by source resolution
   */
  async getPlaysBySourceResolution(options = {}) {
    return await this.request('get_plays_by_source_resolution', {
      time_range: options.timeRange || 30,
      y_axis: options.yAxis || 'plays'
    });
  }

  /**
   * Get plays by stream resolution
   */
  async getPlaysByStreamResolution(options = {}) {
    return await this.request('get_plays_by_stream_resolution', {
      time_range: options.timeRange || 30,
      y_axis: options.yAxis || 'plays'
    });
  }

  /**
   * Get user list
   */
  async getUsers() {
    return await this.request('get_users');
  }

  /**
   * Get libraries
   */
  async getLibraries() {
    return await this.request('get_libraries');
  }

  /**
   * Parse a Tautulli history record into our PlaybackSession format
   */
  parseHistoryRecord(record, streamData = null) {
    // Use streamData if available (richer data), otherwise use basic record
    const data = streamData || record;
    
    return {
      // Tautulli identifiers
      tautulliRowId: record.id || record.row_id,
      tautulliSessionKey: record.session_key,
      
      // Media info
      mediaType: record.media_type === 'episode' ? 'episode' : 'movie',
      ratingKey: record.rating_key?.toString(),
      mediaTitle: record.full_title || record.title,
      parentRatingKey: record.parent_rating_key?.toString(),
      grandparentRatingKey: record.grandparent_rating_key?.toString(),
      
      // Timing
      viewedAt: record.date ? new Date(record.date * 1000) : null,
      startedAt: record.started ? new Date(record.started * 1000) : null,
      stoppedAt: record.stopped ? new Date(record.stopped * 1000) : null,
      duration: record.duration,
      watchedDuration: record.play_duration || record.duration,
      pausedDuration: record.paused_counter || 0,
      
      // User info
      userId: record.user_id?.toString(),
      userName: record.friendly_name || record.user,
      userThumb: record.user_thumb,
      
      // Device info (THE GOOD STUFF!)
      device: {
        name: record.player || 'Unknown',
        platform: record.platform || null,
        product: record.product || null,
        platformVersion: record.platform_version || null,
        deviceIdentifier: record.machine_id || 'unknown'
      },
      
      // Network info
      ipAddress: record.ip_address,
      location: record.location || (record.local === '1' ? 'lan' : 'wan'),
      secure: record.secure === '1' || record.secure === 1,
      relayed: record.relayed === '1' || record.relayed === 1,
      
      // Quality settings
      qualityProfile: data.quality_profile || record.quality_profile,
      optimizedVersion: record.optimized_version === 1,
      syncedVersion: record.synced_version === 1,
      
      // Playback decisions
      // NOTE: get_history returns 'transcode_decision' as the main field ("direct play", "copy", "transcode")
      // Individual video_decision/audio_decision are only in get_stream_data or get_activity
      playback: {
        videoDecision: this.normalizeDecision(
          data.video_decision || 
          data.stream_video_decision || 
          record.transcode_decision  // Fallback to overall transcode_decision from history
        ),
        audioDecision: this.normalizeDecision(
          data.audio_decision || 
          data.stream_audio_decision || 
          record.transcode_decision  // Use same for audio as approximation
        ),
        subtitleDecision: this.normalizeSubtitleDecision(data.subtitle_decision || data.stream_subtitle_decision),
        containerDecision: this.normalizeDecision(data.container_decision || data.stream_container_decision),
        transcodeReason: record.transcode_decision === 'transcode' ? 'transcoding' : null,
        
        // Hardware transcoding details
        transcodeHwRequested: data.transcode_hw_requested === 1 || data.transcode_hw_requested === true,
        transcodeHwDecoding: data.transcode_hw_decoding === 1 || data.transcode_hw_decoding === true,
        transcodeHwEncoding: data.transcode_hw_encoding === 1 || data.transcode_hw_encoding === true,
        transcodeHwFullPipeline: data.transcode_hw_full_pipeline === 1 || data.transcode_hw_full_pipeline === true,
        transcodeHwDecodeCodec: data.transcode_hw_decode || null,
        transcodeHwEncodeCodec: data.transcode_hw_encode || null,
        transcodeHwDecodeTitle: data.transcode_hw_decode_title || null,
        transcodeHwEncodeTitle: data.transcode_hw_encode_title || null,
        
        // Transcode progress/speed
        transcodeSpeed: data.transcode_speed ? parseFloat(data.transcode_speed) : null,
        transcodeProgress: data.transcode_progress || null,
        transcodeThrottled: data.transcode_throttled === 1,
        
        protocol: data.transcode_protocol || record.transcode_protocol || null
      },
      
      // Original media info (source)
      mediaSnapshot: {
        videoCodec: data.video_codec || record.video_codec || null,
        audioCodec: data.audio_codec || record.audio_codec || null,
        resolution: this.formatResolution(data.video_full_resolution || record.video_full_resolution),
        container: data.container || record.container || null,
        bitrate: data.bitrate ? parseInt(data.bitrate) : null,
        videoBitrate: data.video_bitrate ? parseInt(data.video_bitrate) : null,
        audioBitrate: data.audio_bitrate ? parseInt(data.audio_bitrate) : null,
        audioChannels: data.audio_channels ? parseInt(data.audio_channels) : null,
        videoFramerate: data.video_framerate || null,
        aspectRatio: data.aspect_ratio || null,
        hdrType: this.determineHdrType(data)
      },
      
      // Stream output (what was delivered after transcode)
      streamOutput: {
        videoCodec: data.stream_video_codec || null,
        audioCodec: data.stream_audio_codec || null,
        resolution: this.formatResolution(data.stream_video_full_resolution),
        container: data.stream_container || null,
        bitrate: data.stream_bitrate ? parseInt(data.stream_bitrate) : null,
        videoBitrate: data.stream_video_bitrate ? parseInt(data.stream_video_bitrate) : null,
        audioBitrate: data.stream_audio_bitrate ? parseInt(data.stream_audio_bitrate) : null,
        audioChannels: data.stream_audio_channels ? parseInt(data.stream_audio_channels) : null
      },
      
      // Bandwidth
      bandwidth: {
        maxStreamingBitrate: data.bandwidth ? parseInt(data.bandwidth) : null,
        actualBitrate: data.stream_bitrate ? parseInt(data.stream_bitrate) : null
      }
    };
  }

  /**
   * Normalize decision string to our enum values
   */
  normalizeDecision(decision) {
    if (!decision) return 'directplay';
    const d = decision.toLowerCase().replace(/\s+/g, '');
    if (d === 'transcode') return 'transcode';
    if (d === 'copy' || d === 'directstream') return 'copy';
    return 'directplay';
  }

  /**
   * Normalize subtitle decision
   */
  normalizeSubtitleDecision(decision) {
    if (!decision) return 'none';
    const d = decision.toLowerCase().replace(/\s+/g, '');
    if (d === 'burn') return 'burn';
    if (d === 'transcode') return 'transcode';
    if (d === 'copy' || d === 'directstream') return 'directplay';
    if (d === 'directplay') return 'directplay';
    return 'none';
  }

  /**
   * Format resolution string
   */
  formatResolution(resolution) {
    if (!resolution) return null;
    // Already formatted like "1080p" or "4K"
    return resolution;
  }

  /**
   * Determine HDR type from stream data
   */
  determineHdrType(data) {
    const dynamicRange = data.video_dynamic_range || data.stream_video_dynamic_range;
    
    if (!dynamicRange || dynamicRange === 'SDR') {
      return 'SDR';
    }

    // Check for specific HDR types in display strings
    const displayTitle = (data.video_display_title || '').toLowerCase();
    
    if (displayTitle.includes('dolby vision') || displayTitle.includes('dovi')) {
      if (displayTitle.includes('profile 5') || displayTitle.includes('p5')) return 'DV P5';
      if (displayTitle.includes('profile 7') || displayTitle.includes('p7')) return 'DV P7';
      if (displayTitle.includes('profile 8') || displayTitle.includes('p8')) {
        if (displayTitle.includes('.1')) return 'DV P8.1';
        if (displayTitle.includes('.2')) return 'DV P8.2';
        if (displayTitle.includes('.4')) return 'DV P8.4';
        return 'DV P8';
      }
      return 'DV';
    }

    if (dynamicRange === 'HDR') {
      if (displayTitle.includes('hdr10+')) return 'HDR10+';
      if (displayTitle.includes('hlg')) return 'HLG';
      return 'HDR10';
    }

    return dynamicRange || 'SDR';
  }

  /**
   * Get total history count (for import progress)
   */
  async getHistoryCount() {
    const data = await this.getHistory({ length: 1 });
    return data.totalRecords;
  }
}

module.exports = TautulliService;
