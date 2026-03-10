import axios from 'axios';
import { config } from 'dotenv';

config({ path: '.env' });

const API_BASE = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@vmcreviews.com';
const ADMIN_PASSWORD = 'AdminPass@2026';

async function test() {
  try {
    console.log('🧪 Testing Categories API\n');

    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginRes = await axios.post(`${API_BASE}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const { accessToken } = loginRes.data.data;
    console.log('✅ Login successful\n');

    // Step 2: Fetch categories
    console.log('2️⃣ Fetching categories...');
    try {
      const response = await axios.get(`${API_BASE}/api/categories`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('✅ Categories API Response:');
      console.log('   Status:', response.status);
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.data && response.data.data.length > 0) {
        console.log(`\n✅ Found ${response.data.data.length} categories:`);
        response.data.data.forEach((cat, idx) => {
          console.log(`   ${idx + 1}. ${cat.name} (${cat.id})`);
        });
      } else {
        console.log('⚠️  No categories found in response!');
      }
    } catch (err) {
      console.log('❌ Error fetching categories:');
      console.log('   Status:', err.response?.status);
      console.log('   Message:', err.response?.data?.message || err.message);
    }

    // Step 3: Check business data
    console.log('\n3️⃣ Checking business data...');
    const bizRes = await axios.get(`${API_BASE}/api/admin/businesses?page=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (bizRes.data.data.length > 0) {
      const business = bizRes.data.data[0];
      console.log('✅ First Business:');
      console.log(`   Name: ${business.business_name}`);
      console.log(`   Category ID: ${business.business_category}`);
    }

    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

test();
