'use strict';

const express = require('express');
const controller = require('./shard.controller');
const { protect } = require('../../middleware/auth.middleware');
const { restrictTo } = require('../../middleware/rbac.middleware');

const INFRA_READ_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'PRINCIPAL', 'DEVELOPER'];
const INFRA_WRITE_ROLES = ['ADMIN', 'SUPER_ADMIN', 'DEVELOPER'];

// Shard Router
const shardRouter = express.Router();
shardRouter.use(protect);
shardRouter.get('/', restrictTo(...INFRA_READ_ROLES), controller.getShards);
shardRouter.get('/all', restrictTo(...INFRA_READ_ROLES), controller.getShards);
shardRouter.get('/shards', restrictTo(...INFRA_READ_ROLES), controller.getShards);
shardRouter.post('/', restrictTo(...INFRA_WRITE_ROLES), controller.createShard);
shardRouter.post('/shards', restrictTo(...INFRA_WRITE_ROLES), controller.createShard);
shardRouter.patch('/:id/status', restrictTo(...INFRA_WRITE_ROLES), controller.updateShard);
shardRouter.patch('/shards/:id/status', restrictTo(...INFRA_WRITE_ROLES), controller.updateShard);

// Replica Router
const replicaRouter = express.Router();
replicaRouter.use(protect);
replicaRouter.get('/', restrictTo(...INFRA_READ_ROLES), controller.getReplicas);
replicaRouter.get('/all', restrictTo(...INFRA_READ_ROLES), controller.getReplicas);
replicaRouter.get('/replicas', restrictTo(...INFRA_READ_ROLES), controller.getReplicas);
replicaRouter.post('/sync-check', restrictTo(...INFRA_WRITE_ROLES), controller.checkSync);

// DR Failover Router
const drRouter = express.Router();
drRouter.use(protect);
drRouter.get('/', restrictTo(...INFRA_READ_ROLES), controller.getDrills);
drRouter.get('/drills', restrictTo(...INFRA_READ_ROLES), controller.getDrills);
drRouter.get('/rpo-rto-metrics', restrictTo(...INFRA_READ_ROLES), controller.getDrills);
drRouter.post('/trigger-drill', restrictTo(...INFRA_WRITE_ROLES), controller.triggerDrill);

// Main Infrastructure Router
const mainRouter = express.Router();
mainRouter.use(protect);
mainRouter.use('/shards', shardRouter);
mainRouter.use('/replicas', replicaRouter);
mainRouter.use('/dr-failover', drRouter);
mainRouter.get('/', restrictTo(...INFRA_READ_ROLES), controller.getShards);
mainRouter.get('/status', restrictTo(...INFRA_READ_ROLES), controller.getInfrastructureOverview);
mainRouter.get('/overview', restrictTo(...INFRA_READ_ROLES), controller.getInfrastructureOverview);

module.exports = mainRouter;
module.exports.shardRouter = shardRouter;
module.exports.replicaRouter = replicaRouter;
module.exports.drRouter = drRouter;
