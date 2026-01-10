const { Episode, TVShow } = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get all episodes with filtering and pagination
 */
exports.getEpisodes = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      sort = 'media.fileSize',
      order = 'desc',
      search,
      showId,
      resolution,
      videoCodec,
      audioCodec,
      minSize,
      maxSize
    } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    if (showId) {
      filter.showId = showId;
    }

    if (resolution) {
      filter['media.resolution'] = resolution;
    }

    if (videoCodec) {
      filter['media.videoCodec'] = { $regex: new RegExp(`^${videoCodec}$`, 'i') };
    }

    if (audioCodec) {
      filter['media.audioCodec'] = { $regex: new RegExp(`^${audioCodec}$`, 'i') };
    }

    if (minSize || maxSize) {
      filter['media.fileSize'] = {};
      if (minSize) filter['media.fileSize'].$gte = parseInt(minSize, 10);
      if (maxSize) filter['media.fileSize'].$lte = parseInt(maxSize, 10);
    }

    // Build sort
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = { [sort]: sortOrder };

    // Execute query
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    const [episodes, total] = await Promise.all([
      Episode.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit, 10))
        .select({
          showId: 1,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 1,
          'media.resolution': 1,
          'media.videoCodec': 1,
          'media.audioCodec': 1,
          'media.fileSize': 1,
          'media.duration': 1
        }),
      Episode.countDocuments(filter)
    ]);

    // Get show names for each episode
    const showIds = [...new Set(episodes.map(e => e.showId.toString()))];
    const shows = await TVShow.find({ _id: { $in: showIds } }).select({ title: 1 });
    const showMap = new Map(shows.map(s => [s._id.toString(), s.title]));

    res.json({
      episodes: episodes.map(e => ({
        id: e._id,
        showId: e.showId,
        showTitle: showMap.get(e.showId.toString()) || 'Unknown',
        seasonNumber: e.seasonNumber,
        episodeNumber: e.episodeNumber,
        title: e.title,
        resolution: e.media?.resolution,
        videoCodec: e.media?.videoCodec,
        audioCodec: e.media?.audioCodec,
        fileSize: e.media?.fileSize,
        duration: e.media?.duration
      })),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get episode by ID
 */
exports.getEpisode = async (req, res, next) => {
  try {
    const { id } = req.params;

    const episode = await Episode.findById(id);

    if (!episode) {
      throw new AppError('Episode not found', 404, 'NOT_FOUND');
    }

    // Get show name
    const show = await TVShow.findById(episode.showId).select({ title: 1 });

    res.json({ 
      episode: {
        ...episode.toObject(),
        id: episode._id,
        showTitle: show?.title || 'Unknown'
      }
    });

  } catch (error) {
    next(error);
  }
};
