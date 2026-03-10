import http from 'http';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

function log(type, msg) {
  const c = { success: colors.green, error: colors.red, info: colors.cyan, warning: colors.yellow }[type];
  console.log(`${c}[${type.toUpperCase()}]${colors.reset} ${msg}`);
}

async function testAdminLogin() {
  const adminEmail = 'admin@vmcreviews.com';
  const adminPassword = 'AdminPass@2026';

  log('info', 'Testing Admin Login...\n');

  return new Promise((resolve) => {
    const data = JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);

          if (res.statusCode === 200) {
            log('success', '✓ Admin login successful!\n');
            console.log('═'.repeat(70));
            console.log('\n📋 Admin Login Response:\n');
            console.log(`Status Code: ${res.statusCode}`);
            console.log(`Message: ${response.message}\n`);
            console.log('User Info:');
            console.log(`  ID:   ${response.data.user.id}`);
            console.log(`  Name: ${response.data.user.name}`);
            console.log(`  Email: ${response.data.user.email}`);
            console.log(`  Role: ${response.data.user.role}\n`);
            console.log('Tokens Generated:');
            console.log(`  Access Token: ${response.data.accessToken.substring(0, 30)}...`);
            console.log(`  Refresh Token: ${response.data.refreshToken.substring(0, 30)}...\n`);
            console.log('═'.repeat(70));
            console.log('\n✨ Admin account is working perfectly!\n');
          } else {
            log('error', `✗ Login failed with status ${res.statusCode}`);
            console.log('\nResponse:', response);
          }
          resolve();
        } catch (e) {
          log('error', `✗ Error parsing response: ${e.message}`);
          resolve();
        }
      });
    });

    req.on('error', (e) => {
      log('error', `Connection error: ${e.message}`);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

testAdminLogin();
