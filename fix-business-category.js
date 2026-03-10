import axios from 'axios';
import { config } from 'dotenv';

config({ path: '.env' });

const API_BASE = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@vmcreviews.com';
const ADMIN_PASSWORD = 'AdminPass@2026';

async function fix() {
  try {
    console.log('🔧 Fixing business category...\n');

    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginRes = await axios.post(`${API_BASE}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    const { accessToken } = loginRes.data.data;
    console.log('✅ Login successful\n');

    // Step 2: Get business details
    console.log('2️⃣ Getting business data...');
    const bizRes = await axios.get(`${API_BASE}/api/admin/businesses?page=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const business = bizRes.data.data[0];
    console.log(`✅ Found business: "${business.business_name}"`);
    console.log(`   Current category ID: ${business.business_category}`);
    console.log(`   Current status: Not found in categories\n`);

    // Step 3: Update business with valid category (Restaurants & Bars)
    const VALID_CATEGORY_ID = '36f933f4-9485-476a-ad08-451dfca50871'; // Restaurants & Bars
    console.log('3️⃣ Updating business with valid category...');
    
    const updateRes = await axios.put(
      `${API_BASE}/api/admin/businesses/${business.id}`,
      {
        business_category: VALID_CATEGORY_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log('✅ Business updated successfully!');
    console.log(`   Category changed to: Restaurants & Bars`);
    console.log(`   Category ID: ${VALID_CATEGORY_ID}\n`);

    console.log('✅ Fix completed! Refresh the page to see the category name.');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

fix();
