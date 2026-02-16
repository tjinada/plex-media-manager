const { PlexServer, PlaybackSession, Movie, Episode } = require('../models');
const PlexService = require('./plex.service');
const notificationService = require('./notification.service');

/**
 * Service to capture active playback sessions in real-time
 * This captures device information that isn't available in historical data
 */
class SessionCaptureService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.captureInterval = 30000; // 30 seconds
  }

  /**
   * Start the session capture background task
   */
  async start() {
    if (this.isRunning) {
      console.log('Session capture already running');
      return;
    }

    console.log('Starting session capture service...');
    this.isRunning = true;

    // Capture immediately on start
    await this.captureActiveSessions();

    // Then capture periodically
    this.intervalId = setInterval(async () => {
      try {
        await this.captureActiveSessions();
      } catch (error) {
        console.error('Session capture error:', error.message);
      }
    }, this.captureInterval);

    console.log(`Session capture running every ${this.captureInterval / 1000} seconds`);
  }

  /**
   * Stop the session capture background task
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Session capture service stopped');
  }

  /**
   * Capture currently active sessions from Plex
   */
  async captureActiveSessions() {
    try {
      const server = await PlexServer.getServer();
      if (!server) return;

      const plexService = new PlexService(server.host, server.token);
      
      // Get active sessions
      const data = await plexService.request('/status/sessions');
      const sessions = data.MediaContainer?.Metadata || [];

      if (sessions.length === 0) return;

      let capturedCount = 0;

      for (const session of sessions) {
        try {
          const wasCaptured = await this.processActiveSession(session, server._id, plexService);
          if (wasCaptured) {
            capturedCount++;
            // Send push notification for new streaming session
            this.sendStreamingNotification(session).catch(err =>
              console.error('Push notify streaming error:', err.message)
            );
          }
        } catch (error) {
          console.error('Error processing active session:', error.message);
        }
      }

      if (capturedCount > 0) {
        console.log(`Captured ${capturedCount} active sessions`);
      }
    } catch (error) {
      // Silently fail - server might be offline or sessions endpoint unavailable
      if (!error.message.includes('ECONNREFUSED')) {
        console.error('Error capturing active sessions:', error.message);
      }
    }
  }

  /**
   * Process and save an active session with full device info
   */
  async processActiveSession(session, serverId, plexService) {
    if (!session.ratingKey) return false;

    // Generate session key - use Plex's session key if available
    const sessionKey = session.Session?.id 
      ? `active-${session.Session.id}-${session.ratingKey}`
      : `active-${Date.now()}-${session.ratingKey}-${session.User?.id || 'unknown'}`;

    // Check if we already captured this specific playback
    const existing = await PlaybackSession.findOne({
      ratingKey: session.ratingKey,
      'device.deviceIdentifier': session.Player?.machineIdentifier,
      viewedAt: { 
        $gte: new Date(Date.now() - 3600000) // Within last hour
      }
    });

    if (existing) return false; // Already captured recently

    // Determine media type
    const mediaType = session.type === 'episode' ? 'episode' : 'movie';

    // Look up media item for enrichment
    let mediaItem = null;
    let mediaItemId = null;

    if (mediaType === 'movie') {
      mediaItem = await Movie.findOne({ plexId: session.ratingKey, serverId });
    } else {
      mediaItem = await Episode.findOne({ plexId: session.ratingKey, serverId });
    }

    if (mediaItem) {
      mediaItemId = mediaItem._id;
    }

    // Build session document with FULL device info from active session
    const sessionData = {
      sessionKey,
      serverId,
      mediaType,
      mediaItemId,
      ratingKey: session.ratingKey,
      mediaTitle: session.grandparentTitle 
        ? `${session.grandparentTitle} - ${session.title}`
        : session.title,
      viewedAt: new Date(),
      duration: session.duration,

      // User info
      userId: session.User?.id?.toString(),
      userName: session.User?.title || null,

      // FULL Device info from active session!
      device: {
        name: session.Player?.title || session.Player?.device || 'Unknown',
        platform: session.Player?.platform || null,
        product: session.Player?.product || null,
        platformVersion: session.Player?.platformVersion || null,
        deviceIdentifier: session.Player?.machineIdentifier || 'unknown'
      },

      // FULL Playback decisions from active session!
      playback: {
        videoDecision: this.normalizeDecision(session.TranscodeSession?.videoDecision),
        audioDecision: this.normalizeDecision(session.TranscodeSession?.audioDecision),
        subtitleDecision: session.TranscodeSession?.subtitleDecision || 'none',
        transcodeReason: session.TranscodeSession?.transcodeReason || null,
        transcodeHwRequested: session.TranscodeSession?.transcodeHwRequested === true,
        transcodeHwFullPipeline: session.TranscodeSession?.transcodeHwFullPipeline === true,
        protocol: session.Session?.location || 'lan'
      },

      // Media snapshot - from active session or our database
      mediaSnapshot: this.buildMediaSnapshot(session, mediaItem),

      // Bandwidth info from active session
      bandwidth: {
        maxStreamingBitrate: session.Session?.bandwidth || null,
        actualBitrate: session.TranscodeSession?.speed 
          ? Math.round((session.Media?.[0]?.bitrate || 0) * session.TranscodeSession.speed)
          : session.Media?.[0]?.bitrate || mediaItem?.media?.bitrate || null
      }
    };

    // Upsert the session
    await PlaybackSession.updateOne(
      { sessionKey, serverId },
      { $set: sessionData },
      { upsert: true }
    );

    return true;
  }

  /**
   * Send push notification for a new streaming session
   * Transforms raw Plex session data to match the HomeAggregator session format
   */
  async sendStreamingNotification(plexSession) {
    const isEpisode = plexSession.type === 'episode';
    const media = plexSession.Media?.[0];

    const session = {
      user: {
        name: plexSession.User?.title || 'Someone'
      },
      media: {
        type: isEpisode ? 'episode' : 'movie',
        title: plexSession.title || 'Unknown',
        showTitle: isEpisode ? plexSession.grandparentTitle : undefined,
        seasonEpisode: isEpisode
          ? `S${String(plexSession.parentIndex || 0).padStart(2, '0')}E${String(plexSession.index || 0).padStart(2, '0')}`
          : undefined
      },
      streamQuality: {
        resolution: this.getResolutionLabel(media) || 'Unknown'
      },
      playback: {
        decision: plexSession.TranscodeSession
          ? this.normalizeDecision(plexSession.TranscodeSession.videoDecision)
          : 'directplay'
      },
      player: {
        name: plexSession.Player?.title || plexSession.Player?.device || 'Unknown'
      }
    };

    await notificationService.notifyStreamingStarted(session);
  }

  /**
   * Build media snapshot from active session data
   */
  buildMediaSnapshot(session, mediaItem) {
    // Prefer data from active session, fall back to database
    const media = session.Media?.[0];
    const videoStream = media?.Part?.[0]?.Stream?.find(s => s.streamType === 1);

    // Determine HDR type
    let hdrType = 'SDR';
    if (videoStream) {
      hdrType = this.determineHdrType(videoStream);
    } else if (mediaItem?.media?.hdr) {
      hdrType = this.determineHdrTypeFromDb(mediaItem.media.hdr);
    }

    return {
      videoCodec: media?.videoCodec || mediaItem?.media?.videoCodec || null,
      audioCodec: media?.audioCodec || mediaItem?.media?.audioCodec || null,
      resolution: this.getResolutionLabel(media) || mediaItem?.media?.resolution || null,
      container: media?.container || mediaItem?.media?.container || null,
      bitrate: media?.bitrate || mediaItem?.media?.bitrate || null,
      hdrType
    };
  }

  /**
   * Determine HDR type from video stream
   */
  determineHdrType(videoStream) {
    if (!videoStream) return 'SDR';

    // Check for Dolby Vision
    if (videoStream.DOVIPresent) {
      const profile = videoStream.DOVIProfile;
      const blCompatId = videoStream.DOVIBLCompatID;

      if (profile === 5) return 'DV P5';
      if (profile === 7) return 'DV P7';
      if (profile === 8) {
        if (blCompatId === 1) return 'DV P8.1';
        if (blCompatId === 2) return 'DV P8.2';
        if (blCompatId === 4) return 'DV P8.4';
        return 'DV P8';
      }
      return `DV P${profile || '?'}`;
    }

    // Check for HDR10/HDR10+
    if (videoStream.colorPrimaries === 'bt2020' && videoStream.colorTransfer === 'smpte2084') {
      const displayTitle = (videoStream.displayTitle || '').toLowerCase();
      if (displayTitle.includes('hdr10+') || displayTitle.includes('hdr10 plus')) {
        return 'HDR10+';
      }
      return 'HDR10';
    }

    // Check for HLG
    if (videoStream.colorTransfer === 'arib-std-b67') {
      return 'HLG';
    }

    // Check bit depth
    if (videoStream.bitDepth >= 10 && videoStream.colorPrimaries === 'bt2020') {
      return 'HDR';
    }

    return 'SDR';
  }

  /**
   * Determine HDR type from database HDR info
   */
  determineHdrTypeFromDb(hdr) {
    if (!hdr) return 'SDR';

    if (hdr.doviPresent) {
      const profile = hdr.doviProfile;
      const blCompatId = hdr.doviBLCompatID;
      if (profile === 5) return 'DV P5';
      if (profile === 7) return 'DV P7';
      if (profile === 8) {
        if (blCompatId === 1) return 'DV P8.1';
        if (blCompatId === 2) return 'DV P8.2';
        if (blCompatId === 4) return 'DV P8.4';
        return 'DV P8';
      }
      return `DV P${profile || '?'}`;
    }

    if (hdr.colorPrimaries === 'bt2020' && hdr.colorTransfer === 'smpte2084') {
      const displayTitle = (hdr.displayTitle || '').toLowerCase();
      if (displayTitle.includes('hdr10+')) return 'HDR10+';
      return 'HDR10';
    }

    if (hdr.colorTransfer === 'arib-std-b67') return 'HLG';
    if (hdr.bitDepth >= 10 && hdr.colorPrimaries === 'bt2020') return 'HDR';

    return 'SDR';
  }

  /**
   * Get resolution label
   */
  getResolutionLabel(media) {
    if (!media) return null;
    const height = media.height;
    const width = media.width;
    if (!height && !width) return null;
    if (width >= 3840 || height >= 2160) return '4K';
    if (width >= 1920 || height >= 1080) return '1080p';
    if (width >= 1280 || height >= 720) return '720p';
    if (width >= 720 || height >= 480) return '480p';
    return `${height}p`;
  }

  /**
   * Normalize playback decision
   */
  normalizeDecision(decision) {
    if (!decision) return 'directplay';
    const d = decision.toLowerCase();
    if (d === 'transcode') return 'transcode';
    if (d === 'copy' || d === 'directstream') return 'copy';
    return 'directplay';
  }
}

// Export singleton instance
module.exports = new SessionCaptureService();
