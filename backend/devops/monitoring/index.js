module.exports = {
  service: 'GBS Enterprise Prometheus & Grafana Monitoring',
  metrics: {
    endpoint: '/api/v1/monitoring/metrics',
    intervalMs: 15000
  },
  alerts: {
    highCpuThreshold: 85,
    highMemoryThreshold: 90,
    errorRateThresholdPercent: 2.0
  }
};
