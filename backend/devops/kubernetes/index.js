module.exports = {
  namespace: 'gbs-enterprise',
  deployments: ['backend-deployment.yaml', 'frontend-deployment.yaml'],
  services: ['backend-service.yaml', 'frontend-service.yaml'],
  ingress: ['gbs-ingress.yaml'],
  hpa: {
    minReplicas: 3,
    maxReplicas: 20,
    targetCPUUtilizationPercentage: 75
  }
};
