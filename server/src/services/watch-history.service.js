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

    const movieStats = await this.getMovieStats(staleDate, sixMonthsAgo, minAgeDate);
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

      // Skip items added recently (within minAgeToConsiderDays)
      if (addedAt && addedAt > minAgeDate) {
        active++;
        continue;
      }

      if (!lastViewedAt) {
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

      if (addedAt && addedAt > minAgeDate) {
        active++;
        continue;
      }

      if (!lastViewedAt) {
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
   * Get movies list with watch status filtering
   */
  async getMovies(options = {}) {
    const {
      staleThresholdDays = 365,
      minAgeToConsiderDays = 30,
      filter = 'all', // 'all', 'never', 'stale', 'active'
      sortBy = 'fileSize',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = options;

    const now = new Date();
    const staleDate = new Date(now.getTime() - (staleThresholdDays * 24 * 60 * 60 * 1000));
    const minAgeDate = new Date(now.getTime() - (minAgeToConsiderDays * 24 * 60 * 60 * 1000));

    // Build query based on filter
    let query = {};

    if (filter === 'never') {
      query = {
        addedAt: { $lt: minAgeDate },
        $or: [
          { lastViewedAt: null },
          { lastViewedAt: { $exists: false } }
        ]
      };
    } else if (filter === 'stale') {
      query = {
        addedAt: { $lt: minAgeDate },
        lastViewedAt: { $ne: null, $lt: staleDate }
      };
    } else if (filter === 'active') {
      query = {
        $or: [
          { addedAt: { $gte: minAgeDate } },
          { lastViewedAt: { $gte: staleDate } }
        ]
      };
    }
    // 'all' = no filter, show everything

    const sortField = sortBy === 'fileSize' ? 'media.fileSize' : sortBy;
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [movies, total] = await Promise.all([
      Movie.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Movie.countDocuments(query)
    ]);

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
      status: this.getWatchStatus(movie, staleDate, minAgeDate)
    }));

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Get episodes list with watch status filtering
   */
  async getEpisodes(options = {}) {
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

    let query = {};

    if (filter === 'never') {
      query = {
        addedAt: { $lt: minAgeDate },
        $or: [
          { lastViewedAt: null },
          { lastViewedAt: { $exists: false } }
        ]
      };
    } else if (filter === 'stale') {
      query = {
        addedAt: { $lt: minAgeDate },
        lastViewedAt: { $ne: null, $lt: staleDate }
      };
    } else if (filter === 'active') {
      query = {
        $or: [
          { addedAt: { $gte: minAgeDate } },
          { lastViewedAt: { $gte: staleDate } }
        ]
      };
    }

    const sortField = sortBy === 'fileSize' ? 'media.fileSize' : sortBy;
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [episodes, total] = await Promise.all([
      Episode.find(query).populate('showId', 'title').sort(sort).skip(skip).limit(limit).lean(),
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
      status: this.getWatchStatus(episode, staleDate, minAgeDate)
    }));

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Get TV shows with watch status aggregation
   */
  async getShows(options = {}) {
    const {
      staleThresholdDays = 365,
      minAgeToConsiderDays = 30,
      filter = 'all', // 'all', 'never', 'stale', 'active'
      sortBy = 'staleEpisodes',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = options;

    const now = new Date();
    const staleDate = new Date(now.getTime() - (staleThresholdDays * 24 * 60 * 60 * 1000));
    const minAgeDate = new Date(now.getTime() - (minAgeToConsiderDays * 24 * 60 * 60 * 1000));

    const aggregation = await Episode.aggregate([
      {
        $addFields: {
          isRecent: { $gte: ['$addedAt', minAgeDate] },
          watchStatus: {
            $cond: {
              if: { $gte: ['$addedAt', minAgeDate] },
              then: 'active',
              else: {
                $cond: {
                  if: { $eq: ['$lastViewedAt', null] },
                  then: 'never',
                  else: {
                    $cond: {
                      if: { $lt: ['$lastViewedAt', staleDate] },
                      then: 'stale',
                      else: 'active'
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$showId',
          totalEpisodes: { $sum: 1 },
          neverWatched: { $sum: { $cond: [{ $eq: ['$watchStatus', 'never'] }, 1, 0] } },
          staleEpisodes: { $sum: { $cond: [{ $eq: ['$watchStatus', 'stale'] }, 1, 0] } },
          activeEpisodes: { $sum: { $cond: [{ $eq: ['$watchStatus', 'active'] }, 1, 0] } },
          totalSize: { $sum: '$media.fileSize' },
          staleSize: { $sum: { $cond: [{ $in: ['$watchStatus', ['never', 'stale']] }, '$media.fileSize', 0] } }
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
      { $unwind: '$show' },
      {
        $project: {
          showId: '$_id',
          title: '$show.title',
          year: '$show.year',
          posterUrl: '$show.posterUrl',
          totalEpisodes: 1,
          neverWatched: 1,
          staleEpisodes: 1,
          activeEpisodes: 1,
          totalSize: 1,
          staleSize: 1,
          unwatchedCount: { $add: ['$neverWatched', '$staleEpisodes'] },
          activePercentage: {
            $multiply: [{ $divide: ['$activeEpisodes', '$totalEpisodes'] }, 100]
          },
          stalePercentage: {
            $multiply: [{ $divide: [{ $add: ['$neverWatched', '$staleEpisodes'] }, '$totalEpisodes'] }, 100]
          }
        }
      },
      // Filter based on status
      ...(filter === 'active' ? [{ $match: { activePercentage: { $gte: 50 } } }] : []),
      ...(filter === 'stale' ? [{ $match: { staleEpisodes: { $gt: 0 } } }] : []),
      ...(filter === 'never' ? [{ $match: { neverWatched: { $gt: 0 } } }] : []),
      { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
      {
        $facet: {
          items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: 'count' }]
        }
      }
    ]);

    const items = aggregation[0]?.items || [];
    const total = aggregation[0]?.total[0]?.count || 0;

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Get watch status for an item
   */
  getWatchStatus(item, staleDate, minAgeDate) {
    const lastViewedAt = item.lastViewedAt ? new Date(item.lastViewedAt) : null;
    const addedAt = item.addedAt ? new Date(item.addedAt) : null;

    // Recently added items are considered active
    if (addedAt && minAgeDate && addedAt >= minAgeDate) {
      return 'active';
    }

    if (!lastViewedAt) {
      return 'never';
    } else if (lastViewedAt < staleDate) {
      return 'stale';
    }
    return 'active';
  }
}

module.exports = new WatchHistoryService();
