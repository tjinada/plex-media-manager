/**
 * Determines resolution label from video dimensions
 * @param {number} width - Video width in pixels
 * @param {number} height - Video height in pixels
 * @returns {string} - Resolution label (4K, 1080p, 720p, 480p, SD)
 */
const getResolution = (width, height) => {
  if (!width && !height) return 'Unknown';
  
  // Check by width first (more reliable for different aspect ratios)
  if (width >= 3840 || height >= 2160) return '4K';
  if (width >= 1920 || height >= 1080) return '1080p';
  if (width >= 1280 || height >= 720) return '720p';
  if (width >= 720 || height >= 480) return '480p';
  return 'SD';
};

/**
 * Resolution sort order for filtering/sorting
 */
const RESOLUTION_ORDER = {
  '4K': 1,
  '1080p': 2,
  '720p': 3,
  '480p': 4,
  'SD': 5,
  'Unknown': 6
};

/**
 * Gets numeric sort value for resolution
 * @param {string} resolution - Resolution label
 * @returns {number} - Sort order value
 */
const getResolutionSortValue = (resolution) => {
  return RESOLUTION_ORDER[resolution] || 6;
};

module.exports = { getResolution, getResolutionSortValue, RESOLUTION_ORDER };
