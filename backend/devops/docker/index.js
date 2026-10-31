module.exports = {
  service: 'GBS Enterprise Docker Controller',
  containers: {
    backend: {
      image: 'gbs-system-backend:latest',
      ports: ['5001:5001'],
      restart: 'unless-stopped'
    },
    frontend: {
      image: 'gbs-system-frontend:latest',
      ports: ['3000:3000'],
      restart: 'unless-stopped'
    },
    postgres: {
      image: 'postgres:16-alpine',
      ports: ['5432:5432'],
      volume: 'pgdata:/var/lib/postgresql/data'
    },
    redis: {
      image: 'redis:7-alpine',
      ports: ['6379:6379']
    }
  }
};
