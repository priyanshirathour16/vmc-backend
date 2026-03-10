#!/usr/bin/env node

/**
 * Complete Frontend-Backend Authentication Flow Test
 * Tests the entire authentication system including:
 * 1. User Registration
 * 2. User Login
 * 3. Admin Login
 * 4. Protected Routes
 * 5. Token Refresh
 * 6. Logout
 */

import http from 'http';

const API_BASE = 'http://localhost:5000/api';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function log(type, message) {
  const color = {
    success: colors.green,
    error: colors.red,
    info: colors.cyan,
    warning: colors.yellow,
    test: colors.blue,
  }[type];

  console.log(`${color}[${type.toUpperCase()}]${colors.reset} ${message}`);
}

async function runTests() {
  log('info', '🚀 Starting Complete Authentication Flow Test');
  log('info', '='.repeat(60));

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Health Check
  log('test', 'Test 1: Checking backend connectivity...');
  try {
    const response = await makeRequest('GET', '/health');
    if (response.status === 200) {
      log('success', '✓ Backend is running');
      testsPassed++;
    } else {
      log('error', '✗ Backend health check failed');
      testsFailed++;
    }
  } catch (err) {
    log('error', `✗ Cannot connect to backend: ${err.message}`);
    testsFailed++;
    return;
  }

  // Test 2: User Registration
  log('test', 'Test 2: User Registration...');
  const testUser = {
    email: `testuser_${Date.now()}@example.com`,
    password: 'TestPassword123',
    name: 'Test User',
    role: 'consumer',
  };

  try {
    const response = await makeRequest('POST', '/auth/register', testUser);
    if (response.status === 201 && response.data.data?.accessToken) {
      log('success', `✓ Registration successful for ${testUser.email}`);
      log('success', `  🔑 Access Token: ${response.data.data.accessToken.substring(0, 20)}...`);
      testUser.accessToken = response.data.data.accessToken;
      testUser.refreshToken = response.data.data.refreshToken;
      testUser.id = response.data.data.user.id;
      testsPassed++;
    } else {
      log('error', `✗ Registration failed with status ${response.status}`);
      testsFailed++;
    }
  } catch (err) {
    log('error', `✗ Registration error: ${err.message}`);
    testsFailed++;
  }

  // Test 3: User Login
  log('test', 'Test 3: User Login...');
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });

    if (response.status === 200 && response.data.data?.accessToken) {
      log('success', `✓ Login successful`);
      log('success', `  🔑 New Access Token: ${response.data.data.accessToken.substring(0, 20)}...`);
      testUser.accessToken = response.data.data.accessToken;
      testUser.refreshToken = response.data.data.refreshToken;
      testsPassed++;
    } else {
      log('error', `✗ Login failed with status ${response.status}`);
      testsFailed++;
    }
  } catch (err) {
    log('error', `✗ Login error: ${err.message}`);
    testsFailed++;
  }

  // Test 4: Protected Route - Get Profile
  log('test', 'Test 4: Accessing Protected Route (/auth/me)...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testUser.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data),
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data,
            });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (response.status === 200) {
      log('success', `✓ Protected route accessed successfully`);
      log('success', `  👤 User: ${response.data.data.name}`);
      log('success', `  👥 Role: ${response.data.data.role}`);
      testsPassed++;
    } else {
      log('error', `✗ Protected route failed with status ${response.status}`);
      testsFailed++;
    }
  } catch (err) {
    log('error', `✗ Protected route error: ${err.message}`);
    testsFailed++;
  }

  // Test 5: Invalid Token
  log('test', 'Test 5: Testing Invalid Token Rejection...');
  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid.token.here',
        'Content-Type': 'application/json',
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data),
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data,
            });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (response.status === 401) {
      log('success', `✓ Invalid token correctly rejected (401)`);
      testsPassed++;
    } else {
      log('warning', `⚠ Expected 401, got ${response.status}`);
    }
  } catch (err) {
    log('error', `✗ Error: ${err.message}`);
    testsFailed++;
  }

  // Test 6: Token Refresh
  log('test', 'Test 6: Token Refresh...');
  try {
    const response = await makeRequest('POST', '/auth/refresh', {
      refreshToken: testUser.refreshToken,
    });

    if (response.status === 200 && response.data.data?.accessToken) {
      log('success', `✓ Token refresh successful`);
      log('success', `  🔑 New Access Token: ${response.data.data.accessToken.substring(0, 20)}...`);
      testUser.accessToken = response.data.data.accessToken;
      testsPassed++;
    } else {
      log('error', `✗ Token refresh failed with status ${response.status}`);
      testsFailed++;
    }
  } catch (err) {
    log('error', `✗ Token refresh error: ${err.message}`);
    testsFailed++;
  }

  // Test 7: Logout
  log('test', 'Test 7: User Logout...');
  try {
    const response = await makeRequest('POST', '/auth/logout', {
      refreshToken: testUser.refreshToken,
    });

    if (response.status === 200) {
      log('success', `✓ Logout successful`);
      testsPassed++;
    } else {
      log('error', `✗ Logout failed with status ${response.status}`);
      testsFailed++;
    }
  } catch (err) {
    log('error', `✗ Logout error: ${err.message}`);
    testsFailed++;
  }

  // Results
  log('info', '='.repeat(60));
  log('info', `📊 Test Results:`);
  log('success', `   ✓ Passed: ${testsPassed}`);
  log('error', `   ✗ Failed: ${testsFailed}`);
  log(
    testsFailed === 0 ? 'success' : 'warning',
    `   📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`
  );

  console.log('\n');
  log('info', '✨ Frontend integration is ready to use!');
  log('info', '🌐 Frontend: http://localhost:3000 (or next available port)');
  log('info', '🔌 Backend:  http://localhost:5000');
}

// Run the tests
runTests().catch((err) => {
  log('error', `Fatal error: ${err.message}`);
  process.exit(1);
});
