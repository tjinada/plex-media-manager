const { TVShow, Season, Episode } = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get all TV shows with filtering and pagination
 */
exports.getShows = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      sort = 'title',
      order = 'asc',
      search,
      resolution,
      videoCodec
    } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { originalTitle: { $regex: search, $options: 'i' } }
      ];
    }

    if (resolution) {
      filter.dominantResolution = resolution;
    }

    if (videoCodec) {
      filter.dominantVideoCodec = videoCodec;
    }

    // Build sort
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = { [sort]: sortOrder };

    // Execute query
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    const [shows, total] = await Promise.all([
      TVShow.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit, 10))
        .select({
          plexId: 1,
          title: 1,
          year: 1,
          posterUrl: 1,
          seasonCount: 1,
          episodeCount: 1,
          dominantResolution: 1,
          dominantVideoCodec: 1,
          totalFileSize: 1
        }),
      TVShow.countDocuments(filter)
    ]);

    res.json({
      shows: shows.map(s => ({
        id: s._id,
        plexId: s.plexId,
        title: s.title,
        year: s.year,
        posterUrl: s.posterUrl,
        seasonCount: s.seasonCount,
        episodeCount: s.episodeCount,
        dominantResolution: s.dominantResolution,
        dominantVideoCodec: s.dominantVideoCodec,
        totalFileSize: s.totalFileSize
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
 * Get TV show by ID with seasons
 */
exports.getShow = async (req, res, next) => {
  try {
    const { id } = req.params;

    const show = await TVShow.findById(id);

    if (!show) {
      throw new AppError('TV Show not found', 404, 'NOT_FOUND');
    }

    // Get seasons
    const seasons = await Season.find({ showId: id })
      .sort({ seasonNumber: 1 })
      .select({
        plexId: 1,
        seasonNumber: 1,
        title: 1,
        episodeCount: 1,
        posterUrl: 1
      });

    res.json({
      show: {
        ...show.toObject(),
        seasons: seasons.map(s => ({
          id: s._id,
          seasonNumber: s.seasonNumber,
          title: s.title,
          episodeCount: s.episodeCount,
          posterUrl: s.posterUrl
        }))
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get season with episodes
 */
exports.getSeason = async (req, res, next) => {
  try {
    const { showId, seasonNumber } = req.params;

    const season = await Season.findOne({
      showId,
      seasonNumber: parseInt(seasonNumber, 10)
    });

    if (!season) {
      throw new AppError('Season not found', 404, 'NOT_FOUND');
    }

    // Get episodes
    const episodes = await Episode.find({ seasonId: season._id })
      .sort({ episodeNumber: 1 })
      .select({
        plexId: 1,
        episodeNumber: 1,
        title: 1,
        'media.resolution': 1,
        'media.videoCodec': 1,
        'media.fileSize': 1,
        'media.duration': 1
      });

    res.json({
      season: {
        id: season._id,
        seasonNumber: season.seasonNumber,
        title: season.title,
        episodes: episodes.map(e => ({
          id: e._id,
          episodeNumber: e.episodeNumber,
          title: e.title,
          resolution: e.media?.resolution,
          videoCodec: e.media?.videoCodec,
          fileSize: e.media?.fileSize,
          duration: e.media?.duration
        }))
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

    res.json({ episode });

  } catch (error) {
    next(error);
  }
};
