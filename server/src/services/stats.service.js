const { Movie, TVShow, Episode } = require('../models');

class StatsService {
  async getOverview() {
    const [movieCount, showCount, episodeCount, movieStorage, episodeStorage] = await Promise.all([
      Movie.countDocuments(),
      TVShow.countDocuments(),
      Episode.countDocuments(),
      Movie.aggregate([
        { $group: { _id: null, total: { $sum: { $ifNull: ['$media.fileSize', 0] } } } }
      ]),
      Episode.aggregate([
        { $group: { _id: null, total: { $sum: { $ifNull: ['$media.fileSize', 0] } } } }
      ])
    ]);

    const totalStorage = (movieStorage[0]?.total || 0) + (episodeStorage[0]?.total || 0);

    return {
      totalMovies: movieCount,
      totalShows: showCount,
      totalEpisodes: episodeCount,
      totalStorage
    };
  }

  async getResolutionDistribution() {
    const [movies, episodes] = await Promise.all([
      Movie.aggregate([
        { $match: { 'media.resolution': { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$media.resolution', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Episode.aggregate([
        { $match: { 'media.resolution': { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$media.resolution', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    return {
      movies: this._arrayToObject(movies),
      episodes: this._arrayToObject(episodes)
    };
  }

  async getCodecDistribution() {
    const [movieVideo, episodeVideo, movieAudio, episodeAudio] = await Promise.all([
      Movie.aggregate([
        { $match: { 'media.videoCodec': { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$media.videoCodec', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Episode.aggregate([
        { $match: { 'media.videoCodec': { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$media.videoCodec', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Movie.aggregate([
        { $match: { 'media.audioCodec': { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$media.audioCodec', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Episode.aggregate([
        { $match: { 'media.audioCodec': { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$media.audioCodec', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    return {
      video: {
        movies: this._arrayToObject(movieVideo),
        episodes: this._arrayToObject(episodeVideo)
      },
      audio: {
        movies: this._arrayToObject(movieAudio),
        episodes: this._arrayToObject(episodeAudio)
      }
    };
  }

  async getContainerDistribution() {
    const [movies, episodes] = await Promise.all([
      Movie.aggregate([
        { $match: { 'media.container': { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$media.container', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Episode.aggregate([
        { $match: { 'media.container': { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: '$media.container', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    return {
      movies: this._arrayToObject(movies),
      episodes: this._arrayToObject(episodes)
    };
  }

  async getStorageStats() {
    const [
      byResolutionMovies,
      byResolutionEpisodes,
      topMovies,
      topEpisodes,
      storageByShow
    ] = await Promise.all([
      Movie.aggregate([
        { $match: { 'media.fileSize': { $exists: true, $gt: 0 } } },
        { $group: { _id: { $ifNull: ['$media.resolution', 'Unknown'] }, size: { $sum: '$media.fileSize' } } },
        { $sort: { size: -1 } }
      ]),
      Episode.aggregate([
        { $match: { 'media.fileSize': { $exists: true, $gt: 0 } } },
        { $group: { _id: { $ifNull: ['$media.resolution', 'Unknown'] }, size: { $sum: '$media.fileSize' } } },
        { $sort: { size: -1 } }
      ]),
      // Get top movies - include all movies, sorted by file size (null values last)
      Movie.aggregate([
        {
          $addFields: {
            sortableFileSize: { $ifNull: ['$media.fileSize', 0] }
          }
        },
        { $sort: { sortableFileSize: -1 } },
        { $limit: 20 },
        {
          $project: {
            title: 1,
            year: 1,
            'media.fileSize': 1,
            'media.resolution': 1,
            'media.videoCodec': 1
          }
        }
      ]),
      // Get top episodes
      Episode.aggregate([
        {
          $addFields: {
            sortableFileSize: { $ifNull: ['$media.fileSize', 0] }
          }
        },
        { $sort: { sortableFileSize: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'tvshows',
            localField: 'showId',
            foreignField: '_id',
            as: 'show'
          }
        },
        { $unwind: { path: '$show', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            title: 1,
            seasonNumber: 1,
            episodeNumber: 1,
            'media.fileSize': 1,
            'media.resolution': 1,
            'media.videoCodec': 1,
            showTitle: '$show.title'
          }
        }
      ]),
      Episode.aggregate([
        { $match: { 'media.fileSize': { $exists: true, $gt: 0 } } },
        { $group: { _id: '$showId', totalSize: { $sum: '$media.fileSize' }, episodeCount: { $sum: 1 } } },
        { $sort: { totalSize: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'tvshows',
            localField: '_id',
            foreignField: '_id',
            as: 'show'
          }
        },
        { $unwind: { path: '$show', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            title: '$show.title',
            totalSize: 1,
            episodeCount: 1
          }
        }
      ])
    ]);

    const movieStorage = byResolutionMovies.reduce((sum, item) => sum + (item.size || 0), 0);
    const episodeStorage = byResolutionEpisodes.reduce((sum, item) => sum + (item.size || 0), 0);

    const byResolution = {};
    [...byResolutionMovies, ...byResolutionEpisodes].forEach(item => {
      const key = item._id || 'Unknown';
      byResolution[key] = (byResolution[key] || 0) + (item.size || 0);
    });

    return {
      byResolution,
      byType: {
        movies: movieStorage,
        episodes: episodeStorage
      },
      topMovies: topMovies.map(m => ({
        id: m._id,
        title: m.title || 'Unknown',
        year: m.year || 0,
        fileSize: m.media?.fileSize || 0,
        resolution: m.media?.resolution || 'Unknown',
        videoCodec: m.media?.videoCodec || 'Unknown'
      })),
      topEpisodes: topEpisodes.map(e => ({
        id: e._id,
        title: e.title || 'Unknown',
        showTitle: e.showTitle || 'Unknown',
        seasonNumber: e.seasonNumber || 0,
        episodeNumber: e.episodeNumber || 0,
        fileSize: e.media?.fileSize || 0,
        resolution: e.media?.resolution || 'Unknown',
        videoCodec: e.media?.videoCodec || 'Unknown'
      })),
      byShow: storageByShow.map(s => ({
        id: s._id,
        title: s.title || 'Unknown',
        totalSize: s.totalSize || 0,
        episodeCount: s.episodeCount || 0
      }))
    };
  }

  _arrayToObject(arr) {
    const obj = {};
    arr.forEach(item => {
      const key = item._id || 'Unknown';
      obj[key] = item.count;
    });
    return obj;
  }
}

module.exports = new StatsService();
