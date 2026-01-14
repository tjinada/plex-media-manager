const { PlaybackSession, Movie, Episode } = require('../models');

// Codec normalization maps
const VIDEO_CODEC_MAP = {
  'h264': 'H.264',
  'avc': 'H.264',
  'avc1': 'H.264',
  'h.264': 'H.264',
  'hevc': 'H.265 (HEVC)',
  'h265': 'H.265 (HEVC)',
  'h.265': 'H.265 (HEVC)',
  'hev1': 'H.265 (HEVC)',
  'av1': 'AV1',
  'vp9': 'VP9',
  'vp8': 'VP8',
  'mpeg4': 'MPEG-4',
  'mpeg2video': 'MPEG-2',
  'vc1': 'VC-1',
  'vc-1': 'VC-1',
  'wmv3': 'WMV3',
  'divx': 'DivX',
  'xvid': 'XviD'
};

const AUDIO_CODEC_MAP = {
  'eac3': 'EAC3',
  'ec-3': 'EAC3',
  'ac3': 'AC3',
  'ac-3': 'AC3',
  'truehd': 'TrueHD',
  'dts-hd ma': 'DTS-HD MA',
  'dts-hd': 'DTS-HD',
  'dtshd': 'DTS-HD',
  'dca-ma': 'DTS-HD MA',
  'dca': 'DTS',
  'dts': 'DTS',
  'aac': 'AAC',
  'mp3': 'MP3',
  'flac': 'FLAC',
  'opus': 'Opus',
  'vorbis': 'Vorbis',
  'pcm': 'PCM',
  'pcm_s16le': 'PCM',
  'pcm_s24le': 'PCM',
  'lpcm': 'LPCM',
  'wmapro': 'WMA Pro'
};

function normalizeVideoCodec(codec) {
  if (!codec) return 'Unknown';
  const lower = codec.toLowerCase().trim();
  return VIDEO_CODEC_MAP[lower] || codec.toUpperCase();
}

function normalizeAudioCodec(codec) {
  if (!codec) return 'Unknown';
  const lower = codec.toLowerCase().trim();
  return AUDIO_CODEC_MAP[lower] || codec.toUpperCase();
}

function mergeCodecResults(results, normalizer) {
  const merged = new Map();
  
  for (const r of results) {
    const normalizedName = normalizer(r._id);
    
    if (merged.has(normalizedName)) {
      const existing = merged.get(normalizedName);
      existing.totalPlays += r.totalPlays;
      existing.directPlay += r.directPlay;
      existing.transcodes += r.transcodes;
    } else {
      merged.set(normalizedName, {
        name: normalizedName,
        totalPlays: r.totalPlays,
        directPlay: r.directPlay,
        transcodes: r.transcodes
      });
    }
  }
  
  return Array.from(merged.values())
    .map(r => ({
      name: r.name,
      totalPlays: r.totalPlays,
      directPlayCount: r.directPlay,
      transcodeCount: r.transcodes,
      directPlayRate: r.totalPlays > 0 
        ? parseFloat(((r.directPlay / r.totalPlays) * 100).toFixed(1))
        : 0
    }))
    .sort((a, b) => b.totalPlays - a.totalPlays);
}

class TranscodingService {
  getDateRange(period) {
    const now = new Date();
    let startDate = null;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = null;
    }
    
    return { startDate, endDate: now };
  }

  buildBaseQuery(options = {}) {
    const { period = '30d', userId = null, serverId = null } = options;
    const query = {};
    
    const { startDate } = this.getDateRange(period);
    if (startDate) {
      query.viewedAt = { $gte: startDate };
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    if (serverId) {
      query.serverId = serverId;
    }
    
    return query;
  }

  async getSummary(options = {}) {
    const query = this.buildBaseQuery(options);
    
    const [totals, topDevice, topCodec] = await Promise.all([
      PlaybackSession.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            directPlay: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$playback.videoDecision', 'directplay'] },
                    { $eq: ['$playback.audioDecision', 'directplay'] }
                  ]},
                  1, 0
                ]
              }
            },
            videoTranscodes: {
              $sum: { $cond: [{ $eq: ['$playback.videoDecision', 'transcode'] }, 1, 0] }
            },
            audioTranscodes: {
              $sum: { $cond: [{ $eq: ['$playback.audioDecision', 'transcode'] }, 1, 0] }
            },
            directStream: {
              $sum: {
                $cond: [
                  { $or: [
                    { $eq: ['$playback.videoDecision', 'copy'] },
                    { $eq: ['$playback.audioDecision', 'copy'] }
                  ]},
                  1, 0
                ]
              }
            }
          }
        }
      ]),
      
      PlaybackSession.aggregate([
        { $match: { ...query, 'playback.videoDecision': 'transcode' } },
        { $group: { _id: '$device.product', transcodeCount: { $sum: 1 } } },
        { $sort: { transcodeCount: -1 } },
        { $limit: 1 }
      ]),
      
      PlaybackSession.aggregate([
        { $match: { ...query, 'playback.videoDecision': 'transcode' } },
        { $group: { _id: '$mediaSnapshot.videoCodec', transcodeCount: { $sum: 1 } } },
        { $sort: { transcodeCount: -1 } },
        { $limit: 1 }
      ])
    ]);

    const stats = totals[0] || {
      totalSessions: 0,
      directPlay: 0,
      videoTranscodes: 0,
      audioTranscodes: 0,
      directStream: 0
    };

    const transcodeCount = stats.totalSessions - stats.directPlay;
    const directPlayRate = stats.totalSessions > 0 
      ? ((stats.directPlay / stats.totalSessions) * 100).toFixed(1)
      : 0;

    return {
      totalSessions: stats.totalSessions,
      directPlayCount: stats.directPlay,
      transcodeCount,
      directStreamCount: stats.directStream,
      videoTranscodes: stats.videoTranscodes,
      audioTranscodes: stats.audioTranscodes,
      directPlayRate: parseFloat(directPlayRate),
      topDevice: topDevice[0] ? {
        name: topDevice[0]._id || 'Unknown',
        transcodeCount: topDevice[0].transcodeCount
      } : null,
      topCodec: topCodec[0] ? {
        name: topCodec[0]._id || 'Unknown',
        transcodeCount: topCodec[0].transcodeCount
      } : null
    };
  }

  async getDecisionsOverTime(options = {}) {
    const query = this.buildBaseQuery(options);
    const { period = '30d' } = options;
    
    let dateFormat;
    if (period === '7d' || period === '30d' || period === '90d') {
      dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' } };
    } else {
      dateFormat = { $dateToString: { format: '%Y-%m', date: '$viewedAt' } };
    }

    const results = await PlaybackSession.aggregate([
      { $match: query },
      {
        $group: {
          _id: dateFormat,
          total: { $sum: 1 },
          directPlay: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$playback.videoDecision', 'directplay'] },
                  { $eq: ['$playback.audioDecision', 'directplay'] }
                ]},
                1, 0
              ]
            }
          },
          transcodes: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$playback.videoDecision', 'transcode'] },
                  { $eq: ['$playback.audioDecision', 'transcode'] }
                ]},
                1, 0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return results.map(r => ({
      date: r._id,
      total: r.total,
      directPlay: r.directPlay,
      transcodes: r.transcodes
    }));
  }

  async getTranscodeReasons(options = {}) {
    const query = this.buildBaseQuery(options);
    query['playback.videoDecision'] = 'transcode';

    const results = await PlaybackSession.aggregate([
      { $match: query },
      { $group: { _id: '$playback.transcodeReason', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const reasonLabels = {
      'videoCodecNotSupported': 'Video Codec',
      'audioCodecNotSupported': 'Audio Codec',
      'containerNotSupported': 'Container',
      'videoProfileNotSupported': 'Video Profile',
      'videoLevelNotSupported': 'Video Level',
      'videoBitDepthNotSupported': 'Bit Depth',
      'videoFrameRateNotSupported': 'Frame Rate',
      'audioProfileNotSupported': 'Audio Profile',
      'subtitleCodecNotSupported': 'Subtitles',
      'secondarySubtitleNotSupported': 'Secondary Subtitles',
      'audioChannelCountNotSupported': 'Audio Channels',
      'unknownVideoStreamInfo': 'Unknown Video',
      'unknownAudioStreamInfo': 'Unknown Audio',
      'directPlayDisabled': 'Direct Play Disabled',
      'videoResolutionNotSupported': 'Resolution',
      'bitrateExceedsLimit': 'Bitrate Limit'
    };

    return results.map(r => ({
      reason: r._id || 'Unknown',
      label: reasonLabels[r._id] || r._id || 'Unknown',
      count: r.count
    }));
  }

  async getByDevice(options = {}) {
    const query = this.buildBaseQuery(options);

    const results = await PlaybackSession.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            product: { $ifNull: ['$device.product', '$device.platform'] },
            platform: '$device.platform'
          },
          totalPlays: { $sum: 1 },
          directPlay: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$playback.videoDecision', 'directplay'] },
                  { $eq: ['$playback.audioDecision', 'directplay'] }
                ]},
                1, 0
              ]
            }
          },
          transcodes: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$playback.videoDecision', 'transcode'] },
                  { $eq: ['$playback.audioDecision', 'transcode'] }
                ]},
                1, 0
              ]
            }
          },
          users: { $addToSet: '$userName' },
          deviceNames: { $addToSet: '$device.name' },
          reasons: {
            $push: {
              $cond: [
                { $eq: ['$playback.videoDecision', 'transcode'] },
                '$playback.transcodeReason',
                '$$REMOVE'
              ]
            }
          }
        }
      },
      { $sort: { transcodes: -1 } }
    ]);

    return results.map(r => {
      const directPlayRate = r.totalPlays > 0 
        ? ((r.directPlay / r.totalPlays) * 100).toFixed(1)
        : 0;
      
      const reasonCounts = {};
      r.reasons.forEach(reason => {
        if (reason) {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        }
      });
      
      const topReasons = Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason, count]) => ({ reason, count }));

      const product = r._id.product || 'Unknown';
      const platform = r._id.platform;
      let displayName = product;
      if (platform && platform !== product && !product.toLowerCase().includes(platform.toLowerCase())) {
        displayName = `${product} (${platform})`;
      }

      return {
        deviceIdentifier: `${product}-${platform}`,
        name: displayName,
        platform: r._id.platform,
        product: r._id.product,
        totalPlays: r.totalPlays,
        directPlayCount: r.directPlay,
        transcodeCount: r.transcodes,
        directPlayRate: parseFloat(directPlayRate),
        users: r.users.filter(u => u),
        deviceNames: r.deviceNames.filter(d => d),
        topReasons
      };
    });
  }

  async getByFormat(options = {}) {
    const query = this.buildBaseQuery(options);

    const [videoCodecs, audioCodecs, hdrTypes, containers] = await Promise.all([
      PlaybackSession.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$mediaSnapshot.videoCodec',
            totalPlays: { $sum: 1 },
            directPlay: { $sum: { $cond: [{ $eq: ['$playback.videoDecision', 'directplay'] }, 1, 0] } },
            transcodes: { $sum: { $cond: [{ $eq: ['$playback.videoDecision', 'transcode'] }, 1, 0] } }
          }
        },
        { $sort: { totalPlays: -1 } }
      ]),
      
      PlaybackSession.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$mediaSnapshot.audioCodec',
            totalPlays: { $sum: 1 },
            directPlay: { $sum: { $cond: [{ $eq: ['$playback.audioDecision', 'directplay'] }, 1, 0] } },
            transcodes: { $sum: { $cond: [{ $eq: ['$playback.audioDecision', 'transcode'] }, 1, 0] } }
          }
        },
        { $sort: { totalPlays: -1 } }
      ]),
      
      PlaybackSession.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$mediaSnapshot.hdrType',
            totalPlays: { $sum: 1 },
            directPlay: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$playback.videoDecision', 'directplay'] },
                    { $eq: ['$playback.audioDecision', 'directplay'] }
                  ]},
                  1, 0
                ]
              }
            },
            transcodes: {
              $sum: {
                $cond: [
                  { $or: [
                    { $eq: ['$playback.videoDecision', 'transcode'] },
                    { $eq: ['$playback.audioDecision', 'transcode'] }
                  ]},
                  1, 0
                ]
              }
            }
          }
        },
        { $sort: { totalPlays: -1 } }
      ]),
      
      PlaybackSession.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$mediaSnapshot.container',
            totalPlays: { $sum: 1 },
            directPlay: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$playback.videoDecision', 'directplay'] },
                    { $eq: ['$playback.audioDecision', 'directplay'] }
                  ]},
                  1, 0
                ]
              }
            },
            transcodes: {
              $sum: {
                $cond: [
                  { $or: [
                    { $eq: ['$playback.videoDecision', 'transcode'] },
                    { $eq: ['$playback.audioDecision', 'transcode'] }
                  ]},
                  1, 0
                ]
              }
            }
          }
        },
        { $sort: { totalPlays: -1 } }
      ])
    ]);

    const mapResults = (results) => results.map(r => ({
      name: r._id || 'Unknown',
      totalPlays: r.totalPlays,
      directPlayCount: r.directPlay,
      transcodeCount: r.transcodes,
      directPlayRate: r.totalPlays > 0 
        ? parseFloat(((r.directPlay / r.totalPlays) * 100).toFixed(1))
        : 0
    }));

    return {
      videoCodecs: mergeCodecResults(videoCodecs, normalizeVideoCodec),
      audioCodecs: mergeCodecResults(audioCodecs, normalizeAudioCodec),
      hdrTypes: mapResults(hdrTypes),
      containers: mapResults(containers)
    };
  }

  async getCombinations(options = {}) {
    const query = this.buildBaseQuery(options);

    const results = await PlaybackSession.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            videoCodec: '$mediaSnapshot.videoCodec',
            audioCodec: '$mediaSnapshot.audioCodec',
            container: '$mediaSnapshot.container',
            hdrType: '$mediaSnapshot.hdrType'
          },
          totalPlays: { $sum: 1 },
          directPlay: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$playback.videoDecision', 'directplay'] },
                  { $eq: ['$playback.audioDecision', 'directplay'] }
                ]},
                1, 0
              ]
            }
          },
          transcodes: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$playback.videoDecision', 'transcode'] },
                  { $eq: ['$playback.audioDecision', 'transcode'] }
                ]},
                1, 0
              ]
            }
          },
          affectedDevices: { $addToSet: '$device.name' },
          ratingKeys: { $addToSet: '$ratingKey' }
        }
      },
      { $match: { transcodes: { $gt: 0 } } },
      { $sort: { transcodes: -1 } },
      { $limit: 20 }
    ]);

    return results.map(r => ({
      videoCodec: r._id.videoCodec || 'Unknown',
      audioCodec: r._id.audioCodec || 'Unknown',
      container: r._id.container || 'Unknown',
      hdrType: r._id.hdrType || 'SDR',
      totalPlays: r.totalPlays,
      directPlayCount: r.directPlay,
      transcodeCount: r.transcodes,
      directPlayRate: r.totalPlays > 0 
        ? parseFloat(((r.directPlay / r.totalPlays) * 100).toFixed(1))
        : 0,
      affectedDevices: r.affectedDevices.filter(d => d),
      fileCount: r.ratingKeys.length
    }));
  }

  async getByMedia(options = {}) {
    const { page = 1, limit = 20, ...filterOptions } = options;
    const query = this.buildBaseQuery(filterOptions);
    query['playback.videoDecision'] = 'transcode';

    const results = await PlaybackSession.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            mediaItemId: '$mediaItemId',
            mediaType: '$mediaType',
            ratingKey: '$ratingKey',
            title: '$mediaTitle'
          },
          transcodeCount: { $sum: 1 },
          devices: { $addToSet: '$device.name' },
          reasons: { $addToSet: '$playback.transcodeReason' },
          lastSnapshot: { $last: '$mediaSnapshot' }
        }
      },
      { $sort: { transcodeCount: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);

    const totalResult = await PlaybackSession.aggregate([
      { $match: query },
      { $group: { _id: '$mediaItemId' } },
      { $count: 'total' }
    ]);
    const total = totalResult[0]?.total || 0;

    const items = await Promise.all(results.map(async (r) => {
      let mediaDetails = null;
      
      if (r._id.mediaItemId) {
        if (r._id.mediaType === 'movie') {
          mediaDetails = await Movie.findById(r._id.mediaItemId)
            .select('title year posterUrl media.fileSize media.filePath')
            .lean();
        } else if (r._id.mediaType === 'episode') {
          mediaDetails = await Episode.findById(r._id.mediaItemId)
            .populate('showId', 'title')
            .select('title seasonNumber episodeNumber thumbUrl media.fileSize media.filePath')
            .lean();
        }
      }

      return {
        mediaItemId: r._id.mediaItemId,
        mediaType: r._id.mediaType,
        ratingKey: r._id.ratingKey,
        title: r._id.title || mediaDetails?.title || 'Unknown',
        showTitle: mediaDetails?.showId?.title,
        seasonNumber: mediaDetails?.seasonNumber,
        episodeNumber: mediaDetails?.episodeNumber,
        year: mediaDetails?.year,
        posterUrl: mediaDetails?.posterUrl || mediaDetails?.thumbUrl,
        transcodeCount: r.transcodeCount,
        devices: r.devices.filter(d => d),
        reasons: r.reasons.filter(r => r),
        mediaSnapshot: r.lastSnapshot,
        fileSize: mediaDetails?.media?.fileSize
      };
    }));

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async getUsers(options = {}) {
    const query = {};
    if (options.serverId) {
      query.serverId = options.serverId;
    }

    const results = await PlaybackSession.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          sessionCount: { $sum: 1 }
        }
      },
      { $sort: { sessionCount: -1 } }
    ]);

    return results.map(r => ({
      userId: r._id,
      userName: r.userName || 'Unknown User',
      sessionCount: r.sessionCount
    }));
  }

  async getRecommendations(options = {}) {
    const recommendations = [];

    const [devices, formats, combinations, summary] = await Promise.all([
      this.getByDevice(options),
      this.getByFormat(options),
      this.getCombinations(options),
      this.getSummary(options)
    ]);

    // DV Profile 5 issues
    const dvP5Combo = combinations.find(c => 
      c.hdrType && c.hdrType.toLowerCase().includes('dv') && 
      c.hdrType.toLowerCase().includes('p5') &&
      c.directPlayRate < 30
    );
    if (dvP5Combo) {
      const dvP5Files = await this.getFilesForCombination(dvP5Combo, options);
      recommendations.push({
        id: 'dv-profile-5',
        type: 'high',
        icon: '🎯',
        title: `Replace ${dvP5Combo.fileCount} Dolby Vision Profile 5 files`,
        description: 'These files have NO HDR fallback and transcode on all devices except those with native DV support.',
        impact: {
          estimatedTranscodeReduction: dvP5Combo.transcodeCount,
          affectedFiles: dvP5Combo.fileCount,
          affectedStorage: dvP5Files.reduce((sum, f) => sum + (f.fileSize || 0), 0)
        },
        actions: [
          { label: 'View Files', type: 'viewFiles', data: { combination: dvP5Combo } },
          { label: 'Search in Radarr', type: 'searchRadarr', data: { combination: dvP5Combo } }
        ],
        details: { combination: dvP5Combo, affectedDevices: dvP5Combo.affectedDevices }
      });
    }

    // Struggling devices
    const strugglingDevices = devices.filter(d => d.directPlayRate < 50 && d.totalPlays >= 20);
    for (const device of strugglingDevices.slice(0, 2)) {
      recommendations.push({
        id: `device-${device.deviceIdentifier}`,
        type: 'high',
        icon: '📱',
        title: `${device.name} transcodes ${(100 - device.directPlayRate).toFixed(0)}% of plays`,
        description: 'This device struggles with your library content.',
        impact: { estimatedTranscodeReduction: device.transcodeCount, affectedFiles: null, affectedStorage: null },
        actions: [
          { label: 'View Problem Content', type: 'viewDeviceContent', data: { device } },
          { label: 'Plex Settings Guide', type: 'link', data: { url: 'https://support.plex.tv/articles/115007570148-direct-play-direct-stream-or-transcode/' } }
        ],
        details: { device, topReasons: device.topReasons }
      });
    }

    // Problematic audio
    const problematicAudio = formats.audioCodecs.filter(a => 
      (a.name?.toLowerCase().includes('truehd') || a.name?.toLowerCase().includes('dts-hd')) &&
      a.directPlayRate < 30
    );
    for (const audio of problematicAudio) {
      recommendations.push({
        id: `audio-${audio.name}`,
        type: 'medium',
        icon: '🔊',
        title: `${audio.transcodeCount} plays with ${audio.name} audio transcoded`,
        description: `${audio.name} requires transcoding for most streaming scenarios.`,
        impact: { estimatedTranscodeReduction: audio.transcodeCount, affectedFiles: null, affectedStorage: null },
        actions: [
          { label: 'View Files', type: 'viewAudioFiles', data: { codec: audio.name } }
        ],
        details: { audioCodec: audio }
      });
    }

    // Positive insights
    const goodDevices = devices.filter(d => d.directPlayRate >= 90 && d.totalPlays >= 20);
    for (const device of goodDevices.slice(0, 2)) {
      recommendations.push({
        id: `positive-${device.deviceIdentifier}`,
        type: 'positive',
        icon: '✅',
        title: `${device.name} has ${device.directPlayRate}% direct play rate`,
        description: 'This device handles almost everything in your library natively.',
        impact: { estimatedTranscodeReduction: 0, affectedFiles: null, affectedStorage: null },
        actions: [],
        details: { device }
      });
    }

    const typeOrder = { high: 0, medium: 1, low: 2, positive: 3 };
    recommendations.sort((a, b) => {
      const typeCompare = typeOrder[a.type] - typeOrder[b.type];
      if (typeCompare !== 0) return typeCompare;
      return (b.impact.estimatedTranscodeReduction || 0) - (a.impact.estimatedTranscodeReduction || 0);
    });

    return recommendations;
  }

  async getFilesForCombination(combination, options = {}) {
    const query = this.buildBaseQuery(options);
    query['mediaSnapshot.videoCodec'] = combination.videoCodec;
    query['mediaSnapshot.audioCodec'] = combination.audioCodec;
    query['mediaSnapshot.container'] = combination.container;

    const sessions = await PlaybackSession.find(query).select('mediaItemId mediaType').lean();
    const mediaIds = [...new Set(sessions.map(s => s.mediaItemId?.toString()).filter(Boolean))];
    
    const files = await Promise.all([
      Movie.find({ _id: { $in: mediaIds } }).select('media.fileSize').lean(),
      Episode.find({ _id: { $in: mediaIds } }).select('media.fileSize').lean()
    ]);

    return [...files[0], ...files[1]];
  }

  async getSessions(options = {}) {
    const { page = 1, limit = 50, decision = null, ...filterOptions } = options;
    const query = this.buildBaseQuery(filterOptions);

    if (decision === 'directplay') {
      query['playback.videoDecision'] = 'directplay';
      query['playback.audioDecision'] = 'directplay';
    } else if (decision === 'transcode') {
      query.$or = [
        { 'playback.videoDecision': 'transcode' },
        { 'playback.audioDecision': 'transcode' }
      ];
    }

    const [sessions, total] = await Promise.all([
      PlaybackSession.find(query).sort({ viewedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PlaybackSession.countDocuments(query)
    ]);

    return {
      items: sessions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async getSessionCount(serverId = null) {
    const query = serverId ? { serverId } : {};
    return PlaybackSession.countDocuments(query);
  }

  getRawCodecValues(normalizedName, codecType) {
    const map = codecType === 'video' ? VIDEO_CODEC_MAP : AUDIO_CODEC_MAP;
    const rawValues = [];
    
    for (const [raw, normalized] of Object.entries(map)) {
      if (normalized === normalizedName) {
        rawValues.push(raw);
      }
    }
    
    rawValues.push(normalizedName);
    rawValues.push(normalizedName.toLowerCase());
    rawValues.push(normalizedName.toUpperCase());
    
    return [...new Set(rawValues)];
  }

  async getMediaByCodec(options = {}) {
    const { page = 1, limit = 20, codecType, codecValue, ...filterOptions } = options;
    const query = this.buildBaseQuery(filterOptions);
    
    if (!codecType || !codecValue) {
      return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const rawValues = this.getRawCodecValues(codecValue, codecType);
    const codecField = codecType === 'video' ? 'mediaSnapshot.videoCodec' : 'mediaSnapshot.audioCodec';
    
    // Escape special regex characters and build pattern
    const escaped = rawValues.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regexPattern = escaped.map(v => `^${v}$`).join('|');
    query[codecField] = { $regex: new RegExp(regexPattern, 'i') };

    const results = await PlaybackSession.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            mediaItemId: '$mediaItemId',
            mediaType: '$mediaType',
            ratingKey: '$ratingKey',
            title: '$mediaTitle'
          },
          playCount: { $sum: 1 },
          directPlay: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$playback.videoDecision', 'directplay'] },
                  { $eq: ['$playback.audioDecision', 'directplay'] }
                ]},
                1, 0
              ]
            }
          },
          transcodes: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$playback.videoDecision', 'transcode'] },
                  { $eq: ['$playback.audioDecision', 'transcode'] }
                ]},
                1, 0
              ]
            }
          },
          devices: { $addToSet: '$device.product' },
          lastSnapshot: { $last: '$mediaSnapshot' },
          lastViewed: { $max: '$viewedAt' }
        }
      },
      { $sort: { playCount: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);

    const totalResult = await PlaybackSession.aggregate([
      { $match: query },
      { $group: { _id: { mediaItemId: '$mediaItemId', ratingKey: '$ratingKey' } } },
      { $count: 'total' }
    ]);
    const total = totalResult[0]?.total || 0;

    const items = await Promise.all(results.map(async (r) => {
      let mediaDetails = null;
      
      if (r._id.mediaItemId) {
        if (r._id.mediaType === 'movie') {
          mediaDetails = await Movie.findById(r._id.mediaItemId)
            .select('title year posterUrl media.fileSize media.filePath media.resolution')
            .lean();
        } else if (r._id.mediaType === 'episode') {
          mediaDetails = await Episode.findById(r._id.mediaItemId)
            .populate('showId', 'title posterUrl')
            .select('title seasonNumber episodeNumber thumbUrl media.fileSize media.filePath media.resolution')
            .lean();
        }
      }

      const directPlayRate = r.playCount > 0 
        ? parseFloat(((r.directPlay / r.playCount) * 100).toFixed(1))
        : 0;

      return {
        mediaItemId: r._id.mediaItemId,
        mediaType: r._id.mediaType,
        ratingKey: r._id.ratingKey,
        title: r._id.title || mediaDetails?.title || 'Unknown',
        showTitle: mediaDetails?.showId?.title,
        seasonNumber: mediaDetails?.seasonNumber,
        episodeNumber: mediaDetails?.episodeNumber,
        year: mediaDetails?.year,
        posterUrl: mediaDetails?.posterUrl || mediaDetails?.showId?.posterUrl || mediaDetails?.thumbUrl,
        playCount: r.playCount,
        directPlayCount: r.directPlay,
        transcodeCount: r.transcodes,
        directPlayRate,
        devices: r.devices.filter(d => d),
        resolution: mediaDetails?.media?.resolution || r.lastSnapshot?.resolution,
        fileSize: mediaDetails?.media?.fileSize,
        lastViewed: r.lastViewed
      };
    }));

    return {
      items,
      codecType,
      codecValue,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }
}

module.exports = new TranscodingService();
