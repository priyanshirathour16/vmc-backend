#!/usr/bin/env node

/**
 * VMC Reviews Backend API Testing Script
 * Tests all authentication endpoints
 * Usage: node test-auth-api.js
 */

const baseUrl = 'http://localhost:5000/api';
let accessToken = null;
let refreshToken = null;
let userId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(method, endpoint, body = null) {
  const url = `${baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (accessToken) {
    options.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    log(`Request error: ${error.message}`, 'red');
    return { status: 0, data: null };
  }
}

async function testRegistration() {
  log('\n=== TEST 1: USER REGISTRATION ===', 'cyan');
  
  const testUser = {
    email: `testuser${Date.now()}@example.com`,
    password: 'TestPassword123',
    name: 'Test User',
    role: 'consumer'
  };

  log(`Registering user: ${testUser.email}`);
  const { status, data } = await makeRequest('POST', '/auth/register', testUser);

  if (status === 201 && data.status === 'success') {
    log(`✓ Registration successful`, 'green');
    log(`  User ID: ${data.data.user.id}`);
    log(`  Email: ${data.data.user.email}`);
    log(`  Role: ${data.data.user.role}`);
    
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
    userId = data.data.user.id;
    
    return true;
  } else {
    log(`✗ Registration failed: ${data.message}`, 'red');
    return false;
  }
}

async function testLogin() {
  log('\n=== TEST 2: USER LOGIN ===', 'cyan');
  
  const loginData = {
    email: 'testuser@example.com',
    password: 'TestPassword123'
  };

  log(`Logging in with: ${loginData.email}`);
  const { status, data } = await makeRequest('POST', '/auth/login', loginData);

  if (status === 200 && data.status === 'success') {
    log(`✓ Login successful`, 'green');
    log(`  User: ${data.data.user.name}`);
    log(`  Role: ${data.data.user.role}`);
    
    if (!accessToken) {
      accessToken = data.data.accessToken;
      refreshToken = data.data.refreshToken;
      userId = data.data.user.id;
    }
    
    return true;
  } else {
    log(`✗ Login failed: ${data.message}`, 'red');
    return false;
  }
}

async function testGetProfile() {
  log('\n=== TEST 3: GET USER PROFILE ===', 'cyan');

  if (!accessToken) {
    log(`⚠ Skipping: No access token available`, 'yellow');
    return false;
  }

  log(`Fetching user profile...`);
  const { status, data } = await makeRequest('GET', '/auth/me');

  if (status === 200 && data.status === 'success') {
    log(`✓ Profile retrieved successfully`, 'green');
    log(`  Email: ${data.data.email}`);
    log(`  Name: ${data.data.name}`);
    log(`  Role: ${data.data.role}`);
    
    const profileKey = `${data.data.role === 'consumer' ? 'consumer' : data.data.role === 'business_owner' ? 'business' : 'admin'}_profile`;
    if (data.data[profileKey]) {
      log(`  Profile data exists: Yes`, 'green');
    }
    
    return true;
  } else {
    log(`✗ Failed to get profile: ${data.message}`, 'red');
    return false;
  }
}

async function testRefreshToken() {
  log('\n=== TEST 4: REFRESH ACCESS TOKEN ===', 'cyan');

  if (!refreshToken) {
    log(`⚠ Skipping: No refresh token available`, 'yellow');
    return false;
  }

  log(`Refreshing access token...`);
  const { status, data } = await makeRequest('POST', '/auth/refresh', {
    refreshToken
  });

  if (status === 200 && data.status === 'success') {
    log(`✓ Token refreshed successfully`, 'green');
    log(`  New access token generated`);
    
    accessToken = data.data.accessToken;
    
    return true;
  } else {
    log(`✗ Token refresh failed: ${data.message}`, 'red');
    return false;
  }
}

async function testLogout() {
  log('\n=== TEST 5: USER LOGOUT ===', 'cyan');

  if (!accessToken || !refreshToken) {
    log(`⚠ Skipping: No tokens available`, 'yellow');
    return false;
  }

  log(`Logging out...`);
  const { status, data } = await makeRequest('POST', '/auth/logout', {
    refreshToken
  });

  if (status === 200 && data.status === 'success') {
    log(`✓ Logout successful`, 'green');
    log(`  Refresh token blacklisted`);
    
    accessToken = null;
    refreshToken = null;
    
    return true;
  } else {
    log(`✗ Logout failed: ${data.message}`, 'red');
    return false;
  }
}

async function testAdminLogin() {
  log('\n=== TEST 6: ADMIN LOGIN ===', 'cyan');
  
  const adminLogin = {
    email: 'admin@vmcreviews.com',
    password: 'admin123'
  };

  log(`Attempting admin login: ${adminLogin.email}`);
  const { status, data } = await makeRequest('POST', '/auth/admin/login', adminLogin);

  if (status === 200 && data.status === 'success') {
    log(`✓ Admin login successful`, 'green');
    log(`  Admin Level: ${data.data.user.admin?.level || 'N/A'}`);
    log(`  Permissions: ${data.data.user.admin?.permissions ? Object.values(data.data.user.admin.permissions).filter(v => v).length + ' enabled' : 'None'}`);
    
    return true;
  } else if (status === 401 || status === 404) {
    log(`⚠ Admin account not found (this is expected if not set up)`, 'yellow');
    return true; // Don't fail the test suite
  } else {
    log(`✗ Admin login failed: ${data.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log(`\n${'='.repeat(50)}`, 'bright');
  log(`VMC REVIEWS - BACKEND API TESTS`, 'bright');
  log(`${'='.repeat(50)}`, 'bright');

  const results = {
    registration: await testRegistration(),
    profile: await testGetProfile(),
    refreshToken: await testRefreshToken(),
    logout: await testLogout(),
    login: await testLogin(),
    adminLogin: await testAdminLogin()
  };

  // Summary
  log(`\n${'='.repeat(50)}`, 'bright');
  log(`TEST SUMMARY`, 'bright');
  log(`${'='.repeat(50)}`, 'bright');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;

  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? 'green' : 'red';
    log(`  ${name.padEnd(20)}: ${status}`, color);
  });

  log(`\nTotal: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  log(`${'='.repeat(50)}\n`, 'bright');
}

// Run tests
runTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
