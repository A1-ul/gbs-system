'use strict';

const express = require('express');
const controller = require('./shard.controller');
const { protect } = require('../../middleware/auth.middleware');

// Shard Router
const shardRouter = express.Router();
shardRouter.get('/', controller.getShards);
shardRouter.get('/all', controller.getShards);
shardRouter.get('/shards', controller.getShards);
shardRouter.post('/', protect, controller.createShard);
shardRouter.post('/shards', protect, controller.createShard);
shardRouter.patch('/:id/status', protect, controller.updateShard);
shardRouter.patch('/shards/:id/status', protect, controller.updateShard);

// Replica Router
const replicaRouter = express.Router();
replicaRouter.get('/', controller.getReplicas);
replicaRouter.get('/all', controller.getReplicas);
replicaRouter.get('/replicas', controller.getReplicas);
replicaRouter.post('/sync-check', protect, controller.checkSync);

// DR Failover Router
const drRouter = express.Router();
drRouter.get('/', controller.getDrills);
drRouter.get('/drills', controller.getDrills);
drRouter.get('/rpo-rto-metrics', controller.getDrills);
drRouter.post('/trigger-drill', protect, controller.triggerDrill);

// Main Infrastructure Router
const mainRouter = express.Router();
mainRouter.use('/shards', shardRouter);
mainRouter.use('/replicas', replicaRouter);
mainRouter.use('/dr-failover', drRouter);
mainRouter.get('/', controller.getShards);
mainRouter.get('/status', controller.getInfrastructureOverview);
mainRouter.get('/overview', controller.getInfrastructureOverview);

module.exports = mainRouter;
module.exports.shardRouter = shardRouter;
module.exports.replicaRouter = replicaRouter;
module.exports.drRouter = drRouter;
