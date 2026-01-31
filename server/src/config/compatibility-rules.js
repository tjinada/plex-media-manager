/**
 * Media Compatibility Rules
 * 
 * Each rule checks for specific codec/format issues that may cause
 * playback problems on various devices.
 */

const compatibilityRules = [
  {
    id: 'dovi-profile-5',
    name: 'Dolby Vision Profile 5',
    description: 'Dolby Vision Profile 5 lacks HDR10 fallback layer, causing playback issues on non-DV devices. Many TVs and streaming devices will show incorrect colors or fail to play.',
    severity: 'high',
    category: 'hdr',
    enabled: true,
    check: (mediaInfo) => {
      const hdr = mediaInfo.hdr;
      if (!hdr || !hdr.doviPresent) return null;
      
      const doviProfile = hdr.doviProfile;
      const blCompatId = hdr.doviBLCompatID;
      
      // Profile 5 always lacks HDR10 fallback - flag it
      if (doviProfile === 5 || doviProfile === '5') {
        return {
          detected: true,
          details: `Dolby Vision Profile 5 detected (no HDR10 fallback)`
        };
      }
      
      // Profile 8 with BL Compat ID 0 or undefined also lacks proper fallback
      // BL Compat ID 1 = HDR10 compatible, 2 = SDR compatible, 4 = both
      if ((doviProfile === 8 || doviProfile === '8') && 
          (blCompatId === 0 || blCompatId === '0' || blCompatId === undefined || blCompatId === null)) {
        return {
          detected: true,
          details: `Dolby Vision Profile 8 without HDR10 fallback (BL Compat ID: ${blCompatId ?? 'none'})`
        };
      }
      
      return null;
    }
  },
  {
    id: 'dovi-profile-4',
    name: 'Dolby Vision Profile 4',
    description: 'Dolby Vision Profile 4 is less common and may have compatibility issues with some devices.',
    severity: 'medium',
    category: 'hdr',
    enabled: true,
    check: (mediaInfo) => {
      const hdr = mediaInfo.hdr;
      if (!hdr || !hdr.doviPresent) return null;
      
      const doviProfile = hdr.doviProfile;
      
      if (doviProfile === 4 || doviProfile === '4') {
        return {
          detected: true,
          details: `Dolby Vision Profile 4 detected`
        };
      }
      
      return null;
    }
  },
  {
    id: 'truehd-atmos',
    name: 'TrueHD Atmos',
    description: 'TrueHD Atmos requires transcoding for most streaming scenarios. Direct play only works with specific hardware setups.',
    severity: 'medium',
    category: 'audio',
    enabled: true,
    check: (mediaInfo) => {
      const audioTracks = mediaInfo.audioTracks || [];
      
      for (const track of audioTracks) {
        const codec = (track.codec || '').toLowerCase();
        const format = (track.format || '').toLowerCase();
        
        if (codec.includes('truehd') || format.includes('truehd')) {
          const isAtmos = (track.formatAdditionalFeatures || '').toLowerCase().includes('atmos') ||
                          (track.title || '').toLowerCase().includes('atmos');
          
          if (isAtmos) {
            return {
              detected: true,
              details: 'TrueHD Atmos audio track detected'
            };
          }
        }
      }
      
      return null;
    }
  },
  {
    id: 'dts-x',
    name: 'DTS:X',
    description: 'DTS:X audio requires transcoding for most devices. Consider having a compatible fallback audio track.',
    severity: 'medium',
    category: 'audio',
    enabled: true,
    check: (mediaInfo) => {
      const audioTracks = mediaInfo.audioTracks || [];
      
      for (const track of audioTracks) {
        const codec = (track.codec || '').toLowerCase();
        const format = (track.format || '').toLowerCase();
        const title = (track.title || '').toLowerCase();
        
        if (codec.includes('dts') && (title.includes('dts:x') || title.includes('dts-x') || 
            format.includes('dts:x') || format.includes('dts-x'))) {
          return {
            detected: true,
            details: 'DTS:X audio track detected'
          };
        }
      }
      
      return null;
    }
  },
  {
    id: 'dts-hd-ma',
    name: 'DTS-HD MA',
    description: 'DTS-HD Master Audio requires transcoding for most streaming clients.',
    severity: 'low',
    category: 'audio',
    enabled: true,
    check: (mediaInfo) => {
      const audioTracks = mediaInfo.audioTracks || [];
      
      for (const track of audioTracks) {
        const codec = (track.codec || '').toLowerCase();
        const format = (track.format || '').toLowerCase();
        
        if (codec.includes('dts-hd') || codec.includes('dts hd') || 
            format.includes('dts-hd ma') || format.includes('master audio')) {
          return {
            detected: true,
            details: 'DTS-HD Master Audio track detected'
          };
        }
      }
      
      return null;
    }
  },
  {
    id: 'av1-codec',
    name: 'AV1 Codec',
    description: 'AV1 video codec has limited hardware support. Older devices will require transcoding.',
    severity: 'low',
    category: 'video',
    enabled: true,
    check: (mediaInfo) => {
      const videoTrack = mediaInfo.videoTracks?.[0];
      if (!videoTrack) return null;
      
      const codec = (videoTrack.codec || '').toLowerCase();
      const format = (videoTrack.format || '').toLowerCase();
      
      if (codec.includes('av1') || format.includes('av1')) {
        return {
          detected: true,
          details: 'AV1 video codec detected'
        };
      }
      
      return null;
    }
  },
  {
    id: 'high-bitrate-4k',
    name: 'High Bitrate 4K',
    description: '4K content with high bitrate (>80 Mbps) may buffer on slower networks or cause transcoding.',
    severity: 'low',
    category: 'bandwidth',
    enabled: true,
    check: (mediaInfo) => {
      const videoTrack = mediaInfo.videoTracks?.[0];
      if (!videoTrack) return null;
      
      const width = videoTrack.width || 0;
      const bitrate = mediaInfo.overallBitrate || videoTrack.bitrate || 0;
      const bitrateKbps = bitrate / 1000;
      
      // 4K is typically 3840 width or higher
      if (width >= 3840 && bitrateKbps > 80000) {
        return {
          detected: true,
          details: `4K content at ${Math.round(bitrateKbps / 1000)} Mbps`
        };
      }
      
      return null;
    }
  },
  {
    id: 'no-audio',
    name: 'Missing Audio Track',
    description: 'No audio track detected in the file.',
    severity: 'high',
    category: 'audio',
    enabled: true,
    check: (mediaInfo) => {
      const audioTracks = mediaInfo.audioTracks || [];
      
      if (audioTracks.length === 0) {
        return {
          detected: true,
          details: 'No audio track found in file'
        };
      }
      
      return null;
    }
  },
  {
    id: 'hevc-10bit',
    name: 'HEVC 10-bit',
    description: 'HEVC 10-bit requires hardware support. Some older devices may need to transcode.',
    severity: 'low',
    category: 'video',
    enabled: false, // Disabled by default as it's common and usually fine
    check: (mediaInfo) => {
      const videoTrack = mediaInfo.videoTracks?.[0];
      if (!videoTrack) return null;
      
      const codec = (videoTrack.codec || '').toLowerCase();
      const bitDepth = videoTrack.bitDepth || 0;
      
      if ((codec.includes('hevc') || codec.includes('h265') || codec.includes('h.265')) && 
          bitDepth >= 10) {
        return {
          detected: true,
          details: `HEVC ${bitDepth}-bit video detected`
        };
      }
      
      return null;
    }
  },
  {
    id: 'mpeg2-video',
    name: 'MPEG-2 Video',
    description: 'MPEG-2 is an older codec with large file sizes. Consider re-encoding to H.264/HEVC for better efficiency.',
    severity: 'low',
    category: 'video',
    enabled: true,
    check: (mediaInfo) => {
      const videoTrack = mediaInfo.videoTracks?.[0];
      if (!videoTrack) return null;
      
      const codec = (videoTrack.codec || '').toLowerCase();
      const format = (videoTrack.format || '').toLowerCase();
      
      if (codec.includes('mpeg2') || codec.includes('mpeg-2') || 
          format.includes('mpeg2') || format.includes('mpeg-2') ||
          format === 'mpeg video') {
        return {
          detected: true,
          details: 'MPEG-2 video codec detected'
        };
      }
      
      return null;
    }
  },
  {
    id: 'unknown-media-info',
    name: 'Unknown Media Info',
    description: 'Media file has missing or unreadable video/resolution information. This usually indicates a corrupted file or unsupported container that Plex cannot parse. The file likely will not play.',
    severity: 'high',
    category: 'video',
    enabled: true,
    check: (mediaInfo) => {
      const videoTrack = mediaInfo.videoTracks?.[0];
      
      // Check if video track is missing or has no codec
      const noVideoCodec = !videoTrack || !videoTrack.codec;
      
      // Check if dimensions are missing (indicates Unknown resolution)
      const noDimensions = !videoTrack || (!videoTrack.width && !videoTrack.height);
      
      if (noVideoCodec || noDimensions) {
        const issues = [];
        if (noVideoCodec) issues.push('video codec');
        if (noDimensions) issues.push('resolution');
        
        return {
          detected: true,
          details: `Missing ${issues.join(' and ')} - file may be corrupted or use unsupported format`
        };
      }
      
      return null;
    }
  }
];

/**
 * Get all rules
 */
function getRules() {
  return compatibilityRules;
}

/**
 * Get enabled rules only
 */
function getEnabledRules() {
  return compatibilityRules.filter(rule => rule.enabled);
}

/**
 * Get rule by ID
 */
function getRule(id) {
  return compatibilityRules.find(rule => rule.id === id);
}

/**
 * Run all enabled rules against media info
 */
function analyzeMedia(mediaInfo) {
  const issues = [];
  const enabledRules = getEnabledRules();
  
  for (const rule of enabledRules) {
    try {
      const result = rule.check(mediaInfo);
      if (result && result.detected) {
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          description: rule.description,
          severity: rule.severity,
          category: rule.category,
          details: result.details
        });
      }
    } catch (error) {
      console.error(`Error running rule ${rule.id}:`, error.message);
    }
  }
  
  return issues;
}

module.exports = {
  getRules,
  getEnabledRules,
  getRule,
  analyzeMedia,
  compatibilityRules
};
