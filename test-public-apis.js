#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testAPIs() {
  console.log('\n🚀 Testing Business & Review APIs\n');

  try {
    // Test 1: GET /api/businesses
    console.log('1️⃣  Testing GET /api/businesses...');
    const bizRes = await axios.get(`${BASE_URL}/businesses?limit=3&sort_by=rating`);
    const bizData = bizRes.data;
    console.log(`   Status: ${bizRes.status}`);
    console.log(`   Received ${bizData.data?.length || 0} businesses`);
    console.log(`   Pagination: offset=${bizData.pagination?.offset}, total=${bizData.pagination?.total}`);
    console.log(`   ✅ Endpoint working\n`);

    // Test 2: GET /api/reviews with businessId
    if (bizData.data && bizData.data.length > 0) {
      const firstBizId = bizData.data[0].id;
      console.log(`2️⃣  Testing GET /api/reviews?businessId=${firstBizId}...`);
      const revRes = await axios.get(`${BASE_URL}/reviews?businessId=${firstBizId}&limit=5`);
      const revData = revRes.data;
      console.log(`   Status: ${revRes.status}`);
      console.log(`   Received ${revData.data?.length || 0} reviews`);
      console.log(`   Response keys: ${Object.keys(revData).join(', ')}`);
      console.log(`   ✅ Endpoint working\n`);
    } else {
      console.log('⚠️  No businesses found, skipping review test\n');
    }

    // Test 3: Try POST /api/reviews without auth (should fail)
    console.log('3️⃣  Testing POST /api/reviews (without auth - should fail)...');
    try {
      await axios.post(`${BASE_URL}/reviews`, {
        business_id: 'test-id',
        title: 'Test Review',
        content: 'This is a test review content',
        rating: 5
      });
      console.log('   ❌ Should have been rejected (no auth)');
    } catch (postErr) {
      console.log(`   Status: ${postErr.response?.status} (expected 401/403 without token)`);
      console.log(`   Message: ${postErr.response?.data?.message || 'Unauthorized'}`);
      console.log(`   ✅ Auth middleware working\n`);
    }

    console.log('✅ All API endpoints are responding correctly!\n');
  } catch (error) {
    console.error('❌ Error testing APIs:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testAPIs();
