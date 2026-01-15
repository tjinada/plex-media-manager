const { Movie, PlexServer } = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get all movies with filtering and pagination
 */
exports.getMovies = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      sort = 'title',
      order = 'asc',
      search,
      resolution,
      aspectRatio,
      videoCodec,
      audioCodec,
      container,
      minSize,
      maxSize
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
      filter['media.resolution'] = resolution;
    }

    if (aspectRatio) {
      const aspectRatioRanges = {
        standard: { min: 0, max: 1.5 },
        widescreen: { min: 1.5, max: 1.82 },
        theatrical: { min: 1.82, max: 2.2 },
        scope: { min: 2.2, max: 100 }
      };
      const range = aspectRatioRanges[aspectRatio];
      if (range) {
        filter.$expr = {
          $and: [
            { $gte: [{ $toDouble: { $arrayElemAt: [{ $split: ['$media.aspectRatio', ':'] }, 0] } }, range.min] },
            { $lt: [{ $toDouble: { $arrayElemAt: [{ $split: ['$media.aspectRatio', ':'] }, 0] } }, range.max] }
          ]
        };
      }
    }

    if (videoCodec) {
      filter['media.videoCodec'] = { $regex: new RegExp(`^${videoCodec}$`, 'i') };
    }

    if (audioCodec) {
      filter['media.audioCodec'] = { $regex: new RegExp(`^${audioCodec}$`, 'i') };
    }

    if (container) {
      filter['media.container'] = { $regex: new RegExp(`^${container}$`, 'i') };
    }

    if (minSize || maxSize) {
      filter['media.fileSize'] = {};
      if (minSize) filter['media.fileSize'].$gte = parseInt(minSize, 10);
      if (maxSize) filter['media.fileSize'].$lte = parseInt(maxSize, 10);
    }

    // Build sort
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = {};
    
    // Handle nested sort fields
    if (sort.startsWith('media.')) {
      sortOptions[sort] = sortOrder;
    } else if (sort === 'fileSize') {
      sortOptions['media.fileSize'] = sortOrder;
    } else if (sort === 'resolution') {
      sortOptions['media.resolution'] = sortOrder;
    } else {
      sortOptions[sort] = sortOrder;
    }

    // Execute query
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    const [movies, total] = await Promise.all([
      Movie.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit, 10))
        .select({
          plexId: 1,
          title: 1,
          year: 1,
          posterUrl: 1,
          'media.resolution': 1,
          'media.videoCodec': 1,
          'media.audioCodec': 1,
          'media.container': 1,
          'media.fileSize': 1,
          'media.duration': 1
        }),
      Movie.countDocuments(filter)
    ]);

    res.json({
      movies: movies.map(m => ({
        id: m._id,
        plexId: m.plexId,
        title: m.title,
        year: m.year,
        posterUrl: m.posterUrl,
        resolution: m.media?.resolution,
        videoCodec: m.media?.videoCodec,
        audioCodec: m.media?.audioCodec,
        container: m.media?.container,
        fileSize: m.media?.fileSize,
        duration: m.media?.duration
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
 * Get movie by ID
 */
exports.getMovie = async (req, res, next) => {
  try {
    const { id } = req.params;

    const movie = await Movie.findById(id);

    if (!movie) {
      throw new AppError('Movie not found', 404, 'NOT_FOUND');
    }

    res.json({ movie });

  } catch (error) {
    next(error);
  }
};
