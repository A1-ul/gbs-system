module.exports = {
  service: 'GBS Enterprise Nginx Multi-CDN Load Balancer',
  upstream: {
    backend: '127.0.0.1:5001',
    frontend: '127.0.0.1:3000'
  },
  rateLimiting: {
    zone: 'gbs_limit:10m',
    rate: '30r/s'
  },
  ssl: {
    enabled: true,
    protocols: ['TLSv1.2', 'TLSv1.3']
  }
};
