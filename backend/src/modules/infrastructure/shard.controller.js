'use strict';

const shardService = require('./shard.service');

async function getShards(req, res, next) {
  try {
    const result = await shardService.getAllShards();
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function createShard(req, res, next) {
  try {
    const result = await shardService.registerShard(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateShard(req, res, next) {
  try {
    const result = await shardService.updateShardStatus(req.params.id, req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getReplicas(req, res, next) {
  try {
    const result = await shardService.getAllReplicas();
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function checkSync(req, res, next) {
  try {
    const result = await shardService.checkReplicaSync();
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getDrills(req, res, next) {
  try {
    const result = await shardService.getDrFailoverLogs();
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function triggerDrill(req, res, next) {
  try {
    const result = await shardService.triggerDrFailoverDrill(req.body, req.user);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getInfrastructureOverview(req, res, next) {
  try {
    const shardsResult = await shardService.getAllShards();
    const replicasResult = await shardService.getAllReplicas();
    const drResult = await shardService.getDrFailoverLogs();

    return res.status(200).json({
      success: true,
      message: 'Unified multi-database infrastructure telemetry retrieved',
      data: {
        shards: shardsResult.data?.shards || [],
        clusterStats: shardsResult.data?.clusterStats || {},
        replicas: replicasResult.data?.replicas || [],
        replicaSummary: {
          totalReplicas: replicasResult.data?.totalReplicas || 0,
          healthyCount: replicasResult.data?.healthyCount || 0,
          maxReplicationLagMs: replicasResult.data?.maxReplicationLagMs || 0,
          isSyncOptimal: replicasResult.data?.isSyncOptimal || false
        },
        drLogs: drResult.data?.drills || [],
        drMetrics: drResult.data?.metrics || {}
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getShards,
  createShard,
  updateShard,
  getReplicas,
  checkSync,
  getDrills,
  triggerDrill,
  getInfrastructureOverview
};
