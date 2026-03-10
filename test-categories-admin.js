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

function makeRequest(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
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
    req.end();
  });
}

async function runTest() {
  log('info', '🧪 Testing Categories Admin Endpoint');
  log('info', '='.repeat(60));

  // First login as admin
  log('test', 'Step 1: Admin Login');
  const loginRes = await makeRequest('POST', '/api/auth/login', { 'Content-Type': 'application/json' });
  // We need to send POST data, let me fix this

  try {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };

    await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            const adminToken = result.data?.accessToken;
            
            if (adminToken) {
              log('success', '✓ Admin login successful');
              
              // Now test the categories endpoint
              log('test', 'Step 2: Fetch Admin Categories');
              
              const catOptions = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/categories/admin/all',
                method: 'GET',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${adminToken}`
                },
              };

              const catReq = http.request(catOptions, (catRes) => {
                let catData = '';
                catRes.on('data', (chunk) => { catData += chunk; });
                catRes.on('end', () => {
                  try {
                    const categoryResult = JSON.parse(catData);
                    if (catRes.statusCode === 200) {
                      log('success', '✓ Categories fetched successfully');
                      log('info', `  Status: ${catRes.statusCode}`);
                      log('info', `  Count: ${categoryResult.data?.length || 0} categories`);
                      if (categoryResult.data?.length > 0) {
                        log('info', `  Sample: ${categoryResult.data[0].name}`);
                      }
                    } else {
                      log('error', `✗ Failed with status ${catRes.statusCode}`);
                      log('error', `  Error: ${JSON.stringify(categoryResult)}`);
                    }
                  } catch (e) {
                    log('error', `✗ Parse error: ${e.message}`);
                  }
                  resolve();
                });
              });

              catReq.on('error', (e) => {
                log('error', `✗ Request error: ${e.message}`);
                resolve();
              });
              catReq.end();
            } else {
              log('error', `✗ Login failed: ${JSON.stringify(result)}`);
              resolve();
            }
          } catch (e) {
            log('error', `✗ Parse error: ${e.message}`);
            resolve();
          }
        });
      });

      req.on('error', reject);
      const loginBody = {
        email: 'admin@vmcreviews.com',
        password: 'AdminPass@2026'
      };
      req.write(JSON.stringify(loginBody));
      req.end();
    });
  } catch (e) {
    log('error', `✗ Test failed: ${e.message}`);
  }
}

runTest();
