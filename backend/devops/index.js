const path = require('path');

/**
 * GBS Enterprise DevOps Registry
 * Step 1: Enterprise Architecture & Deployment Orchestration
 */
module.exports = {
  docker: {
    dockerfilePath: path.resolve(__dirname, '../Dockerfile'),
    composePath: path.resolve(__dirname, 'docker/docker-compose.yml'),
    network: 'gbs-enterprise-net',
  },
  nginx: {
    configPath: path.resolve(__dirname, 'nginx/nginx.conf'),
    port: 80,
    sslPort: 443,
  },
  kubernetes: {
    manifestsPath: path.resolve(__dirname, 'kubernetes'),
    namespace: 'gbs-enterprise-prod',
  },
  monitoring: {
    prometheusPort: 9090,
    grafanaPort: 3001,
  }
};
