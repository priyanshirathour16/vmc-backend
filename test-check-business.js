/**
 * Quick test to check if business profile exists
 */

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
});

const testFlow = async () => {
  try {
    // 1. Login
    console.log('📍 Step 1: Logging in...');
    const loginRes = await api.post('/auth/login', {
      email: 'business@example.com',
      password: 'password123'
    });

    const token = loginRes.data.data?.accessToken;
    const userId = loginRes.data.data?.user?.id;
    
    if (!token) {
      console.log('❌ Login failed - no token');
      return;
    }

    console.log('✅ Logged in successfully');
    console.log('   User ID:', userId);
    console.log('   Token:', token.substring(0, 20) + '...\n');

    // 2. Check if business profile exists
    console.log('📍 Step 2: Checking business profile...');
    const api2 = axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    try {
      const dashRes = await api2.get('/business/me');
      console.log('✅ Business profile exists!');
      console.log('   Business Name:', dashRes.data.data?.business?.business_name);
      console.log('   Total Reviews:', dashRes.data.data?.stats?.totalReviews);
      console.log('   Avg Rating:', dashRes.data.data?.stats?.avgRating);
      console.log('\n✅ Backend is working correctly!');
      process.exit(0);
    } catch (err) {
      if (err.response?.status === 404) {
        console.log('⚠️ No business profile found');
        console.log('   This account exists but has no business profile.');
        console.log('   You need to create a business profile first.\n');
        console.log('   To create a business profile:');
        console.log('   1. Go to admin panel or use POST /api/admin/businesses');
        console.log('   2. Create a business for user ID: ' + userId);
        console.log('   3. Or register a new business via /api/businesses/apply');
        process.exit(1);
      } else {
        console.log('❌ Error:', err.response?.data?.message || err.message);
        process.exit(1);
      }
    }

  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
    process.exit(1);
  }
};

testFlow();
