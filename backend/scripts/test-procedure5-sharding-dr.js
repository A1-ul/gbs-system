/**
 * test-procedure5-sharding-dr.js
 * Procedure 5 Automated Test Suite:
 * Multi-DB Architecture, Regional Sharding Registry, Read-Replica Sync,
 * Zero-Loss Disaster Recovery (DR) Automated Failover Engine, and Prometheus Telemetry.
 */

const http = require("http");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:Admin123@localhost:5432/gbs_system"
});

const BASE_HOST = "localhost";
const BASE_PORT = 5001;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const options = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failed++;
  }
}

async function runProcedure5Tests() {
  console.log("================================================================================");
  console.log("PROCEDURE 5 VERIFICATION SUITE: MULTI-DB ARCHITECTURE, SHARDING & DR FAILOVER");
  console.log("================================================================================\n");

  let createdShardId = null;
  let authToken = null;

  try {
    // --------------------------------------------------------------------------
    // Step 0: Obtain Administrative Bearer Token
    // --------------------------------------------------------------------------
    console.log("0. Authenticating Administrator for Secure Infrastructure Endpoints...");
    const loginRes = await request("POST", "/api/v1/auth/login", {
      email: "admin@gbs.com",
      password: "Admin123!"
    });
    assert(loginRes.status === 200, `Admin authentication returned 200 (Got: ${loginRes.status})`);
    authToken = loginRes.data?.data?.accessToken;
    assert(Boolean(authToken), "Received valid JWT access token");

    // --------------------------------------------------------------------------
    // Test 1: Query Live Shard Registry & Cluster Telemetry
    // --------------------------------------------------------------------------
    console.log("\n1. Testing GET /api/v1/shards (Live Shard Registry & Telemetry)...");
    const resShards = await request("GET", "/api/v1/shards");
    assert(resShards.status === 200, `Status code is 200 (Got: ${resShards.status})`);
    assert(resShards.data && resShards.data.success === true, "Response reports success: true");
    assert(Array.isArray(resShards.data.data?.shards), "Returned shards is an array");
    assert(resShards.data.data?.shards.length >= 3, `Expected at least 3 seeded shards (Found: ${resShards.data.data?.shards.length})`);
    assert(resShards.data.data?.totalShards >= 3, `Total shards >= 3 (Got: ${resShards.data.data?.totalShards})`);
    assert(parseFloat(resShards.data.data?.clusterStats?.totalCapacityGb) >= 500, `Total cluster capacity >= 500GB (Got: ${resShards.data.data?.clusterStats?.totalCapacityGb}GB)`);

    // --------------------------------------------------------------------------
    // Test 2: Provision & Register New Regional Database Shard
    // --------------------------------------------------------------------------
    console.log("\n2. Testing POST /api/v1/shards (Dynamic Regional Shard Provisioning)...");
    const newShardPayload = {
      shardKey: `SHARD-TEST-WEST-AFRICA-${Date.now().toString().slice(-4)}`,
      name: "West Africa Primary Gateway Shard",
      region: "West Africa (Lagos Node 1)",
      host: "db-shard-wa1.cluster.gbs.internal",
      port: 5432,
      databaseName: "gbs_shard_wa1",
      storageCapacityGb: 1500.0
    };
    const resCreateShard = await request("POST", "/api/v1/shards", newShardPayload, authToken);
    assert(resCreateShard.status === 201, `Status code is 201 (Got: ${resCreateShard.status})`);
    assert(resCreateShard.data?.success === true, "Shard successfully registered in PostgreSQL");
    const shardData = resCreateShard.data?.data;
    assert((shardData?.shard_key || shardData?.shardKey) === newShardPayload.shardKey, `Created shardKey matches '${newShardPayload.shardKey}'`);
    createdShardId = shardData?.id;
    assert(createdShardId !== null && createdShardId !== undefined, `Created shard received valid ID (${createdShardId})`);

    // --------------------------------------------------------------------------
    // Test 3: Shard Lifecycle & Status Mutation (Maintenance Toggle)
    // --------------------------------------------------------------------------
    console.log("\n3. Testing PATCH /api/v1/shards/:id/status (Shard Lifecycle State Mutation)...");
    const resStatusMaint = await request("PATCH", `/api/v1/shards/${createdShardId}/status`, {
      status: "MAINTENANCE"
    }, authToken);
    assert(resStatusMaint.status === 200, `Maintenance toggle returned status 200 (Got: ${resStatusMaint.status})`);
    const maintData = resStatusMaint.data?.data;
    assert(maintData?.status === "MAINTENANCE", "Shard status updated to 'MAINTENANCE'");

    const resStatusOnline = await request("PATCH", `/api/v1/shards/${createdShardId}/status`, {
      status: "ONLINE"
    }, authToken);
    assert(resStatusOnline.status === 200, `Online restoration returned status 200 (Got: ${resStatusOnline.status})`);
    const onlineData = resStatusOnline.data?.data;
    assert(onlineData?.status === "ONLINE", "Shard status restored to 'ONLINE'");

    // --------------------------------------------------------------------------
    // Test 4: Query Read Replicas & Streaming Replication Status
    // --------------------------------------------------------------------------
    console.log("\n4. Testing GET /api/v1/replicas (Cluster Read-Replicas & Streaming Telemetry)...");
    const resReplicas = await request("GET", "/api/v1/replicas");
    assert(resReplicas.status === 200, `Replicas status code is 200 (Got: ${resReplicas.status})`);
    assert(resReplicas.data?.success === true, "Replica query returned success: true");
    assert(Array.isArray(resReplicas.data?.data?.replicas), "Replicas array present");
    assert(resReplicas.data?.data?.replicas.length >= 4, `Expected at least 4 nodes in cluster (Found: ${resReplicas.data?.data?.replicas.length})`);
    assert(resReplicas.data?.data?.healthyCount >= 3, `Healthy node count >= 3 (Got: ${resReplicas.data?.data?.healthyCount})`);
    assert(resReplicas.data?.data?.isSyncOptimal === true, "Replication lag is optimal (< 5.0ms)");

    // --------------------------------------------------------------------------
    // Test 5: Trigger Cluster Replication Lag & LSN Sync Audit
    // --------------------------------------------------------------------------
    console.log("\n5. Testing POST /api/v1/replicas/sync-check (Streaming Sync & LSN Audit)...");
    const resSync = await request("POST", "/api/v1/replicas/sync-check", {}, authToken);
    assert(resSync.status === 200, `Sync audit status code is 200 (Got: ${resSync.status})`);
    assert(resSync.data?.success === true, "Sync audit returned success: true");
    assert(Array.isArray(resSync.data?.data), "Sync audit returned updated replica nodes");
    assert(resSync.data?.data?.length >= 4, `Total cluster nodes audited >= 4 (Got: ${resSync.data?.data?.length})`);

    // --------------------------------------------------------------------------
    // Test 6: Query DR Failover Ledger & Past Drill Audits
    // --------------------------------------------------------------------------
    console.log("\n6. Testing GET /api/v1/dr-failover/drills (Disaster Recovery Audit Ledger)...");
    const resDrills = await request("GET", "/api/v1/dr-failover/drills");
    assert(resDrills.status === 200, `DR drills status code is 200 (Got: ${resDrills.status})`);
    assert(resDrills.data?.success === true, "DR drills query returned success: true");
    assert(Array.isArray(resDrills.data?.data?.drills), "DR drills array returned");
    assert(resDrills.data?.data?.drills.length >= 1, `At least 1 historical DR drill logged (Found: ${resDrills.data?.data?.drills.length})`);
    const firstDrill = resDrills.data?.data?.drills[0];
    const hash = firstDrill?.verification_hash || firstDrill?.verificationHash;
    const rpo = parseFloat(firstDrill?.rpo_seconds || firstDrill?.rpoSeconds || 0);
    assert(hash && hash.length === 64, `Drill record contains valid SHA-256 hash (${hash ? hash.slice(0, 12) : "none"}...)`);
    assert(rpo === 0.0, `Historical drill achieved 0.0s RPO (Zero Data Loss, Got: ${rpo}s)`);

    // --------------------------------------------------------------------------
    // Test 7: Trigger Live Zero-Loss Automated DR Failover Drill
    // --------------------------------------------------------------------------
    console.log("\n7. Testing POST /api/v1/dr-failover/trigger-drill (Automated Zero-Loss DR Drill)...");
    const drillPayload = {
      triggerType: "SCHEDULED_PROCEDURE_5_DRILL",
      sourceShard: "SHARD-EAST-AFRICA-01",
      targetShard: "SHARD-GLOBAL-DR-01",
      notes: "Procedure 5 automated multi-region DR failover and sync validation drill."
    };
    const resTrigger = await request("POST", "/api/v1/dr-failover/trigger-drill", drillPayload, authToken);
    assert(resTrigger.status === 201, `Trigger drill status code is 201 (Got: ${resTrigger.status})`);
    assert(resTrigger.data?.success === true, "DR failover drill completed successfully");
    const executedDrill = resTrigger.data?.data;
    assert(executedDrill?.status === "COMPLETED", `Drill status is 'COMPLETED' (Got: ${executedDrill?.status})`);
    assert(parseFloat(executedDrill?.rpo_seconds || executedDrill?.rpoSeconds) === 0.0, "RPO achieved 0.0s zero loss");
    const triggerHash = executedDrill?.verification_hash || executedDrill?.verificationHash;
    assert(triggerHash && triggerHash.length === 64, `Generated valid SHA-256 audit ledger hash (${triggerHash.slice(0, 12)}...)`);

    // --------------------------------------------------------------------------
    // Test 8: Unified Infrastructure Overview
    // --------------------------------------------------------------------------
    console.log("\n8. Testing GET /api/v1/infrastructure/status (Unified Cluster Architecture)...");
    const resInfra = await request("GET", "/api/v1/infrastructure/status");
    assert(resInfra.status === 200, `Unified infra status returned 200 (Got: ${resInfra.status})`);
    assert(resInfra.data?.success === true, "Unified infra query returned success: true");
    assert(resInfra.data?.data?.shards?.length >= 4, `Unified report contains all active shards (${resInfra.data?.data?.shards?.length})`);
    assert(resInfra.data?.data?.replicas?.length >= 4, `Unified report contains all cluster replicas (${resInfra.data?.data?.replicas?.length})`);
    assert(resInfra.data?.data?.drLogs?.length >= 2, `Unified report contains updated DR ledger logs (${resInfra.data?.data?.drLogs?.length})`);

    // --------------------------------------------------------------------------
    // Test 9: System Observability & Prometheus Health Endpoint
    // --------------------------------------------------------------------------
    console.log("\n9. Testing GET /api/v1/monitoring/health (Kernel & DB Telemetry)...");
    const resHealth = await request("GET", "/api/v1/monitoring/health");
    assert(resHealth.status === 200, `Monitoring health returned 200 (Got: ${resHealth.status})`);
    assert(resHealth.data?.status === "success", "Response reports status: success");
    assert(resHealth.data?.data?.status === "HEALTHY", `Health status is 'HEALTHY' (Got: ${resHealth.data?.data?.status})`);
    assert(resHealth.data?.data?.database?.connected === true, "PostgreSQL connection status is connected: true");
    assert(resHealth.data?.data?.uptimeSeconds >= 0, `Uptime is positive (${resHealth.data?.data?.uptimeSeconds}s)`);

    // --------------------------------------------------------------------------
    // Test 10: System Observability & Metrics Endpoint (JSON & Prometheus format)
    // --------------------------------------------------------------------------
    console.log("\n10. Testing GET /api/v1/monitoring/metrics (Observability & Shard Telemetry)...");
    const resMetrics = await request("GET", "/api/v1/monitoring/metrics");
    assert(resMetrics.status === 200, `Monitoring metrics returned 200 (Got: ${resMetrics.status})`);
    assert(resMetrics.data?.data?.metrics?.shards?.total >= 4, `Metrics contains accurate shard count (${resMetrics.data?.data?.metrics?.shards?.total})`);
    assert(resMetrics.data?.data?.metrics?.replicas?.total >= 4, `Metrics contains accurate replica count (${resMetrics.data?.data?.metrics?.replicas?.total})`);
    assert(resMetrics.data?.data?.metrics?.drills?.total >= 2, `Metrics contains updated DR drill count (${resMetrics.data?.data?.metrics?.drills?.total})`);

    // --------------------------------------------------------------------------
    // Test 11: Direct Database Verification (Zero Mockup Integrity)
    // --------------------------------------------------------------------------
    console.log("\n11. Direct PostgreSQL Table Verification (Zero Mockups Guarantee)...");
    const dbShards = await pool.query("SELECT COUNT(*) FROM shard_registry;");
    const dbReplicas = await pool.query("SELECT COUNT(*) FROM replica_status;");
    const dbDrills = await pool.query("SELECT COUNT(*) FROM dr_failover_logs;");
    const totalTables = await pool.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
    );

    const shardCount = parseInt(dbShards.rows[0].count, 10);
    const replicaCount = parseInt(dbReplicas.rows[0].count, 10);
    const drillCount = parseInt(dbDrills.rows[0].count, 10);
    const tableCount = parseInt(totalTables.rows[0].count, 10);

    assert(shardCount >= 4, `PostgreSQL table 'shard_registry' has >= 4 rows (Found: ${shardCount})`);
    assert(replicaCount >= 4, `PostgreSQL table 'replica_status' has >= 4 rows (Found: ${replicaCount})`);
    assert(drillCount >= 2, `PostgreSQL table 'dr_failover_logs' has >= 2 rows (Found: ${drillCount})`);
    assert(tableCount >= 81, `PostgreSQL total public tables >= 81 (Found: ${tableCount})`);

  } catch (err) {
    console.error("Test execution caught unhandled error:", err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log("\n================================================================================");
  console.log(`PROCEDURE 5 AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runProcedure5Tests();
