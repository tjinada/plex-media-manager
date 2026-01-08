/**
 * Video codec normalization mapping
 */
const VIDEO_CODEC_MAP = {
  'hevc': 'HEVC',
  'h265': 'HEVC',
  'x265': 'HEVC',
  'h264': 'H.264',
  'x264': 'H.264',
  'avc': 'H.264',
  'avc1': 'H.264',
  'av1': 'AV1',
  'mpeg4': 'MPEG-4',
  'mpeg-4': 'MPEG-4',
  'divx': 'MPEG-4',
  'xvid': 'MPEG-4',
  'vc1': 'VC-1',
  'vc-1': 'VC-1',
  'vp9': 'VP9',
  'vp8': 'VP8'
};

/**
 * Audio codec normalization mapping
 */
const AUDIO_CODEC_MAP = {
  'truehd': 'TrueHD',
  'dts-hd ma': 'DTS-HD MA',
  'dts-hd': 'DTS-HD MA',
  'dtshd': 'DTS-HD MA',
  'dts': 'DTS',
  'ac3': 'AC3',
  'eac3': 'EAC3',
  'ec-3': 'EAC3',
  'aac': 'AAC',
  'flac': 'FLAC',
  'mp3': 'MP3',
  'opus': 'Opus',
  'vorbis': 'Vorbis',
  'pcm': 'PCM',
  'lpcm': 'LPCM'
};

/**
 * Normalizes video codec to standard format
 * @param {string} codec - Raw codec string from Plex
 * @returns {string} - Normalized codec name
 */
const normalizeVideoCodec = (codec) => {
  if (!codec) return 'Unknown';
  const lower = codec.toLowerCase().trim();
  return VIDEO_CODEC_MAP[lower] || codec.toUpperCase();
};

/**
 * Normalizes audio codec to standard format
 * @param {string} codec - Raw codec string from Plex
 * @returns {string} - Normalized codec name
 */
const normalizeAudioCodec = (codec) => {
  if (!codec) return 'Unknown';
  const lower = codec.toLowerCase().trim();
  return AUDIO_CODEC_MAP[lower] || codec.toUpperCase();
};

/**
 * Normalizes container format
 * @param {string} container - Raw container string
 * @returns {string} - Normalized container (lowercase)
 */
const normalizeContainer = (container) => {
  if (!container) return 'unknown';
  return container.toLowerCase().trim();
};

module.exports = {
  normalizeVideoCodec,
  normalizeAudioCodec,
  normalizeContainer,
  VIDEO_CODEC_MAP,
  AUDIO_CODEC_MAP
};
