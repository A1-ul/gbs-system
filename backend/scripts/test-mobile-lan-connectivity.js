/**
 * test-mobile-lan-connectivity.js
 * Verification Suite for Mobile Phone Browsers & LAN IP Connectivity:
 * Tests that both Frontend (Port 3000) and Backend (Port 5001) are reachable via:
 * 1. Localhost (127.0.0.1)
 * 2. Device LAN IP (e.g. 192.168.100.30)
 * 3. Mobile Host Header validation (allowedHosts in Vite)
 * 4. Mobile CORS Headers (Access-Control-Allow-Origin from mobile browser origins)
 * 5. Full REST API responses from mobile LAN IPs.
 */

const http = require('http');
const os = require('os');

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function requestHttp(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('HTTP request timeout after 5000ms'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runMobileLanTests() {
  console.log('================================================================================');
  console.log('📱 MOBILE PHONE BROWSER & LOCAL NETWORK CONNECTIVITY VERIFICATION');
  console.log('================================================================================\n');

  const lanIp = getLanIp();
  console.log(`Detected Active LAN IP for Mobile Access: ${lanIp}`);
  console.log(`Mobile Phone URL for Frontend: http://${lanIp}:3000`);
  console.log(`Mobile Phone URL for Backend:  http://${lanIp}:5001\n`);

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

  // 1. Test Backend reachability on 127.0.0.1:5001
  try {
    console.log('1. Testing Backend health on 127.0.0.1:5001/health...');
    const resLocal = await requestHttp('http://127.0.0.1:5001/health');
    assert(resLocal.statusCode === 200, `Backend returned 200 on localhost (Got: ${resLocal.statusCode})`);
    const json = JSON.parse(resLocal.data);
    assert(json.status === 'success', 'Backend reports status: success');
  } catch (err) {
    assert(false, `Localhost backend request failed: ${err.message}`);
  }

  // 2. Test Backend reachability on LAN IP (e.g. 192.168.100.30:5001) for Mobile Browsers
  try {
    console.log(`\n2. Testing Backend reachability on LAN IP: http://${lanIp}:5001/health...`);
    const resLan = await requestHttp(`http://${lanIp}:5001/health`);
    assert(resLan.statusCode === 200, `Backend returned 200 on LAN IP ${lanIp} (Got: ${resLan.statusCode})`);
    const json = JSON.parse(resLan.data);
    assert(json.status === 'success', 'Backend accessible to mobile phones via LAN IP');
  } catch (err) {
    assert(false, `LAN IP backend request failed: ${err.message}`);
  }

  // 3. Test Mobile Browser CORS Headers from Mobile Origin
  try {
    console.log(`\n3. Testing CORS for Mobile Phone Origin (Origin: http://${lanIp}:3000)...`);
    const resCors = await requestHttp(`http://${lanIp}:5001/health`, {
      headers: {
        'Origin': `http://${lanIp}:3000`,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      }
    });
    const allowOrigin = resCors.headers['access-control-allow-origin'];
    assert(allowOrigin === `http://${lanIp}:3000` || allowOrigin === '*', `CORS allows mobile origin: ${allowOrigin}`);
  } catch (err) {
    assert(false, `Mobile CORS test failed: ${err.message}`);
  }

  // 4. Test Frontend reachability on 127.0.0.1:3000
  try {
    console.log('\n4. Testing Frontend web app on 127.0.0.1:3000...');
    const resFrontLocal = await requestHttp('http://127.0.0.1:3000/');
    assert(resFrontLocal.statusCode === 200, `Frontend returned 200 on localhost (Got: ${resFrontLocal.statusCode})`);
    assert(resFrontLocal.data.includes('<!DOCTYPE html>') || resFrontLocal.data.includes('root'), 'Frontend serves valid HTML document');
  } catch (err) {
    assert(false, `Frontend localhost request failed: ${err.message}`);
  }

  // 5. Test Frontend reachability on LAN IP (e.g. 192.168.100.30:3000) with Mobile User-Agent & Host Header
  try {
    console.log(`\n5. Testing Frontend web app on LAN IP: http://${lanIp}:3000 for Mobile Browsers...`);
    const resFrontLan = await requestHttp(`http://${lanIp}:3000/`, {
      headers: {
        'Host': `${lanIp}:3000`,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
      }
    });
    assert(resFrontLan.statusCode === 200, `Frontend returned 200 on mobile LAN IP ${lanIp} (Got: ${resFrontLan.statusCode})`);
    assert(resFrontLan.data.includes('viewport-fit=cover'), 'Frontend includes mobile responsive viewport meta tag');
  } catch (err) {
    assert(false, `Frontend mobile LAN request failed: ${err.message}`);
  }

  // 6. Test Frontend Proxy to Backend via Mobile LAN IP (http://192.168.100.30:3000/health)
  try {
    console.log(`\n6. Testing Frontend Reverse Proxy via Mobile LAN IP (http://${lanIp}:3000/health)...`);
    const resProxy = await requestHttp(`http://${lanIp}:3000/health`, {
      headers: {
        'Host': `${lanIp}:3000`,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
      }
    });
    assert(resProxy.statusCode === 200, `Frontend proxy returned 200 on LAN IP (Got: ${resProxy.statusCode})`);
    const json = JSON.parse(resProxy.data);
    assert(json.status === 'success', 'Frontend proxy correctly routes mobile traffic to backend');
  } catch (err) {
    assert(false, `Frontend proxy test failed: ${err.message}`);
  }

  // 7. Test Public API data query from Mobile LAN IP
  try {
    console.log(`\n7. Testing Live PostgreSQL Public Shards API from Mobile LAN IP...`);
    const resApi = await requestHttp(`http://${lanIp}:5001/api/v1/shards`, {
      headers: {
        'Origin': `http://${lanIp}:3000`,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
      }
    });
    assert(resApi.statusCode === 200, `Shards API returned 200 on LAN IP (Got: ${resApi.statusCode})`);
    const json = JSON.parse(resApi.data);
    assert(json.success === true, 'Shards API successfully returned real PostgreSQL data');
    assert(Array.isArray(json.data?.shards) && json.data.shards.length >= 3, `Returned ${json.data?.shards?.length} active shards`);
  } catch (err) {
    assert(false, `Mobile Shards API query failed: ${err.message}`);
  }

  console.log('\n================================================================================');
  console.log(`📱 MOBILE & LAN CONNECTIVITY AUDIT: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMobileLanTests();
