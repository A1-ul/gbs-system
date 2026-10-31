'use strict';

const monitoringService = require('./monitoring.service');

async function getHealth(req, res, next) {
  try {
    const health = await monitoringService.getSystemHealth();
    return res.status(200).json({ status: 'success', data: health });
  } catch (error) {
    next(error);
  }
}

async function getMetrics(req, res, next) {
  try {
    if (req.headers.accept && req.headers.accept.includes('text/plain')) {
      const textMetrics = await monitoringService.getPrometheusMetrics();
      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      return res.send(textMetrics);
    }

    const metricsData = await monitoringService.getSystemMetricsJson();
    return res.status(200).json({ status: 'success', data: metricsData });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealth,
  getMetrics
};
