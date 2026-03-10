import axios from 'axios';
import { config } from 'dotenv';

config({ path: '.env' });

const API_BASE = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@vmcreviews.com';
const ADMIN_PASSWORD = 'AdminPass@2026';

async function test() {
  try {
    console.log('🧪 Testing Admin Businesses API\n');

    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginRes = await axios.post(`${API_BASE}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const { accessToken } = loginRes.data.data;
    console.log('✅ Login successful');
    console.log(`Token: ${accessToken.substring(0, 20)}...`);

    // Step 2: Test API with correct parameters (page/perpage)
    console.log('\n2️⃣ Testing API with correct parameters (page/perpage)...');
    const response1 = await axios.get(`${API_BASE}/api/admin/businesses`, {
      params: {
        page: 1,
        perpage: 10,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('✅ API Response with correct params:');
    console.log(`   - Status: ${response1.status}`);
    console.log(`   - Data count: ${response1.data.data.length}`);
    console.log(`   - Pagination:`, response1.data.pagination);

    if (response1.data.data.length > 0) {
      console.log('✅ Businesses found!');
      console.log(`   First business: ${response1.data.data[0].business_name}`);
    } else {
      console.log('⚠️  No businesses found in database');
    }

    // Step 3: Test API with wrong parameters (limit/offset) - what frontend sends
    console.log('\n3️⃣ Testing API with wrong parameters (limit/offset) - what frontend sends...');
    try {
      const response2 = await axios.get(`${API_BASE}/api/admin/businesses`, {
        params: {
          limit: 10,
          offset: 0,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('✅ API Response with wrong params:');
      console.log(`   - Status: ${response2.status}`);
      console.log(`   - Data count: ${response2.data.data.length}`);
      console.log(`   - Pagination:`, response2.data.pagination);
    } catch (err) {
      console.log('❌ Error with wrong params:', err.response?.data?.message || err.message);
    }

    // Step 4: Check direct database query
    console.log('\n4️⃣ Checking database directly via GET with filter...');
    const response3 = await axios.get(`${API_BASE}/api/admin/businesses?created_by_type=all`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('✅ API Response with filters:');
    console.log(`   - Data count: ${response3.data.data.length}`);
    console.log(`   - Response:`, JSON.stringify(response3.data, null, 2));

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

test();
