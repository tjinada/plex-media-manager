const { Movie, Episode, TVShow } = require('../models');

class WatchHistoryService {
  /**
   * Get watch history analysis
   */
  async getAnalysis(options = {}) {
    const {
      staleThresholdDays = 365,
      minAgeToConsiderDays = 30
    } = options;

    const now = new Date();
    const staleDate = new Date(now.getTime() - (staleThresholdDays * 24 * 60 * 60 * 1000));
    const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    const minAgeDate = new Date(now.getTime() - (minAgeToConsiderDays * 24 * 60 * 60 * 1000));

    // Get movie stats
    const movieStats = await this.getMovieStats(staleDate, sixMonthsAgo, minAgeDate);
    
    // Get episode stats
    const episodeStats = await this.getEpisodeStats(staleDate, sixMonthsAgo, minAgeDate);

    return {
      summary: {
        movies: movieStats.summary,
        episodes: episodeStats.summary,
        total: {
          neverWatched: movieStats.summary.neverWatched + episodeStats.summary.neverWatched,
          staleOneYear: movieStats.summary.staleOneYear + episodeStats.summary.staleOneYear,
          staleSixMonths: movieStats.summary.staleSixMonths + episodeStats.summary.staleSixMonths,
          active: movieStats.summary.active + episodeStats.summary.active,
          totalItems: movieStats.summary.totalItems + episodeStats.summary.totalItems,
          totalSize: movieStats.summary.totalSize + episodeStats.summary.totalSize,
          staleSize: movieStats.summary.staleSize + episodeStats.summary.staleSize
        }
      },
      staleThresholdDays,
      analyzedAt: now
    };
  }

  /**
   * Get movie watch stats
   */
  async getMovieStats(staleDate, sixMonthsAgo, minAgeDate) {
    const movies = await Movie.find({}).lean();
    
    let neverWatched = 0;
    let staleOneYear = 0;
    let staleSixMonths = 0;
    let active = 0;
    let totalSize = 0;
    let staleSize = 0;

    for (const movie of movies) {
      const fileSize = movie.media?.fileSize || 0;
      totalSize += fileSize;

      const addedAt = movie.addedAt ? new Date(movie.addedAt) : null;
      const lastViewedAt = movie.lastViewedAt ? new Date(movie.lastViewedAt) : null;
      const viewCount = movie.viewCount || 0;

      // Skip items added recently (within minAgeToConsiderDays)
      if (addedAt && addedAt > minAgeDate) {
        active++;
        continue;
      }

      if (viewCount === 0 || !lastViewedAt) {
        neverWatched++;
        staleSize += fileSize;
      } else if (lastViewedAt < staleDate) {
        staleOneYear++;
        staleSize += fileSize;
      } else if (lastViewedAt < sixMonthsAgo) {
        staleSixMonths++;
      } else {
        active++;
      }
    }

    return {
      summary: {
        neverWatched,
        staleOneYear,
        staleSixMonths,
        active,
        totalItems: movies.length,
        totalSize,
        staleSize
      }
    };
  }

  /**
   * Get episode watch stats
   */
  async getEpisodeStats(staleDate, sixMonthsAgo, minAgeDate) {
    const episodes = await Episode.find({}).lean();
    
    let neverWatched = 0;
    let staleOneYear = 0;
    let staleSixMonths = 0;
    let active = 0;
    let totalSize = 0;
    let staleSize = 0;

    for (const episode of episodes) {
      const fileSize = episode.media?.fileSize || 0;
      totalSize += fileSize;

      const addedAt = episode.addedAt ? new Date(episode.addedAt) : null;
      const lastViewedAt = episode.lastViewedAt ? new Date(episode.lastViewedAt) : null;
      const viewCount = episode.viewCount || 0;

      // Skip items added recently (within minAgeToConsiderDays)
      if (addedAt && addedAt > minAgeDate) {
        active++;
        continue;
      }

      if (viewCount === 0 || !lastViewedAt) {
        neverWatched++;
        staleSize += fileSize;
      } else if (lastViewedAt < staleDate) {
        staleOneYear++;
        staleSize += fileSize;
      } else if (lastViewedAt < sixMonthsAgo) {
        staleSixMonths++;
      } else {
        active++;
      }
    }

    return {
      summary: {
        neverWatched,
        staleOneYear,
        staleSixMonths,
        active,
        totalItems: episodes.length,
        totalSize,
        staleSize
      }
    };
  }

  /**
   * Get stale movies list
   */
  async getStaleMovies(options = {}) {
    const {
      staleThresholdDays = 365,
      minAgeToConsiderDays = 30,
      filter = 'all', // 'all', 'never', 'stale'
      sortBy = 'fileSize', // 'fileSize', 'addedAt', 'lastViewedAt'
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = options;

    const now = new Date();
    const staleDate = new Date(now.getTime() - (staleThresholdDays * 24 * 60 * 60 * 1000));
    const minAgeDate = new Date(now.getTime() - (minAgeToConsiderDays * 24 * 60 * 60 * 1000));

    // Build query
    const query = {
      addedAt: { $lt: minAgeDate }
    };

    if (filter === 'never') {
      query.$or = [
        { viewCount: 0 },
        { viewCount: { $exists: false } },
        { lastViewedAt: null },
        { lastViewedAt: { $exists: false } }
      ];
    } else if (filter === 'stale') {
      query.viewCount = { $gt: 0 };
      query.lastViewedAt = { $lt: staleDate };
    } else {
      // 'all' - both never watched and stale
      query.$or = [
        { viewCount: 0 },
        { viewCount: { $exists: false } },
        { lastViewedAt: null },
        { lastViewedAt: { $exists: false } },
        { lastViewedAt: { $lt: staleDate } }
      ];
    }

    // Build sort
    const sortField = sortBy === 'fileSize' ? 'media.fileSize' : sortBy;
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const skip = (page - 1) * limit;

    const [movies, total] = await Promise.all([
      Movie.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Movie.countDocuments(query)
    ]);

    // Transform for response
    const items = movies.map(movie => ({
      id: movie._id,
      plexId: movie.plexId,
      title: movie.title,
      year: movie.year,
      addedAt: movie.addedAt,
      lastViewedAt: movie.lastViewedAt,
      viewCount: movie.viewCount || 0,
      fileSize: movie.media?.fileSize || 0,
      resolution: movie.media?.resolution,
      videoCodec: movie.media?.videoCodec,
      filePath: movie.media?.filePath,
      posterUrl: movie.posterUrl,
      status: this.getWatchStatus(movie, staleDate)
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get stale episodes list
   */
  async getStaleEpisodes(options = {}) {
    const {
      staleThresholdDays = 365,
      minAgeToConsiderDays = 30,
      filter = 'all',
      sortBy = 'fileSize',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = options;

    const now = new Date();
    const staleDate = new Date(now.getTime() - (staleThresholdDays * 24 * 60 * 60 * 1000));
    const minAgeDate = new Date(now.getTime() - (minAgeToConsiderDays * 24 * 60 * 60 * 1000));

    // Build query
    const query = {
      addedAt: { $lt: minAgeDate }
    };

    if (filter === 'never') {
      query.$or = [
        { viewCount: 0 },
        { viewCount: { $exists: false } },
        { lastViewedAt: null },
        { lastViewedAt: { $exists: false } }
      ];
    } else if (filter === 'stale') {
      query.viewCount = { $gt: 0 };
      query.lastViewedAt = { $lt: staleDate };
    } else {
      query.$or = [
        { viewCount: 0 },
        { viewCount: { $exists: false } },
        { lastViewedAt: null },
        { lastViewedAt: { $exists: false } },
        { lastViewedAt: { $lt: staleDate } }
      ];
    }

    const sortField = sortBy === 'fileSize' ? 'media.fileSize' : sortBy;
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const skip = (page - 1) * limit;

    const [episodes, total] = await Promise.all([
      Episode.find(query)
        .populate('showId', 'title')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Episode.countDocuments(query)
    ]);

    const items = episodes.map(episode => ({
      id: episode._id,
      plexId: episode.plexId,
      title: episode.title,
      showTitle: episode.showId?.title || 'Unknown Show',
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      addedAt: episode.addedAt,
      lastViewedAt: episode.lastViewedAt,
      viewCount: episode.viewCount || 0,
      fileSize: episode.media?.fileSize || 0,
      resolution: episode.media?.resolution,
      videoCodec: episode.media?.videoCodec,
      filePath: episode.media?.filePath,
      thumbUrl: episode.thumbUrl,
      status: this.getWatchStatus(episode, staleDate)
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get stale TV shows (aggregate by show)
   */
  async getStaleShows(options = {}) {
    const {
      staleThresholdDays = 365,
      minAgeToConsiderDays = 30,
      sortBy = 'staleEpisodes',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = options;

    const now = new Date();
    const staleDate = new Date(now.getTime() - (staleThresholdDays * 24 * 60 * 60 * 1000));
    const minAgeDate = new Date(now.getTime() - (minAgeToConsiderDays * 24 * 60 * 60 * 1000));

    // Aggregate episodes by show
    const aggregation = await Episode.aggregate([
      {
        $match: {
          addedAt: { $lt: minAgeDate }
        }
      },
      {
        $addFields: {
          isStale: {
            $or: [
              { $eq: ['$viewCount', 0] },
              { $eq: ['$viewCount', null] },
              { $eq: ['$lastViewedAt', null] },
              { $lt: ['$lastViewedAt', staleDate] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$showId',
          totalEpisodes: { $sum: 1 },
          staleEpisodes: { $sum: { $cond: ['$isStale', 1, 0] } },
          totalSize: { $sum: '$media.fileSize' },
          staleSize: { $sum: { $cond: ['$isStale', '$media.fileSize', 0] } }
        }
      },
      {
        $match: {
          staleEpisodes: { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'tvshows',
          localField: '_id',
          foreignField: '_id',
          as: 'show'
        }
      },
      {
        $unwind: '$show'
      },
      {
        $project: {
          showId: '$_id',
          title: '$show.title',
          year: '$show.year',
          posterUrl: '$show.posterUrl',
          totalEpisodes: 1,
          staleEpisodes: 1,
          totalSize: 1,
          staleSize: 1,
          stalePercentage: {
            $multiply: [
              { $divide: ['$staleEpisodes', '$totalEpisodes'] },
              100
            ]
          }
        }
      },
      {
        $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
      },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          total: [
            { $count: 'count' }
          ]
        }
      }
    ]);

    const items = aggregation[0]?.items || [];
    const total = aggregation[0]?.total[0]?.count || 0;

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get watch status for an item
   */
  getWatchStatus(item, staleDate) {
    const viewCount = item.viewCount || 0;
    const lastViewedAt = item.lastViewedAt ? new Date(item.lastViewedAt) : null;

    if (viewCount === 0 || !lastViewedAt) {
      return 'never';
    } else if (lastViewedAt < staleDate) {
      return 'stale';
    }
    return 'active';
  }
}

module.exports = new WatchHistoryService();
