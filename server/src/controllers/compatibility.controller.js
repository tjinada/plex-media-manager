const compatibilityService = require('../services/compatibility.service');

/**
 * Get all compatibility rules
 */
exports.getRules = async (req, res, next) => {
  try {
    const rules = compatibilityService.getRules();
    res.json({ rules });
  } catch (error) {
    next(error);
  }
};

/**
 * Get compatibility analysis summary
 */
exports.getAnalysis = async (req, res, next) => {
  try {
    const analysis = await compatibilityService.analyzeAll();
    res.json(analysis);
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of compatibility issues
 */
exports.getIssues = async (req, res, next) => {
  try {
    const {
      type = 'all',
      severity = 'all',
      ruleId = null,
      sortBy = 'severity',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const result = await compatibilityService.getIssues({
      type,
      severity,
      ruleId: ruleId || null,
      sortBy,
      sortOrder,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
