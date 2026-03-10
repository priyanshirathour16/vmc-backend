import http from 'http';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(type, msg) {
  const c = { success: colors.green, error: colors.red, info: colors.cyan, test: colors.blue, warning: colors.yellow }[type];
  console.log(`${c}[${type.toUpperCase()}]${colors.reset} ${msg}`);
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  log('info', '🚀 Frontend-Backend Integration Test Suite');
  log('info', '='.repeat(60));

  let passed = 0, failed = 0;

  // Test 1: Health
  log('test', 'Test 1: Backend Health Check');
  try {
    const res = await makeRequest('GET', '/health');
    if (res.status === 200) {
      log('success', '✓ Backend running');
      passed++;
    }
  } catch (e) {
    log('error', `✗ Connection failed: ${e.message}`);
    failed++;
    return;
  }

  // Test 2: Register
  log('test', 'Test 2: User Registration');
  const testUser = {
    email: `user_${Date.now()}@test.com`,
    password: 'TestPass123',
    name: 'Test User',
  };

  try {
    const res = await makeRequest('POST', '/api/auth/register', testUser);
    if (res.status === 201 && res.data.data?.accessToken) {
      log('success', `✓ Registered: ${testUser.email}`);
      testUser.id = res.data.data.user.id;
      testUser.accessToken = res.data.data.accessToken;
      testUser.refreshToken = res.data.data.refreshToken;
      passed++;
    } else {
      log('error', `✗ Failed (${res.status})`);
      failed++;
    }
  } catch (e) {
    log('error', `✗ Error: ${e.message}`);
    failed++;
  }

  // Test 3: Login
  log('test', 'Test 3: User Login');
  try {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });
    if (res.status === 200 && res.data.data?.accessToken) {
      log('success', '✓ Login successful');
      testUser.accessToken = res.data.data.accessToken;
      testUser.refreshToken = res.data.data.refreshToken;
      passed++;
    } else {
      log('error', `✗ Failed (${res.status})`);
      failed++;
    }
  } catch (e) {
    log('error', `✗ Error: ${e.message}`);
    failed++;
  }

  // Test 4: Get Profile (Protected)
  log('test', 'Test 4: Protected Route - Get Profile');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${testUser.accessToken}` },
    };
    const res = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (res.status === 200) {
      log('success', `✓ Got profile: ${res.data.data.name}`);
      passed++;
    } else {
      log('error', `✗ Failed (${res.status})`);
      failed++;
    }
  } catch (e) {
    log('error', `✗ Error: ${e.message}`);
    failed++;
  }

  // Test 5: Token Refresh
  log('test', 'Test 5: Token Refresh');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/refresh',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUser.accessToken}`,
      },
    };
    const res = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify({ refreshToken: testUser.refreshToken }));
      req.end();
    });

    if (res.status === 200 && res.data.data?.accessToken) {
      log('success', '✓ Token refreshed');
      testUser.accessToken = res.data.data.accessToken;
      passed++;
    } else {
      log('error', `✗ Failed (${res.status})`);
      failed++;
    }
  } catch (e) {
    log('error', `✗ Error: ${e.message}`);
    failed++;
  }

  // Test 6: Logout
  log('test', 'Test 6: User Logout');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/logout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUser.accessToken}`,
      },
    };
    const res = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify({ refreshToken: testUser.refreshToken }));
      req.end();
    });

    if (res.status === 200) {
      log('success', '✓ Logged out successfully');
      passed++;
    } else {
      log('error', `✗ Failed (${res.status})`);
      failed++;
    }
  } catch (e) {
    log('error', `✗ Error: ${e.message}`);
    failed++;
  }

  // Results
  log('info', '='.repeat(60));
  log('info', `Results: ${passed}/${passed + failed} tests passed`);
  
  if (failed === 0) {
    log('success', '✨ All tests passed! Frontend-backend integration ready!');
  }
}

runTests().catch(e => log('error', e));
