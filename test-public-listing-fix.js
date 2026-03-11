import axios from 'axios';

const API_BASE = 'http://localhost:5000';

/**
 * Test to verify that verified + published businesses appear in public listing
 * 
 * Scenario:
 * 1. Create a business via admin API
 * 2. Verify the business (sets verification_status='verified' + is_approved=true)
 * 3. Publish the business (sets is_published=true)
 * 4. Check public /api/businesses endpoint - business should appear
 */

async function runTest() {
  try {
    console.log('🧪 Testing: Verified & Published Business Visibility\n');

    // Step 1: Get or create admin token
    console.log('1️⃣  Getting admin token...');
    const adminCredentials = {
      email: 'admin@test.com',
      password: 'Admin@123456'
    };

    const loginRes = await axios.post(`${API_BASE}/api/auth/login`, adminCredentials);
    const adminToken = loginRes.data.data.accessToken;
    console.log('✅ Admin token obtained\n');

    // Step 2: Get all categories
    console.log('2️⃣  Fetching categories...');
    const categoriesRes = await axios.get(`${API_BASE}/api/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const categoryId = categoriesRes.data.data[0].id;
    console.log(`✅ Using category: ${categoryId}\n`);

    // Step 3: Create a test business
    console.log('3️⃣  Creating test business...');
    const businessData = {
      business_name: `Test Business ${Date.now()}`,
      business_category: categoryId,
      website_url: 'https://example.com',
      street_address: '123 Test St',
      city: 'Test City',
      country: 'India',
      phone_number: '+91-9999999999',
      email_business: `test-${Date.now()}@business.com`,
      business_description: 'Test business for verification',
    };

    const createRes = await axios.post(
      `${API_BASE}/api/admin/businesses`,
      businessData,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const businessId = createRes.data.data.id;
    console.log(`✅ Business created: ${businessId}`);
    console.log(`   - verification_status: ${createRes.data.data.verification_status}`);
    console.log(`   - is_approved: ${createRes.data.data.is_approved}`);
    console.log(`   - is_published: ${createRes.data.data.is_published}\n`);

    // Step 4: Verify the business
    console.log('4️⃣  Verifying business...');
    const verifyRes = await axios.patch(
      `${API_BASE}/api/admin/businesses/${businessId}/verify`,
      { verification_status: 'verified' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✅ Business verified`);
    console.log(`   - verification_status: ${verifyRes.data.data.verification_status}`);
    console.log(`   - is_verified: ${verifyRes.data.data.is_verified}`);
    console.log(`   - is_approved: ${verifyRes.data.data.is_approved} ← Should be TRUE\n`);

    if (!verifyRes.data.data.is_approved) {
      console.log('❌ ERROR: is_approved is still FALSE after verification!');
      console.log('This is the bug causing businesses not to appear in public listing.\n');
    }

    // Step 5: Publish the business
    console.log('5️⃣  Publishing business...');
    const publishRes = await axios.patch(
      `${API_BASE}/api/admin/businesses/${businessId}/publish`,
      { is_published: true },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✅ Business published`);
    console.log(`   - is_published: ${publishRes.data.data.is_published}`);
    console.log(`   - is_approved: ${publishRes.data.data.is_approved}\n`);

    // Step 6: Check public listing
    console.log('6️⃣  Checking public /api/businesses listing...');
    const publicRes = await axios.get(`${API_BASE}/api/businesses`);
    const foundBusiness = publicRes.data.data.find(b => b.id === businessId);

    if (foundBusiness) {
      console.log('✅ SUCCESS! Business found in public listing');
      console.log(`   Business name: ${foundBusiness.business_name}`);
      console.log(`   Rating: ${foundBusiness.avg_rating || 'No reviews yet'}`);
    } else {
      console.log('❌ FAILED! Business NOT found in public listing');
      console.log(`   Total businesses in listing: ${publicRes.data.data.length}`);
      console.log('   This indicates the fix did not work.\n');
    }

    console.log('\n📊 Test Summary:');
    console.log(`   - Business created: ${businessId}`);
    console.log(`   - Verification status: verified`);
    console.log(`   - Published: true`);
    console.log(`   - Visible in public listing: ${foundBusiness ? '✅ YES' : '❌ NO'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTest();
